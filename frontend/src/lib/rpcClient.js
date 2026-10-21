// Fault-Tolerant JSON-RPC 2.0 Client with Circuit Breaker and Exponential Backoff

class CircuitBreaker {
  constructor(failureThreshold = 3, resetTimeoutMs = 6000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
    this.consecutiveFailures = 0;
    this.nextAttemptAt = 0;
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const sub of this.subscribers) {
      sub({
        state: this.state,
        failures: this.consecutiveFailures,
        nextAttemptAt: this.nextAttemptAt
      });
    }
  }

  canExecute() {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttemptAt) {
        this.state = 'HALF_OPEN';
        this.notify();
        return true;
      }
      return false;
    }

    if (this.state === 'HALF_OPEN') {
      return true; // allow probe request
    }

    return true;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.notify();
  }

  recordFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
    }
    this.notify();
  }

  reset() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.nextAttemptAt = 0;
    this.notify();
  }
}

class RpcClient {
  constructor(endpoint = '/rpc') {
    this.endpoint = endpoint;
    this.circuitBreaker = new CircuitBreaker(3, 5000);
    this.telemetryListeners = new Set();
  }

  onTelemetry(callback) {
    this.telemetryListeners.add(callback);
    return () => this.telemetryListeners.delete(callback);
  }

  emitTelemetry(event) {
    for (const cb of this.telemetryListeners) {
      cb(event);
    }
  }

  // Generate unique request ID
  generateId() {
    return `rpc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  }

  // Calculate exponential backoff with jitter
  calculateBackoff(attempt, baseDelayMs = 400, maxDelayMs = 4000) {
    const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
    const jitter = Math.random() * (exp * 0.3); // 30% jitter
    return Math.round(exp + jitter);
  }

  /**
   * Invoke RPC Method with automatic retries, backoff, and circuit breaker
   * @param {string} method - Procedure name, e.g. "TaskService.CreateTask"
   * @param {object} params - Arguments
   * @param {object} options - { maxRetries: 4, idempotencyKey: string }
   */
  async call(method, params = {}, options = {}) {
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 4;
    const idempotencyKey = options.idempotencyKey || `idem-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
    const rpcId = this.generateId();

    let attempt = 1;

    while (attempt <= maxRetries) {
      // 1. Check Circuit Breaker
      if (!this.circuitBreaker.canExecute()) {
        const remainingMs = Math.max(0, this.circuitBreaker.nextAttemptAt - Date.now());
        const err = new Error(`Circuit Breaker is OPEN. Request fast-failed. Retry in ${Math.round(remainingMs / 1000)}s`);
        err.code = -32099;
        err.circuitBreakerOpen = true;

        this.emitTelemetry({
          id: rpcId,
          method,
          status: 'CIRCUIT_BREAKER_BLOCKED',
          attempt,
          timestamp: new Date().toISOString(),
          error: err.message
        });

        throw err;
      }

      const startTime = performance.now();

      this.emitTelemetry({
        id: rpcId,
        method,
        status: attempt === 1 ? 'INVOKED' : 'RETRYING',
        attempt,
        idempotencyKey,
        timestamp: new Date().toISOString()
      });

      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-retry-attempt': String(attempt),
            'x-idempotency-key': idempotencyKey
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id: rpcId,
            idempotencyKey
          })
        });

        const duration = Math.round(performance.now() - startTime);

        if (!response.ok && response.status !== 503) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          const isRetryable = data.error.data?.retryable || response.status === 503;
          if (isRetryable && attempt < maxRetries) {
            this.circuitBreaker.recordFailure();
            const backoffMs = this.calculateBackoff(attempt);

            this.emitTelemetry({
              id: rpcId,
              method,
              status: 'RETRY_SCHEDULED',
              attempt,
              durationMs: duration,
              backoffMs,
              error: data.error.message,
              timestamp: new Date().toISOString()
            });

            await new Promise(r => setTimeout(r, backoffMs));
            attempt++;
            continue;
          }

          this.circuitBreaker.recordFailure();
          const rpcError = new Error(data.error.message);
          rpcError.code = data.error.code;
          rpcError.data = data.error.data;

          this.emitTelemetry({
            id: rpcId,
            method,
            status: 'FAILED',
            attempt,
            durationMs: duration,
            error: data.error.message,
            timestamp: new Date().toISOString()
          });

          throw rpcError;
        }

        // RPC Success
        this.circuitBreaker.recordSuccess();

        this.emitTelemetry({
          id: rpcId,
          method,
          status: 'SUCCESS',
          attempt,
          durationMs: duration,
          idempotentReplay: data.meta?.idempotentReplay || false,
          timestamp: new Date().toISOString()
        });

        return data.result;

      } catch (networkErr) {
        const duration = Math.round(performance.now() - startTime);
        this.circuitBreaker.recordFailure();

        if (attempt < maxRetries) {
          const backoffMs = this.calculateBackoff(attempt);

          this.emitTelemetry({
            id: rpcId,
            method,
            status: 'NETWORK_RETRY_SCHEDULED',
            attempt,
            durationMs: duration,
            backoffMs,
            error: networkErr.message,
            timestamp: new Date().toISOString()
          });

          await new Promise(r => setTimeout(r, backoffMs));
          attempt++;
        } else {
          this.emitTelemetry({
            id: rpcId,
            method,
            status: 'MAX_RETRIES_EXCEEDED',
            attempt,
            durationMs: duration,
            error: networkErr.message,
            timestamp: new Date().toISOString()
          });
          throw networkErr;
        }
      }
    }
  }
}

export const rpcClient = new RpcClient();

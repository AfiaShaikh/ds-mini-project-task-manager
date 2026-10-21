// Fault Tolerance & Chaos Engineering Engine
// Simulates distributed system failures (network lag, packet loss, RPC 503s, worker crashes)
// to demonstrate automated retries, idempotency, backoff, and circuit breaking.

class FaultEngine {
  constructor() {
    this.config = {
      rpcFailureRate: 0,      // Percentage: 0 to 100
      simulatedLatencyMs: 0,  // Artificial delay: 0 to 5000ms
      workerCrashRate: 0,     // Percentage: 0 to 100 (for MQ workers)
      networkPartition: false, // Drop all requests
      lastFailureReason: null
    };
    this.failureEvents = [];
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.logEvent('CONFIG_UPDATE', `Fault engine config updated: ${JSON.stringify(this.config)}`);
    return this.config;
  }

  logEvent(type, details) {
    const event = {
      id: `fault-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      type,
      details
    };
    this.failureEvents.unshift(event);
    if (this.failureEvents.length > 100) this.failureEvents.pop();
    return event;
  }

  getRecentEvents(limit = 30) {
    return this.failureEvents.slice(0, limit);
  }

  // Intercept an RPC call and test if chaos should trigger
  async interceptRpc(method, params, attempt = 1) {
    if (this.config.networkPartition) {
      this.logEvent('NETWORK_PARTITION', `RPC ${method} dropped due to simulated network partition`);
      const err = new Error('Network Partition Simulated: Node is isolated from cluster');
      err.code = -32002;
      err.retryable = true;
      throw err;
    }

    if (this.config.simulatedLatencyMs > 0) {
      // Add artificial network latency
      await new Promise(r => setTimeout(r, this.config.simulatedLatencyMs));
    }

    if (this.config.rpcFailureRate > 0) {
      const roll = Math.random() * 100;
      if (roll < this.config.rpcFailureRate) {
        this.logEvent('RPC_INJECTED_FAULT', `Injected fault (attempt ${attempt}) for RPC ${method}. Roll ${Math.round(roll)}% < Rate ${this.config.rpcFailureRate}%`);
        const err = new Error(`Simulated Node Failure: Service Unavailable (HTTP 503) on method ${method}`);
        err.code = -32001;
        err.retryable = true;
        throw err;
      }
    }
  }

  // Intercept Message Queue consumer processing
  shouldWorkerCrash() {
    if (this.config.workerCrashRate > 0) {
      const roll = Math.random() * 100;
      if (roll < this.config.workerCrashRate) {
        this.logEvent('WORKER_CRASH', `Worker crashed while processing message. Roll ${Math.round(roll)}% < Rate ${this.config.workerCrashRate}%`);
        return true;
      }
    }
    return false;
  }
}

const faultEngine = new FaultEngine();
module.exports = faultEngine;

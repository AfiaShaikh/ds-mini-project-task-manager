// JSON-RPC 2.0 Dispatcher with Idempotency, Metrics, and Fault Injection Middleware

const store = require('../db/store');
const faultEngine = require('./faultEngine');
const taskService = require('./taskService');

const methods = {
  'TaskService.CreateTask': (params) => taskService.createTask(params),
  'TaskService.AssignTask': (params) => taskService.assignTask(params),
  'TaskService.UpdateProgress': (params) => taskService.updateProgress(params),
  'TaskService.UpdateStatus': (params) => taskService.updateStatus(params),
  'TaskService.DeleteTask': (params) => taskService.deleteTask(params),
  'TaskService.BatchAssign': (params) => taskService.batchAssign(params),
  'System.GetHealth': () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: store.getMetrics()
  }),
  'System.Reset': () => {
    store.reset();
    return { success: true, message: 'Store reset to initial state' };
  }
};

async function handleRpcRequest(req, res) {
  const startTime = Date.now();
  store.metrics.rpcCallsTotal++;

  const { jsonrpc, method, params = {}, id, idempotencyKey } = req.body || {};

  // JSON-RPC 2.0 Validation
  if (jsonrpc !== '2.0' || !method || id === undefined) {
    store.metrics.rpcFailed++;
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid Request: Must be JSON-RPC 2.0 with method and id'
      },
      id: id || null
    });
  }

  // Idempotency check: if request was already executed, return cached result
  if (idempotencyKey) {
    const cached = store.checkIdempotency(idempotencyKey);
    if (cached) {
      store.metrics.rpcSuccess++;
      const durationMs = Date.now() - startTime;
      store.metrics.totalLatencyMs += durationMs;
      return res.json({
        jsonrpc: '2.0',
        result: cached,
        id,
        meta: {
          idempotentReplay: true,
          durationMs,
          serverTimestamp: new Date().toISOString()
        }
      });
    }
  }

  // Method existence check
  const handler = methods[method];
  if (!handler) {
    store.metrics.rpcFailed++;
    return res.status(404).json({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      },
      id
    });
  }

  try {
    // Intercept with Fault Engine (may throw simulated 503 or add latency)
    const attempt = Number(req.headers['x-retry-attempt'] || 1);
    if (attempt > 1) {
      store.metrics.rpcRetried++;
    }
    await faultEngine.interceptRpc(method, params, attempt);

    // Execute business logic
    const result = await handler(params);

    // Save in idempotency cache
    if (idempotencyKey) {
      store.recordIdempotency(idempotencyKey, result);
    }

    const durationMs = Date.now() - startTime;
    store.metrics.rpcSuccess++;
    store.metrics.totalLatencyMs += durationMs;

    return res.json({
      jsonrpc: '2.0',
      result,
      id,
      meta: {
        durationMs,
        attempt,
        serverTimestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    const durationMs = Date.now() - startTime;
    store.metrics.rpcFailed++;
    store.metrics.totalLatencyMs += durationMs;

    const statusCode = err.code === -32001 || err.code === -32002 ? 503 : 500;

    return res.status(statusCode).json({
      jsonrpc: '2.0',
      error: {
        code: err.code || -32603,
        message: err.message || 'Internal RPC Error',
        data: {
          retryable: err.retryable || false,
          attempt: Number(req.headers['x-retry-attempt'] || 1)
        }
      },
      id,
      meta: {
        durationMs,
        failedAt: new Date().toISOString()
      }
    });
  }
}

module.exports = {
  handleRpcRequest,
  methods
};

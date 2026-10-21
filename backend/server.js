// Distributed Task Management System - Main Backend Server
// Integrates:
// 1. JSON-RPC 2.0 for Creating and Assigning Tasks
// 2. Asynchronous Message Broker & Worker Pool for Notifications & DLQ
// 3. Server-Sent Events (SSE) for Live Streaming Task Updates
// 4. WebRTC Signaling Server for Direct P2P Team Communication
// 5. Fault Tolerance & Chaos Engineering (Retries, Backoff, Idempotency, Circuit Breaker)

const http = require('http');
const express = require('express');
const cors = require('cors');

const store = require('./db/store');
const eventStream = require('./streaming/eventStream');
const messageBroker = require('./queue/messageBroker');
const faultEngine = require('./rpc/faultEngine');
const { handleRpcRequest } = require('./rpc/rpcRouter');
const signalingServer = require('./p2p/signalingServer');

// Link components
eventStream.setStore(store);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// 1. RPC Endpoint (JSON-RPC 2.0)
// -------------------------------------------------------------
app.post('/rpc', handleRpcRequest);

// -------------------------------------------------------------
// 2. Real-time Streaming (Server-Sent Events)
// -------------------------------------------------------------
app.get('/api/stream/events', (req, res) => {
  eventStream.handleSseConnection(req, res);
});

// -------------------------------------------------------------
// 3. REST Helpers for UI initialization & telemetry
// -------------------------------------------------------------
app.get('/api/tasks', (req, res) => {
  res.json({ tasks: store.getTasks() });
});

app.get('/api/users', (req, res) => {
  res.json({ users: store.getUsers() });
});

app.get('/api/queue/status', (req, res) => {
  res.json(messageBroker.getStatus());
});

app.post('/api/queue/dlq/reprocess', (req, res) => {
  const { messageId } = req.body;
  const success = messageBroker.reprocessDlqItem(messageId);
  res.json({ success, messageId });
});

app.get('/api/system/metrics', (req, res) => {
  res.json({
    metrics: store.getMetrics(),
    activeStreams: eventStream.getActiveCount(),
    queue: messageBroker.getStatus(),
    p2p: signalingServer.getStatus(),
    faultConfig: faultEngine.getConfig()
  });
});

app.get('/api/system/audit', (req, res) => {
  res.json({ audit: store.getAuditLog() });
});

// Chaos & Fault Tolerance Endpoints
app.get('/api/faults/config', (req, res) => {
  res.json(faultEngine.getConfig());
});

app.post('/api/faults/config', (req, res) => {
  const updated = faultEngine.updateConfig(req.body);
  eventStream.broadcast('fault_config_changed', { config: updated });
  res.json({ success: true, config: updated });
});

app.get('/api/faults/events', (req, res) => {
  res.json({ events: faultEngine.getRecentEvents() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Create HTTP Server & Bind WebSocket Signaling
const server = http.createServer(app);
const wssSignaling = signalingServer.initialize(server);

// Handle HTTP Upgrade for WebSocket signaling
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws/p2p') {
    wssSignaling.handleUpgrade(request, socket, head, (ws) => {
      wssSignaling.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Distributed Task Management System Server Running`);
  console.log(` - Port:            http://localhost:${PORT}`);
  console.log(` - JSON-RPC 2.0:    POST http://localhost:${PORT}/rpc`);
  console.log(` - Live SSE Stream: GET  http://localhost:${PORT}/api/stream/events`);
  console.log(` - P2P Signaling:   ws://localhost:${PORT}/ws/p2p`);
  console.log(` - Message Broker:  3 Active Workers (Alpha, Beta, Gamma)`);
  console.log(`=======================================================`);
});

// Streaming Layer: Server-Sent Events (SSE) & WebSocket event broadcaster
// Provides live task updates to all connected browser clients with sequence numbers and replay buffer

class EventStreamManager {
  constructor() {
    this.sseClients = new Set();
    this.eventBuffer = []; // Circular replay buffer of last 100 events
    this.sequenceId = 0;
    this.store = null;

    // Periodic heartbeat to keep connections alive and detect dead sockets
    setInterval(() => {
      this.broadcast('heartbeat', {
        time: new Date().toISOString(),
        activeStreams: this.sseClients.size
      });
    }, 15000);
  }

  setStore(store) {
    this.store = store;
  }

  // Handle new incoming SSE connection
  handleSseConnection(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    const clientId = `stream-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const client = { id: clientId, res, connectedAt: new Date().toISOString() };
    this.sseClients.add(client);

    if (this.store) {
      this.store.metrics.sseActiveConnections = this.sseClients.size;
    }

    // Check if client provided Last-Event-ID for missed messages
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
      const lastIdNum = parseInt(lastEventId, 10);
      const missed = this.eventBuffer.filter(e => e.seq > lastIdNum);
      missed.forEach(event => {
        res.write(`id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
      });
    }

    // Send initial connection greeting
    res.write(`id: ${this.sequenceId}\nevent: connected\ndata: ${JSON.stringify({
      clientId,
      status: 'active',
      bufferSize: this.eventBuffer.length,
      connectedAt: client.connectedAt
    })}\n\n`);

    req.on('close', () => {
      this.sseClients.delete(client);
      if (this.store) {
        this.store.metrics.sseActiveConnections = this.sseClients.size;
      }
    });
  }

  // Broadcast event to all SSE streams
  broadcast(eventType, payload) {
    this.sequenceId++;
    const eventRecord = {
      seq: this.sequenceId,
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    // Store in circular buffer
    this.eventBuffer.push(eventRecord);
    if (this.eventBuffer.length > 100) {
      this.eventBuffer.shift();
    }

    const sseMessage = `id: ${eventRecord.seq}\nevent: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.sseClients) {
      try {
        client.res.write(sseMessage);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }

    return eventRecord;
  }

  getRecentEvents(limit = 20) {
    return this.eventBuffer.slice(-limit).reverse();
  }

  getActiveCount() {
    return this.sseClients.size;
  }
}

const eventStream = new EventStreamManager();
module.exports = eventStream;

// Asynchronous Message Queue Broker with Worker Pool & Dead Letter Queue (DLQ)
// Used for decoupling notification delivery, audit indexing, and background task processing

const store = require('../db/store');
const eventStream = require('../streaming/eventStream');
const faultEngine = require('../rpc/faultEngine');

class MessageBroker {
  constructor() {
    this.queues = {
      'task.notifications': [],
      'team.alerts': []
    };
    this.dlq = []; // Dead Letter Queue for permanently failed messages
    this.workers = [
      { id: 'worker-1', name: 'Queue-Worker-Alpha', status: 'idle', processedCount: 0, failedCount: 0, currentJob: null },
      { id: 'worker-2', name: 'Queue-Worker-Beta', status: 'idle', processedCount: 0, failedCount: 0, currentJob: null },
      { id: 'worker-3', name: 'Queue-Worker-Gamma', status: 'idle', processedCount: 0, failedCount: 0, currentJob: null }
    ];
    this.history = []; // Processed messages history
    this.isProcessing = false;
    this.maxRetries = 3;

    // Start background processing loop
    setInterval(() => this.processQueues(), 800);
  }

  // Publish message to a topic
  publish(topic, payload, options = {}) {
    if (!this.queues[topic]) {
      this.queues[topic] = [];
    }

    const message = {
      id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      topic,
      payload,
      attempts: 0,
      maxRetries: options.maxRetries || this.maxRetries,
      status: 'pending', // pending, in_flight, acked, nacked, dlq
      enqueuedAt: new Date().toISOString(),
      lastAttemptAt: null,
      error: null
    };

    this.queues[topic].push(message);
    store.metrics.mqPublished++;

    // Notify stream that queue has a new item
    eventStream.broadcast('queue_published', {
      topic,
      messageId: message.id,
      queueDepth: this.getQueueDepth()
    });

    return message;
  }

  // Worker dispatcher loop
  async processQueues() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      for (const worker of this.workers) {
        if (worker.status !== 'idle') continue;

        // Find next pending message across queues
        let targetMsg = null;
        let targetTopic = null;

        for (const [topic, items] of Object.entries(this.queues)) {
          const nextIdx = items.findIndex(m => m.status === 'pending');
          if (nextIdx !== -1) {
            targetMsg = items[nextIdx];
            targetTopic = topic;
            break;
          }
        }

        if (targetMsg) {
          // Assign to worker
          this.executeWorkerJob(worker, targetMsg, targetTopic);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async executeWorkerJob(worker, msg, topic) {
    worker.status = 'busy';
    worker.currentJob = { id: msg.id, topic, action: msg.payload?.action || 'notify' };
    msg.status = 'in_flight';
    msg.attempts++;
    msg.lastAttemptAt = new Date().toISOString();

    eventStream.broadcast('worker_started', {
      workerId: worker.id,
      workerName: worker.name,
      messageId: msg.id,
      attempt: msg.attempts
    });

    // Simulate async I/O worker latency (200ms - 600ms)
    await new Promise(r => setTimeout(r, 350 + Math.random() * 250));

    // Check if chaos fault triggers a worker crash
    const willCrash = faultEngine.shouldWorkerCrash();

    if (willCrash) {
      worker.failedCount++;
      store.metrics.mqRetried++;
      msg.error = 'Simulated Consumer Crash: Worker memory fault / network timeout';
      
      if (msg.attempts >= msg.maxRetries) {
        // Move to Dead Letter Queue (DLQ)
        msg.status = 'dlq';
        this.removeFromQueue(topic, msg.id);
        this.dlq.unshift({ ...msg, movedToDlqAt: new Date().toISOString() });
        store.metrics.mqDlqCount = this.dlq.length;

        eventStream.broadcast('queue_dlq', {
          messageId: msg.id,
          topic,
          error: msg.error,
          attempts: msg.attempts
        });
      } else {
        // Re-queue with backoff
        msg.status = 'pending';
        eventStream.broadcast('queue_retry', {
          messageId: msg.id,
          topic,
          attempt: msg.attempts,
          nextRetryInMs: 1000 * Math.pow(2, msg.attempts)
        });
      }
    } else {
      // Success (ACK)
      msg.status = 'acked';
      worker.processedCount++;
      store.metrics.mqConsumed++;

      this.removeFromQueue(topic, msg.id);
      this.history.unshift({
        ...msg,
        processedBy: worker.name,
        completedAt: new Date().toISOString()
      });
      if (this.history.length > 50) this.history.pop();

      // Emit notification to frontend clients
      eventStream.broadcast('notification_delivered', {
        id: msg.id,
        topic: msg.topic,
        title: msg.payload?.title || 'Notification',
        body: msg.payload?.body || 'Task updated successfully',
        type: msg.payload?.type || 'info',
        worker: worker.name,
        timestamp: new Date().toISOString()
      });
    }

    worker.status = 'idle';
    worker.currentJob = null;
  }

  removeFromQueue(topic, msgId) {
    if (!this.queues[topic]) return;
    const idx = this.queues[topic].findIndex(m => m.id === msgId);
    if (idx !== -1) {
      this.queues[topic].splice(idx, 1);
    }
  }

  getQueueDepth() {
    let total = 0;
    for (const items of Object.values(this.queues)) {
      total += items.filter(m => m.status === 'pending').length;
    }
    return total;
  }

  getStatus() {
    return {
      queues: {
        'task.notifications': {
          pending: this.queues['task.notifications'].filter(m => m.status === 'pending').length,
          inFlight: this.queues['task.notifications'].filter(m => m.status === 'in_flight').length
        },
        'team.alerts': {
          pending: this.queues['team.alerts'].filter(m => m.status === 'pending').length,
          inFlight: this.queues['team.alerts'].filter(m => m.status === 'in_flight').length
        }
      },
      workers: this.workers.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        processed: w.processedCount,
        failed: w.failedCount,
        currentJob: w.currentJob
      })),
      dlqCount: this.dlq.length,
      dlqItems: this.dlq.slice(0, 10),
      recentHistory: this.history.slice(0, 10)
    };
  }

  reprocessDlqItem(messageId) {
    const idx = this.dlq.findIndex(m => m.id === messageId);
    if (idx === -1) return false;
    const [item] = this.dlq.splice(idx, 1);
    item.attempts = 0;
    item.status = 'pending';
    item.error = null;
    this.queues[item.topic].push(item);
    store.metrics.mqDlqCount = this.dlq.length;
    return true;
  }
}

const messageBroker = new MessageBroker();
module.exports = messageBroker;

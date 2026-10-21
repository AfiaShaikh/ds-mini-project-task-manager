// Live Task Updates via Server-Sent Events (SSE) Client

class StreamClient {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.status = 'disconnected';
    this.statusListeners = new Set();
    this.recentEvents = [];
    this.reconnectTimer = null;
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  setStatus(newStatus) {
    this.status = newStatus;
    for (const cb of this.statusListeners) {
      cb(newStatus);
    }
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) set.delete(callback);
    };
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.setStatus('connecting');

    try {
      this.eventSource = new EventSource('/api/stream/events');

      this.eventSource.onopen = () => {
        this.setStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.onerror = (err) => {
        this.setStatus('reconnecting');
        // Browser automatically attempts SSE reconnection
      };

      const eventNames = [
        'connected',
        'heartbeat',
        'task_created',
        'task_updated',
        'task_deleted',
        'notification_delivered',
        'queue_published',
        'worker_started',
        'queue_dlq',
        'queue_retry',
        'fault_config_changed'
      ];

      eventNames.forEach(name => {
        this.eventSource.addEventListener(name, (e) => {
          try {
            const data = JSON.parse(e.data);
            const eventObj = {
              id: e.lastEventId || Date.now(),
              type: name,
              data,
              timestamp: new Date().toISOString()
            };

            this.recentEvents.unshift(eventObj);
            if (this.recentEvents.length > 50) this.recentEvents.pop();

            const cbs = this.listeners.get(name);
            if (cbs) {
              for (const cb of cbs) cb(data, eventObj);
            }

            // Universal listener
            const allCbs = this.listeners.get('*');
            if (allCbs) {
              for (const cb of allCbs) cb(name, data, eventObj);
            }
          } catch (err) {
            console.error('Failed to parse SSE event payload:', err);
          }
        });
      });

    } catch (err) {
      this.setStatus('error');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus('disconnected');
  }

  getRecentEvents() {
    return [...this.recentEvents];
  }
}

export const streamClient = new StreamClient();

// In-memory data store with atomic transactions, versioning, and initial seed data matching the UI screenshot

const initialUsers = [
  { id: 'u1', name: 'Ava Vance', role: 'Product Lead', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', color: '#6366f1' },
  { id: 'u2', name: 'Sarah Chen', role: 'Frontend Architect', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80', color: '#ec4899' },
  { id: 'u3', name: 'Leo Rodriguez', role: 'Distributed Systems Engineer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', color: '#3b82f6' },
  { id: 'u4', name: 'Elena Rostova', role: 'UX Researcher', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', color: '#8b5cf6' },
  { id: 'u5', name: 'Marcus Brody', role: 'DevOps & QA', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', color: '#10b981' }
];

const initialTasks = [
  {
    id: 'task-101',
    title: 'Create Landing Page Wireframe',
    description: 'Design the initial wireframe of the landing page to improve user engagement and conversion.',
    category: 'Design',
    status: 'pending',
    progress: 0,
    assignees: [initialUsers[0], initialUsers[1], initialUsers[2]],
    startDate: 'Apr 20',
    dueDate: 'May 10 \'25',
    priority: 'high',
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'task-102',
    title: 'Update Brand Guidelines',
    description: 'Revise the visual identity guide to match the latest rebranding strategy.',
    category: 'Development',
    status: 'pending',
    progress: 0,
    assignees: [initialUsers[2], initialUsers[3]],
    startDate: 'Apr 22',
    dueDate: 'May 12 \'25',
    priority: 'medium',
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'task-103',
    title: 'User Persona Research',
    description: 'Collect insights from surveys and interviews to define key user profiles.',
    category: 'Research',
    status: 'todo',
    progress: 32,
    assignees: [initialUsers[3], initialUsers[4], initialUsers[0]],
    startDate: 'Apr 18',
    dueDate: 'May 15 \'25',
    priority: 'high',
    version: 3,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    id: 'task-104',
    title: 'Conduct Competitor Analysis',
    description: 'Review 5 competing apps and create a summary of strengths and weaknesses.',
    category: 'Documentation',
    status: 'todo',
    progress: 12,
    assignees: [initialUsers[0], initialUsers[3], initialUsers[4], initialUsers[1]],
    startDate: 'Apr 17',
    dueDate: 'May 15 \'25',
    priority: 'medium',
    version: 2,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'task-105',
    title: 'Test Responsive Navigation Bar',
    description: 'Test a navigation bar that adapts across desktop, tablet, and mobile screens.',
    category: 'Testing',
    status: 'doing',
    progress: 67,
    assignees: [initialUsers[1], initialUsers[2], initialUsers[4]],
    startDate: 'Apr 19',
    dueDate: 'May 13 \'25',
    priority: 'urgent',
    version: 5,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'task-106',
    title: 'Initialize Git Repository',
    description: 'Set up the project structure and initial commits in the GitHub repository.',
    category: 'Design',
    status: 'done',
    progress: 100,
    assignees: [initialUsers[4], initialUsers[1]],
    startDate: 'Apr 12',
    dueDate: 'Apr 13 \'25',
    priority: 'low',
    version: 4,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 8).toISOString()
  }
];

class Store {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = JSON.parse(JSON.stringify(initialUsers));
    this.tasks = JSON.parse(JSON.stringify(initialTasks));
    this.idempotencyCache = new Map(); // idempotencyKey -> result
    this.auditLog = [];
    this.metrics = {
      rpcCallsTotal: 0,
      rpcSuccess: 0,
      rpcFailed: 0,
      rpcRetried: 0,
      totalLatencyMs: 0,
      mqPublished: 0,
      mqConsumed: 0,
      mqRetried: 0,
      mqDlqCount: 0,
      sseActiveConnections: 0,
      p2pPeersOnline: 0,
      p2pMessagesSent: 0
    };
  }

  // Idempotent operation check
  checkIdempotency(key) {
    if (!key) return null;
    return this.idempotencyCache.get(key) || null;
  }

  recordIdempotency(key, result) {
    if (!key) return;
    this.idempotencyCache.set(key, result);
    // Keep cache under 500 entries
    if (this.idempotencyCache.size > 500) {
      const firstKey = this.idempotencyCache.keys().next().value;
      this.idempotencyCache.delete(firstKey);
    }
  }

  getTasks() {
    return this.tasks;
  }

  getTaskById(id) {
    return this.tasks.find(t => t.id === id);
  }

  createTask(taskData) {
    const id = taskData.id || `task-${Date.now().toString(36)}`;
    const newTask = {
      id,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      category: taskData.category || 'Design',
      status: taskData.status || 'pending',
      progress: Number(taskData.progress) || 0,
      assignees: taskData.assignees || [this.users[0]],
      startDate: taskData.startDate || 'Today',
      dueDate: taskData.dueDate || 'Next week',
      priority: taskData.priority || 'medium',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tasks.push(newTask);
    this.addAudit('CREATE_TASK', `Created task "${newTask.title}" via RPC`, newTask);
    return newTask;
  }

  updateTask(id, updates) {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${id} not found`);
    }

    const current = this.tasks[taskIndex];
    // Optimistic Concurrency check if expectedVersion provided
    if (updates.expectedVersion !== undefined && updates.expectedVersion !== current.version) {
      throw new Error(`Conflict: Task was modified by another peer (expected v${updates.expectedVersion}, found v${current.version})`);
    }

    const updated = {
      ...current,
      ...updates,
      version: current.version + 1,
      updatedAt: new Date().toISOString()
    };
    delete updated.expectedVersion;

    this.tasks[taskIndex] = updated;
    this.addAudit('UPDATE_TASK', `Updated task "${updated.title}" via RPC`, updated);
    return updated;
  }

  deleteTask(id) {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${id} not found`);
    }
    const [deleted] = this.tasks.splice(taskIndex, 1);
    this.addAudit('DELETE_TASK', `Deleted task "${deleted.title}" via RPC`, deleted);
    return deleted;
  }

  getUsers() {
    return this.users;
  }

  addAudit(action, summary, payload = null) {
    const entry = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      action,
      summary,
      payload
    };
    this.auditLog.unshift(entry);
    if (this.auditLog.length > 200) {
      this.auditLog.pop();
    }
    return entry;
  }

  getAuditLog(limit = 50) {
    return this.auditLog.slice(0, limit);
  }

  getMetrics() {
    return {
      ...this.metrics,
      tasksTotal: this.tasks.length,
      tasksPending: this.tasks.filter(t => t.status === 'pending').length,
      tasksTodo: this.tasks.filter(t => t.status === 'todo').length,
      tasksDoing: this.tasks.filter(t => t.status === 'doing').length,
      tasksDone: this.tasks.filter(t => t.status === 'done').length,
      avgRpcLatency: this.metrics.rpcCallsTotal > 0
        ? Math.round(this.metrics.totalLatencyMs / this.metrics.rpcCallsTotal)
        : 0
    };
  }
}

const store = new Store();
module.exports = store;

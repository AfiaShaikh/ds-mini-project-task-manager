// RPC Service Implementation for Tasks
// Implements business logic invoked by RPC procedures

const store = require('../db/store');
const messageBroker = require('../queue/messageBroker');
const eventStream = require('../streaming/eventStream');

class TaskService {
  async createTask(params) {
    if (!params.title || !params.title.trim()) {
      const err = new Error('Task title is required');
      err.code = -32602; // Invalid params
      throw err;
    }

    const task = store.createTask({
      title: params.title.trim(),
      description: params.description || '',
      category: params.category || 'Design',
      status: params.status || 'pending',
      progress: params.progress || 0,
      assignees: params.assignees || [store.users[0]],
      startDate: params.startDate || 'Today',
      dueDate: params.dueDate || 'Next week',
      priority: params.priority || 'medium'
    });

    // 1. Asynchronously publish notification via Message Queue
    messageBroker.publish('task.notifications', {
      action: 'TASK_CREATED',
      title: 'New Task Created',
      body: `"${task.title}" was created in ${task.category}`,
      taskId: task.id,
      type: 'info'
    });

    // 2. Broadcast live update to streaming subscribers
    eventStream.broadcast('task_created', { task });

    return { success: true, task };
  }

  async assignTask(params) {
    const { taskId, userIds } = params;
    if (!taskId || !Array.isArray(userIds)) {
      const err = new Error('taskId and userIds array are required');
      err.code = -32602;
      throw err;
    }

    const users = store.users.filter(u => userIds.includes(u.id));
    const updated = store.updateTask(taskId, {
      assignees: users,
      expectedVersion: params.expectedVersion
    });

    // Publish to Message Queue
    const userNames = users.map(u => u.name).join(', ') || 'unassigned';
    messageBroker.publish('task.notifications', {
      action: 'TASK_ASSIGNED',
      title: 'Task Assignment Updated',
      body: `"${updated.title}" assigned to ${userNames}`,
      taskId: updated.id,
      type: 'success'
    });

    // Broadcast live update
    eventStream.broadcast('task_updated', { task: updated });

    return { success: true, task: updated };
  }

  async updateProgress(params) {
    const { taskId, progress } = params;
    if (!taskId || progress === undefined) {
      const err = new Error('taskId and progress (0-100) are required');
      err.code = -32602;
      throw err;
    }

    const progNum = Math.min(100, Math.max(0, Number(progress)));
    let statusUpdate = {};
    if (progNum === 100) {
      statusUpdate.status = 'done';
    } else if (progNum > 0) {
      const current = store.getTaskById(taskId);
      if (current && current.status === 'pending') {
        statusUpdate.status = 'doing';
      }
    }

    const updated = store.updateTask(taskId, {
      progress: progNum,
      ...statusUpdate,
      expectedVersion: params.expectedVersion
    });

    // Queue notification if completed
    if (progNum === 100) {
      messageBroker.publish('task.notifications', {
        action: 'TASK_COMPLETED',
        title: 'Task Completed! 🚀',
        body: `"${updated.title}" has reached 100% completion`,
        taskId: updated.id,
        type: 'celebration'
      });
    }

    eventStream.broadcast('task_updated', { task: updated });
    return { success: true, task: updated };
  }

  async updateStatus(params) {
    const { taskId, status } = params;
    const validStatuses = ['pending', 'todo', 'doing', 'done'];
    if (!taskId || !validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.code = -32602;
      throw err;
    }

    let progressUpdate = {};
    if (status === 'done') {
      progressUpdate.progress = 100;
    }

    const updated = store.updateTask(taskId, {
      status,
      ...progressUpdate,
      expectedVersion: params.expectedVersion
    });

    messageBroker.publish('task.notifications', {
      action: 'STATUS_CHANGED',
      title: 'Status Updated',
      body: `"${updated.title}" moved to ${status.toUpperCase()}`,
      taskId: updated.id,
      type: 'info'
    });

    eventStream.broadcast('task_updated', { task: updated });
    return { success: true, task: updated };
  }

  async deleteTask(params) {
    const { taskId } = params;
    if (!taskId) {
      const err = new Error('taskId is required');
      err.code = -32602;
      throw err;
    }

    const deleted = store.deleteTask(taskId);

    messageBroker.publish('task.notifications', {
      action: 'TASK_DELETED',
      title: 'Task Deleted',
      body: `"${deleted.title}" was removed`,
      taskId: deleted.id,
      type: 'warning'
    });

    eventStream.broadcast('task_deleted', { taskId });
    return { success: true, deletedTaskId: taskId };
  }

  async batchAssign(params) {
    const { taskIds, userId } = params;
    if (!Array.isArray(taskIds) || !userId) {
      const err = new Error('taskIds array and userId are required');
      err.code = -32602;
      throw err;
    }

    const user = store.users.find(u => u.id === userId);
    if (!user) throw new Error(`User with ID ${userId} not found`);

    const results = [];
    for (const id of taskIds) {
      const task = store.getTaskById(id);
      if (task) {
        const hasUser = task.assignees.some(u => u.id === userId);
        if (!hasUser) {
          const updated = store.updateTask(id, {
            assignees: [...task.assignees, user]
          });
          results.push(updated);
          eventStream.broadcast('task_updated', { task: updated });
        }
      }
    }

    messageBroker.publish('task.notifications', {
      action: 'BATCH_ASSIGN',
      title: 'Batch Assignment',
      body: `Assigned ${user.name} to ${results.length} tasks`,
      type: 'success'
    });

    return { success: true, updatedCount: results.length, tasks: results };
  }
}

module.exports = new TaskService();

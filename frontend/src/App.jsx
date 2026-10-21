import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import KanbanBoard from './components/KanbanBoard';
import TaskModal from './components/TaskModal';
import DistributedMonitor from './components/DistributedMonitor';
import P2PChatModal from './components/P2PChatModal';
import NotificationsToast from './components/NotificationsToast';
import { rpcClient } from './lib/rpcClient';
import { streamClient } from './lib/streamClient';
import { p2pMesh } from './lib/p2pMesh';
import { CheckCircle2, Clock, Calendar, MoreHorizontal, User } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('Board');
  const [activeNav, setActiveNav] = useState('my-tasks');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('pending');
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [isP2PChatOpen, setIsP2PChatOpen] = useState(false);

  // Distributed Telemetry Logs
  const [rpcLogs, setRpcLogs] = useState([]);
  const [streamLogs, setStreamLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Initial Data Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [taskRes, userRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/users')
        ]);
        if (taskRes.ok) {
          const tData = await taskRes.json();
          setTasks(tData.tasks || []);
        }
        if (userRes.ok) {
          const uData = await userRes.json();
          setUsers(uData.users || []);
        }
      } catch (err) {
        console.error('Initial data fetch failed:', err);
      }
    };

    fetchInitialData();
  }, []);

  // Connect Real-time SSE Stream & P2P Swarm
  useEffect(() => {
    // 1. Connect SSE Live Stream
    streamClient.connect();

    // 2. Connect P2P WebRTC mesh with primary user
    p2pMesh.connect({
      id: 'u1',
      name: 'Ava Vance',
      role: 'Product Lead',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
    });

    // 3. Listen for streaming events
    const unsubCreated = streamClient.subscribe('task_created', (data, eventObj) => {
      setStreamLogs(prev => [eventObj, ...prev]);
      if (data.task) {
        setTasks(prev => {
          if (prev.some(t => t.id === data.task.id)) return prev;
          return [data.task, ...prev];
        });
      }
    });

    const unsubUpdated = streamClient.subscribe('task_updated', (data, eventObj) => {
      setStreamLogs(prev => [eventObj, ...prev]);
      if (data.task) {
        setTasks(prev => prev.map(t => (t.id === data.task.id ? data.task : t)));
      }
    });

    const unsubDeleted = streamClient.subscribe('task_deleted', (data, eventObj) => {
      setStreamLogs(prev => [eventObj, ...prev]);
      if (data.taskId) {
        setTasks(prev => prev.filter(t => t.id !== data.taskId));
      }
    });

    // Message Queue Notifications
    const unsubNotif = streamClient.subscribe('notification_delivered', (data, eventObj) => {
      setStreamLogs(prev => [eventObj, ...prev]);
      setToasts(prev => [
        {
          id: data.id || `toast-${Date.now()}`,
          title: data.title,
          body: data.body,
          worker: data.worker,
          type: data.type
        },
        ...prev
      ]);
    });

    // RPC Telemetry Listener
    const unsubRpc = rpcClient.onTelemetry((telemetry) => {
      setRpcLogs(prev => [telemetry, ...prev.slice(0, 99)]);
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubNotif();
      unsubRpc();
      streamClient.disconnect();
    };
  }, []);

  // -------------------------------------------------------------
  // RPC Handlers with Fault-Tolerant Client
  // -------------------------------------------------------------
  const handleCreateTask = async (taskData) => {
    return await rpcClient.call('TaskService.CreateTask', taskData);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      await rpcClient.call('TaskService.UpdateStatus', {
        taskId,
        status: newStatus,
        expectedVersion: task?.version
      });
    } catch (err) {
      alert(`RPC Update Status failed: ${err.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleProgressChange = async (taskId, progress) => {
    setUpdatingTaskId(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      await rpcClient.call('TaskService.UpdateProgress', {
        taskId,
        progress,
        expectedVersion: task?.version
      });
    } catch (err) {
      alert(`RPC Update Progress failed: ${err.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task via RPC?')) return;
    try {
      await rpcClient.call('TaskService.DeleteTask', { taskId });
    } catch (err) {
      alert(`RPC Delete failed: ${err.message}`);
    }
  };

  const handleDismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const openNewTaskModal = (status = 'pending') => {
    setNewTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  return (
    <div style={styles.appLayout}>
      {/* Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onOpenMonitor={() => setIsMonitorOpen(true)}
        clusterStatus={{ unreadCount: toasts.length }}
      />

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Top Header & Navigation */}
        <TopNav
          users={users}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenNewTask={() => openNewTaskModal('pending')}
          onOpenMonitor={() => setIsMonitorOpen(true)}
          onOpenP2PChat={() => setIsP2PChatOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          taskCount={tasks.length}
        />

        {/* View Content */}
        {activeTab === 'Board' && (
          <KanbanBoard
            tasks={tasks}
            onOpenNewTask={openNewTaskModal}
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
            onDeleteTask={handleDeleteTask}
            updatingTaskId={updatingTaskId}
            categoryFilter={categoryFilter}
            searchQuery={searchQuery}
          />
        )}

        {/* List View */}
        {activeTab === 'List' && (
          <div style={styles.listViewContainer}>
            <div style={styles.listCard}>
              <table style={styles.listTable}>
                <thead>
                  <tr>
                    <th style={styles.listTh}>Task</th>
                    <th style={styles.listTh}>Category</th>
                    <th style={styles.listTh}>Status</th>
                    <th style={styles.listTh}>Progress</th>
                    <th style={styles.listTh}>Assignees</th>
                    <th style={styles.listTh}>Due Date</th>
                    <th style={styles.listTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id} style={styles.listTr}>
                      <td style={styles.listTdTitle}>
                        <div style={styles.listTaskTitle}>{t.title}</div>
                        <div style={styles.listTaskDesc}>{t.description}</div>
                      </td>
                      <td style={styles.listTd}>
                        <span style={styles.listCatBadge}>{t.category}</span>
                      </td>
                      <td style={styles.listTd}>
                        <span style={styles.listStatusBadge}>{t.status.toUpperCase()}</span>
                      </td>
                      <td style={styles.listTd}>
                        <div style={styles.listProgressWrap}>
                          <span style={styles.listProgressVal}>{t.progress}%</span>
                          <div style={styles.listProgressBar}>
                            <div style={{ ...styles.listProgressFill, width: `${t.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td style={styles.listTd}>
                        <div style={styles.listAvatarStack}>
                          {(t.assignees || []).map((u, i) => (
                            <img
                              key={u.id || i}
                              src={u.avatar}
                              alt={u.name}
                              title={u.name}
                              style={{ ...styles.listAvatar, marginLeft: i > 0 ? '-6px' : '0' }}
                            />
                          ))}
                        </div>
                      </td>
                      <td style={styles.listTd}>{t.dueDate}</td>
                      <td style={styles.listTd}>
                        <button
                          style={styles.listActionBtn}
                          onClick={() => handleProgressChange(t.id, Math.min(100, (t.progress || 0) + 25))}
                        >
                          +25%
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'Overview' && (
          <div style={styles.overviewContainer}>
            <div style={styles.overviewHeader}>
              <h2 style={styles.overviewTitle}>Project Distributed Health &amp; Workload</h2>
              <p style={styles.overviewDesc}>Real-time synchronization across peer nodes, workers, and active streams.</p>
            </div>

            <div style={styles.statsCardsRow}>
              <div style={styles.statSummaryCard}>
                <span style={styles.sumLabel}>Active Tasks</span>
                <span style={styles.sumVal}>{tasks.length}</span>
                <span style={styles.sumSub}>{tasks.filter(t => t.status === 'done').length} Completed</span>
              </div>
              <div style={styles.statSummaryCard}>
                <span style={styles.sumLabel}>Team Members (Swarm)</span>
                <span style={styles.sumVal}>{users.length}</span>
                <span style={styles.sumSub}>WebRTC Mesh Ready</span>
              </div>
              <div style={styles.statSummaryCard}>
                <span style={styles.sumLabel}>RPC Idempotency Cache</span>
                <span style={styles.sumVal}>Active</span>
                <span style={styles.sumSub}>Safe Against Duplicate Requests</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        users={users}
        defaultStatus={newTaskStatus}
      />

      {/* Distributed Architecture & Chaos Lab Modal */}
      <DistributedMonitor
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
        rpcLogs={rpcLogs}
        streamLogs={streamLogs}
      />

      {/* Direct P2P Team Chat Modal */}
      <P2PChatModal
        isOpen={isP2PChatOpen}
        onClose={() => setIsP2PChatOpen(false)}
        currentUser={users[0]}
        users={users}
      />

      {/* Real-time Message Queue Notification Toasts */}
      <NotificationsToast
        notifications={toasts}
        onDismiss={handleDismissToast}
      />
    </div>
  );
}

const styles = {
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflowY: 'auto'
  },
  listViewContainer: {
    padding: '24px 28px'
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  listTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  listTh: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontWeight: 600,
    borderBottom: '1px solid #e2e8f0'
  },
  listTr: {
    borderBottom: '1px solid #f1f5f9'
  },
  listTdTitle: {
    padding: '12px 16px'
  },
  listTaskTitle: {
    fontWeight: 700,
    color: '#0f172a'
  },
  listTaskDesc: {
    fontSize: '11.5px',
    color: '#64748b',
    marginTop: '2px'
  },
  listTd: {
    padding: '12px 16px',
    color: '#334155'
  },
  listCatBadge: {
    backgroundColor: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569'
  },
  listStatusBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10.5px',
    fontWeight: 700
  },
  listProgressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  listProgressVal: {
    fontSize: '11.5px',
    fontWeight: 700
  },
  listProgressBar: {
    width: '70px',
    height: '5px',
    backgroundColor: '#e2e8f0',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  listProgressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: '999px'
  },
  listAvatarStack: {
    display: 'flex',
    alignItems: 'center'
  },
  listAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    objectFit: 'cover'
  },
  listActionBtn: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  overviewContainer: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  overviewHeader: {
    marginBottom: '8px'
  },
  overviewTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a'
  },
  overviewDesc: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px'
  },
  statsCardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  statSummaryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column'
  },
  sumLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b'
  },
  sumVal: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '6px 0 2px 0'
  },
  sumSub: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: 500
  }
};

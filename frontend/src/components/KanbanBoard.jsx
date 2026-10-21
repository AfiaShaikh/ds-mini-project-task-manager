import React from 'react';
import { Plus, AlertTriangle, ShieldCheck } from 'lucide-react';
import TaskCard from './TaskCard';

export default function KanbanBoard({
  tasks = [],
  onOpenNewTask,
  onStatusChange,
  onProgressChange,
  onDeleteTask,
  updatingTaskId,
  categoryFilter,
  searchQuery
}) {
  const columns = [
    {
      id: 'pending',
      title: 'Pending',
      dotColor: '#94a3b8'
    },
    {
      id: 'todo',
      title: 'To do',
      dotColor: '#3b82f6'
    },
    {
      id: 'doing',
      title: 'Doing',
      dotColor: '#f59e0b'
    },
    {
      id: 'done',
      title: 'Done',
      dotColor: '#10b981'
    }
  ];

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (categoryFilter !== 'ALL' && task.category !== categoryFilter) {
      return false;
    }
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }
    return true;
  });

  return (
    <div style={styles.boardContainer}>
      {/* Trial / Distributed Health Banner matching screenshot */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
          <AlertTriangle size={15} color="#4f46e5" />
          <span style={styles.bannerText}>
            <strong>Your free trial ends in 30 days!</strong> Enjoy uninterrupted access.{' '}
            <a href="#trial" style={styles.bannerLink}>Subscribe now</a> and keep going!
          </span>
        </div>
        <div style={styles.bannerRight}>
          <span style={styles.clusterTag}>
            <ShieldCheck size={13} color="#10b981" />
            <span>Fault Tolerance: Auto-Retry Active</span>
          </span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div style={styles.columnsGrid}>
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div key={col.id} style={styles.columnWrapper}>
              {/* Column Header */}
              <div style={styles.columnHeader}>
                <div style={styles.columnTitleGroup}>
                  <span
                    style={{
                      ...styles.columnDot,
                      backgroundColor: col.dotColor
                    }}
                  />
                  <h2 style={styles.columnTitle}>{col.title}</h2>
                </div>
                <span style={styles.columnCount}>{colTasks.length}</span>
              </div>

              {/* Add New Task Button */}
              <button
                style={styles.addTaskBtn}
                onClick={() => onOpenNewTask(col.id)}
              >
                <Plus size={14} color="#64748b" />
                <span>Add new task</span>
              </button>

              {/* Cards List */}
              <div style={styles.cardsList}>
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={onStatusChange}
                    onProgressChange={onProgressChange}
                    onDelete={onDeleteTask}
                    isUpdating={updatingTaskId === task.id}
                  />
                ))}

                {colTasks.length === 0 && (
                  <div style={styles.emptyDropZone}>
                    <span>No tasks in {col.title.toLowerCase()}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  boardContainer: {
    padding: '20px 28px 40px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  banner: {
    backgroundColor: '#eef2ff',
    border: '1px solid #e0e7ff',
    borderRadius: '10px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#3730a3'
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  bannerText: {
    color: '#3730a3'
  },
  bannerLink: {
    color: '#4f46e5',
    fontWeight: 600,
    textDecoration: 'underline'
  },
  bannerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  clusterTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #c7d2fe',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#1e1b4b'
  },
  columnsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(270px, 1fr))',
    gap: '20px',
    alignItems: 'start'
  },
  columnWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '14px',
    border: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 4px'
  },
  columnTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  columnDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  columnTitle: {
    fontSize: '14.5px',
    fontWeight: 700,
    color: '#1e293b'
  },
  columnCount: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748b',
    backgroundColor: '#ffffff',
    padding: '2px 8px',
    borderRadius: '999px',
    border: '1px solid #e2e8f0'
  },
  addTaskBtn: {
    backgroundColor: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '10px',
    padding: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: '#475569',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minHeight: '220px'
  },
  emptyDropZone: {
    border: '1px dashed #e2e8f0',
    borderRadius: '10px',
    padding: '30px 10px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '12px'
  }
};

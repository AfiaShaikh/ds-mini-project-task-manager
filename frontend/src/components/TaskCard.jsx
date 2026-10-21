import React, { useState } from 'react';
import {
  PenTool,
  Search,
  CheckCircle,
  FileText,
  Code2,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

export default function TaskCard({
  task,
  onStatusChange,
  onProgressChange,
  onDelete,
  isUpdating
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Category badge config matching screenshot
  const categoryStyles = {
    Design: {
      bg: '#fff7ed',
      border: '#ffedd5',
      color: '#ea580c',
      icon: <PenTool size={12} color="#ea580c" />
    },
    Research: {
      bg: '#f0f9ff',
      border: '#e0f2fe',
      color: '#0284c7',
      icon: <Search size={12} color="#0284c7" />
    },
    Testing: {
      bg: '#fff1f2',
      border: '#ffe4e6',
      color: '#e11d48',
      icon: <CheckCircle size={12} color="#e11d48" />
    },
    Documentation: {
      bg: '#faf5ff',
      border: '#f3e8ff',
      color: '#9333ea',
      icon: <FileText size={12} color="#9333ea" />
    },
    Development: {
      bg: '#f0fdf4',
      border: '#dcfce7',
      color: '#16a34a',
      icon: <Code2 size={12} color="#16a34a" />
    }
  };

  const currentCat = categoryStyles[task.category] || categoryStyles.Design;

  const nextStatusMap = {
    pending: 'todo',
    todo: 'doing',
    doing: 'done',
    done: 'pending'
  };

  const prevStatusMap = {
    done: 'doing',
    doing: 'todo',
    todo: 'pending',
    pending: 'done'
  };

  return (
    <div
      style={{
        ...styles.card,
        opacity: isUpdating ? 0.7 : 1
      }}
    >
      {/* Top Category Badge & Actions */}
      <div style={styles.cardHeader}>
        <div
          style={{
            ...styles.categoryBadge,
            backgroundColor: currentCat.bg,
            borderColor: currentCat.border,
            color: currentCat.color
          }}
        >
          {currentCat.icon}
          <span>{task.category}</span>
        </div>

        <div style={styles.headerRight}>
          {/* Logical Version Clock badge */}
          <span style={styles.versionBadge} title="Distributed version (logical vector clock)">
            v{task.version || 1}
          </span>

          <button
            style={styles.moreBtn}
            onClick={() => setShowMenu(!showMenu)}
            title="Task options"
          >
            <MoreHorizontal size={15} color="#94a3b8" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div style={styles.dropdownMenu}>
          <button
            style={styles.menuItem}
            onClick={() => {
              setShowMenu(false);
              onProgressChange(task.id, Math.min(100, (task.progress || 0) + 25));
            }}
          >
            <ArrowUpRight size={13} color="#2563eb" />
            <span>Increase Progress (+25%)</span>
          </button>
          <button
            style={styles.menuItem}
            onClick={() => {
              setShowMenu(false);
              onStatusChange(task.id, nextStatusMap[task.status]);
            }}
          >
            <ChevronRight size={13} color="#10b981" />
            <span>Move to Next Column</span>
          </button>
          <button
            style={{ ...styles.menuItem, color: '#ef4444' }}
            onClick={() => {
              setShowMenu(false);
              onDelete(task.id);
            }}
          >
            <span>Delete Task via RPC</span>
          </button>
        </div>
      )}

      {/* Title & Description */}
      <h3 style={styles.title}>{task.title}</h3>
      <p style={styles.description}>{task.description}</p>

      {/* Progress Section */}
      <div style={styles.progressContainer}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Progress</span>
          <span style={styles.progressValue}>{task.progress || 0}%</span>
        </div>
        <div style={styles.progressBarTrack}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${task.progress || 0}%`,
              backgroundColor: task.progress === 100 ? '#10b981' : '#2563eb'
            }}
          />
        </div>
      </div>

      {/* Card Footer: Assignees & Date Span */}
      <div style={styles.cardFooter}>
        <div style={styles.assigneeStack}>
          {(task.assignees || []).slice(0, 2).map((assignee, idx) => (
            <img
              key={assignee.id || idx}
              src={assignee.avatar}
              alt={assignee.name}
              title={`${assignee.name} (${assignee.role})`}
              style={{
                ...styles.assigneeAvatar,
                marginLeft: idx > 0 ? '-6px' : '0',
                zIndex: 2 - idx
              }}
            />
          ))}
          {(task.assignees?.length || 0) > 2 && (
            <div style={styles.assigneeMore}>
              +{(task.assignees?.length || 0) - 1}
            </div>
          )}
        </div>

        {/* Date Span */}
        <div style={styles.dateSpan}>
          <Calendar size={12} color="#94a3b8" />
          <span>{task.startDate} – {task.dueDate}</span>
        </div>

        {/* Quick Column Shift Buttons */}
        <div style={styles.quickShift}>
          <button
            style={styles.shiftBtn}
            onClick={() => onStatusChange(task.id, prevStatusMap[task.status])}
            title="Move back"
          >
            <ChevronLeft size={13} color="#64748b" />
          </button>
          <button
            style={styles.shiftBtn}
            onClick={() => onStatusChange(task.id, nextStatusMap[task.status])}
            title="Advance task via RPC"
          >
            <ChevronRight size={13} color="#64748b" />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02), 0 2px 8px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: 600,
    border: '1px solid transparent'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  versionBadge: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    padding: '1px 5px',
    borderRadius: '4px'
  },
  moreBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  dropdownMenu: {
    position: 'absolute',
    top: '40px',
    right: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    zIndex: 30,
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '180px'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#334155',
    textAlign: 'left',
    transition: 'background-color 0.1s ease'
  },
  title: {
    fontSize: '14.5px',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: '1.35',
    marginBottom: '6px'
  },
  description: {
    fontSize: '12.5px',
    color: '#64748b',
    lineHeight: '1.45',
    marginBottom: '14px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  progressContainer: {
    marginBottom: '14px'
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '5px'
  },
  progressLabel: {
    fontSize: '11.5px',
    color: '#64748b',
    fontWeight: 500
  },
  progressValue: {
    fontSize: '11.5px',
    color: '#0f172a',
    fontWeight: 700
  },
  progressBarTrack: {
    width: '100%',
    height: '5px',
    backgroundColor: '#f1f5f9',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.4s ease, background-color 0.3s ease'
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '6px',
    borderTop: '1px solid #f8fafc'
  },
  assigneeStack: {
    display: 'flex',
    alignItems: 'center'
  },
  assigneeAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    objectFit: 'cover'
  },
  assigneeMore: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    fontSize: '9.5px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff',
    marginLeft: '-6px',
    zIndex: 0
  },
  dateSpan: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 500
  },
  quickShift: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  shiftBtn: {
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
  }
};

import React, { useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, X, Radio } from 'lucide-react';

export default function NotificationsToast({ notifications = [], onDismiss }) {
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    const timer = setTimeout(() => {
      onDismiss(latest.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notifications, onDismiss]);

  if (notifications.length === 0) return null;

  return (
    <div style={styles.container}>
      {notifications.slice(0, 3).map((item) => (
        <div key={item.id} style={styles.toast} className="animate-fade-in">
          <div style={styles.iconCol}>
            {item.type === 'celebration' ? (
              <CheckCircle2 size={18} color="#10b981" />
            ) : item.type === 'warning' ? (
              <AlertCircle size={18} color="#f59e0b" />
            ) : (
              <Bell size={18} color="#2563eb" />
            )}
          </div>
          <div style={styles.contentCol}>
            <div style={styles.titleRow}>
              <span style={styles.title}>{item.title}</span>
              <span style={styles.workerBadge}>Worker: {item.worker || 'Alpha'}</span>
            </div>
            <p style={styles.body}>{item.body}</p>
          </div>
          <button style={styles.dismissBtn} onClick={() => onDismiss(item.id)}>
            <X size={14} color="#94a3b8" />
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '28px',
    zIndex: 90,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '380px',
    pointerEvents: 'none'
  },
  toast: {
    pointerEvents: 'auto',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  iconCol: {
    paddingTop: '2px'
  },
  contentCol: {
    flex: 1
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px'
  },
  title: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a'
  },
  workerBadge: {
    fontSize: '9.5px',
    fontWeight: 600,
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    padding: '1px 6px',
    borderRadius: '4px'
  },
  body: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.4'
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px'
  }
};

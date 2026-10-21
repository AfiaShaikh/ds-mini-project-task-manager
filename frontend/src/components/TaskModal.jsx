import React, { useState } from 'react';
import { X, Check, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  users = [],
  defaultStatus = 'pending'
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Design');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState('medium');
  const [selectedUserIds, setSelectedUserIds] = useState(['u1', 'u2']);
  const [startDate, setStartDate] = useState('Apr 20');
  const [dueDate, setDueDate] = useState("May 10 '25");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Task title cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const assignees = users.filter((u) => selectedUserIds.includes(u.id));

    try {
      await onSubmit({
        title,
        description,
        category,
        status,
        priority,
        assignees,
        startDate,
        dueDate,
        progress: status === 'done' ? 100 : 0
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'RPC invocation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length > 1) {
        setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
      }
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard} className="animate-fade-in">
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={styles.titleGroup}>
            <div style={styles.iconBadge}>
              <Sparkles size={16} color="#2563eb" />
            </div>
            <div>
              <h2 style={styles.modalTitle}>Create New Task via RPC</h2>
              <p style={styles.modalSub}>
                Dispatched using JSON-RPC 2.0 with Idempotency Key &amp; Automated Retries
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertCircle size={15} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Task Title</label>
            <input
              type="text"
              placeholder="e.g. Create Landing Page Wireframe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.textInput}
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              placeholder="Detailed objectives, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...styles.textInput, height: '70px', resize: 'none' }}
            />
          </div>

          {/* Category & Status Row */}
          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.selectInput}
              >
                <option value="Design">Design (Orange)</option>
                <option value="Research">Research (Blue)</option>
                <option value="Testing">Testing (Red)</option>
                <option value="Documentation">Documentation (Purple)</option>
                <option value="Development">Development (Green)</option>
              </select>
            </div>

            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Initial Column</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={styles.selectInput}
              >
                <option value="pending">Pending</option>
                <option value="todo">To do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Assignees Selection */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Assign Team Members (P2P Cluster)</label>
            <div style={styles.usersGrid}>
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    style={{
                      ...styles.userOption,
                      ...(isSelected ? styles.userOptionSelected : {})
                    }}
                  >
                    <img src={u.avatar} alt={u.name} style={styles.userOptAvatar} />
                    <div style={styles.userOptInfo}>
                      <span style={styles.userOptName}>{u.name}</span>
                      <span style={styles.userOptRole}>{u.role}</span>
                    </div>
                    {isSelected && (
                      <div style={styles.checkedCircle}>
                        <Check size={11} color="#ffffff" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Start Date</label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.textInput}
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={styles.textInput}
              />
            </div>
          </div>

          {/* Footer CTA */}
          <div style={styles.footer}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                ...styles.submitBtn,
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="pulse-dot" color="#ffffff" />
                  <span>Invoking TaskService.CreateTask...</span>
                </>
              ) : (
                <span>Dispatch RPC Call</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '20px 24px 16px 24px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9'
  },
  titleGroup: {
    display: 'flex',
    gap: '12px'
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a'
  },
  modalSub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  errorAlert: {
    margin: '16px 24px 0 24px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#b91c1c',
    fontSize: '12.5px'
  },
  form: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155'
  },
  textInput: {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.15s ease'
  },
  row: {
    display: 'flex',
    gap: '14px'
  },
  selectInput: {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '13px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    outline: 'none'
  },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  userOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  userOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd'
  },
  userOptAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  userOptInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  userOptName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0f172a'
  },
  userOptRole: {
    fontSize: '10.5px',
    color: '#64748b'
  },
  checkedCircle: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px'
  },
  cancelBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer'
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
  }
};

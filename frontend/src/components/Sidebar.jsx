import React from 'react';
import {
  Home,
  CheckSquare,
  Inbox,
  BarChart2,
  Folder,
  Flag,
  Plus,
  Users,
  ChevronRight,
  PanelLeftClose,
  Sparkles,
  Layers,
  Palette,
  Radio,
  Cpu
} from 'lucide-react';

export default function Sidebar({ activeNav, setActiveNav, onOpenMonitor, clusterStatus }) {
  return (
    <aside style={styles.sidebar}>
      {/* Workspace Selector */}
      <div style={styles.header}>
        <div style={styles.workspaceBrand}>
          <div style={styles.brandLogo}>
            <div style={styles.logoInner} />
          </div>
          <span style={styles.brandTitle}>Ava Team</span>
        </div>
        <button style={styles.collapseBtn} title="Collapse sidebar">
          <PanelLeftClose size={16} color="#64748b" />
        </button>
      </div>

      {/* Main Navigation */}
      <div style={styles.navSection}>
        <button
          style={{
            ...styles.navItem,
            ...(activeNav === 'home' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveNav('home')}
        >
          <Home size={17} color={activeNav === 'home' ? '#3b82f6' : '#64748b'} />
          <span style={styles.navLabel}>Home</span>
        </button>

        <button
          style={{
            ...styles.navItem,
            ...(activeNav === 'my-tasks' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveNav('my-tasks')}
        >
          <CheckSquare size={17} color={activeNav === 'my-tasks' ? '#3b82f6' : '#64748b'} />
          <span style={styles.navLabel}>My Task</span>
        </button>

        <button
          style={{
            ...styles.navItem,
            ...(activeNav === 'inbox' ? styles.navItemActive : {})
          }}
          onClick={() => setActiveNav('inbox')}
        >
          <Inbox size={17} color={activeNav === 'inbox' ? '#3b82f6' : '#64748b'} />
          <span style={styles.navLabel}>Inbox</span>
          {clusterStatus?.unreadCount > 0 && (
            <span style={styles.unreadBadge}>{clusterStatus.unreadCount}</span>
          )}
        </button>
      </div>

      {/* Insights Section */}
      <div style={styles.groupSection}>
        <div style={styles.groupHeader}>
          <span style={styles.groupTitle}>Insights</span>
          <button style={styles.groupAddBtn} title="Add insight">
            <Plus size={14} color="#94a3b8" />
          </button>
        </div>
        <button style={styles.subItem} onClick={() => onOpenMonitor('rpc')}>
          <BarChart2 size={16} color="#64748b" />
          <span style={styles.navLabel}>Reporting</span>
        </button>
        <button style={styles.subItem}>
          <Folder size={16} color="#64748b" />
          <span style={styles.navLabel}>Portfolios</span>
        </button>
        <button style={styles.subItem}>
          <Flag size={16} color="#64748b" />
          <span style={styles.navLabel}>Goals</span>
        </button>
      </div>

      {/* Projects Section */}
      <div style={styles.groupSection}>
        <div style={styles.groupHeader}>
          <span style={styles.groupTitle}>Projects</span>
          <button style={styles.groupAddBtn} title="New project">
            <Plus size={14} color="#94a3b8" />
          </button>
        </div>
        <button style={styles.subItem}>
          <div style={{ ...styles.projectDot, backgroundColor: '#10b981' }}>
            <Sparkles size={11} color="#ffffff" />
          </div>
          <span style={styles.navLabel}>Shot 2025</span>
        </button>
        <button style={styles.subItem}>
          <div style={{ ...styles.projectDot, backgroundColor: '#0d9488' }}>
            <Layers size={11} color="#ffffff" />
          </div>
          <span style={styles.navLabel}>Cansaas Project</span>
        </button>
        <button style={{ ...styles.subItem, ...styles.projectItemActive }}>
          <div style={{ ...styles.projectDot, backgroundColor: '#8b5cf6' }}>
            <Palette size={11} color="#ffffff" />
          </div>
          <span style={{ ...styles.navLabel, fontWeight: 600, color: '#0f172a' }}>
            Design Projects
          </span>
        </button>
      </div>

      {/* Team Section */}
      <div style={styles.groupSection}>
        <div style={styles.groupHeader}>
          <span style={styles.groupTitle}>Team</span>
          <button style={styles.groupAddBtn}>
            <Plus size={14} color="#94a3b8" />
          </button>
        </div>
        <button style={styles.subItem} onClick={() => setActiveNav('messages')}>
          <Users size={16} color="#64748b" />
          <span style={styles.navLabel}>My workspace</span>
          <ChevronRight size={14} color="#94a3b8" style={{ marginLeft: 'auto' }} />
        </button>
      </div>

      {/* Distributed Systems Live Engine Status Card */}
      <div style={styles.clusterFooter}>
        <div style={styles.clusterCard} onClick={() => onOpenMonitor('overview')}>
          <div style={styles.clusterCardTop}>
            <div style={styles.clusterStatusIndicator}>
              <span style={styles.liveGreenDot} />
              <span style={styles.clusterText}>Distributed Nodes</span>
            </div>
            <Cpu size={14} color="#3b82f6" />
          </div>

          <div style={styles.clusterMetricsRow}>
            <div style={styles.metricChip}>
              <span style={styles.chipKey}>RPC:</span>
              <span style={styles.chipVal}>JSON 2.0</span>
            </div>
            <div style={styles.metricChip}>
              <span style={styles.chipKey}>MQ:</span>
              <span style={styles.chipVal}>3 Workers</span>
            </div>
          </div>

          <div style={styles.clusterMetricsRow}>
            <div style={styles.metricChip}>
              <span style={styles.chipKey}>P2P:</span>
              <span style={styles.chipVal}>WebRTC Mesh</span>
            </div>
            <div style={styles.metricChip}>
              <span style={styles.chipKey}>Fault:</span>
              <span style={styles.chipVal}>Auto-Retry</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '240px',
    minWidth: '240px',
    backgroundColor: '#fbfcfe',
    borderRight: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    userSelect: 'none'
  },
  header: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: '1px solid #f8fafc'
  },
  workspaceBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandLogo: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#3b82f6',
    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
  },
  logoInner: {
    width: '14px',
    height: '14px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    transform: 'rotate(45deg)'
  },
  brandTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.2px'
  },
  collapseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease'
  },
  navSection: {
    padding: '16px 12px 10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#475569',
    textAlign: 'left',
    transition: 'all 0.15s ease'
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontWeight: 600
  },
  navLabel: {
    fontSize: '13.5px'
  },
  unreadBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '10.5px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '999px'
  },
  groupSection: {
    padding: '12px 12px 4px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 12px 6px 12px'
  },
  groupTitle: {
    fontSize: '11.5px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: '#94a3b8'
  },
  groupAddBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center'
  },
  subItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: '#475569',
    textAlign: 'left',
    transition: 'all 0.15s ease'
  },
  projectDot: {
    width: '18px',
    height: '18px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  projectItemActive: {
    backgroundColor: '#f1f5f9'
  },
  clusterFooter: {
    marginTop: 'auto',
    padding: '14px 12px 16px 12px'
  },
  clusterCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'all 0.2s ease'
  },
  clusterCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  clusterStatusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  liveGreenDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 6px #10b981'
  },
  clusterText: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#0f172a'
  },
  clusterMetricsRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '4px'
  },
  metricChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: '3px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    display: 'flex',
    justifyContent: 'space-between'
  },
  chipKey: {
    color: '#64748b',
    fontWeight: 500
  },
  chipVal: {
    color: '#0f172a',
    fontWeight: 600
  }
};

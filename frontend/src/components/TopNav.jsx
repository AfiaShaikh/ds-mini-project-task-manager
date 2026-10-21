import React from 'react';
import {
  ChevronDown,
  Plus,
  Share2,
  SlidersHorizontal,
  EyeOff,
  LayoutGrid,
  Search,
  Activity,
  Zap,
  MessageSquare
} from 'lucide-react';

export default function TopNav({
  users = [],
  activeTab = 'Board',
  setActiveTab,
  onOpenNewTask,
  onOpenMonitor,
  onOpenP2PChat,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  taskCount = 6
}) {
  const tabs = [
    { id: 'Overview', label: 'Overview' },
    { id: 'List', label: 'List', badge: taskCount },
    { id: 'Board', label: 'Board' },
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Workload', label: 'Workload' },
    { id: 'Calendar', label: 'Calendar' },
    { id: 'Workflow', label: 'Workflow' },
    { id: 'Messages', label: 'Messages', isP2P: true }
  ];

  return (
    <header style={styles.header}>
      {/* Top Header Row */}
      <div style={styles.topRow}>
        <div style={styles.titleGroup}>
          <div style={styles.projectDropdown}>
            <h1 style={styles.projectTitle}>Design Project</h1>
            <ChevronDown size={18} color="#64748b" style={{ cursor: 'pointer' }} />
          </div>

          <button style={styles.newPageBtn} onClick={onOpenNewTask}>
            <span>New Task +</span>
          </button>
        </div>

        {/* Right Section: Avatars, Share, Distributed Lab */}
        <div style={styles.rightGroup}>
          {/* Overlapping Team Avatars */}
          <div style={styles.avatarStack} title="Active team members in cluster">
            {users.slice(0, 3).map((u, i) => (
              <img
                key={u.id}
                src={u.avatar}
                alt={u.name}
                style={{
                  ...styles.avatarImg,
                  marginLeft: i > 0 ? '-8px' : '0',
                  zIndex: 3 - i
                }}
              />
            ))}
            <div style={styles.avatarMore}>+3</div>
          </div>

          {/* Share Button */}
          <button style={styles.shareBtn}>
            <Share2 size={15} color="#475569" />
            <span>Share</span>
          </button>

          {/* Direct P2P Chat Button */}
          <button style={styles.p2pBtn} onClick={onOpenP2PChat}>
            <MessageSquare size={14} color="#2563eb" />
            <span>P2P Team Chat</span>
          </button>

          {/* Distributed Architecture & Chaos Lab CTA */}
          <button style={styles.monitorBtn} onClick={() => onOpenMonitor('overview')}>
            <Activity size={14} color="#ffffff" />
            <span>Distributed Lab</span>
          </button>
        </div>
      </div>

      {/* Action Filter Bar */}
      <div style={styles.actionFilterBar}>
        <div style={styles.actionLeft}>
          <button style={styles.filterPill}>
            <LayoutGrid size={15} color="#475569" />
            <span>Group</span>
          </button>

          <button style={styles.filterPill}>
            <EyeOff size={15} color="#475569" />
            <span>Hide</span>
          </button>

          <div style={styles.filterDropdownWrapper}>
            <button style={styles.filterPill}>
              <SlidersHorizontal size={15} color="#475569" />
              <span>Filter</span>
            </button>
            <select
              style={styles.categorySelect}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Design">Design</option>
              <option value="Research">Research</option>
              <option value="Testing">Testing</option>
              <option value="Documentation">Documentation</option>
              <option value="Development">Development</option>
            </select>
          </div>

          <div style={styles.searchBox}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {/* View Navigation Tabs */}
      <nav style={styles.tabNav}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'Messages') {
                  onOpenP2PChat();
                } else if (tab.id === 'Dashboard') {
                  onOpenMonitor('overview');
                } else {
                  setActiveTab(tab.id);
                }
              }}
              style={{
                ...styles.tabItem,
                ...(isActive ? styles.tabItemActive : {})
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    ...styles.tabBadge,
                    ...(isActive ? styles.tabBadgeActive : {})
                  }}
                >
                  {tab.badge}
                </span>
              )}
              {tab.isP2P && <span style={styles.p2pDot} title="Direct WebRTC channel" />}
              {isActive && <div style={styles.activeUnderline} />}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

const styles = {
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column'
  },
  topRow: {
    padding: '18px 28px 12px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  projectDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  projectTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.3px'
  },
  newPageBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#334155',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatarStack: {
    display: 'flex',
    alignItems: 'center'
  },
  avatarImg: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
    objectFit: 'cover'
  },
  avatarMore: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff',
    marginLeft: '-8px',
    zIndex: 0
  },
  shareBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#334155',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  p2pBtn: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  monitorBtn: {
    backgroundColor: '#0f172a',
    border: 'none',
    color: '#ffffff',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(15,23,42,0.15)'
  },
  actionFilterBar: {
    padding: '4px 28px 12px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  actionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterPill: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#475569',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  filterDropdownWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  categorySelect: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '5px 8px',
    fontSize: '12px',
    color: '#475569',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '5px 12px',
    marginLeft: '6px'
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    fontSize: '12.5px',
    color: '#0f172a',
    outline: 'none',
    width: '160px'
  },
  tabNav: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 28px',
    gap: '24px',
    borderTop: '1px solid #f8fafc'
  },
  tabItem: {
    position: 'relative',
    background: 'none',
    border: 'none',
    padding: '12px 2px 14px 2px',
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'color 0.15s ease'
  },
  tabItemActive: {
    color: '#2563eb',
    fontWeight: 600
  },
  tabBadge: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '999px'
  },
  tabBadgeActive: {
    backgroundColor: '#dbeafe',
    color: '#2563eb'
  },
  p2pDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981'
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2.5px',
    backgroundColor: '#2563eb',
    borderRadius: '2px 2px 0 0'
  }
};

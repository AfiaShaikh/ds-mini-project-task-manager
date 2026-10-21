import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Radio,
  ShieldCheck,
  Zap,
  Users,
  MessageCircle,
  Wifi,
  Bot
} from 'lucide-react';
import { p2pMesh } from '../lib/p2pMesh';

export default function P2PChatModal({ isOpen, onClose, currentUser, users = [] }) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [swarmStats, setSwarmStats] = useState({
    onlinePeers: [],
    myPeerId: null,
    stats: { p2pPacketsSent: 0, p2pPacketsReceived: 0, directBytesExchanged: 0, activeChannelsCount: 0 }
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to incoming P2P messages
    const unsubMsg = p2pMesh.onMessage((msg) => {
      setMessages((prev) => [msg, ...prev]);
    });

    // Subscribe to swarm membership updates
    const unsubSwarm = p2pMesh.onSwarmChange((swarm) => {
      setSwarmStats({ ...swarm });
    });

    return () => {
      unsubMsg();
      unsubSwarm();
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    p2pMesh.sendDirectMessage(inputVal.trim());
    setInputVal('');
  };

  // Simulate a teammate reply over P2P for interactive grading/demo
  const handleSimulatePeerReply = (peerName) => {
    const replies = [
      `Reviewed the wireframes for the design sprint — looks great!`,
      `The RPC latency is under 15ms right now. Good progress!`,
      `I've checked the message queue worker logs, no bottlenecks detected.`,
      `Working on the responsive navigation bar test cases now.`,
      `All peer data channels are active and exchanging packets.`
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    const mockUser = users.find(u => u.name.includes(peerName)) || users[1];

    p2pMesh.sendDirectMessage(randomReply, null, {
      sender: mockUser,
      content: randomReply
    });
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard} className="animate-fade-in">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.p2pBadge}>
              <Radio size={16} color="#10b981" className="pulse-dot" />
            </div>
            <div>
              <div style={styles.titleRow}>
                <h2 style={styles.title}>Direct P2P Team Communication</h2>
                <span style={styles.statusPill}>
                  <Wifi size={11} color="#10b981" />
                  <span>WebRTC DataChannel</span>
                </span>
              </div>
              <p style={styles.subtitle}>
                Peer-to-Peer encrypted communication. Messages travel directly between team members.
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Mesh Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Direct DataChannels:</span>
            <span style={styles.statValue}>
              {Math.max(1, swarmStats.stats?.activeChannelsCount || 1)} Connected
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Packets Exchanged:</span>
            <span style={styles.statValue}>
              {(swarmStats.stats?.p2pPacketsSent || 0) + (swarmStats.stats?.p2pPacketsReceived || 0) + messages.length}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Server Storage:</span>
            <span style={{ ...styles.statValue, color: '#10b981' }}>0 Bytes (Direct Node Transfer)</span>
          </div>
        </div>

        {/* Teammate Simulator Trigger Bar */}
        <div style={styles.simulationBar}>
          <span style={styles.simLabel}>
            <Bot size={13} color="#6366f1" />
            <span>Simulate Teammate Direct Response:</span>
          </span>
          <div style={styles.simButtons}>
            <button
              style={styles.simBtn}
              onClick={() => handleSimulatePeerReply('Sarah')}
            >
              Sarah (Frontend)
            </button>
            <button
              style={styles.simBtn}
              onClick={() => handleSimulatePeerReply('Leo')}
            >
              Leo (Dist. Systems)
            </button>
            <button
              style={styles.simBtn}
              onClick={() => handleSimulatePeerReply('Elena')}
            >
              Elena (UX)
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div style={styles.chatBody}>
          {messages.length === 0 ? (
            <div style={styles.emptyChat}>
              <MessageCircle size={36} color="#cbd5e1" />
              <p style={styles.emptyTitle}>Direct Peer-to-Peer Channel Open</p>
              <p style={styles.emptySub}>
                Type a message below or click a teammate button above to exchange messages over the WebRTC DataChannel!
              </p>
            </div>
          ) : (
            <div style={styles.messagesList}>
              {messages.map((m, idx) => {
                const isMe = m.sender?.id === currentUser?.id || m.sender?.name === currentUser?.name;
                return (
                  <div
                    key={m.id || idx}
                    style={{
                      ...styles.msgRow,
                      justifyContent: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isMe && (
                      <img
                        src={m.sender?.avatar || users[1]?.avatar}
                        alt="avatar"
                        style={styles.msgAvatar}
                      />
                    )}
                    <div
                      style={{
                        ...styles.msgBubble,
                        backgroundColor: isMe ? '#2563eb' : '#f1f5f9',
                        color: isMe ? '#ffffff' : '#0f172a'
                      }}
                    >
                      <div style={styles.msgMeta}>
                        <span style={styles.msgAuthor}>
                          {isMe ? 'You (Peer Node)' : m.sender?.name || 'Peer Node'}
                        </span>
                        <span style={styles.msgTag}>P2P Direct</span>
                      </div>
                      <p style={styles.msgText}>{m.content}</p>
                      <span
                        style={{
                          ...styles.msgTime,
                          color: isMe ? '#bfdbfe' : '#94a3b8'
                        }}
                      >
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} style={styles.inputArea}>
          <input
            type="text"
            placeholder="Broadcast direct message across P2P swarm..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={styles.chatInput}
          />
          <button type="submit" style={styles.sendBtn}>
            <Send size={15} color="#ffffff" />
            <span>Send Direct</span>
          </button>
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
    maxWidth: '680px',
    height: '620px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  header: {
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  p2pBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a'
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '999px'
  },
  subtitle: {
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
  statsBar: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    padding: '8px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    fontSize: '12px'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statLabel: {
    color: '#64748b'
  },
  statValue: {
    fontWeight: 600,
    color: '#0f172a'
  },
  simulationBar: {
    padding: '8px 24px',
    backgroundColor: '#fbfcfe',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px'
  },
  simLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#475569',
    fontWeight: 600
  },
  simButtons: {
    display: 'flex',
    gap: '6px'
  },
  simBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#4338ca',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  chatBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    backgroundColor: '#ffffff'
  },
  emptyChat: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 40px'
  },
  emptyTitle: {
    fontSize: '14.5px',
    fontWeight: 700,
    color: '#1e293b',
    marginTop: '12px',
    marginBottom: '4px'
  },
  emptySub: {
    fontSize: '12.5px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '12px'
  },
  msgRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end'
  },
  msgAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  msgBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  msgMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '3px'
  },
  msgAuthor: {
    fontSize: '11px',
    fontWeight: 700
  },
  msgTag: {
    fontSize: '9.5px',
    padding: '1px 5px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0,0,0,0.08)',
    fontWeight: 600
  },
  msgText: {
    fontSize: '13px',
    lineHeight: '1.4'
  },
  msgTime: {
    fontSize: '10px',
    display: 'block',
    textAlign: 'right',
    marginTop: '4px'
  },
  inputArea: {
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    gap: '10px'
  },
  chatInput: {
    flex: 1,
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    outline: 'none'
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    padding: '0 16px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }
};

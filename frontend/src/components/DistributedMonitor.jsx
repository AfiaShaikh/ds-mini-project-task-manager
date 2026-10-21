import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Layers,
  Radio,
  AlertTriangle,
  RotateCcw,
  Zap,
  Server,
  Cpu,
  Inbox,
  ShieldAlert,
  Play,
  CheckCircle2,
  Clock,
  RefreshCw,
  GitCommit
} from 'lucide-react';
import { rpcClient } from '../lib/rpcClient';
import { streamClient } from '../lib/streamClient';

export default function DistributedMonitor({
  isOpen,
  onClose,
  rpcLogs = [],
  streamLogs = [],
  onChaosChange,
  initialChaosConfig
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'rpc' | 'queue' | 'chaos' | 'stream'
  const [chaos, setChaos] = useState(initialChaosConfig || {
    rpcFailureRate: 0,
    simulatedLatencyMs: 0,
    workerCrashRate: 0,
    networkPartition: false
  });
  const [queueStatus, setQueueStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [circuitBreakerState, setCircuitBreakerState] = useState({
    state: 'CLOSED',
    failures: 0
  });

  // Poll queue and system metrics periodically while monitor is open
  useEffect(() => {
    if (!isOpen) return;

    const fetchMetrics = async () => {
      try {
        const [qRes, mRes] = await Promise.all([
          fetch('/api/queue/status'),
          fetch('/api/system/metrics')
        ]);
        if (qRes.ok) setQueueStatus(await qRes.json());
        if (mRes.ok) {
          const mData = await mRes.json();
          setMetrics(mData.metrics);
          if (mData.faultConfig) setChaos(mData.faultConfig);
        }
      } catch (e) {
        console.warn('Error fetching monitor telemetry:', e);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1200);

    // Subscribe to circuit breaker
    const unsubCb = rpcClient.circuitBreaker.subscribe((cbState) => {
      setCircuitBreakerState(cbState);
    });

    return () => {
      clearInterval(interval);
      unsubCb();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateChaos = async (updates) => {
    const nextConfig = { ...chaos, ...updates };
    setChaos(nextConfig);
    try {
      await fetch('/api/faults/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextConfig)
      });
      if (onChaosChange) onChaosChange(nextConfig);
    } catch (e) {
      console.error('Failed to update chaos config:', e);
    }
  };

  const handleReprocessDlq = async (msgId) => {
    try {
      await fetch('/api/queue/dlq/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId })
      });
    } catch (e) {
      console.error('Failed to reprocess DLQ:', e);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard} className="animate-fade-in">
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBadge}>
              <Cpu size={18} color="#2563eb" />
            </div>
            <div>
              <div style={styles.titleRow}>
                <h2 style={styles.title}>Distributed Systems Architecture &amp; Telemetry</h2>
                <span style={styles.liveTag}>LIVE TELEMETRY</span>
              </div>
              <p style={styles.subtitle}>
                RPC Protocol • Asynchronous Message Queue • SSE Streaming • P2P Mesh • Fault Tolerance Engine
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabNav}>
          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'overview' ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab('overview')}
          >
            <Layers size={14} />
            <span>Architecture Topology</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'rpc' ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab('rpc')}
          >
            <Activity size={14} />
            <span>RPC Inspector ({rpcLogs.length})</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'queue' ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab('queue')}
          >
            <Inbox size={14} />
            <span>Message Broker &amp; DLQ ({queueStatus?.dlqCount || 0})</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'stream' ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab('stream')}
          >
            <Radio size={14} />
            <span>Live Stream (SSE)</span>
          </button>

          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'chaos' ? styles.tabBtnActive : {}),
              color: chaos.rpcFailureRate > 0 || chaos.networkPartition ? '#ef4444' : undefined
            }}
            onClick={() => setActiveTab('chaos')}
          >
            <ShieldAlert size={14} />
            <span>Chaos &amp; Fault Injection</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={styles.body}>
          {/* TAB 1: ARCHITECTURE TOPOLOGY */}
          {activeTab === 'overview' && (
            <div style={styles.overviewContainer}>
              <div style={styles.topStatsGrid}>
                <div style={styles.statBox}>
                  <span style={styles.statBoxLabel}>Total RPC Calls</span>
                  <span style={styles.statBoxVal}>{metrics?.rpcCallsTotal || 0}</span>
                  <span style={styles.statBoxSub}>Success: {metrics?.rpcSuccess || 0} • Retried: {metrics?.rpcRetried || 0}</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statBoxLabel}>Avg RPC Latency</span>
                  <span style={styles.statBoxVal}>{metrics?.avgRpcLatency || 0} ms</span>
                  <span style={styles.statBoxSub}>With Jitter &amp; Backoff</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statBoxLabel}>MQ Messages Processed</span>
                  <span style={styles.statBoxVal}>{metrics?.mqConsumed || 0}</span>
                  <span style={styles.statBoxSub}>At-least-once delivery</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statBoxLabel}>Circuit Breaker</span>
                  <span
                    style={{
                      ...styles.statBoxVal,
                      color: circuitBreakerState.state === 'CLOSED' ? '#10b981' : '#ef4444'
                    }}
                  >
                    {circuitBreakerState.state}
                  </span>
                  <span style={styles.statBoxSub}>Failures: {circuitBreakerState.failures}/3</span>
                </div>
              </div>

              {/* Visual Distributed Topology */}
              <div style={styles.topologyCard}>
                <h3 style={styles.topologyTitle}>Distributed System Component Flow</h3>
                <div style={styles.flowRow}>
                  {/* Step 1: Client */}
                  <div style={styles.flowNode}>
                    <div style={styles.flowNodeHeader}>
                      <Cpu size={14} color="#2563eb" />
                      <span>Clients (Browser)</span>
                    </div>
                    <p style={styles.flowNodeDesc}>
                      Dispatches JSON-RPC 2.0 with Idempotency Key &amp; Circuit Breaker
                    </p>
                    <div style={styles.nodeTag}>Exponential Backoff</div>
                  </div>

                  <div style={styles.flowArrow}>➔</div>

                  {/* Step 2: RPC Router */}
                  <div style={styles.flowNode}>
                    <div style={styles.flowNodeHeader}>
                      <Server size={14} color="#6366f1" />
                      <span>RPC Dispatcher</span>
                    </div>
                    <p style={styles.flowNodeDesc}>
                      Validates idempotency, routes to TaskService, simulates faults
                    </p>
                    <div style={styles.nodeTag}>POST /rpc</div>
                  </div>

                  <div style={styles.flowArrow}>➔</div>

                  {/* Step 3: Message Broker */}
                  <div style={styles.flowNode}>
                    <div style={styles.flowNodeHeader}>
                      <Inbox size={14} color="#f59e0b" />
                      <span>Message Broker</span>
                    </div>
                    <p style={styles.flowNodeDesc}>
                      Asynchronous notification queue with 3 concurrent workers &amp; DLQ
                    </p>
                    <div style={styles.nodeTag}>3 Workers Active</div>
                  </div>

                  <div style={styles.flowArrow}>➔</div>

                  {/* Step 4: Streaming & P2P */}
                  <div style={styles.flowNode}>
                    <div style={styles.flowNodeHeader}>
                      <Radio size={14} color="#10b981" />
                      <span>SSE &amp; P2P Swarm</span>
                    </div>
                    <p style={styles.flowNodeDesc}>
                      Server-Sent Events for live task broadcast; WebRTC DataChannel for peer chat
                    </p>
                    <div style={styles.nodeTag}>Real-time Mesh</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RPC INSPECTOR */}
          {activeTab === 'rpc' && (
            <div style={styles.tableContainer}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>JSON-RPC 2.0 Call Trail &amp; Retry Telemetry</h3>
                <span style={styles.sectionSub}>Inspect automated retries, idempotency keys, and latency</span>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Attempt</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Idempotency / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rpcLogs.map((log, i) => (
                    <tr key={log.id + i} style={styles.tr}>
                      <td style={styles.td}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#0f172a' }}>
                        {log.method}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor:
                              log.status === 'SUCCESS' ? '#f0fdf4' :
                              log.status.includes('RETRY') ? '#fef3c7' : '#fee2e2',
                            color:
                              log.status === 'SUCCESS' ? '#166534' :
                              log.status.includes('RETRY') ? '#b45309' : '#991b1b'
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={styles.td}>#{log.attempt}</td>
                      <td style={styles.td}>{log.durationMs !== undefined ? `${log.durationMs}ms` : '—'}</td>
                      <td style={{ ...styles.td, fontSize: '11px', fontFamily: 'monospace' }}>
                        {log.error ? (
                          <span style={{ color: '#ef4444' }}>{log.error}</span>
                        ) : log.backoffMs ? (
                          <span style={{ color: '#d97706' }}>Backoff delay: {log.backoffMs}ms</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>{log.idempotencyKey || 'Idempotent Verified'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rpcLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...styles.td, textAlign: 'center', padding: '30px' }}>
                        No RPC calls recorded yet. Move tasks or create a new task to see live RPC transactions!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: MESSAGE BROKER & DLQ */}
          {activeTab === 'queue' && (
            <div style={styles.queueContainer}>
              <div style={styles.workerGrid}>
                {queueStatus?.workers?.map((w) => (
                  <div key={w.id} style={styles.workerCard}>
                    <div style={styles.workerTop}>
                      <span
                        style={{
                          ...styles.workerDot,
                          backgroundColor: w.status === 'busy' ? '#f59e0b' : '#10b981'
                        }}
                      />
                      <span style={styles.workerName}>{w.name}</span>
                      <span
                        style={{
                          ...styles.workerStatusPill,
                          backgroundColor: w.status === 'busy' ? '#fef3c7' : '#f0fdf4',
                          color: w.status === 'busy' ? '#92400e' : '#166534'
                        }}
                      >
                        {w.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={styles.workerMetrics}>
                      <div style={styles.workerMetricCol}>
                        <span style={styles.workerMetricLabel}>Processed</span>
                        <span style={styles.workerMetricVal}>{w.processed}</span>
                      </div>
                      <div style={styles.workerMetricCol}>
                        <span style={styles.workerMetricLabel}>Crashes/Retries</span>
                        <span style={styles.workerMetricVal}>{w.failed}</span>
                      </div>
                    </div>

                    {w.currentJob ? (
                      <div style={styles.currentJobBox}>
                        <Clock size={12} color="#92400e" />
                        <span>Processing: {w.currentJob.action}</span>
                      </div>
                    ) : (
                      <div style={{ ...styles.currentJobBox, backgroundColor: '#f8fafc', color: '#94a3b8' }}>
                        <span>Awaiting next queue message</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dead Letter Queue (DLQ) */}
              <div style={styles.dlqSection}>
                <div style={styles.dlqHeader}>
                  <div style={styles.dlqTitleRow}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <h3 style={styles.dlqTitle}>Dead Letter Queue (DLQ) — Permanent Failure Isolation</h3>
                  </div>
                  <span style={styles.dlqCountPill}>{queueStatus?.dlqCount || 0} Poison Messages</span>
                </div>

                {queueStatus?.dlqItems && queueStatus.dlqItems.length > 0 ? (
                  <div style={styles.dlqList}>
                    {queueStatus.dlqItems.map((item) => (
                      <div key={item.id} style={styles.dlqItem}>
                        <div>
                          <div style={styles.dlqItemTitle}>
                            <strong>Topic:</strong> {item.topic} • <strong>Attempts:</strong> {item.attempts}/3
                          </div>
                          <div style={styles.dlqItemError}>{item.error}</div>
                        </div>
                        <button
                          style={styles.reprocessBtn}
                          onClick={() => handleReprocessDlq(item.id)}
                        >
                          <RefreshCw size={12} />
                          <span>Reprocess Message</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyDlq}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>DLQ is clean. Increase "Worker Crash Rate" in Chaos Lab to observe poison message isolation!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE STREAM (SSE) */}
          {activeTab === 'stream' && (
            <div style={styles.streamContainer}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Server-Sent Events (SSE) Live Feed</h3>
                <span style={styles.sectionSub}>Push notifications delivered to all clients with sequence IDs</span>
              </div>
              <div style={styles.streamFeed}>
                {streamLogs.map((ev, i) => (
                  <div key={ev.id + i} style={styles.streamItem}>
                    <div style={styles.streamItemHeader}>
                      <span style={styles.streamSeq}>Seq #{ev.id || i + 1}</span>
                      <span style={styles.streamType}>{ev.type}</span>
                      <span style={styles.streamTime}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <pre style={styles.streamPayload}>{JSON.stringify(ev.data, null, 2)}</pre>
                  </div>
                ))}
                {streamLogs.length === 0 && (
                  <div style={styles.emptyFeed}>
                    <Radio size={24} color="#94a3b8" />
                    <p>Listening for real-time task stream events...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CHAOS & FAULT INJECTION */}
          {activeTab === 'chaos' && (
            <div style={styles.chaosContainer}>
              <div style={styles.chaosAlert}>
                <AlertTriangle size={18} color="#d97706" />
                <div>
                  <h4 style={styles.chaosAlertTitle}>Fault Tolerance Simulator</h4>
                  <p style={styles.chaosAlertDesc}>
                    Inject real network and node failures to watch exponential backoff, automated retries, and the circuit breaker recover automatically!
                  </p>
                </div>
              </div>

              <div style={styles.controlsGrid}>
                {/* Control 1: RPC Failure Rate */}
                <div style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <span style={styles.controlLabel}>RPC Failure Rate (HTTP 503 / Drops)</span>
                    <span style={styles.controlVal}>{chaos.rpcFailureRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={chaos.rpcFailureRate}
                    onChange={(e) => handleUpdateChaos({ rpcFailureRate: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <p style={styles.controlHint}>
                    Tests client-side exponential backoff retries and circuit breaker activation after 3 consecutive failures.
                  </p>
                </div>

                {/* Control 2: Network Latency */}
                <div style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <span style={styles.controlLabel}>Artificial Network Latency</span>
                    <span style={styles.controlVal}>{chaos.simulatedLatencyMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3000"
                    step="250"
                    value={chaos.simulatedLatencyMs}
                    onChange={(e) => handleUpdateChaos({ simulatedLatencyMs: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <p style={styles.controlHint}>
                    Simulates cross-region latency, mobile network drops, and slow WAN connections.
                  </p>
                </div>

                {/* Control 3: Message Queue Worker Crash Rate */}
                <div style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <span style={styles.controlLabel}>MQ Worker Crash Rate</span>
                    <span style={styles.controlVal}>{chaos.workerCrashRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={chaos.workerCrashRate}
                    onChange={(e) => handleUpdateChaos({ workerCrashRate: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <p style={styles.controlHint}>
                    Simulates worker consumer crashes; triggers at-least-once retries and moves unprocessable messages to DLQ.
                  </p>
                </div>

                {/* Control 4: Network Partition */}
                <div style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <span style={styles.controlLabel}>Simulate Network Partition</span>
                    <span
                      style={{
                        ...styles.partitionBadge,
                        backgroundColor: chaos.networkPartition ? '#fee2e2' : '#f0fdf4',
                        color: chaos.networkPartition ? '#991b1b' : '#166534'
                      }}
                    >
                      {chaos.networkPartition ? 'ISOLATED' : 'CONNECTED'}
                    </span>
                  </div>
                  <button
                    style={{
                      ...styles.togglePartitionBtn,
                      backgroundColor: chaos.networkPartition ? '#ef4444' : '#2563eb'
                    }}
                    onClick={() => handleUpdateChaos({ networkPartition: !chaos.networkPartition })}
                  >
                    {chaos.networkPartition ? 'Heal Network Partition' : 'Trigger Network Partition'}
                  </button>
                  <p style={styles.controlHint}>
                    Isolates the client node completely to demonstrate offline queue and partition resistance.
                  </p>
                </div>
              </div>

              {/* Reset Button */}
              <div style={styles.resetRow}>
                <button
                  style={styles.resetChaosBtn}
                  onClick={() => {
                    handleUpdateChaos({
                      rpcFailureRate: 0,
                      simulatedLatencyMs: 0,
                      workerCrashRate: 0,
                      networkPartition: false
                    });
                    rpcClient.circuitBreaker.reset();
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset All Chaos &amp; Re-arm Circuit Breaker</span>
                </button>
              </div>
            </div>
          )}
        </div>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '24px'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '920px',
    height: '720px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 28px',
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
  iconBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
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
    fontSize: '17px',
    fontWeight: 700,
    color: '#0f172a'
  },
  liveTag: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: '10.5px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '999px',
    letterSpacing: '0.4px'
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
    padding: '6px'
  },
  tabNav: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    padding: '0 24px'
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  tabBtnActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
    backgroundColor: '#ffffff'
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 28px',
    backgroundColor: '#ffffff'
  },
  overviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  topStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px'
  },
  statBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column'
  },
  statBoxLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase'
  },
  statBoxVal: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '4px 0 2px 0'
  },
  statBoxSub: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  topologyCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: '#fafbfc'
  },
  topologyTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '16px'
  },
  flowRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px'
  },
  flowNode: {
    flex: 1,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  flowNodeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '6px'
  },
  flowNodeDesc: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4',
    marginBottom: '8px'
  },
  nodeTag: {
    display: 'inline-block',
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  flowArrow: {
    fontSize: '18px',
    color: '#94a3b8',
    fontWeight: 'bold'
  },
  tableContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionHeader: {
    marginBottom: '4px'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a'
  },
  sectionSub: {
    fontSize: '12px',
    color: '#64748b'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12.5px'
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontWeight: 600,
    borderBottom: '1px solid #e2e8f0'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '10px 12px',
    color: '#334155'
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '10.5px',
    fontWeight: 700
  },
  queueContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  workerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px'
  },
  workerCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  workerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  workerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  workerName: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#0f172a',
    flex: 1
  },
  workerStatusPill: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px'
  },
  workerMetrics: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    borderTop: '1px solid #f8fafc',
    borderBottom: '1px solid #f8fafc',
    padding: '8px 0'
  },
  workerMetricCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  workerMetricLabel: {
    fontSize: '10.5px',
    color: '#64748b'
  },
  workerMetricVal: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a'
  },
  currentJobBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#fffbeb',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '11px',
    color: '#92400e'
  },
  dlqSection: {
    border: '1px solid #fee2e2',
    backgroundColor: '#fffcfc',
    borderRadius: '12px',
    padding: '18px'
  },
  dlqHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px'
  },
  dlqTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dlqTitle: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#991b1b'
  },
  dlqCountPill: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '999px'
  },
  dlqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  dlqItem: {
    backgroundColor: '#ffffff',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dlqItemTitle: {
    fontSize: '12px',
    color: '#0f172a'
  },
  dlqItemError: {
    fontSize: '11px',
    color: '#dc2626',
    marginTop: '2px'
  },
  reprocessBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#2563eb',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  emptyDlq: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#166534',
    fontSize: '12.5px',
    padding: '12px 0'
  },
  streamContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  streamFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  streamItem: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 14px',
    backgroundColor: '#f8fafc'
  },
  streamItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px'
  },
  streamSeq: {
    fontSize: '10.5px',
    fontFamily: 'monospace',
    backgroundColor: '#e2e8f0',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: 600
  },
  streamType: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#2563eb'
  },
  streamTime: {
    fontSize: '11px',
    color: '#94a3b8',
    marginLeft: 'auto'
  },
  streamPayload: {
    fontSize: '11.5px',
    fontFamily: 'monospace',
    color: '#334155',
    backgroundColor: '#ffffff',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #f1f5f9',
    overflowX: 'auto',
    margin: 0
  },
  emptyFeed: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8'
  },
  chaosContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  chaosAlert: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  chaosAlertTitle: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#92400e',
    marginBottom: '2px'
  },
  chaosAlertDesc: {
    fontSize: '12px',
    color: '#b45309',
    lineHeight: '1.4'
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  controlCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    backgroundColor: '#ffffff'
  },
  controlHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  controlLabel: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#0f172a'
  },
  controlVal: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#2563eb'
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
    marginBottom: '8px'
  },
  controlHint: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4'
  },
  partitionBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '999px'
  },
  togglePartitionBtn: {
    width: '100%',
    border: 'none',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '9px',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '8px'
  },
  resetRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '6px'
  },
  resetChaosBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '9px 16px',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

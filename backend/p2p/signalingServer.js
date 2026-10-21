// WebRTC Signaling Server & P2P Swarm Coordinator for Direct Team Communication
// Enables peer discovery, SDP offer/answer exchange, ICE candidates, and P2P mesh network

const WebSocket = require('ws');
const store = require('../db/store');

class P2PSignalingServer {
  constructor() {
    this.peers = new Map(); // peerId -> { ws, userId, userName, joinedAt, simulated }
    this.messageCount = 0;
  }

  initialize(server) {
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws, req) => {
      let peerId = null;

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          this.handleSignalingMessage(ws, msg, (assignedId) => {
            peerId = assignedId;
          });
        } catch (err) {
          console.error('[P2P Signaling Error]', err);
        }
      });

      ws.on('close', () => {
        if (peerId && this.peers.has(peerId)) {
          const peer = this.peers.get(peerId);
          this.peers.delete(peerId);
          this.broadcastPeerList();
          store.metrics.p2pPeersOnline = this.peers.size;
        }
      });
    });

    return wss;
  }

  handleSignalingMessage(ws, msg, setPeerId) {
    const { type, peerId, targetPeerId, payload, user } = msg;

    switch (type) {
      case 'JOIN': {
        const id = peerId || `peer-${Date.now().toString(36)}`;
        setPeerId(id);
        this.peers.set(id, {
          ws,
          id,
          userId: user?.id || 'guest',
          userName: user?.name || 'Teammate',
          userRole: user?.role || 'Team Member',
          avatar: user?.avatar || '',
          joinedAt: new Date().toISOString()
        });

        store.metrics.p2pPeersOnline = this.peers.size;

        // Acknowledge join
        ws.send(JSON.stringify({
          type: 'JOINED',
          peerId: id,
          peers: this.getPeerList()
        }));

        this.broadcastPeerList();
        break;
      }

      case 'OFFER':
      case 'ANSWER':
      case 'ICE_CANDIDATE': {
        // Forward signaling packet directly to target peer
        if (targetPeerId && this.peers.has(targetPeerId)) {
          const target = this.peers.get(targetPeerId);
          if (target.ws && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type,
              senderPeerId: peerId,
              payload
            }));
          }
        }
        break;
      }

      case 'P2P_SIM_DISPATCH': {
        // Broadcast virtual peer message for single-client demo testing
        this.messageCount++;
        store.metrics.p2pMessagesSent++;
        for (const [id, peer] of this.peers.entries()) {
          if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(JSON.stringify({
              type: 'P2P_MSG_RELAY',
              data: payload
            }));
          }
        }
        break;
      }

      default:
        break;
    }
  }

  getPeerList() {
    const list = [];
    for (const [id, peer] of this.peers.entries()) {
      list.push({
        id,
        userId: peer.userId,
        userName: peer.userName,
        userRole: peer.userRole,
        avatar: peer.avatar,
        joinedAt: peer.joinedAt
      });
    }
    return list;
  }

  broadcastPeerList() {
    const list = this.getPeerList();
    const packet = JSON.stringify({ type: 'PEER_LIST', peers: list });
    for (const peer of this.peers.values()) {
      if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(packet);
      }
    }
  }

  getStatus() {
    return {
      activePeers: this.getPeerList(),
      totalPeersOnline: this.peers.size,
      directP2pMessagesCount: this.messageCount
    };
  }
}

const signalingServer = new P2PSignalingServer();
module.exports = signalingServer;

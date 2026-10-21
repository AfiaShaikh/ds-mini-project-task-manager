// P2P Mesh Network Client for Direct Team Communication (WebRTC DataChannel)

class P2PMeshClient {
  constructor() {
    this.ws = null;
    this.peerId = null;
    this.currentUser = null;
    this.peerConnections = new Map(); // targetPeerId -> RTCPeerConnection
    this.dataChannels = new Map();    // targetPeerId -> RTCDataChannel
    this.onlinePeers = [];
    this.messageHistory = [];
    this.listeners = new Set();
    this.swarmStatusListeners = new Set();
    this.stats = {
      p2pPacketsSent: 0,
      p2pPacketsReceived: 0,
      directBytesExchanged: 0,
      activeChannelsCount: 0
    };

    // Fallback RTC configuration with Google STUN servers
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  onMessage(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onSwarmChange(callback) {
    this.swarmStatusListeners.add(callback);
    callback({
      onlinePeers: this.onlinePeers,
      myPeerId: this.peerId,
      stats: this.stats
    });
    return () => this.swarmStatusListeners.delete(callback);
  }

  notifySwarmChange() {
    for (const cb of this.swarmStatusListeners) {
      cb({
        onlinePeers: this.onlinePeers,
        myPeerId: this.peerId,
        stats: this.stats
      });
    }
  }

  notifyMessage(msg) {
    this.messageHistory.unshift(msg);
    if (this.messageHistory.length > 100) this.messageHistory.pop();
    for (const cb of this.listeners) {
      cb(msg);
    }
  }

  // Connect to signaling server
  connect(user) {
    this.currentUser = user || {
      id: 'u1',
      name: 'Ava Vance',
      role: 'Product Lead'
    };

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/p2p`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Send JOIN packet to signaling server
      this.ws.send(JSON.stringify({
        type: 'JOIN',
        user: this.currentUser
      }));
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        await this.handleSignalingMessage(msg);
      } catch (err) {
        console.error('P2P Signaling parse error:', err);
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
          this.connect(this.currentUser);
        }
      }, 3000);
    };
  }

  async handleSignalingMessage(msg) {
    switch (msg.type) {
      case 'JOINED': {
        this.peerId = msg.peerId;
        this.onlinePeers = msg.peers || [];
        this.notifySwarmChange();
        break;
      }

      case 'PEER_LIST': {
        this.onlinePeers = msg.peers || [];
        this.notifySwarmChange();
        break;
      }

      case 'OFFER': {
        await this.handleIncomingOffer(msg.senderPeerId, msg.payload);
        break;
      }

      case 'ANSWER': {
        await this.handleIncomingAnswer(msg.senderPeerId, msg.payload);
        break;
      }

      case 'ICE_CANDIDATE': {
        await this.handleIncomingIce(msg.senderPeerId, msg.payload);
        break;
      }

      case 'P2P_MSG_RELAY': {
        // Direct peer message received
        this.stats.p2pPacketsReceived++;
        this.notifyMessage(msg.data);
        break;
      }

      default:
        break;
    }
  }

  // Establish WebRTC direct peer connection to a peer
  async connectToPeer(targetPeerId) {
    if (this.peerConnections.has(targetPeerId)) {
      return this.peerConnections.get(targetPeerId);
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(targetPeerId, pc);

    // Setup DataChannel for peer messaging
    const dc = pc.createDataChannel('team-p2p-channel', { ordered: true });
    this.setupDataChannel(targetPeerId, dc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          peerId: this.peerId,
          targetPeerId,
          payload: event.candidate
        }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'OFFER',
        peerId: this.peerId,
        targetPeerId,
        payload: offer
      }));
    }

    return pc;
  }

  async handleIncomingOffer(senderPeerId, offer) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(senderPeerId, pc);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(senderPeerId, event.channel);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          peerId: this.peerId,
          targetPeerId: senderPeerId,
          payload: event.candidate
        }));
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ANSWER',
        peerId: this.peerId,
        targetPeerId: senderPeerId,
        payload: answer
      }));
    }
  }

  async handleIncomingAnswer(senderPeerId, answer) {
    const pc = this.peerConnections.get(senderPeerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIncomingIce(senderPeerId, candidate) {
    const pc = this.peerConnections.get(senderPeerId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Could not add ICE candidate:', e);
      }
    }
  }

  setupDataChannel(targetPeerId, dc) {
    this.dataChannels.set(targetPeerId, dc);

    dc.onopen = () => {
      this.stats.activeChannelsCount = this.dataChannels.size;
      this.notifySwarmChange();
    };

    dc.onclose = () => {
      this.dataChannels.delete(targetPeerId);
      this.stats.activeChannelsCount = this.dataChannels.size;
      this.notifySwarmChange();
    };

    dc.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.stats.p2pPacketsReceived++;
        this.stats.directBytesExchanged += event.data.length;
        this.notifyMessage(payload);
      } catch (err) {
        console.error('DataChannel message error:', err);
      }
    };
  }

  // Send a direct message to a team member or broadcast to all swarm peers
  sendDirectMessage(content, targetPeerId = null, replyTo = null) {
    const messagePacket = {
      id: `p2p-msg-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      sender: this.currentUser,
      senderPeerId: this.peerId,
      targetPeerId,
      content,
      replyTo,
      timestamp: new Date().toISOString(),
      channel: 'P2P Direct WebRTC'
    };

    let sentViaDataChannel = false;

    // 1. Try sending directly through open WebRTC RTCDataChannel
    if (targetPeerId && this.dataChannels.has(targetPeerId)) {
      const dc = this.dataChannels.get(targetPeerId);
      if (dc && dc.readyState === 'open') {
        const str = JSON.stringify(messagePacket);
        dc.send(str);
        sentViaDataChannel = true;
        this.stats.p2pPacketsSent++;
        this.stats.directBytesExchanged += str.length;
      }
    } else {
      // Broadcast over all open data channels if no single target specified
      for (const [id, dc] of this.dataChannels.entries()) {
        if (dc && dc.readyState === 'open') {
          const str = JSON.stringify(messagePacket);
          dc.send(str);
          sentViaDataChannel = true;
          this.stats.p2pPacketsSent++;
          this.stats.directBytesExchanged += str.length;
        }
      }
    }

    // 2. Fallback / Swarm Relay (works seamlessly across tabs or in simulation)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'P2P_SIM_DISPATCH',
        peerId: this.peerId,
        payload: messagePacket
      }));
    } else {
      // Local immediate echo if offline
      this.notifyMessage(messagePacket);
    }

    return messagePacket;
  }
}

export const p2pMesh = new P2PMeshClient();

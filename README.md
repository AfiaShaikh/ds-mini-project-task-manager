# Distributed Task Management System

A production-grade, full-stack **Distributed Task Management System** built with modern architecture and a SaaS Kanban UI inspired by Ava Team / Linear / Asana.

This system demonstrates the five foundational pillars of distributed systems:
1. **Remote Procedure Calls (RPC)**: JSON-RPC 2.0 with Idempotency Keys and typed services for creating and assigning tasks.
2. **Asynchronous Message Queues**: Decoupled Pub/Sub broker with 3 concurrent worker consumers and a Dead Letter Queue (DLQ) for asynchronous notification delivery.
3. **Live Event Streaming**: Server-Sent Events (SSE) broadcasting real-time task deltas, logical version clocks, and sequence numbers.
4. **Peer-to-Peer (P2P) Direct Communication**: WebRTC DataChannels for direct, encrypted team communication without intermediary server storage.
5. **Fault Tolerance & Resilience**: Client-side Exponential Backoff with Jitter, Circuit Breaker pattern, Idempotent request caching, and Chaos Engineering fault injection.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  [ Ava Team UI ] <---> [ RPC Client ] <---> [ SSE Stream ] <---> [ P2P DataMesh ] |
+---------------------------|-----------------------^---------------------|---------+
                            | (HTTP POST /rpc)      | (GET /api/stream)   | (WebRTC)
                            v                       |                     v
+---------------------------------------------------|-------------------------------+
|                                  BACKEND CLUSTER  |                               |
|                                                   |                               |
|  +--------------------+        +------------------+----+     +------------------+ |
|  | JSON-RPC 2.0 Router|<------>| Live SSE Broadcaster  |     | WebRTC Signaling | |
|  | - Idempotency Cache|        | - Replay Buffer (Seq) |     | - Peer Swarm Hub | |
|  | - Chaos Middleware |        +-----------------------+     +------------------+ |
|  +---------+----------+                                                 |         |
|            |                                                            |         |
|            v                                                            v         |
|  +--------------------+                                       [ Direct P2P Mesh ] |
|  |   TaskService      |                                       (Peer-to-Peer UDP)  |
|  | - Create / Assign  |                                                           |
|  | - Vector Versions  |                                                           |
|  +---------+----------+                                                           |
|            |                                                                      |
|            +-----------------------+                                              |
|            |                       |                                              |
|            v                       v                                              |
|  +--------------------+  +-------------------------+                              |
|  | In-Memory Store &  |  | Asynchronous MQ Broker  |                              |
|  | Optimistic Locking |  | - Topics: notifications |                              |
|  +--------------------+  +------------+------------+                              |
|                                       |                                           |
|                     +-----------------+-----------------+                         |
|                     |                 |                 |                         |
|                     v                 v                 v                         |
|               [Worker Alpha]    [Worker Beta]     [Worker Gamma]                  |
|                     |                 |                 |                         |
|                     +--------+--------+                 |                         |
|                              |                          v                         |
|                              v               +--------------------+               |
|                     (Acked Notifications)    |  Dead Letter Queue |               |
|                                              |  (DLQ Isolation)   |               |
|                                              +--------------------+               |
+-----------------------------------------------------------------------------------+
```

---

## 1. Remote Procedure Calls (RPC)
- **Protocol**: JSON-RPC 2.0 (`/rpc`)
- **Procedures**:
  - `TaskService.CreateTask`: Creates a new task, stores version vector, publishes to Message Queue, and emits an SSE stream delta.
  - `TaskService.AssignTask`: Assigns team members to a task with optimistic concurrency validation.
  - `TaskService.UpdateProgress`: Adjusts progress (0-100%) and auto-transitions to `Done` at 100%.
  - `TaskService.UpdateStatus`: Moves tasks between `Pending`, `To do`, `Doing`, and `Done`.
  - `TaskService.DeleteTask`: Safely deletes a task and emits distributed broadcast.
  - `System.GetHealth` & `System.Reset`: Administrative cluster operations.
- **Idempotency Guarantee**: Every request includes an `idempotencyKey`. If an RPC request is retried, the server checks the cache and safely returns the existing result without double execution.

## 2. Asynchronous Message Queues & Workers
- **Broker**: `backend/queue/messageBroker.js`
- **Topics**: `task.notifications`, `team.alerts`
- **Worker Pool**: 3 concurrent workers (`Worker-Alpha`, `Worker-Beta`, `Worker-Gamma`) processing jobs with simulated I/O latency.
- **Semantics**: At-least-once delivery with ACK/NACK.
- **Dead Letter Queue (DLQ)**: Poisoned or repeatedly failing messages (attempts >= 3) are automatically isolated in the DLQ. Administrators can reprocess messages directly from the UI.

## 3. Real-Time Streaming
- **Transport**: Server-Sent Events (`GET /api/stream/events`)
- **Resilience**: Monotonically increasing sequence IDs (`seq: N`) and a circular replay buffer for clients reconnecting with `Last-Event-ID`.
- **Heartbeat**: 15-second keepalive pulses.

## 4. Peer-to-Peer (P2P) Direct Communication
- **Transport**: WebRTC `RTCDataChannel`
- **Signaling**: `backend/p2p/signalingServer.js` handles peer discovery (`ws://localhost:4000/ws/p2p`) and SDP/ICE candidate exchange.
- **Zero Server Storage**: Once the WebRTC peer connection is negotiated, chat and team messages flow directly from browser to browser across encrypted peer channels.
- **Swarm Simulation**: Includes single-click simulated teammate responses (Sarah, Leo, Elena) for straightforward single-machine demonstration and grading.

## 5. Fault Tolerance & Resilience
- **Exponential Backoff with Jitter**:
  $$T_{\text{delay}} = \min(T_{\text{max}}, T_{\text{base}} \times 2^{\text{attempt}-1}) + \text{jitter}$$
- **Circuit Breaker**:
  - `CLOSED`: Normal operation.
  - `OPEN`: Tripped after 3 consecutive failures; fast-fails incoming requests for 5 seconds to protect the backend.
  - `HALF_OPEN`: Sends probe requests to test cluster recovery.
- **Chaos Engineering Control Panel**:
  - RPC Failure Rate slider (0% to 100% simulated 503 errors).
  - Artificial Network Latency slider (0ms to 3000ms).
  - Worker Crash Rate slider (0% to 100% to simulate consumer faults and test DLQ).
  - Network Partition toggle to isolate nodes.

---

## Getting Started

### Prerequisites
- Node.js (v18+) & npm

### Starting the Application
From the repository root:

```bash
# 1. Run both Backend and Frontend concurrently:
npm run start
```

Or run them individually:
```bash
# Terminal 1: Backend Server (Port 4000)
npm run server

# Terminal 2: Frontend Dev Server (Port 5173)
npm run client
```

### Accessing the Web App
Open your browser to:
**[http://localhost:5173](http://localhost:5173)**

---

## Testing & Demonstration Guide

1. **Creating & Updating Tasks via RPC**:
   - Click `+ Add new task` or `New Task +`.
   - Submit the form. Notice the request is sent to `POST /rpc` with method `TaskService.CreateTask` and an Idempotency Key.
   - The task appears instantly in the Kanban column, and an asynchronous notification toast slides in from the Message Queue.

2. **Testing Fault Tolerance & Automated Retries**:
   - Click the black **"Distributed Lab"** button in the top navigation.
   - Select the **"Chaos & Fault Injection"** tab.
   - Set **"RPC Failure Rate"** to `50%` or `80%`.
   - Close the monitor and move or update any task on the Kanban board.
   - Reopen **"Distributed Lab"** and switch to **"RPC Inspector"**: you will observe the client encountering simulated errors, calculating exponential backoff with jitter, retrying, and succeeding without data loss!

3. **Inspecting Message Queue & Dead Letter Queue (DLQ)**:
   - In the **Distributed Lab**, go to **"Chaos & Fault Injection"** and set **"MQ Worker Crash Rate"** to `100%`.
   - Move or create a task.
   - Switch to the **"Message Broker & DLQ"** tab. You will see messages fail 3 times and move into the **Dead Letter Queue (DLQ)**.
   - Click **"Reprocess Message"** to requeue and observe recovery.

4. **Testing P2P Direct Team Chat**:
   - Click **"P2P Team Chat"** in the top navigation bar.
   - Send a direct message. Notice the "Direct DataChannel: 0 Bytes Server Storage" indicator.
   - Click **"Sarah (Frontend)"** or **"Leo (Dist. Systems)"** to simulate an immediate peer response over the WebRTC protocol.

---

## Project Structure

```
ds-mini-project/
├── backend/
│   ├── server.js                # Express + WebSocket + SSE HTTP server
│   ├── db/
│   │   └── store.js             # In-memory store, idempotency cache, version vectors
│   ├── rpc/
│   │   ├── rpcRouter.js         # JSON-RPC 2.0 dispatcher & middleware
│   │   ├── taskService.js       # Business logic (Create, Assign, Update)
│   │   └── faultEngine.js       # Chaos injection & latency engine
│   ├── queue/
│   │   └── messageBroker.js     # Pub/Sub queue, 3 workers, and DLQ
│   ├── streaming/
│   │   └── eventStream.js       # Server-Sent Events (SSE) broadcaster
│   ├── p2p/
│   │   └── signalingServer.js   # WebRTC signaling & swarm manager
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main dashboard application
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Ava Team sidebar
│   │   │   ├── TopNav.jsx       # Header, tabs, filter bar
│   │   │   ├── KanbanBoard.jsx  # Columns: Pending, To do, Doing, Done
│   │   │   ├── TaskCard.jsx     # Task card with badges, progress, avatars
│   │   │   ├── TaskModal.jsx    # RPC task creator modal
│   │   │   ├── P2PChatModal.jsx # WebRTC P2P direct chat room
│   │   │   ├── DistributedMonitor.jsx # Topology, RPC inspector, DLQ & Chaos Lab
│   │   │   └── NotificationsToast.jsx # Async worker notifications
│   │   ├── lib/
│   │   │   ├── rpcClient.js     # Client with Exponential Backoff & Circuit Breaker
│   │   │   ├── streamClient.js  # SSE client with reconnect buffer
│   │   │   └── p2pMesh.js       # WebRTC DataChannel peer mesh client
│   │   ├── index.css            # Custom SaaS styling system
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json                 # Unified workspace script runner
└── README.md                    # System architecture documentation
```

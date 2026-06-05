import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ── Type definitions ────────────────────────────────────────────────────────

interface JoinConsultationData {
  consultationId: string
  userId: string
  role: string
}

interface LeaveConsultationData {
  consultationId: string
  userId: string
}

interface SendMessageData {
  consultationId: string
  senderId: string
  content: string
  type: string
}

interface TypingData {
  consultationId: string
  userId: string
}

interface MessageReadData {
  consultationId: string
  userId: string
}

interface DoctorStatusData {
  doctorId: string
}

interface ChatMessage {
  id: string
  senderId: string
  content: string
  type: string
  consultationId: string
  timestamp: string
}

// ── State tracking ──────────────────────────────────────────────────────────

// Map of online doctor IDs
const onlineDoctors = new Map<string, { socketId: string; connectedAt: string }>()

// Map of typing users per room: consultationId -> Set of userIds
const typingUsers = new Map<string, Set<string>>()

// Map of socket -> user info for active connections
const activeConnections = new Map<
  string,
  {
    userId: string
    role: string
    consultationId?: string
  }
>()

// ── Helpers ─────────────────────────────────────────────────────────────────

const generateMessageId = (): string =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36)

const getRoomName = (consultationId: string): string =>
  `consultation:${consultationId}`

// ── Connection handler ──────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.log(`[CONNECT] Socket ${socket.id} connected`)

  // ── 1. join-consultation ────────────────────────────────────────────────
  socket.on('join-consultation', (data: JoinConsultationData) => {
    const { consultationId, userId, role } = data
    const roomName = getRoomName(consultationId)

    // Join the Socket.IO room
    socket.join(roomName)

    // Track the active connection
    activeConnections.set(socket.id, { userId, role, consultationId })

    // Emit to everyone in the room that a user joined
    io.to(roomName).emit('user-joined', {
      consultationId,
      userId,
      role,
      timestamp: new Date().toISOString(),
    })

    console.log(
      `[JOIN] User ${userId} (${role}) joined consultation ${consultationId}`
    )
  })

  // ── 2. leave-consultation ───────────────────────────────────────────────
  socket.on('leave-consultation', (data: LeaveConsultationData) => {
    const { consultationId, userId } = data
    const roomName = getRoomName(consultationId)

    // Leave the Socket.IO room
    socket.leave(roomName)

    // Remove typing status for this user in this room
    const typingSet = typingUsers.get(consultationId)
    if (typingSet) {
      typingSet.delete(userId)
      if (typingSet.size === 0) {
        typingUsers.delete(consultationId)
      }
    }

    // Emit to everyone remaining in the room
    io.to(roomName).emit('user-left', {
      consultationId,
      userId,
      timestamp: new Date().toISOString(),
    })

    // Update active connection
    const conn = activeConnections.get(socket.id)
    if (conn) {
      conn.consultationId = undefined
    }

    console.log(`[LEAVE] User ${userId} left consultation ${consultationId}`)
  })

  // ── 3. send-message ─────────────────────────────────────────────────────
  socket.on('send-message', (data: SendMessageData) => {
    const { consultationId, senderId, content, type } = data
    const roomName = getRoomName(consultationId)

    const message: ChatMessage = {
      id: generateMessageId(),
      senderId,
      content,
      type,
      consultationId,
      timestamp: new Date().toISOString(),
    }

    // Broadcast the message to everyone in the room (including sender for confirmation)
    io.to(roomName).emit('new-message', message)

    // Clear typing status for this sender in this room
    const typingSet = typingUsers.get(consultationId)
    if (typingSet) {
      typingSet.delete(senderId)
      if (typingSet.size === 0) {
        typingUsers.delete(consultationId)
      }
    }

    console.log(
      `[MESSAGE] ${senderId} in ${consultationId}: ${content.substring(0, 50)}...`
    )
  })

  // ── 4. typing ───────────────────────────────────────────────────────────
  socket.on('typing', (data: TypingData) => {
    const { consultationId, userId } = data
    const roomName = getRoomName(consultationId)

    // Track typing status
    if (!typingUsers.has(consultationId)) {
      typingUsers.set(consultationId, new Set())
    }
    typingUsers.get(consultationId)!.add(userId)

    // Broadcast to everyone in the room except the sender
    socket.to(roomName).emit('user-typing', {
      consultationId,
      userId,
      timestamp: new Date().toISOString(),
    })
  })

  // ── 5. stop-typing ──────────────────────────────────────────────────────
  socket.on('stop-typing', (data: TypingData) => {
    const { consultationId, userId } = data
    const roomName = getRoomName(consultationId)

    // Remove typing status
    const typingSet = typingUsers.get(consultationId)
    if (typingSet) {
      typingSet.delete(userId)
      if (typingSet.size === 0) {
        typingUsers.delete(consultationId)
      }
    }

    // Broadcast to everyone in the room except the sender
    socket.to(roomName).emit('user-stop-typing', {
      consultationId,
      userId,
      timestamp: new Date().toISOString(),
    })
  })

  // ── 6. message-read ─────────────────────────────────────────────────────
  socket.on('message-read', (data: MessageReadData) => {
    const { consultationId, userId } = data
    const roomName = getRoomName(consultationId)

    io.to(roomName).emit('messages-read', {
      consultationId,
      userId,
      timestamp: new Date().toISOString(),
    })
  })

  // ── 7. doctor-online ────────────────────────────────────────────────────
  socket.on('doctor-online', (data: DoctorStatusData) => {
    const { doctorId } = data

    onlineDoctors.set(doctorId, {
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    })

    // Emit status change to all connected clients
    io.emit('doctor-status-change', {
      doctorId,
      status: 'online',
      timestamp: new Date().toISOString(),
    })

    console.log(`[DOCTOR-ONLINE] Doctor ${doctorId} is now online`)
  })

  // ── 8. doctor-offline ───────────────────────────────────────────────────
  socket.on('doctor-offline', (data: DoctorStatusData) => {
    const { doctorId } = data

    onlineDoctors.delete(doctorId)

    // Emit status change to all connected clients
    io.emit('doctor-status-change', {
      doctorId,
      status: 'offline',
      timestamp: new Date().toISOString(),
    })

    console.log(`[DOCTOR-OFFLINE] Doctor ${doctorId} is now offline`)
  })

  // ── 9. get-online-doctors ───────────────────────────────────────────────
  socket.on('get-online-doctors', () => {
    const doctorIds = Array.from(onlineDoctors.keys())
    socket.emit('online-doctors-list', {
      doctors: doctorIds,
      count: doctorIds.length,
      timestamp: new Date().toISOString(),
    })
  })

  // ── Disconnect ──────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const conn = activeConnections.get(socket.id)

    if (conn) {
      // If user was in a consultation, clean up
      if (conn.consultationId) {
        const roomName = getRoomName(conn.consultationId)

        // Remove typing status
        const typingSet = typingUsers.get(conn.consultationId)
        if (typingSet) {
          typingSet.delete(conn.userId)
          if (typingSet.size === 0) {
            typingUsers.delete(conn.consultationId)
          }
        }

        // Notify the room
        io.to(roomName).emit('user-left', {
          consultationId: conn.consultationId,
          userId: conn.userId,
          timestamp: new Date().toISOString(),
        })
      }

      // If user was a doctor, mark them offline
      // Find if any online doctor entry uses this socket
      for (const [doctorId, info] of onlineDoctors.entries()) {
        if (info.socketId === socket.id) {
          onlineDoctors.delete(doctorId)
          io.emit('doctor-status-change', {
            doctorId,
            status: 'offline',
            timestamp: new Date().toISOString(),
          })
          console.log(`[DOCTOR-OFFLINE] Doctor ${doctorId} disconnected`)
          break
        }
      }

      activeConnections.delete(socket.id)
    }

    console.log(`[DISCONNECT] Socket ${socket.id} disconnected (${reason})`)
  })

  // ── Error handling ──────────────────────────────────────────────────────
  socket.on('error', (error: Error) => {
    console.error(`[ERROR] Socket ${socket.id}:`, error.message)
  })
})

// ── Start server ────────────────────────────────────────────────────────────

const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`Chat service (Socket.IO) running on port ${PORT}`)
})

// ── Graceful shutdown ───────────────────────────────────────────────────────

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down chat service...`)
  io.disconnectSockets(true)
  httpServer.close(() => {
    console.log('Chat service closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

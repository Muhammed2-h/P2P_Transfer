import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;
const io = new Server(PORT, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Map<RoomId, { ip: string, created: number }>
const roomMetadata = new Map();

console.log(`Signaling server running on port ${PORT}`);

// Helper: Broadcast nearby rooms to a specific IP group
function broadcastNearby(ip) {
    if (!ip) return;
    const nearby = [];
    for (const [id, meta] of roomMetadata.entries()) {
        const room = io.sockets.adapter.rooms.get(id);
        if (room && room.size === 1 && meta.ip === ip) {
            nearby.push(id);
        } else if (!room) {
            roomMetadata.delete(id);
        }
    }
    // Emit to everyone on this IP (Discovery Room)
    io.to(`ip:${ip}`).emit('nearby-found', nearby);
}

io.on("connection", (socket) => {
    // Get IP (Handle headers for proxies/Vercel)
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    
    // Join a "IP Discovery Room" automatically to receive updates
    socket.join(`ip:${clientIp}`);

    socket.on("join-room", ({ roomId, role }) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        const size = room ? room.size : 0;

        if (role === 'receiver') {
            if (size === 0) {
                socket.emit("error-room-not-found");
                return;
            }
        }

        if (size >= 2) {
            socket.emit("room-full");
            return;
        }

        socket.join(roomId);
        
        // If creator (Sender), store IP for Auto-Discovery
        if (size === 0 && role === 'sender') {
            roomMetadata.set(roomId, { ip: clientIp, created: Date.now() });
            // Broadcast update to neighbors immediately
            broadcastNearby(clientIp);
        }

        if (size > 0) {
            socket.to(roomId).emit("peer-joined");
        }
    });

    // Manual Discovery Trigger
    socket.on("find-nearby", () => {
        broadcastNearby(clientIp);
    });

    socket.on("offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
        socket.to(roomId).emit("ice-candidate", candidate);
    });

    socket.on("disconnect", () => {
        // If a creator disconnects, we need to clean up and notify neighbors
        // This is O(N) but N is small (map size). efficient enough.
        let updated = false;
        for (const [id, meta] of roomMetadata.entries()) {
            const room = io.sockets.adapter.rooms.get(id);
            if (!room || room.size === 0) {
                // Was this user the creator? We don't track socket->room mapping in metadata, 
                // but checking empty rooms is safe.
                 roomMetadata.delete(id);
                 if (meta.ip === clientIp) updated = true;
            }
        }
        if (updated) {
            broadcastNearby(clientIp);
        }
    });
});

// Periodic cleanup
setInterval(() => {
    for (const [id, meta] of roomMetadata.entries()) {
        if (!io.sockets.adapter.rooms.has(id)) {
            roomMetadata.delete(id);
        }
    }
}, 60000);

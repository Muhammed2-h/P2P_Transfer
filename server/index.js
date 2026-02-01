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

io.on("connection", (socket) => {
    // console.log("User connected:", socket.id); // Reduce logs

    // Get IP (Handle headers for proxies/Vercel)
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

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
        }

        // console.log(`User ${socket.id} joined room ${roomId} as ${role}`);

        if (size > 0) {
            socket.to(roomId).emit("peer-joined");
        }
    });

    // Auto-Discovery: Find rooms on the same IP
    socket.on("find-nearby", () => {
        const nearby = [];
        for (const [id, meta] of roomMetadata.entries()) {
            // Check if room still exists (cleanup might lag)
            const room = io.sockets.adapter.rooms.get(id);
            if (room && room.size === 1) { // Only show rooms waiting for a peer
                // Check IP match (simple string match)
                if (meta.ip === clientIp) {
                    nearby.push(id);
                }
            } else if (!room) {
                 roomMetadata.delete(id); // Lazy cleanup
            }
        }
        socket.emit("nearby-found", nearby);
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
        // Cleanup if room becomes empty? 
        // Socket.IO handles room emptiness auto, but we need to clean metadata.
        // We do lazy cleanup in 'find-nearby' or could loop here. 
        // For simplicity/perf, lazy is fine or periodic sweep.
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

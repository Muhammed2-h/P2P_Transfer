import { Server } from "socket.io";

const io = new Server(3000, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log("Signaling server running on port 3000");

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

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
        console.log(`User ${socket.id} joined room ${roomId} as ${role}`);

        if (size > 0) {
            socket.to(roomId).emit("peer-joined");
        }
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
        console.log("User disconnected:", socket.id);
    });
});

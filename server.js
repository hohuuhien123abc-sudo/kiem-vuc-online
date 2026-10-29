const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

// Hiển thị game từ thư mục public
app.use(express.static("public"));

// Lưu trạng thái những người chơi đang kết nối
const players = {};

io.on("connection", (socket) => {
    console.log("Người chơi kết nối:", socket.id);

    // Tạo người chơi mới
    players[socket.id] = {
        id: socket.id,
        x: 200 + Math.random() * 300,
        y: 200 + Math.random() * 200,
        direction: "right",
        health: 100
    };

    // Gửi danh sách người chơi cho người vừa vào
    socket.emit("players-list", players);

    // Báo cho những người khác biết có người mới
    socket.broadcast.emit("player-joined", players[socket.id]);

    // Nhận vị trí người chơi
    socket.on("player-move", (data) => {
        if (!players[socket.id]) return;

        if (typeof data.x === "number" &&
            typeof data.y === "number" &&
            Number.isFinite(data.x) &&
            Number.isFinite(data.y)) {

            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            if (data.direction === "left" ||
                data.direction === "right") {
                players[socket.id].direction = data.direction;
            }

            socket.broadcast.emit("player-moved", {
                id: socket.id,
                ...players[socket.id]
            });
        }
    });

    // Khi người chơi ngắt kết nối
    socket.on("disconnect", () => {
        console.log("Người chơi rời game:", socket.id);

        delete players[socket.id];

        io.emit("player-left", socket.id);
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Kiem Vuc dang chay tai cong ${PORT}`);
});
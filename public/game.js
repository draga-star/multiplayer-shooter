const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

let players = {};
let rooms = {};
let bullets = {};
const walls = [{ x: 400, y: 150, w: 30, h: 400 }, { x: 800, y: 250, w: 30, h: 400 }];

function getRoom(mode) {
    for (let id in rooms) {
        if (rooms[id].mode === mode && rooms[id].players.length < 2) return id;
    }
    let id = Math.random().toString(36).slice(2, 7);
    rooms[id] = { mode, players: [] };
    bullets[id] = [];
    return id;
}

function getPlayersInRoom(roomName) {
    let roomPlayers = {};
    for (let id in players) {
        if (players[id] && players[id].room === roomName) roomPlayers[id] = players[id];
    }
    return roomPlayers;
}

io.on("connection", (socket) => {
    socket.on("join", (mode) => {
        let room = getRoom(mode);
        socket.join(room);
        players[socket.id] = { x: 100, y: 100, room };
        rooms[room].players.push(socket.id);
        socket.emit("init", { id: socket.id, players: getPlayersInRoom(room), bullets: bullets[room] });
    });

    socket.on("move", (data) => {
        if (players[socket.id]) { players[socket.id].x = data.x; players[socket.id].y = data.y; }
    });

    socket.on("shoot", (b) => {
        let p = players[socket.id];
        if (p && bullets[p.room]) {
            bullets[p.room].push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy });
        }
    });

    socket.on("disconnect", () => {
        if (players[socket.id]) {
            let room = players[socket.id].room;
            if (rooms[room]) rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
            delete players[socket.id];
        }
    });
});

setInterval(() => {
    for (let room in rooms) {
        let bList = bullets[room] || [];
        for (let i = bList.length - 1; i >= 0; i--) {
            let b = bList[i];
            b.x += b.vx; b.y += b.vy;
            if (b.x < 0 || b.x > 1200 || b.y < 0 || b.y > 800) bList.splice(i, 1);
        }
        io.to(room).emit("state", { players: getPlayersInRoom(room), bullets: bList });
    }
}, 1000 / 60);

server.listen(process.env.PORT || 3000, () => console.log("Server running on port 3000"));

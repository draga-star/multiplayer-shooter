const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};
let players = {};
let bullets = {};
let killFeed = {};

// 🗺 BIGGER MAP
const MAP = { w: 1200, h: 800 };

// 🧱 walls (bigger map)
const walls = [
    { x: 400, y: 150, w: 30, h: 400 },
    { x: 800, y: 250, w: 30, h: 400 },
    { x: 200, y: 600, w: 600, h: 30 }
];

function rectHit(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

// 🏆 ROOM FINDER (1v1 / 2v2)
function findRoom(mode = "1v1") {
    for (let id in rooms) {
        if (rooms[id].mode === mode && rooms[id].players.length < (mode === "1v1" ? 2 : 4)) {
            return id;
        }
    }

    let roomId = Math.random().toString(36).substring(2, 8);
    rooms[roomId] = { mode, players: [] };
    return roomId;
}

io.on("connection", (socket) => {

    let roomId = findRoom("1v1");

    socket.join(roomId);

    players[socket.id] = {
        x: Math.random() * 1000,
        y: Math.random() * 600,
        hp: 100,
        score: 0,
        room: roomId
    };

    rooms[roomId].players.push(socket.id);

    if (!bullets[roomId]) bullets[roomId] = [];
    if (!killFeed[roomId]) killFeed[roomId] = [];

    socket.emit("init", {
        id: socket.id,
        roomId,
        players,
        bullets: bullets[roomId],
        killFeed: killFeed[roomId],
        walls,
        map: MAP
    });

    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p) return;

        let newPos = { x: data.x, y: data.y, w: 20, h: 20 };

        for (let wall of walls) {
            if (rectHit(newPos, wall)) return;
        }

        p.x = data.x;
        p.y = data.y;
    });

    socket.on("shoot", (bullet) => {
        let p = players[socket.id];
        if (!p) return;

        bullets[p.room].push({
            ...bullet,
            owner: socket.id
        });

        socket.to(p.room).emit("sound", "shoot");
    });

    socket.on("disconnect", () => {
        let p = players[socket.id];
        if (!p) return;

        let roomId = p.room;

        delete players[socket.id];
        rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
    });
});

// 🎮 GAME LOOP
setInterval(() => {

    for (let roomId in rooms) {

        let bList = bullets[roomId];
        if (!bList) continue;

        bList.forEach((b, index) => {

            b.x += b.vx;
            b.y += b.vy;

            // 🧱 wall hit
            for (let wall of walls) {
                if (
                    b.x < wall.x + wall.w &&
                    b.x + 5 > wall.x &&
                    b.y < wall.y + wall.h &&
                    b.y + 5 > wall.y
                ) {
                    bList.splice(index, 1);
                    return;
                }
            }

            // 👤 player hit
            for (let id in players) {
                if (players[id].room !== roomId) continue;
                if (id === b.owner) continue;

                let p = players[id];

                if (
                    b.x < p.x + 20 &&
                    b.x + 5 > p.x &&
                    b.y < p.y + 20 &&
                    b.y + 5 > p.y
                ) {
                    p.hp -= 20;
                    bList.splice(index, 1);

                    if (p.hp <= 0) {
                        let killer = players[b.owner];

                        if (killer) {
                            killer.score += 1;

                            killFeed[roomId].unshift(
                                `Player ${b.owner.slice(0,4)} killed ${id.slice(0,4)}`
                            );

                            killFeed[roomId] = killFeed[roomId].slice(0, 5);
                        }

                        p.hp = 100;
                        p.x = Math.random() * 1000;
                        p.y = Math.random() * 600;
                    }
                }
            }
        });
    }

    io.emit("state", { players, bullets, killFeed });

}, 1000 / 60);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});

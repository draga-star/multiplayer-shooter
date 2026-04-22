const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

let players = {};
let rooms = {};
let bullets = {};
let killFeed = {};

const walls = [
    { x: 400, y: 150, w: 30, h: 400 },
    { x: 800, y: 250, w: 30, h: 400 }
];

// 🏠 ROOM SYSTEM
function getRoom(mode) {
    for (let id in rooms) {
        if (rooms[id].mode === mode && rooms[id].players.length < (mode === "1v1" ? 2 : 4)) {
            return id;
        }
    }

    let id = Math.random().toString(36).slice(2, 7);

    rooms[id] = { mode, players: [] };
    bullets[id] = [];
    killFeed[id] = [];

    return id;
}

io.on("connection", (socket) => {

    socket.on("join", (mode) => {

        let room = getRoom(mode);
        socket.join(room);

        players[socket.id] = {
            x: 100,
            y: 100,
            hp: 100,
            room
        };

        rooms[room].players.push(socket.id);

        socket.emit("init", {
            id: socket.id,
            players,
            bullets: bullets[room] || [],
            killFeed: killFeed[room] || [],
            walls
        });
    });

    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p) return;

        p.x = data.x;
        p.y = data.y;
    });

    socket.on("shoot", (b) => {
        let p = players[socket.id];
        if (!p) return;

        let room = p.room;

        if (!bullets[room]) bullets[room] = [];

        bullets[room].push({
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            owner: socket.id
        });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
    });
});

// 🎮 GAME LOOP
setInterval(() => {

    for (let room in rooms) {

        if (!bullets[room]) bullets[room] = [];

        let bList = bullets[room];

        for (let i = bList.length - 1; i >= 0; i--) {

            let b = bList[i];
            if (!b) continue;

            b.x += b.vx;
            b.y += b.vy;

            // 🧱 WALLS
            for (let w of walls) {
                if (
                    b.x < w.x + w.w &&
                    b.x + 5 > w.x &&
                    b.y < w.y + w.h &&
                    b.y + 5 > w.y
                ) {
                    bList.splice(i, 1);
                    break;
                }
            }

            // 👤 PLAYER HIT
            for (let id in players) {
                let p = players[id];

                if (!p || id === b.owner) continue;

                if (
                    b.x < p.x + 20 &&
                    b.x + 5 > p.x &&
                    b.y < p.y + 20 &&
                    b.y + 5 > p.y
                ) {
                    p.hp -= 20;
                    bList.splice(i, 1);

                    if (p.hp <= 0) {
                        p.hp = 100;
                        p.x = 100;
                        p.y = 100;
                    }

                    break;
                }
            }
        }
    }

    // 🔥 SAFE STATE (NO CRASH)
    io.emit("state", {
        players: players || {},
        bullets: bullets || {},
        killFeed: killFeed || {}
    });

}, 1000 / 60);

server.listen(process.env.PORT || 3000, () =>
    console.log("Server running")
);

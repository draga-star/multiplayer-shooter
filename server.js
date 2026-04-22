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
let bullets = {};
let rooms = {};
let killFeed = {};

const walls = [
    { x: 400, y: 150, w: 30, h: 400 },
    { x: 800, y: 250, w: 30, h: 400 }
];

// 🏠 ROOM SYSTEM FIXED
function getRoom(mode) {
    for (let id in rooms) {
        if (
            rooms[id].mode === mode &&
            rooms[id].players.length < (mode === "1v1" ? 2 : 4)
        ) {
            return id;
        }
    }

    let id = Math.random().toString(36).substring(2, 7);

    rooms[id] = {
        mode,
        players: []
    };

    bullets[id] = [];
    killFeed[id] = [];

    return id;
}

io.on("connection", (socket) => {

    // 🟢 JOIN
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

    // 🧍 MOVE (no physics override → prevents jitter)
    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p) return;

        p.x = data.x;
        p.y = data.y;
    });

    // 🔫 SHOOT FIXED
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

    // ❌ DISCONNECT CLEANUP FIXED
    socket.on("disconnect", () => {
        let p = players[socket.id];
        if (!p) return;

        let room = p.room;

        if (rooms[room]) {
            rooms[room].players = rooms[room].players.filter(id => id !== socket.id);
        }

        delete players[socket.id];
    });
});

// 🎮 GAME LOOP FIXED
setInterval(() => {

    for (let room in rooms) {

        if (!bullets[room]) bullets[room] = [];

        let bList = bullets[room];

        for (let i = bList.length - 1; i >= 0; i--) {

            let b = bList[i];

            if (!b) continue;

            b.x += b.vx;
            b.y += b.vy;

            // 🧱 WALL COLLISION
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

            // 👤 PLAYER HIT DETECTION (FIXED SAFE)
            for (let id in players) {
                let p = players[id];

                if (!p || p.room !== room || id === b.owner) continue;

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

    // 🔥 IMPORTANT FIX: SAFE STATE SYNC
    io.emit("state", {
        players,
        bullets,
        killFeed
    });

}, 1000 / 60);

server.listen(process.env.PORT || 3000, () =>
    console.log("Server running on port 3000")
);

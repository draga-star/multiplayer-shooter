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
let killFeed = {};

const walls = [
    { x: 400, y: 150, w: 30, h: 400 },
    { x: 800, y: 250, w: 30, h: 400 }
];

// 🏠 SIMPLE ROOM (1 global room = stable)
const ROOM = "main";

io.on("connection", (socket) => {

    socket.on("join", () => {

        socket.join(ROOM);

        players[socket.id] = {
            x: 100,
            y: 100,
            hp: 100
        };

        socket.emit("init", {
            id: socket.id,
            players,
            bullets: [],
            killFeed,
            walls
        });
    });

    // 🧍 movement (server authoritative)
    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p) return;

        p.x = data.x;
        p.y = data.y;
    });

    // 🔫 shoot
    socket.on("shoot", (b) => {
        if (!bullets[ROOM]) bullets[ROOM] = [];

        bullets[ROOM].push({
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

    if (!bullets[ROOM]) bullets[ROOM] = [];

    let bList = bullets[ROOM];

    for (let i = bList.length - 1; i >= 0; i--) {

        let b = bList[i];
        if (!b) continue;

        b.x += b.vx;
        b.y += b.vy;

        // 🧱 walls
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
    }

    // 🔥 SEND CLEAN DATA (IMPORTANT)
    io.emit("state", {
        players,
        bullets: bList,
        killFeed,
        walls
    });

}, 1000 / 60);

server.listen(process.env.PORT || 3000, () =>
    console.log("Server running")
);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let bullets = [];
let killFeed = [];

// 🧱 SIMPLE MAP WALLS
const walls = [
    { x: 300, y: 100, w: 20, h: 300 },
    { x: 500, y: 200, w: 20, h: 300 },
    { x: 150, y: 400, w: 300, h: 20 }
];

function rectHit(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

io.on("connection", (socket) => {
    players[socket.id] = {
        x: 100,
        y: 100,
        hp: 100,
        score: 0
    };

    socket.emit("init", { players, bullets, killFeed, walls });

    socket.on("move", (data) => {
        if (players[socket.id]) {
            let newX = data.x;
            let newY = data.y;

            let testPlayer = { x: newX, y: newY, w: 20, h: 20 };

            // 🧱 wall collision check
            for (let wall of walls) {
                if (rectHit(testPlayer, wall)) {
                    return; // block movement
                }
            }

            players[socket.id].x = newX;
            players[socket.id].y = newY;
        }
    });

    socket.on("shoot", (bullet) => {
        bullets.push({
            ...bullet,
            owner: socket.id
        });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
    });
});

// 🎮 GAME LOOP
setInterval(() => {

    // move bullets
    bullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
    });

    // 💥 bullet collisions
    bullets.forEach((b, index) => {

        // 🧱 wall hit
        for (let wall of walls) {
            if (
                b.x < wall.x + wall.w &&
                b.x + 5 > wall.x &&
                b.y < wall.y + wall.h &&
                b.y + 5 > wall.y
            ) {
                bullets.splice(index, 1);
                return;
            }
        }

        // 👤 player hit
        for (let id in players) {
            if (id === b.owner) continue;

            let p = players[id];

            if (
                b.x < p.x + 20 &&
                b.x + 5 > p.x &&
                b.y < p.y + 20 &&
                b.y + 5 > p.y
            ) {
                p.hp -= 20;
                bullets.splice(index, 1);

                if (p.hp <= 0) {
                    let killer = players[b.owner];

                    if (killer) {
                        killer.score += 1;
                        killFeed.unshift(`Player ${b.owner.slice(0,4)} killed ${id.slice(0,4)}`);
                        killFeed = killFeed.slice(0, 5);
                    }

                    p.hp = 100;
                    p.x = Math.random() * 700;
                    p.y = Math.random() * 500;
                }
            }
        }
    });

    bullets = bullets.filter(b =>
        b.x > 0 && b.x < 800 && b.y > 0 && b.y < 600
    );

    io.emit("state", { players, bullets, killFeed, walls });

}, 1000 / 60);

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
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
let bullets = [];
let killFeed = [];

// 🏆 ROUND SYSTEM
const ROUND_TIME = 180;
let timeLeft = ROUND_TIME;

// 🧱 SPAWNS
const spawns = [
    { x: 100, y: 100 },
    { x: 1000, y: 100 },
    { x: 100, y: 600 },
    { x: 1000, y: 600 }
];

// 🧱 RANDOM WALLS
let walls = generateWalls();

function generateWalls() {
    let arr = [];
    for (let i = 0; i < 6; i++) {
        arr.push({
            x: Math.random() * 1000,
            y: Math.random() * 700,
            w: 30,
            h: 80
        });
    }
    return arr;
}

// 🔄 RESET ROUND
function resetRound() {
    walls = generateWalls();
    bullets = [];
    killFeed = [];
    timeLeft = ROUND_TIME;

    let i = 0;
    for (let id in players) {
        let p = players[id];
        let s = spawns[i % spawns.length];

        p.x = s.x;
        p.y = s.y;
        p.hp = 100;
        p.dead = false;

        i++;
    }
}

io.on("connection", (socket) => {

    players[socket.id] = {
        x: 100,
        y: 100,
        hp: 100,
        elo: 1000,
        kills: 0,
        dead: false
    };

    socket.emit("init", {
        id: socket.id,
        players,
        bullets,
        killFeed,
        walls,
        timeLeft
    });

    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p || p.dead) return;

        p.x = data.x;
        p.y = data.y;
    });

    socket.on("shoot", (b) => {
        let p = players[socket.id];
        if (!p || p.dead) return;

        bullets.push({
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

    timeLeft -= 1 / 60;
    if (timeLeft <= 0) resetRound();

    for (let i = bullets.length - 1; i >= 0; i--) {

        let b = bullets[i];

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
                bullets.splice(i, 1);
                break;
            }
        }

        // 👤 PLAYERS
        for (let id in players) {
            let p = players[id];

            if (!p || p.dead) continue;
            if (id === b.owner) continue;

            if (
                b.x < p.x + 20 &&
                b.x + 5 > p.x &&
                b.y < p.y + 20 &&
                b.y + 5 > p.y
            ) {

                p.hp -= 25;
                bullets.splice(i, 1);

                if (p.hp <= 0) {

                    let killer = players[b.owner];

                    if (killer) {
                        killer.kills++;
                        killer.elo += 25;
                        p.elo -= 15;

                        killFeed.unshift(`${b.owner.slice(0,4)} killed ${id.slice(0,4)}`);
                        killFeed = killFeed.slice(0, 5);
                    }

                    p.dead = true;
                    p.hp = 0;

                    setTimeout(() => {
                        p.dead = false;
                        p.hp = 100;

                        let s = spawns[Math.floor(Math.random() * spawns.length)];
                        p.x = s.x;
                        p.y = s.y;

                    }, 500);
                }
            }
        }
    }

    io.emit("state", {
        players,
        bullets,
        killFeed,
        walls,
        timeLeft: Math.floor(timeLeft)
    });

}, 1000 / 60);

server.listen(process.env.PORT || 3000, () =>
    console.log("Server running")
);

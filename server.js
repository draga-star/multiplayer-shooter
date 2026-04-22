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

// 🏆 RANKED (ELO)
function getElo() {
    return 1000;
}

// 🎮 ROUND SYSTEM
let roundTime = 60;
let timeLeft = roundTime;

// 🧱 RANDOM WALLS PER ROUND
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

    for (let id in players) {
        players[id].x = Math.random() * 1000;
        players[id].y = Math.random() * 700;
        players[id].hp = 100;
    }

    killFeed = [];
    timeLeft = roundTime;
}

// 🏆 WEAPONS
const weapons = {
    pistol: { speed: 8, rate: 120 },
    rifle: { speed: 10, rate: 80 },
    shotgun: { speed: 7, rate: 400 }
};

io.on("connection", (socket) => {

    players[socket.id] = {
        x: 100,
        y: 100,
        hp: 100,
        elo: 1000,
        kills: 0,
        weapon: "pistol"
    };

    socket.emit("init", {
        id: socket.id,
        players,
        bullets,
        killFeed,
        walls,
        timeLeft
    });

    // 🧍 MOVE
    socket.on("move", (data) => {
        let p = players[socket.id];
        if (!p) return;

        p.x = data.x;
        p.y = data.y;
    });

    // 🔫 SHOOT
    socket.on("shoot", (b) => {
        let p = players[socket.id];
        if (!p) return;

        let w = weapons[p.weapon];

        bullets.push({
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            owner: socket.id
        });
    });

    // 🔫 SWITCH WEAPON
    socket.on("weapon", (w) => {
        if (players[socket.id]) {
            players[socket.id].weapon = w;
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
    });
});

// 🎮 GAME LOOP
setInterval(() => {

    // ⏱ round timer
    timeLeft -= 1 / 60;
    if (timeLeft <= 0) resetRound();

    // 🔫 bullets
    for (let i = bullets.length - 1; i >= 0; i--) {

        let b = bullets[i];
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
                bullets.splice(i, 1);
                break;
            }
        }

        // 👤 players
        for (let id in players) {
            if (id === b.owner) continue;

            let p = players[id];

            if (
                b.x < p.x + 20 &&
                b.x + 5 > p.x &&
                b.y < p.y + 20 &&
                b.y + 5 > p.y
            ) {
                p.hp -= 25;

                if (p.hp <= 0) {
                    players[b.owner].kills++;
                    players[b.owner].elo += 25;
                    p.elo -= 15;

                    killFeed.unshift(`${b.owner.slice(0,4)} killed ${id.slice(0,4)}`);
                    killFeed = killFeed.slice(0, 5);

                    p.hp = 100;
                    p.x = Math.random() * 1000;
                    p.y = Math.random() * 700;
                }

                bullets.splice(i, 1);
                break;
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

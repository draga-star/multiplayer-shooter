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

// 🧍 skins
const skins = ["blue", "red", "green", "purple", "orange"];

// 🏅 ranked ELO
function getElo() {
    return 1000;
}

// 🏆 room system (1v1 / 2v2)
function findRoom(mode) {
    for (let id in rooms) {
        if (rooms[id].mode === mode && rooms[id].players.length < (mode === "1v1" ? 2 : 4)) {
            return id;
        }
    }

    let id = Math.random().toString(36).substr(2, 6);
    rooms[id] = { mode, players: [] };
    return id;
}

// 🧱 map
const walls = [
    { x: 400, y: 150, w: 30, h: 400 },
    { x: 800, y: 250, w: 30, h: 400 },
    { x: 200, y: 600, w: 600, h: 30 }
];

function hit(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

io.on("connection", (socket) => {

    socket.on("join", (mode) => {

        let room = findRoom(mode);
        socket.join(room);

        players[socket.id] = {
            x: Math.random() * 800,
            y: Math.random() * 600,
            hp: 100,
            score: 0,
            elo: 1000,
            skin: skins[Math.floor(Math.random() * skins.length)],
            room
        };

        rooms[room].players.push(socket.id);

        if (!bullets[room]) bullets[room] = [];
        if (!killFeed[room]) killFeed[room] = [];

        socket.emit("init", {
            id: socket.id,
            room,
            players,
            bullets: bullets[room],
            killFeed: killFeed[room],
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

        bullets[p.room].push({ ...b, owner: socket.id });
    });

    socket.on("disconnect", () => {
        let p = players[socket.id];
        if (!p) return;

        let room = p.room;
        rooms[room].players = rooms[room].players.filter(x => x !== socket.id);

        delete players[socket.id];
    });
});

// 🎮 LOOP
setInterval(() => {

    for (let room in rooms) {

        let bList = bullets[room];
        if (!bList) continue;

        bList.forEach((b, i) => {

            b.x += b.vx;
            b.y += b.vy;

            // walls
            for (let w of walls) {
                if (
                    b.x < w.x + w.w &&
                    b.x + 5 > w.x &&
                    b.y < w.y + w.h &&
                    b.y + 5 > w.y
                ) {
                    bList.splice(i, 1);
                    return;
                }
            }

            // players
            for (let id in players) {
                let p = players[id];
                if (p.room !== room || id === b.owner) continue;

                if (
                    b.x < p.x + 20 &&
                    b.x + 5 > p.x &&
                    b.y < p.y + 20 &&
                    b.y + 5 > p.y
                ) {
                    p.hp -= 20;
                    bList.splice(i, 1);

                    if (p.hp <= 0) {
                        let killer = players[b.owner];

                        if (killer) {
                            killer.score += 1;
                            killer.elo += 25;
                            p.elo -= 15;

                            killFeed[room].unshift(`${b.owner.slice(0,4)} killed ${id.slice(0,4)}`);
                            killFeed[room] = killFeed[room].slice(0, 5);
                        }

                        p.hp = 100;
                        p.x = Math.random() * 800;
                        p.y = Math.random() * 600;
                    }
                }
            }
        });
    }

    io.emit("state", { players, bullets, killFeed });

}, 1000 / 60);

server.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});

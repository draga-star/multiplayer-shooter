const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 800;

let players = {};
let bullets = [];
let killFeed = [];
let walls = [];
let myId = null;

let keys = {};
let mouse = { x: 0, y: 0 };

let lastShot = 0;

// 🟢 INIT
socket.on("init", (data) => {
    myId = data.id;
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
});

// 🟢 STATE
socket.on("state", (data) => {
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
});

// 🎮 INPUT
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 🖱 MOUSE
canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", shoot);

// 🧍 MOVE (smooth client prediction)
function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 4;

    let x = p.x;
    let y = p.y;

    if (keys["w"]) y -= speed;
    if (keys["s"]) y += speed;
    if (keys["a"]) x -= speed;
    if (keys["d"]) x += speed;

    socket.emit("move", { x, y });
}

// 🔫 SHOOT
function shoot() {
    let p = players[myId];
    if (!p) return;

    let now = Date.now();
    if (now - lastShot < 120) return;
    lastShot = now;

    let angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

    socket.emit("shoot", {
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8
    });
}

// 🎨 DRAW
function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 🧠 FIX BLACK SCREEN
    if (!myId || !players[myId]) {
        ctx.fillStyle = "white";
        ctx.fillText("Loading...", 20, 20);
        requestAnimationFrame(draw);
        return;
    }

    move();

    // 🧱 WALLS
    ctx.fillStyle = "gray";
    for (let w of walls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
    }

    // 👤 PLAYERS
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);
    }

    // 🔫 BULLETS
    ctx.fillStyle = "black";
    if (Array.isArray(bullets)) {
        bullets.forEach(b => {
            if (b && typeof b.x === "number") {
                ctx.fillRect(b.x, b.y, 5, 5);
            }
        });
    }

    requestAnimationFrame(draw);
}

draw();

// JOIN
window.onload = () => {
    socket.emit("join");
};

const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 800;

let players = {};
let bullets = [];
let killFeed = [];
let myId = null;

let keys = {};
let mouse = { x: 0, y: 0 };

let lastShot = 0;

// 🧠 LOCAL PLAYER SMOOTH POSITION (IMPORTANT)
let local = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0
};

// 🔥 JOIN
window.onload = () => {
    socket.emit("join", "1v1");
};

// 🔥 INIT
socket.on("init", (data) => {
    myId = data.id;
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];

    if (players[myId]) {
        local.x = players[myId].x;
        local.y = players[myId].y;
    }
});

// 🔥 STATE (ONLY OTHER PLAYERS)
socket.on("state", (data) => {
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
});

// 🎮 INPUT
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 🖱 MOUSE
canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", shoot);

// 🧍 SMOOTH MOVEMENT (FIXED)
function move() {
    let speed = 4;

    if (keys["w"]) local.y -= speed;
    if (keys["s"]) local.y += speed;
    if (keys["a"]) local.x -= speed;
    if (keys["d"]) local.x += speed;

    // send to server (NOT server control)
    socket.emit("move", { x: local.x, y: local.y });
}

// 🔫 SHOOT (FIXED AIM)
function shoot() {
    let now = Date.now();
    if (now - lastShot < 120) return;
    lastShot = now;

    let angle = Math.atan2(mouse.y - local.y, mouse.x - local.x);

    socket.emit("shoot", {
        x: local.x,
        y: local.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8
    });
}

// 🎨 DRAW
function draw() {
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    move();

    // 🧠 LOCAL PLAYER (NO JITTER)
    ctx.fillStyle = "blue";
    ctx.fillRect(local.x, local.y, 20, 20);

    // 👤 OTHER PLAYERS
    for (let id in players) {
        if (id === myId) continue;

        let p = players[id];
        ctx.fillStyle = "red";
        ctx.fillRect(p.x, p.y, 20, 20);
    }

    // 🔫 BULLETS SAFE
    ctx.fillStyle = "black";
    if (Array.isArray(bullets)) {
        bullets.forEach(b => {
            if (b) ctx.fillRect(b.x, b.y, 5, 5);
        });
    }

    requestAnimationFrame(draw);
}

draw();

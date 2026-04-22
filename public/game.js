const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 800;

let players = {};
let bullets = [];   // ✅ always array
let killFeed = [];
let walls = [];
let myId = null;
let room = null;

let isShooting = false;
let lastShot = 0;
const fireRate = 120;

// 🔊 sound
const shootSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

// 🟢 join game
window.onload = () => {
    let mode = prompt("Choose mode: 1v1 or 2v2") || "1v1";
    socket.emit("join", mode);
};

// 🟢 init
socket.on("init", (data) => {
    myId = data.id;
    room = data.room;

    players = data.players || {};
    bullets = Array.isArray(data.bullets) ? data.bullets : [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
});

// 🟢 state update (SAFE FIX)
socket.on("state", (data) => {
    players = data.players || {};
    bullets = Array.isArray(data.bullets) ? data.bullets : [];
    killFeed = data.killFeed || [];
});

// 🔊 sounds
socket.on("sound", () => {
    shootSound.play();
});

// 🎮 movement
let keys = {};

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 5;

    if (keys["w"]) p.y -= speed;
    if (keys["s"]) p.y += speed;
    if (keys["a"]) p.x -= speed;
    if (keys["d"]) p.x += speed;

    socket.emit("move", { x: p.x, y: p.y });
}

// 🖱 mouse
let mx = 0, my = 0;

canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
});

canvas.addEventListener("mousedown", () => isShooting = true);
canvas.addEventListener("mouseup", () => isShooting = false);

// 🔫 shooting
function shoot() {
    let p = players[myId];
    if (!p) return;

    let now = Date.now();
    if (now - lastShot < fireRate) return;

    lastShot = now;

    let angle = Math.atan2(my - p.y, mx - p.x);

    socket.emit("shoot", {
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7
    });

    shootSound.play();
}

// 🎨 draw loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    move();

    if (isShooting) shoot();

    // 🧱 walls
    ctx.fillStyle = "gray";
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    // 👤 players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);

        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 10, p.hp / 2, 5);

        ctx.fillStyle = "black";
        ctx.fillText(`ELO: ${p.elo || 1000}`, p.x, p.y - 15);
    }

    // 🔫 bullets (SAFE)
    if (Array.isArray(bullets)) {
        ctx.fillStyle = "black";
        bullets.forEach(b => {
            if (b) ctx.fillRect(b.x, b.y, 5, 5);
        });
    }

    // 💀 kill feed
    ctx.fillStyle = "black";
    killFeed.forEach((m, i) => {
        ctx.fillText(m, 10, 20 + i * 20);
    });

    requestAnimationFrame(draw);
}

draw();

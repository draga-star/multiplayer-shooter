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

let isShooting = false;
let lastShot = 0;
const fireRate = 150;

// 🔊 sounds
const shootSound = new Audio("https://actions.google.com/sounds/v1/alarms/medium_bell_ring.ogg");

socket.on("connect", () => {
    myId = socket.id;
});

socket.on("init", (data) => {
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
    walls = data.walls;
});

socket.on("state", (data) => {
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
});

socket.on("sound", (type) => {
    if (type === "shoot") shootSound.play();
});

// movement
document.addEventListener("keydown", (e) => {
    let p = players[myId];
    if (!p) return;

    let x = p.x;
    let y = p.y;

    if (e.key === "w") y -= 6;
    if (e.key === "s") y += 6;
    if (e.key === "a") x -= 6;
    if (e.key === "d") x += 6;

    socket.emit("move", { x, y });
});

// mouse
let mx = 0, my = 0;

canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
});

canvas.addEventListener("mousedown", () => isShooting = true);
canvas.addEventListener("mouseup", () => isShooting = false);

// shooting
function shoot() {
    let p = players[myId];
    if (!p) return;

    let now = Date.now();
    if (now - lastShot < fireRate) return;

    lastShot = now;

    let angle = Math.atan2(my - p.y, mx - p.x);

    socket.emit("shoot", {
        x: p.x + 10,
        y: p.y + 10,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7
    });
}

// draw
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🧱 walls
    ctx.fillStyle = "gray";
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    // players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);

        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 10, p.hp / 2, 5);

        ctx.fillStyle = "black";
        ctx.fillText(p.score, p.x, p.y - 15);
    }

    // bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

    // kill feed
    killFeed.forEach((m, i) => {
        ctx.fillText(m, 10, 20 + i * 20);
    });

    if (isShooting) shoot();

    requestAnimationFrame(draw);
}

draw();

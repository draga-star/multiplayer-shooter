const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

let players = {};
let bullets = [];
let killFeed = [];
let walls = [];
let myId = null;

let isShooting = false;
let lastShot = 0;
const fireRate = 200;

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
    walls = data.walls;
});

// movement
document.addEventListener("keydown", (e) => {
    if (!players[myId]) return;

    let p = players[myId];

    let newX = p.x;
    let newY = p.y;

    if (e.key === "w") newY -= 5;
    if (e.key === "s") newY += 5;
    if (e.key === "a") newX -= 5;
    if (e.key === "d") newX += 5;

    socket.emit("move", { x: newX, y: newY });
});

// shooting
canvas.addEventListener("mousedown", () => {
    isShooting = true;
});

canvas.addEventListener("mouseup", () => {
    isShooting = false;
});

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (e) => {
    let rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

function handleShooting() {
    if (!isShooting || !players[myId]) return;

    let now = Date.now();
    if (now - lastShot < fireRate) return;

    lastShot = now;

    let p = players[myId];

    let angle = Math.atan2(mouseY - p.y, mouseX - p.x);
    let speed = 6;

    socket.emit("shoot", {
        x: p.x + 10,
        y: p.y + 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
    });
}

// draw
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🧱 walls
    ctx.fillStyle = "gray";
    walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
    });

    // players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);

        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 10, p.hp / 2, 5);

        ctx.fillStyle = "black";
        ctx.fillText(`K: ${p.score}`, p.x, p.y - 20);
    }

    // bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, 5, 5);
    });

    // kill feed
    ctx.fillStyle = "black";
    killFeed.forEach((msg, i) => {
        ctx.fillText(msg, 10, 20 + i * 20);
    });

    handleShooting();
    requestAnimationFrame(draw);
}

draw();

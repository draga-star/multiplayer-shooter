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

// 🔥 JOIN
window.onload = () => {
    socket.emit("join", "1v1");
};

// 🔥 INIT
socket.on("init", (data) => {
    myId = data.id;
    players = data.players || {};

    bullets = normalizeBullets(data.bullets);
    killFeed = Array.isArray(data.killFeed) ? data.killFeed : [];
});

// 🔥 STATE (IMPORTANT FIX)
socket.on("state", (data) => {
    players = data.players || {};
    bullets = normalizeBullets(data.bullets);
    killFeed = Array.isArray(data.killFeed) ? data.killFeed : [];
});

// 🧠 FIX: makes bullets ALWAYS array
function normalizeBullets(data) {
    if (Array.isArray(data)) return data;
    if (!data) return [];
    return Object.values(data).flat();
}

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

// 🧍 MOVE
function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 5;

    let x = p.x;
    let y = p.y;

    if (keys["w"]) y -= speed;
    if (keys["s"]) y += speed;
    if (keys["a"]) x -= speed;
    if (keys["d"]) x += speed;

    socket.emit("move", { x, y });
}

// 🔫 SHOOT (aim fix)
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

// 🎨 DRAW LOOP
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    move();

    // 👤 players
    for (let id in players) {
        let p = players[id];
        if (!p) continue;

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);
    }

    // 🔫 bullets (SAFE FIX)
    ctx.fillStyle = "black";
    if (Array.isArray(bullets)) {
        bullets.forEach(b => {
            if (b && typeof b.x === "number") {
                ctx.fillRect(b.x, b.y, 5, 5);
            }
        });
    }

    // 💀 kill feed (SAFE)
    ctx.fillStyle = "black";
    if (Array.isArray(killFeed)) {
        killFeed.forEach((m, i) => {
            ctx.fillText(m, 10, 20 + i * 20);
        });
    }

    requestAnimationFrame(draw);
}

draw();

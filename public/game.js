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
let timeLeft = 0;

let keys = {};
let mouse = { x: 0, y: 0 };

let lastShot = 0;

// 📱 MOBILE DETECT
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

// 📱 TOUCH STATE
let touch = {
    up: false,
    down: false,
    left: false,
    right: false
};

// 🟢 INIT
socket.on("init", (data) => {
    myId = data.id;

    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
    timeLeft = data.timeLeft;

    createMobileControls(); // IMPORTANT
});

// 🟢 STATE UPDATE
socket.on("state", (data) => {
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
    timeLeft = data.timeLeft;
});

// 🎮 KEYBOARD
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 🖱 MOUSE AIM
canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", shoot);

// 📱 MOBILE CONTROLS (FULL FIX)
function createMobileControls() {

    if (!isMobile) return;

    if (document.getElementById("mobile-controls")) return;

    const container = document.createElement("div");
    container.id = "mobile-controls";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.left = "20px";
    container.style.zIndex = "9999";

    const btnStyle = `
        width:70px;
        height:70px;
        margin:5px;
        font-size:22px;
        border:none;
        border-radius:12px;
        background:rgba(255,255,255,0.25);
        color:white;
        touch-action:none;
    `;

    function btn(text, down, up) {
        let b = document.createElement("button");
        b.innerText = text;
        b.style = btnStyle;

        b.addEventListener("touchstart", (e) => {
            e.preventDefault();
            down();
        });

        b.addEventListener("touchend", (e) => {
            e.preventDefault();
            up();
        });

        return b;
    }

    const up = btn("↑", () => touch.up = true, () => touch.up = false);
    const down = btn("↓", () => touch.down = true, () => touch.down = false);
    const left = btn("←", () => touch.left = true, () => touch.left = false);
    const right = btn("→", () => touch.right = true, () => touch.right = false);

    const shootBtn = document.createElement("button");
    shootBtn.innerText = "🔫";
    shootBtn.style = `
        position:fixed;
        right:20px;
        bottom:40px;
        width:80px;
        height:80px;
        font-size:24px;
        border:none;
        border-radius:50%;
        background:rgba(255,0,0,0.4);
        color:white;
        z-index:9999;
        touch-action:none;
    `;

    shootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        shoot();
    });

    container.appendChild(up);
    container.appendChild(left);
    container.appendChild(right);
    container.appendChild(down);

    document.body.appendChild(container);
    document.body.appendChild(shootBtn);
}

// 🧍 MOVE (PC + MOBILE)
function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 4;

    let x = p.x;
    let y = p.y;

    if (isMobile) {
        if (touch.up) y -= speed;
        if (touch.down) y += speed;
        if (touch.left) x -= speed;
        if (touch.right) x += speed;
    } else {
        if (keys["w"]) y -= speed;
        if (keys["s"]) y += speed;
        if (keys["a"]) x -= speed;
        if (keys["d"]) x += speed;
    }

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

// 🎨 DRAW LOOP
function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!players[myId]) {
        requestAnimationFrame(draw);
        return;
    }

    move();

    // 🧱 walls
    ctx.fillStyle = "gray";
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    // 👤 players + HEALTH BAR
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);

        // 🟢 health bar
        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 8, (p.hp || 100) / 2, 5);
    }

    // 🔫 bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

    // 🏆 timer
    ctx.fillStyle = "white";
    ctx.fillText("Time: " + timeLeft, 20, 20);

    requestAnimationFrame(draw);
}

draw();

// 🚀 JOIN
window.onload = () => socket.emit("join");

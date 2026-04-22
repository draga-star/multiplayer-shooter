const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 800;

// 🧠 GAME STATE
let players = {};
let bullets = [];
let killFeed = [];
let walls = [];
let myId = null;

let keys = {};
let mouse = { x: 0, y: 0 };

let lastShot = 0;

// 📱 DEVICE DETECTION (IMPORTANT)
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

// 📱 TOUCH INPUT STORAGE
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

    if (isMobile) createMobileControls();
});

// 🟢 STATE UPDATE
socket.on("state", (data) => {
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
});

// 🎮 KEYBOARD
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 🖱 MOUSE
canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", () => shoot());

// 📱 MOBILE CONTROLS (AUTO ONLY ON MOBILE)
function createMobileControls() {

    const style = `
        position:fixed;
        width:70px;height:70px;
        background:rgba(255,255,255,0.2);
        color:white;
        font-size:20px;
        border:none;
        border-radius:10px;
        z-index:999;
    `;

    function btn(text, left, bottom, onDown, onUp) {
        let b = document.createElement("button");
        b.innerText = text;
        b.style = style + `left:${left}px;bottom:${bottom}px;`;
        b.ontouchstart = () => onDown();
        b.ontouchend = () => onUp();
        document.body.appendChild(b);
    }

    btn("↑", 80, 140, () => touch.up = true, () => touch.up = false);
    btn("↓", 80, 40, () => touch.down = true, () => touch.down = false);
    btn("←", 10, 90, () => touch.left = true, () => touch.left = false);
    btn("→", 150, 90, () => touch.right = true, () => touch.right = false);

    let shootBtn = document.createElement("button");
    shootBtn.innerText = "🔫";
    shootBtn.style = style + "right:40px;bottom:80px;";
    shootBtn.ontouchstart = () => shoot();
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

    // 🧠 safety check
    if (!myId || !players[myId]) {
        ctx.fillStyle = "white";
        ctx.fillText("Loading...", 20, 20);
        requestAnimationFrame(draw);
        return;
    }

    move();

    // 🧱 walls
    ctx.fillStyle = "gray";
    for (let w of walls) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
    }

    // 🧍 PLAYERS (SKINS SYSTEM)
    for (let id in players) {
        let p = players[id];
        if (!p) continue;

        let color = p.skin || "red";

        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, 20, 20);

        if (id === myId) {
            ctx.strokeStyle = "white";
            ctx.strokeRect(p.x, p.y, 20, 20);
        }
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

// 🚀 JOIN GAME
window.onload = () => {
    socket.emit("join");
};

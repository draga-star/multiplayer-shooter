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
let weapon = "pistol"; // 🔫 weapon system

// 📱 MOBILE CONTROLS
let touch = {
    left:false,
    right:false,
    up:false,
    down:false,
    shoot:false
};

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

// 📱 MOBILE BUTTONS
function createMobileButtons() {

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

    let up = document.createElement("button");
    up.innerText = "↑";
    up.style = style + "bottom:140px;left:80px;";
    up.ontouchstart = () => touch.up = true;
    up.ontouchend = () => touch.up = false;
    document.body.appendChild(up);

    let down = document.createElement("button");
    down.innerText = "↓";
    down.style = style + "bottom:40px;left:80px;";
    down.ontouchstart = () => touch.down = true;
    down.ontouchend = () => touch.down = false;
    document.body.appendChild(down);

    let left = document.createElement("button");
    left.innerText = "←";
    left.style = style + "bottom:90px;left:10px;";
    left.ontouchstart = () => touch.left = true;
    left.ontouchend = () => touch.left = false;
    document.body.appendChild(left);

    let right = document.createElement("button");
    right.innerText = "→";
    right.style = style + "bottom:90px;left:150px;";
    right.ontouchstart = () => touch.right = true;
    right.ontouchend = () => touch.right = false;
    document.body.appendChild(right);

    let shootBtn = document.createElement("button");
    shootBtn.innerText = "🔫";
    shootBtn.style = style + "bottom:80px;right:40px;";
    shootBtn.ontouchstart = () => shoot();
    document.body.appendChild(shootBtn);
}

createMobileButtons();

// 🧍 MOVE
function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 4;

    let x = p.x;
    let y = p.y;

    // keyboard
    if (keys["w"] || touch.up) y -= speed;
    if (keys["s"] || touch.down) y += speed;
    if (keys["a"] || touch.left) x -= speed;
    if (keys["d"] || touch.right) x += speed;

    socket.emit("move", { x, y });
}

// 🔫 WEAPON SYSTEM
function shoot() {
    let p = players[myId];
    if (!p) return;

    let now = Date.now();

    let fireRate = weapon === "shotgun" ? 400 : 150;

    if (now - lastShot < fireRate) return;
    lastShot = now;

    let angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

    // 🔫 weapon types
    if (weapon === "shotgun") {

        for (let i = -2; i <= 2; i++) {
            socket.emit("shoot", {
                x: p.x,
                y: p.y,
                vx: Math.cos(angle + i * 0.1) * 7,
                vy: Math.sin(angle + i * 0.1) * 7
            });
        }

    } else {

        socket.emit("shoot", {
            x: p.x,
            y: p.y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8
        });
    }
}

// 🎨 DRAW
function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    // 👤 players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);
    }

    // 🔫 bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => {
        if (b) ctx.fillRect(b.x, b.y, 5, 5);
    });

    // 🔫 UI weapon text
    ctx.fillStyle = "white";
    ctx.fillText("Weapon: " + weapon, 20, 20);

    requestAnimationFrame(draw);
}

draw();

// JOIN
window.onload = () => {
    socket.emit("join");
};

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

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

// 🎮 JOYSTICK STATE (FIXED)
let moveDir = { x: 0, y: 0 };
let aimDir = { x: 0, y: 0 };

let shootHeld = false;
let lastShot = 0;

// =====================
// 🟢 SOCKET EVENTS
// =====================
socket.on("init", (data) => {
    myId = data.id;
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
    walls = data.walls;
    timeLeft = data.timeLeft;

    if (isMobile) createMobileControls();
});

socket.on("state", (data) => {
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
    walls = data.walls;
    timeLeft = data.timeLeft;
});

// =====================
// 💻 PC CONTROLS
// =====================
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", e => {
    let r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", () => shootHeld = true);
canvas.addEventListener("mouseup", () => shootHeld = false);

// =====================
// 🔫 SHOOT (FIXED RATE LIMIT)
// =====================
function shoot(angle) {
    let p = players[myId];
    if (!p) return;

    let now = Date.now();
    if (now - lastShot < 120) return;
    lastShot = now;

    socket.emit("shoot", {
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8
    });
}

// =====================
// 📱 MOBILE CONTROLS (NO SPAM FIX)
// =====================
function createMobileControls() {

    if (document.getElementById("mobile")) return;

    const container = document.createElement("div");
    container.id = "mobile";
    document.body.appendChild(container);

    container.style.position = "fixed";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.zIndex = "9999";
    container.style.top = "0";
    container.style.left = "0";

    function joystick(xPos, yPos, callback) {
        const joy = document.createElement("div");

        joy.style = `
            position:fixed;
            width:120px;
            height:120px;
            border-radius:50%;
            background:rgba(255,255,255,0.1);
            ${xPos}:${yPos};
            touch-action:none;
        `;

        let active = false;

        joy.addEventListener("touchstart", e => {
            active = true;
        });

        joy.addEventListener("touchmove", e => {
            if (!active) return;

            let t = e.touches[0];
            let rect = joy.getBoundingClientRect();

            let dx = t.clientX - (rect.left + 60);
            let dy = t.clientY - (rect.top + 60);

            let len = Math.sqrt(dx*dx + dy*dy);
            if (len > 45) {
                dx /= len;
                dy /= len;
            }

            callback(dx, dy);
        });

        joy.addEventListener("touchend", () => {
            active = false;
            callback(0, 0);
        });

        container.appendChild(joy);
    }

    // 🧍 MOVE JOYSTICK
    joystick("left:20px", "bottom:20px", (x, y) => {
        moveDir.x = x;
        moveDir.y = y;
    });

    // 🎯 AIM JOYSTICK (NO AUTO SHOOT SPAM)
    joystick("right:20px", "bottom:20px", (x, y) => {
        aimDir.x = x;
        aimDir.y = y;
    });

    // 🔫 SHOOT BUTTON (SEPARATE)
    const shootBtn = document.createElement("button");
    shootBtn.innerText = "🔫";

    shootBtn.style = `
        position:fixed;
        right:20px;
        bottom:120px;
        width:80px;
        height:80px;
        border-radius:50%;
        font-size:24px;
        background:red;
        color:white;
        border:none;
        touch-action:none;
    `;

    shootBtn.addEventListener("touchstart", e => {
        e.preventDefault();
        shootHeld = true;
    });

    shootBtn.addEventListener("touchend", e => {
        e.preventDefault();
        shootHeld = false;
    });

    container.appendChild(shootBtn);
}

// =====================
// 🧍 MOVE SYSTEM (FIXED MOBILE + PC)
// =====================
function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 4;

    let x = p.x;
    let y = p.y;

    if (isMobile) {
        x += moveDir.x * speed;
        y += moveDir.y * speed;
    } else {
        if (keys["w"]) y -= speed;
        if (keys["s"]) y += speed;
        if (keys["a"]) x -= speed;
        if (keys["d"]) x += speed;
    }

    socket.emit("move", { x, y });
}

// =====================
// 🎯 AIM + SHOOT LOOP
// =====================
function updateShoot() {

    let p = players[myId];
    if (!p) return;

    let angle;

    if (isMobile) {
        angle = Math.atan2(aimDir.y, aimDir.x);
    } else {
        angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);
    }

    if (shootHeld) shoot(angle);
}

// =====================
// 🎮 DRAW LOOP
// =====================
function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!players[myId]) return requestAnimationFrame(draw);

    move();
    updateShoot();

    // walls
    ctx.fillStyle = "gray";
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    // players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);

        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 8, (p.hp || 100) / 2, 5);
    }

    // bullets
    ctx.fillStyle = "white";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

    requestAnimationFrame(draw);
}

draw();

// 🚀 START
window.onload = () => socket.emit("join");

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
const fireRate = 120;

// 🔊 sound
const shootSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

// join
window.onload = () => {
    let mode = prompt("1v1 or 2v2") || "1v1";
    socket.emit("join", mode);
};

// init
socket.on("init", (data) => {
    myId = data.id;
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
    walls = data.walls || [];
});

// state
socket.on("state", (data) => {
    players = data.players || {};
    bullets = data.bullets || [];
    killFeed = data.killFeed || [];
});

// input
document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// mouse
canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", shoot);

// movement (SMOOTH CLIENT PREDICTION)
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

// shoot (FIXED AIM)
function shoot() {
    let p = players[myId];
    if (!p) return;

    let now = Date.now();
    if (now - lastShot < fireRate) return;

    lastShot = now;

    let angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

    socket.emit("shoot", {
        x: p.x + 10,
        y: p.y + 10,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8
    });

    shootSound.play();
}

// draw
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    move();

    // walls
    ctx.fillStyle = "gray";
    walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    // players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);

        ctx.fillStyle = "green";
        ctx.fillRect(p.x, p.y - 10, (p.hp || 100) / 2, 5);
    }

    // bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

    requestAnimationFrame(draw);
}

draw();

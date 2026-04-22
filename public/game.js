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

// join
window.onload = () => {
    socket.emit("join", "1v1");
};

// init
socket.on("init", (data) => {
    myId = data.id;
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
});

// state
socket.on("state", (data) => {
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
});

// input
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// mouse
canvas.addEventListener("mousemove", (e) => {
    let r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});

canvas.addEventListener("mousedown", shoot);

// movement
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

// draw
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    move();

    // players
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x, p.y, 20, 20);
    }

    // bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 5));

    requestAnimationFrame(draw);
}

draw();

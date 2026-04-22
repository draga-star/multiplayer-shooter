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

// 📱 MOBILE
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

let moveJoy = { x: 0, y: 0 };
let aimJoy = { x: 0, y: 0 };

// 🟢 INIT
socket.on("init", (data) => {
    myId = data.id;
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
    walls = data.walls;
    timeLeft = data.timeLeft;

    if (isMobile) createJoysticks();
});

// 🟢 STATE
socket.on("state", (data) => {
    players = data.players;
    bullets = data.bullets;
    killFeed = data.killFeed;
    walls = data.walls;
    timeLeft = data.timeLeft;
});

// 🎮 KEYBOARD
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// 🧠 AIM ASSIST
function aimAssist(px, py, angle) {
    let best = angle;
    let minDist = 120;

    for (let id in players) {
        if (id === myId) continue;

        let p = players[id];
        if (!p) continue;

        let dx = p.x - px;
        let dy = p.y - py;

        let dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < minDist) {
            minDist = dist;
            best = Math.atan2(dy, dx);
        }
    }

    return best;
}

// 🎮 JOYSTICKS
function createJoysticks() {

    const container = document.createElement("div");
    document.body.appendChild(container);

    container.style.position = "fixed";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.zIndex = "9999";

    function joy(left, bottom, onMove) {
        let d = document.createElement("div");
        d.style = `
            position:fixed;
            width:120px;
            height:120px;
            border-radius:50%;
            background:rgba(255,255,255,0.1);
            ${left}:${bottom};
        `;

        d.addEventListener("touchmove", (e) => {
            let t = e.touches[0];
            let rect = d.getBoundingClientRect();

            let dx = t.clientX - rect.left - 60;
            let dy = t.clientY - rect.top - 60;

            let len = Math.sqrt(dx*dx + dy*dy);
            if (len > 50) {
                dx /= len;
                dy /= len;
            }

            onMove(dx, dy);
        });

        d.addEventListener("touchend", () => onMove(0,0));

        container.appendChild(d);
    }

    // MOVE
    joy("left:20px", "bottom:20px", (x,y)=>{
        moveJoy.x = x;
        moveJoy.y = y;
    });

    // AIM
    joy("right:20px", "bottom:20px", (x,y)=>{
        aimJoy.x = x;
        aimJoy.y = y;

        let p = players[myId];
        if (!p) return;

        let angle = Math.atan2(y, x);
        angle = aimAssist(p.x, p.y, angle);

        shoot(angle);
    });
}

// 🧍 MOVE
function move() {
    let p = players[myId];
    if (!p) return;

    let speed = 4;

    let x = p.x;
    let y = p.y;

    if (isMobile) {
        x += moveJoy.x * speed;
        y += moveJoy.y * speed;
    } else {
        if (keys["w"]) y -= speed;
        if (keys["s"]) y += speed;
        if (keys["a"]) x -= speed;
        if (keys["d"]) x += speed;
    }

    socket.emit("move", { x, y });
}

// 🔫 SHOOT
function shoot(angle) {
    let p = players[myId];
    if (!p) return;

    socket.emit("shoot", {
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8
    });
}

// 🎨 DRAW
function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if (!players[myId]) return requestAnimationFrame(draw);

    move();

    // walls
    ctx.fillStyle = "gray";
    walls.forEach(w => ctx.fillRect(w.x,w.y,w.w,w.h));

    // players + HP
    for (let id in players) {
        let p = players[id];

        ctx.fillStyle = id === myId ? "blue" : "red";
        ctx.fillRect(p.x,p.y,20,20);

        ctx.fillStyle = "green";
        ctx.fillRect(p.x,p.y-8,(p.hp||100)/2,5);
    }

    // bullets
    ctx.fillStyle = "black";
    bullets.forEach(b => ctx.fillRect(b.x,b.y,5,5));

    ctx.fillStyle = "white";
    ctx.fillText("Time: " + timeLeft, 20, 20);

    requestAnimationFrame(draw);
}

draw();

window.onload = () => socket.emit("join");

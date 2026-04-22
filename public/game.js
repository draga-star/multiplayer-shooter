console.log("GAME.JS LOADED");

window.onerror = function(msg, src, line, col, err) {
    console.log("JS ERROR:", msg, "Line:", line);
};

const socket = io();

console.log("SOCKET CREATED");

socket.on("connect", () => {
    console.log("SOCKET CONNECTED:", socket.id);
});

socket.on("connect_error", (err) => {
    console.log("SOCKET ERROR:", err.message);
});

socket.on("init", (data) => {
    console.log("INIT RECEIVED:", data);
});

socket.on("state", (data) => {
    console.log("STATE RECEIVED:", data);
});

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 1200;
canvas.height = 800;

function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillText("DIAGNOSTIC RUNNING", 20, 20);

    requestAnimationFrame(draw);
}

draw();

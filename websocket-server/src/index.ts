import { WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import os from 'os';

const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", (ws) => {
    console.log("Client connected");

    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env as Record<string, string>,
    });
    ptyProcess.onData((data) => ws.send(data));
    ws.on("message", (msg) => {
        ptyProcess.write(msg.toString());
    });
    ws.on("close", () => {
        console.log("Client disconnected");
        ptyProcess.kill();
    });
});

console.log("WebSocket + PTY server running on ws://localhost:3001");

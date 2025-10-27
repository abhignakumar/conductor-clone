import { WebSocketServer } from "ws";
import { spawn, IPty } from "node-pty";

const PORT = parseInt(process.env.PORT || "3001");
const wss = new WebSocketServer({ port: PORT });

const CODING_AGENT_PATH = "/Users/abhigna/Documents/Abhi/Job/Interviews/Conductor/Repo/coding-agent";

interface WorkspaceSession {
    pty: IPty;
    logs: string[];
}

const workspaces: Record<string, WorkspaceSession | null> = {};

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (msg) => {
        const data = JSON.parse(msg.toString());
        const { action, workspaceName, command, input } = data;

        switch (action) {
            case "START":
                if (workspaces[workspaceName]) {
                    ws.send(JSON.stringify({ type: "error", message: "Already running" }));
                    return;
                }
                const shell = process.platform === "win32" ? "powershell.exe" : "bash";
                const ptyProcess = spawn(shell, [], {
                    name: "xterm-color",
                    cols: 80,
                    rows: 24,
                    cwd: CODING_AGENT_PATH,
                    env: process.env,
                });
                const session: WorkspaceSession = { pty: ptyProcess, logs: [] };
                workspaces[workspaceName] = session;
                ptyProcess.onData((data: string) => {
                    session.logs.push(data);
                    if (session.logs.length > 1000) session.logs.shift();
                    ws.send(JSON.stringify({ type: "output", workspaceName, data }));
                });
                ptyProcess.write(`${command}\r`);
                break;

            case "INPUT":
                workspaces[workspaceName]?.pty.write(input);
                break;

            case "STOP":
                if (workspaces[workspaceName]) {
                    workspaces[workspaceName].pty.kill();
                    workspaces[workspaceName] = null;
                    ws.send(JSON.stringify({ type: "stopped", workspaceName }));
                }
                break;

            case "RESUME":
                const resumed = workspaces[workspaceName];
                if (resumed) {
                    ws.send(
                        JSON.stringify({
                            type: "restore_logs",
                            workspaceName,
                            logs: resumed.logs,
                        })
                    );
                }
                break;
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
        Object.entries(workspaces).forEach(([_, session]) => {
            if (session)
                session.pty.kill();
        });
        const workspacesKeys = Object.keys(workspaces);
        workspacesKeys.forEach((key) => delete workspaces[key]);
    });
});

console.log(`WebSocket + PTY server running on ws://localhost:${PORT} ...`);
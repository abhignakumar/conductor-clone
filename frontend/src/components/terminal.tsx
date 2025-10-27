import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function TerminalView({ workspaceName, socket }: {
    workspaceName: string;
    socket: WebSocket | null;
}) {
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const fitAddon = new FitAddon();

    useEffect(() => {
        if (!terminalRef.current || !socket) return;

        const xterm = new Terminal({
            cursorBlink: true,
            theme: { background: "#1e1e1e" },
        });
        xterm.loadAddon(fitAddon);
        xterm.open(terminalRef.current);
        fitAddon.fit();

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.workspaceName !== workspaceName) return;

            switch (msg.type) {
                case "output":
                    xterm.write(msg.data);
                    break;

                case "restore_logs":
                    xterm.clear();
                    msg.logs.forEach((chunk: string) => xterm.write(chunk));
                    break;

                case "stopped":
                    xterm.write("\r\n[Session stopped]\r\n");
                    break;
            }
        };

        xterm.onData((input) => {
            socket.send(JSON.stringify({ action: "INPUT", workspaceName, input }));
        });
        window.addEventListener("resize", () => fitAddon.fit());

        return () => {
            window.removeEventListener("resize", () => fitAddon.fit());
            xterm.dispose();
        };
    }, [workspaceName, socket]);

    return <div ref={terminalRef} className="h-full w-full bg-black" />;
}

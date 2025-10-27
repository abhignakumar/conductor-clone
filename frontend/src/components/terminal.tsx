import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Terminal({ term, socket }: { term: XTerm, socket: WebSocket }) {
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const fitAddon = useRef(new FitAddon()).current;
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        term.loadAddon(fitAddon);
        term.open(terminalRef.current!);
        fitAddon.fit();
        socketRef.current = socket;
        window.addEventListener("resize", () => fitAddon.fit());
    }, [fitAddon]);

    return (
        <div
            ref={terminalRef}
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#1e1e1e",
                borderRadius: "6px",
            }}
        />
    );
}

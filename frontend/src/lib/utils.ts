import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Terminal as XTerm } from "xterm"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createTerminalConnection() {
  const term = new XTerm({
    cursorBlink: true,
    fontFamily: "monospace",
    fontSize: 14,
    theme: { background: "#1e1e1e" },
  });
  const socket = new WebSocket("ws://localhost:3001");
  socket.onopen = () => {
    term.writeln("Connected to backend shell.\r\n");
  };
  socket.onmessage = (event) => {
    term.write(event.data);
  };
  socket.onclose = () => {
    term.writeln("\r\n*** Connection closed ***");
  };
  term.onData((data) => {
    socket.send(data);
  });
  return { term, socket };
}


# Conductor Clone

This project is a clone of the Y-Combinator backed startup "Conductor," enhanced with a parallel agents feature and a custom CLI AI Coding Agent implementation. Conductor is a powerful development environment that enables developers to work with multiple isolated workspaces simultaneously, each running its own `Claude Code`.

## Features

- **Parallel Development Workspaces**: Create and manage multiple isolated workspaces for your projects
- **Custom AI Coding Agent**: Built-in CLI agent using File System MCP (Model Context Protocol) Server
- **Real-time Collaboration**: Interact with multiple workspaces simultaneously
- **Modern Tech Stack**: Built with React, TypeScript, Express, and WebSockets

## System Architecture

![System Architecture](system_design.png)

## Project Structure

```
Repo/
├── backend/            # Express server for handling API requests
├── coding-agent/       # Custom CLI AI Coding Agent implementation
├── frontend/           # React-based user interface
└── websocket-server/   # WebSocket server for real-time communication
```

## Prerequisites

- Node.js (v16 or later)
- pnpm

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/abhignakumar/conductor-clone
cd conductor-clone
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies
cd backend
pnpm install

# Install coding agent dependencies
cd coding-agent
pnpm install

# Install WebSocket server dependencies
cd websocket-server
pnpm install
```

### 3. Set Up Environment Variables

Create `.env` files in each directory based on the provided `.env.example` files.

### 4. Start the Application

#### In separate terminal windows, run:

```bash
# Start the backend server
cd backend
pnpm start

# Start the WebSocket server
cd websocket-server
pnpm start

# Start the frontend application
cd frontend
pnpm start
```

## Custom AI Coding Agent

The project includes a custom CLI AI Coding Agent that implements the File System MCP (Model Context Protocol) Server. This agent provides intelligent code completion, suggestions, and automated refactoring capabilities.

### Key Features:
- File system operations through MCP protocol
- Context-aware code suggestions
- Parallel processing of multiple workspaces
- Integration with the WebSocket server for real-time updates

---
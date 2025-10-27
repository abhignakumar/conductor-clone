import express from "express";
import cors from "cors";
import fs from "fs";
import { copyDirectorySync } from "./utils";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

let originalProjectPath: string;
let projectName: string;

app.post("/select-project", (req, res) => {
    const { projectPath } = req.body;
    originalProjectPath = projectPath;
    projectName = originalProjectPath.split("/")[originalProjectPath.split("/").length - 1];
    res.json({ message: "Project selected." });
})

app.get("/workspaces", (req, res) => {
    const workspaceProjects = fs.readdirSync(process.env.WORKSPACES_PATH!);
    const isExisting = workspaceProjects.includes(projectName);
    if (!isExisting)
        fs.mkdirSync(`${process.env.WORKSPACES_PATH}/${projectName}`);
    const workspaces = fs.readdirSync(`${process.env.WORKSPACES_PATH}/${projectName}`);
    res.json({ workspaces });
});

app.post("/workspaces", (req, res) => {
    const { workspaceName } = req.body;
    const workspaces = fs.readdirSync(`${process.env.WORKSPACES_PATH}/${projectName}`);
    const isExisting = workspaces.includes(workspaceName);
    if (isExisting)
        return res.status(400).json({ message: "Workspace with this name already exists." });
    try {
        const destination = `${process.env.WORKSPACES_PATH}/${projectName}/${workspaceName}`;
        copyDirectorySync(originalProjectPath, destination);
        res.json({ message: "Workspace created." });
    } catch (error) {
        console.error("Error creating workspace:", error);
        res.status(500).json({ message: "Failed to create workspace." });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} ...`);
});
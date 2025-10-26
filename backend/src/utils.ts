import fs from "fs";
import path from "path";

export function copyDirectorySync(source: string, destination: string) {
    if (!fs.existsSync(destination))
        fs.mkdirSync(destination, { recursive: true });
    const files = fs.readdirSync(source);
    for (const file of files) {
        const srcPath = path.join(source, file);
        const destPath = path.join(destination, file);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory())
            copyDirectorySync(srcPath, destPath);
        else
            fs.copyFileSync(srcPath, destPath);
    }
}
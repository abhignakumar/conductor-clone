import { CodingAgent } from "./agent";
import { inputFromUserTerminal } from "./utils";
import "dotenv/config";

async function main() {
    console.log("=================================");
    console.log("       AI Coding Agent");
    console.log("=================================");
    console.log("Enter 'exit' to exit.");
    const agent = new CodingAgent(process.env.MODEL_NAME!);
    while (true) {
        const userPrompt = await inputFromUserTerminal("> ");
        if (userPrompt === "exit") {
            await agent.mcpClient.disconnect();
            process.exit(0);
        }
        await agent.run(userPrompt, ["toolNode"])
    }
}

main();
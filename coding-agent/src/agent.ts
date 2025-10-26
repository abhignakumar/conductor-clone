import "dotenv/config";
import { Content, GoogleGenAI } from "@google/genai";
import { MCPClient } from "./mcp-client";
import { getHumanApproval } from "./utils";

interface State<T> {
    data: T;
    reducer?: (cur: T, update: T) => T;
}

class AgentState {
    userPrompt: State<string> = { data: "" }
    plan: State<string> = { data: "" }
    messages: State<Content[]> = { data: [], reducer: (cur: Content[], update: Content[]) => { return [...cur, ...update] } }
}

type ReturnState = {
    [key in keyof AgentState]?: AgentState[key] extends State<infer U> ? U : never;
}

export class CodingAgent {
    agentState: AgentState;
    geminiModel: GoogleGenAI;
    modelName: string;
    mcpClient: MCPClient;

    nameNodeMapper: Record<string, Function> = {
        START: () => this.START(),
        planNode: () => this.planNode(),
        llmNode: () => this.llmNode(),
        toolNode: () => this.toolNode(),
    }
    edges: Record<string, () => string> = {
        START: () => "planNode",
        planNode: () => "llmNode",
        llmNode: () => this.llmOutputEdge(),
        toolNode: () => "llmNode"
    }

    constructor(modelName: string) {
        this.geminiModel = new GoogleGenAI({});
        this.mcpClient = new MCPClient();
        this.agentState = new AgentState();
        this.modelName = modelName;
    }

    async connectToMCPServer(source: string) {
        await this.mcpClient.connectToLocalServer("docker", [
            "run",
            "-i",
            "--rm",
            "--mount", `type=bind,src=${source},dst=/project/`,
            "mcp/filesystem",
            "/project"
        ])
    }

    async START(): Promise<ReturnState> {
        return {}
    }

    async planNode(): Promise<ReturnState> {
        const response = await this.geminiModel.models.generateContent({
            model: this.modelName,
            contents: this.agentState.userPrompt.data,
            config: {
                systemInstruction: "You are a coding AI agent. Give a small plan to implement the user prompt."
            }
        });
        const responseContent = response.candidates && response.candidates[0].content;
        console.log("\n" + responseContent?.parts?.[0]?.text + "\n");
        return { plan: responseContent?.parts?.[0]?.text };
    }

    async llmNode(): Promise<ReturnState> {
        const response = await this.geminiModel.models.generateContent({
            model: this.modelName,
            contents: this.agentState.messages.data,
            config: {
                systemInstruction: "You are a coding AI agent. You have access to tools of File System MCP Server (Model Context Protocol). Implement the following plan: \n" + this.agentState.plan.data,
                tools: [
                    {
                        functionDeclarations: this.mcpClient.getMCPTools()
                    }
                ]
            }
        });
        const responseContent = response.candidates && response.candidates[0].content;
        for (const part of responseContent?.parts || []) {
            if (part.text)
                console.log("\n" + part.text + "\n");
            if (part.functionCall)
                console.log("\n" + JSON.stringify(part.functionCall, null, 2) + "\n");
        }
        return { messages: responseContent ? [responseContent] : undefined }
    }

    async toolNode(): Promise<ReturnState> {
        const noToolCallMessage: Content = { role: "user", parts: [{ text: "Last message is not a tool call." }] };
        const lastMessage = this.agentState.messages.data.length === 0 ? undefined : this.agentState.messages.data[this.agentState.messages.data.length - 1];
        if (!lastMessage || (lastMessage.role && lastMessage.role !== "model")) {
            return { messages: [noToolCallMessage] };
        }
        if (!lastMessage.parts || lastMessage.parts.length === 0 || lastMessage.parts.filter(p => p.functionCall).length === 0) {
            return { messages: [noToolCallMessage] };
        }
        let message: Content = { role: "user", parts: [] };
        for (const part of lastMessage.parts.filter(p => p.functionCall)) {
            const functionCall = part.functionCall;
            if (functionCall?.name && functionCall?.args) {
                const result = await this.mcpClient.callTool(functionCall.name, functionCall.args);
                const responseObj = { functionResponse: { id: functionCall.id, name: functionCall.name, response: { output: result.content } } };
                message.parts?.push(responseObj);
            }
        }
        for (const part of message.parts || []) {
            if (part.text)
                console.log("\n" + part.text + "\n");
            if (part.functionResponse)
                console.log("\n" + JSON.stringify(part.functionResponse, null, 2) + "\n");
        }
        if (message.parts?.length && message.parts.length > 0)
            return { messages: [message] };
        return { messages: [noToolCallMessage] };
    }

    llmOutputEdge(): "toolNode" | "END" {
        if (this.agentState.messages.data.length === 0)
            return "END";
        const lastMessage = this.agentState.messages.data[this.agentState.messages.data.length - 1];
        if (lastMessage.parts?.length && lastMessage.parts.length > 0 && lastMessage.parts.filter(p => p.functionCall).length > 0)
            return "toolNode";
        return "END";
    }

    resetState() {
        this.agentState.userPrompt.data = "";
        this.agentState.plan.data = "";
        this.agentState.messages.data = [];
    }

    async run(userPrompt: string, sourcePath: string, humanApprovalBefore?: string[]) {
        this.resetState();
        this.agentState.userPrompt.data = userPrompt;
        this.agentState.messages.data.push({ role: "user", parts: [{ text: "Start the implementation of the plan." }] });
        await this.connectToMCPServer(sourcePath);
        let currentNode: string = "START";
        while (currentNode !== "END") {
            if (humanApprovalBefore && humanApprovalBefore.includes(currentNode)) {
                const functionCalls = this.agentState.messages.data[this.agentState.messages.data.length - 1].parts?.filter(p => p.functionCall)!.map(p => p.functionCall!)!;
                const approval = await getHumanApproval(functionCalls);
                if (approval === "Reject") {
                    console.log("Function call (Tool call) Rejected.");
                    await this.mcpClient.disconnect();
                    return;
                }
            }
            const result = await this.nameNodeMapper[currentNode]() as ReturnState;
            Object.entries(result).forEach(([key, value]) => {
                const stateKey = key as keyof AgentState;
                if (this.agentState[stateKey]) {
                    if (this.agentState[stateKey].reducer) {
                        const reducerFunc = this.agentState[stateKey].reducer as (cur: typeof value, update: typeof value) => typeof value;
                        this.agentState[stateKey].data = reducerFunc(this.agentState[stateKey].data, value);
                    } else {
                        this.agentState[stateKey].data = value;
                    }
                }
            });
            currentNode = this.edges[currentNode]();
        }
        await this.mcpClient.disconnect();
        return;
    }
}
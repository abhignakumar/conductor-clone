import readline from 'readline';
import { FunctionCall } from "@google/genai";

export function inputFromUserTerminal(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}


export async function getHumanApproval(functionCalls: FunctionCall[]): Promise<"Allow" | "Reject"> {
    const answer = await inputFromUserTerminal(`Approve function calls ${functionCalls.map((fc) => `"${fc.name}" with args ${JSON.stringify(fc.args)}`).join(",\n")}? (yes/no): `);
    return answer.trim().toLowerCase() === "yes" ? "Allow" : "Reject";
}
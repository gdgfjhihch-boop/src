// src/SwarmAgents.js
import * as FileSystem from "expo-file-system";
import { KHAZANA_ROOT } from "./KhazanaManager";
import { performWebSearch } from "./Toolbox";

/**
 * Executes the Dynamic Swarm Multi-Agent System.
 * Automatically provisions agents, delegates tasks, and synthesizes the final report.
 */
export const executeSwarmTask = async (taskQuery, tavilyKey, activeConn, apiCaller, logCallback) => {
    logCallback(`[SYSTEM] Initializing Swarm Protocol for task: "${taskQuery}"`);

    try {
        // ---------------------------------------------------------
        // 1. MANAGER AGENT: Assign Roles
        // ---------------------------------------------------------
        logCallback("[MANAGER] Analyzing task and assigning specialized agent roles...");
        const managerPrompt = `Analyze the following task: "${taskQuery}". Assign 3 specific roles to complete this task. Format exactly as: TEAM_NAME | ROLE_1 | ROLE_2 | ROLE_3`;
        const managerRes = await apiCaller(activeConn, "Strict Format required.", managerPrompt);
        
        const roles = managerRes.split('|').map(s => s.trim());
        const teamName = roles.length >= 4 ? roles[0] : "Alpha Research Team";
        const role1 = roles.length >= 4 ? roles[1] : "Lead Researcher";
        const role2 = roles.length >= 4 ? roles[2] : "Critical Analyst";
        const role3 = roles.length >= 4 ? roles[3] : "Technical Writer";

        logCallback(`[MANAGER] Team Configured: [${teamName}]`);
        logCallback(`--> Agent 1: ${role1}`);
        logCallback(`--> Agent 2: ${role2}`);
        logCallback(`--> Agent 3: ${role3}`);

        // ---------------------------------------------------------
        // 2. AGENT 1: Data Gathering & Initial Draft
        // ---------------------------------------------------------
        logCallback(`[${role1.toUpperCase()}] Gathering intelligence and drafting initial data...`);
        let baseData = "No external data fetched.";
        
        if (tavilyKey) {
            try {
                baseData = await performWebSearch(taskQuery, tavilyKey);
            } catch (e) {
                logCallback(`[WARNING] Web search failed, proceeding with internal knowledge.`);
            }
        }
        
        const draftPrompt = `Task: "${taskQuery}". External Data: ${baseData}. Generate a comprehensive initial draft.`;
        const draft = await apiCaller(activeConn, `You are the ${role1}. Focus on raw data and facts.`, draftPrompt);

        // ---------------------------------------------------------
        // 3. AGENT 2: The Critique
        // ---------------------------------------------------------
        logCallback(`[${role2.toUpperCase()}] Reviewing draft for logical gaps and errors...`);
        const critiquePrompt = `Review this draft:\n${draft}\nIdentify missing information, structural flaws, or logical errors. Provide strict, constructive feedback.`;
        const feedback = await apiCaller(activeConn, `You are the ${role2}. Be highly critical.`, critiquePrompt);

        // ---------------------------------------------------------
        // 4. AGENT 3: Final Synthesis
        // ---------------------------------------------------------
        logCallback(`[${role3.toUpperCase()}] Compiling final masterpiece based on feedback...`);
        const finalPrompt = `Task: "${taskQuery}".\nDraft:\n${draft}\nFeedback:\n${feedback}\nFix all issues and write the perfect final output. Ensure professional formatting.`;
        const finalOutput = await apiCaller(activeConn, `You are the ${role3}.`, finalPrompt);

        logCallback("[SYSTEM] Swarm execution complete. Saving data to Secure Khazana Storage...");

        // ---------------------------------------------------------
        // 5. SAVE TO KHAZANA
        // ---------------------------------------------------------
        const fileHeader = `=== SWARM TEAM: ${teamName} ===\n=== TASK: ${taskQuery} ===\n\n`;
        const safeFileName = "Swarm_Report_" + Date.now() + ".txt";
        const targetPath = KHAZANA_ROOT + safeFileName;
        
        await FileSystem.writeAsStringAsync(targetPath, fileHeader + finalOutput);
        logCallback(`[SYSTEM] File saved successfully at: /Raju_Khazana/${safeFileName}`);

        return {
            success: true,
            message: `Swarm operation successful. Report securely saved as [${safeFileName}].`,
            report: finalOutput
        };

    } catch (error) {
        logCallback(`[ERROR] Swarm execution failed: ${error.message}`);
        return {
            success: false,
            message: `Swarm execution aborted due to critical failure: ${error.message}`,
            report: null
        };
    }
};

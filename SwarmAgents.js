// SwarmAgents.js
export const executeSwarmTask = async (task, searchKey, apiConn, apiCall, logCallback) => {
    try {
        logCallback("[SWARM_LEADER] Assembling AI Army for task...");
        
        // 1. RESEARCHER AGENT
        logCallback("[RESEARCHER] Scraping data and gathering facts...");
        const researchPrompt = `You are an elite Researcher. Gather detailed facts and data about: "${task}". Be concise but highly informative.`;
        const researchData = await apiCall(apiConn, "Act as an expert researcher.", researchPrompt);
        
        // 2. CRITIC AGENT
        logCallback("[CRITIC] Analyzing research for flaws and accuracy...");
        const criticPrompt = `You are a strict Critic. Review this research: "${researchData}". Point out flaws, add missing context, and verify accuracy.`;
        const critiqueData = await apiCall(apiConn, "Act as a harsh but logical critic.", criticPrompt);
        
        // 3. WRITER AGENT
        logCallback("[WRITER] Compiling final executive report...");
        const writerPrompt = `You are a Tech Writer. Combine the original research and the critic's notes into a final, highly professional report for the boss. 
        Research: ${researchData}
        Critique: ${critiqueData}`;
        const finalReport = await apiCall(apiConn, "Act as a master tech writer.", writerPrompt);
        
        logCallback("[SWARM_LEADER] Task complete. Delivering report.");
        return { message: finalReport };
    } catch (error) {
        logCallback(`[SWARM_FATAL] Army collapsed: ${error.message}`);
        return { message: "Swarm operation failed due to system error." };
    }
};

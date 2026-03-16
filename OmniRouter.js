// OmniRouter.js
export const processUserIntent = async (text, apiCall, apiConn) => {
    const prompt = `
    Analyze the user's input: "${text}"
    Classify it into EXACTLY ONE of these categories:
    1. "memory" (If user asks about themselves, their profile, their files, or past info)
    2. "swarm" (If user asks for a deep research report, analysis, or multi-step thinking)
    3. "calculate" (If it involves math or numbers)
    4. "search" (If it needs real-time live internet data)
    5. "chat" (For general conversation)

    Return ONLY a valid JSON object like this:
    {"action": "category_name", "query": "extracted main subject"}
    Do not add markdown, backticks, or extra words.
    `;

    try {
        const response = await apiCall(apiConn, "You are the Omni-Router. You only reply in pure JSON.", prompt);
        let cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
        const intent = JSON.parse(cleanJson);
        return intent;
    } catch (error) {
        // Fallback if AI fails to output JSON
        return { action: "chat", query: text };
    }
};

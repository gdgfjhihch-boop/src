// src/OmniRouter.js
import * as FileSystem from "expo-file-system";
import { SYSTEM_DIR } from "./KhazanaManager";

export const MIND_MAP_FILE = SYSTEM_DIR + "Mind_Map.json";

/**
 * 1. Manual Command Override
 * Bypasses AI detection if user specifies a direct command.
 */
const checkManualOverrides = (text) => {
    const lowerText = text.toLowerCase().trim();
    if (lowerText.startsWith("search:")) return { action: "search", query: text.substring(7).trim() };
    if (lowerText.startsWith("swarm:")) return { action: "swarm", query: text.substring(6).trim() };
    if (lowerText.startsWith("deep:")) return { action: "deep_think", query: text.substring(5).trim() };
    return null;
};

/**
 * 2. Knowledge Graph Builder (Subconscious Mapping)
 * Extracts subject-relation-object from user text quietly.
 */
export const updateMindMap = async (userText, apiCaller, activeConn) => {
    try {
        const mapPrompt = `Analyze this text: "${userText}". 
        If the user is sharing a personal fact, preference, or project detail, extract the relationship.
        Format STRICTLY as JSON: {"subject": "...", "relation": "...", "object": "..."}.
        If no personal fact is found, reply with {"subject": "NONE"}.`;
        
        let mapRes = await apiCaller(activeConn, "You are a Knowledge Graph Extractor. Output only valid JSON.", mapPrompt);
        mapRes = mapRes.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(mapRes);

        if (extractedData.subject && extractedData.subject !== "NONE") {
            let currentMap = [];
            const info = await FileSystem.getInfoAsync(MIND_MAP_FILE);
            if (info.exists) {
                const mapData = await FileSystem.readAsStringAsync(MIND_MAP_FILE);
                currentMap = JSON.parse(mapData);
            }
            currentMap.push(extractedData);
            await FileSystem.writeAsStringAsync(MIND_MAP_FILE, JSON.stringify(currentMap, null, 2));
            console.log("[SYSTEM] Knowledge Graph Updated Successfully.");
        }
    } catch (error) {
        console.log("[SYSTEM] Mind Map Extraction Skipped (Non-critical).");
    }
};

/**
 * 3. The Omni-Router (Intent Detection Engine)
 */
export const processUserIntent = async (userText, apiCaller, activeConn) => {
    const manualIntent = checkManualOverrides(userText);
    if (manualIntent) return manualIntent;

    const routerPrompt = `You are the Omni-Router (The core intelligence module).
    Analyze the user's text: "${userText}".
    Choose EXACTLY ONE action from the list below:
    
    1. "search": User needs current internet info or live news.
    2. "swarm": User wants deep research, an essay, or a complex script saved to Khazana.
    3. "memorize": User is explicitly sharing a personal rule or important memory to save.
    4. "read_link": User provided a web URL (http/https).
    5. "search_khazana": User is asking about their saved notes, files, or local database.
    6. "calculate": User asks a math question or needs logic execution.
    7. "manage_khazana": User wants to DELETE a file/folder or CREATE an empty folder.
    8. "chat": Normal conversational greeting or general AI query.

    Reply STRICTLY in valid JSON format:
    {
      "action": "chat|search|swarm|memorize|read_link|search_khazana|calculate|manage_khazana",
      "query": "Extracted main topic or math problem",
      "path": "File path (if applicable for manage_khazana)",
      "operation": "delete_file|delete_folder|create_folder (only if manage_khazana)",
      "url": "Extracted URL (only if read_link)"
    }`;

    try {
        let routerRes = await apiCaller(activeConn, "You output strict JSON.", routerPrompt);
        routerRes = routerRes.replace(/```json/g, '').replace(/```/g, '').trim();
        const intent = JSON.parse(routerRes);

        // Fire and forget: Subconscious Mind Mapping
        updateMindMap(userText, apiCaller, activeConn);

        return intent;
    } catch (error) {
        console.error("Router Parse Error:", error);
        return { action: "chat", query: userText };
    }
};

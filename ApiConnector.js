// src/ApiConnector.js

/**
 * Parses the raw AI response to extract 'Deep Think' blocks and the final answer.
 */
export const parseAIResponse = (rawText) => {
    let thinkData = null;
    let finalData = rawText;
    const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
    
    if (thinkMatch) {
        thinkData = thinkMatch[1].trim();
        finalData = rawText.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    }
    
    return { thinkData, finalData };
};

/**
 * Handles communication with Cloud AI providers (Gemini, OpenAI).
 */
export const callCloudAPI = async (conn, systemPrompt, userPrompt) => {
    if (!conn || !conn.key) {
        throw new Error("Active API connection is missing. Please configure it in settings.");
    }

    try {
        if (conn.provider === "Gemini") {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${conn.modelId}:generateContent?key=${conn.key}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
                    }]
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            if (!data.candidates || data.candidates.length === 0) throw new Error("Empty response from Gemini.");
            
            return data.candidates[0].content.parts[0].text;

        } else if (conn.provider === "OpenAI") {
            const endpoint = `https://api.openai.com/v1/chat/completions`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${conn.key}` 
                },
                body: JSON.stringify({
                    model: conn.modelId,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            if (!data.choices || data.choices.length === 0) throw new Error("Empty response from OpenAI.");
            
            return data.choices[0].message.content;
            
        } else {
            throw new Error(`Unsupported API Provider: ${conn.provider}`);
        }
    } catch (error) {
        console.error("API Connector Error:", error);
        throw error;
    }
};
                         

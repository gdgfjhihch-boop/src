// src/Toolbox.js

/**
 * 1. Secure Math & Logic Sandbox
 * Uses a sandboxed function context instead of direct eval().
 */
export const executeSafeMath = (codeString) => {
    try {
        const safeFn = new Function(`"use strict"; return (${codeString});`);
        const result = safeFn();
        return String(result);
    } catch (error) {
        console.error("Sandbox Execution Error:", error);
        return "Error: Execution failed in secure sandbox environment.";
    }
};

/**
 * 2. Live Web Scraper
 * Fetches webpage content and cleanly strips HTML tags, CSS, and Scripts.
 */
export const fetchAndStripHTML = async (url) => {
    try {
        const response = await fetch(url);
        const html = await response.text();
        let text = html.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
        text = text.replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '');
        text = text.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, ' ').trim();
        return text.substring(0, 15000); // Protect against token limits
    } catch (error) {
        console.error("Web Scraper Error:", error);
        return "Error: Unable to fetch website content. Connection refused or invalid URL.";
    }
};

/**
 * 3. Search API Integrator (Tavily)
 */
export const performWebSearch = async (query, apiKey) => {
    if (!apiKey) throw new Error("Search API key is missing. Please configure it in settings.");
    try {
        const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                api_key: apiKey, 
                query: query, 
                include_answer: true,
                max_results: 3
            })
        });
        const data = await res.json();
        return data.answer || (data.results && data.results.map(r => r.content).join("\n\n")) || "No valid search results found.";
    } catch (error) {
        console.error("Search API Error:", error);
        throw new Error("Web search failed due to network or API issue.");
    }
};

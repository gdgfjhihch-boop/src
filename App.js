import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, Alert
} from 'react-native';

// --- CORE MODULE IMPORTS ---
import { COLORS } from './src/theme';
import { 
  initKhazanaSystem, loadChatHistory, saveChatHistory, clearChatHistory 
} from './src/KhazanaManager';
import { processUserIntent } from './src/OmniRouter';
import { executeSafeMath, performWebSearch, fetchAndStripHTML } from './src/Toolbox';
import { callCloudAPI } from './src/ApiConnector';
import { executeSwarmTask } from './src/SwarmAgents';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const scrollRef = useRef(null);

  // --- API CONFIGURATION ---
  // Replace these with your actual keys when ready to go live
  const activeConn = { 
      provider: "Gemini", 
      modelId: "gemini-1.5-flash", 
      key: "YOUR_GEMINI_API_KEY_HERE" 
  };
  const tavilyKey = "YOUR_TAVILY_API_KEY_HERE";

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    const bootSystem = async () => {
      await initKhazanaSystem();
      const history = await loadChatHistory();
      
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{ 
          id: "sys_boot", 
          role: "ai", 
          text: "Sovereign OS Online. Modular architecture initialized. Awaiting commands, Boss.",
          terminalLogs: "[SYSTEM] Boot sequence complete. All subsystems green.\n[SYSTEM] Ready for intelligence routing.",
          isNew: true 
        }]);
      }
      setIsSystemReady(true);
    };
    bootSystem();
  }, []);

  // --- AUTO-SAVE HISTORY ---
  useEffect(() => {
    if (isSystemReady && messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages, isSystemReady]);

  // --- TERMINAL LOG HELPER ---
  const appendTerminalLog = (msgId, logText) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, terminalLogs: m.terminalLogs ? m.terminalLogs + "\n" + logText : logText };
      }
      return m;
    }));
  };

  // --- CORE MESSAGE HANDLER ---
  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    
    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev.map(m => ({...m, isNew: false})), { 
      id: userMsgId, role: "user", text: userText, isNew: false 
    }]);
    
    setInputText("");
    setIsProcessing(true);

    // Add initial AI processing message
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { 
      id: aiMsgId, role: "ai", text: "Processing command...", terminalLogs: "[SYSTEM] Analyzing intent via OmniRouter...", isNew: true 
    }]);

    try {
      // Safe wrapper to prevent crashes if keys are missing
      const safeApiCaller = async (conn, sys, prmpt) => {
          if (conn.key === "YOUR_GEMINI_API_KEY_HERE") {
              return '{"action":"chat", "query":"Operating in Mock Mode. Insert API keys to activate neural link."}';
          }
          return await callCloudAPI(conn, sys, prmpt);
      };

      // 1. ROUTER: Detect Intent
      const intent = await processUserIntent(userText, safeApiCaller, activeConn);
      appendTerminalLog(aiMsgId, `[ROUTER] Intent successfully mapped to: ${intent.action.toUpperCase()}`);

      let finalResponse = "";

      // 2. EXECUTE PROTOCOLS
      switch (intent.action) {
        case "calculate":
          appendTerminalLog(aiMsgId, `[SANDBOX] Executing secure logic sequence: ${intent.query}`);
          const mathResult = executeSafeMath(intent.query);
          finalResponse = `Execution complete. The mathematical/logical result is: ${mathResult}`;
          break;

        case "read_link":
          appendTerminalLog(aiMsgId, `[SCRAPER] Fetching target URL: ${intent.url}`);
          const webData = await fetchAndStripHTML(intent.url);
          finalResponse = `Data extracted successfully. Total characters parsed: ${webData.length}.\n\nContent Preview: ${webData.substring(0, 300)}...`;
          break;

        case "search":
          appendTerminalLog(aiMsgId, `[WEB_SEARCH] Querying global network for: ${intent.query}`);
          if (tavilyKey === "YOUR_TAVILY_API_KEY_HERE") {
              finalResponse = "Search protocol aborted. Valid Tavily API key is required.";
          } else {
              const searchData = await performWebSearch(intent.query, tavilyKey);
              finalResponse = `Live Search Results Acquired:\n\n${searchData}`;
          }
          break;

        case "swarm":
          appendTerminalLog(aiMsgId, `[SWARM_COMMANDER] Activating Multi-Agent Protocol. Stand by...`);
          const logger = (log) => appendTerminalLog(aiMsgId, log);
          if (activeConn.key === "YOUR_GEMINI_API_KEY_HERE") {
              finalResponse = "Swarm protocol requires an active Gemini/OpenAI connection to provision agents.";
          } else {
              const swarmRes = await executeSwarmTask(intent.query, tavilyKey, activeConn, callCloudAPI, logger);
              finalResponse = swarmRes.message;
          }
          break;

        default:
          appendTerminalLog(aiMsgId, `[NEURAL_CORE] Generating standard conversational response...`);
          if (activeConn.key === "YOUR_GEMINI_API_KEY_HERE") {
              finalResponse = "I am currently offline in Mock Mode. Please update the App.js file with your secure API keys to restore full system capabilities.";
          } else {
              finalResponse = await callCloudAPI(activeConn, "You are Sovereign OS. Be highly intelligent, concise, and professional.", userText);
          }
          break;
      }

      // Update AI message with final data
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId ? { ...m, text: finalResponse, isNew: true } : m
      ));

    } catch (error) {
      appendTerminalLog(aiMsgId, `[CRITICAL_FAILURE] ${error.message}`);
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId ? { ...m, text: "System operation failed due to an unhandled internal exception." } : m
      ));
    }

    setIsProcessing(false);
  };

  const handleClearChat = () => {
    Alert.alert("Purge Memory Cache", "Are you certain you wish to erase all local conversation logs?", [
      { text: "Cancel", style: "cancel" },
      { text: "Purge", style: "destructive", onPress: async () => {
          await clearChatHistory();
          setMessages([{ 
            id: Date.now().toString(), 
            role: "ai", 
            text: "Memory pathways purged. Core system reset successful.", 
            terminalLogs: "[SYSTEM] Storage cache deleted successfully.", 
            isNew: true 
          }]);
      }}
    ]);
  };

  // --- RENDER LOADER ---
  if (!isSystemReady) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.primary, marginTop: 12, fontWeight: 'bold' }}>Booting Sovereign OS...</Text>
      </View>
    );
  }

  // --- RENDER MAIN UI ---
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SOVEREIGN OS_v9</Text>
        <TouchableOpacity onPress={handleClearChat}>
          <Text style={styles.headerIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* CHAT DISPLAY */}
      <View style={styles.screenContainer}>
        <ScrollView 
          ref={scrollRef} 
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: true})} 
          contentContainerStyle={styles.chatScrollArea}
        >
          {messages.map(msg => (
            <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.messageRowUser : styles.messageRowAI]}>
              <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                
                {/* HACKER TERMINAL LOGS (Displays only for AI) */}
                {msg.terminalLogs && (
                  <View style={styles.terminalBox}>
                    <Text style={styles.terminalHeader}>SYS_TERMINAL_LOGS</Text>
                    <Text style={styles.terminalText}>{msg.terminalLogs}</Text>
                  </View>
                )}
                
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            </View>
          ))}
          {isProcessing && <ActivityIndicator color={COLORS.primary} style={styles.loadingIndicator} />}
        </ScrollView>

        {/* INPUT FIELD */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.textInput} 
              placeholder="Enter system command..." 
              placeholderTextColor={COLORS.textMuted} 
              value={inputText} 
              onChangeText={setInputText} 
              multiline 
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isProcessing}>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 15, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.primary, fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  headerIcon: { fontSize: 20 },
  screenContainer: { flex: 1 },
  chatScrollArea: { padding: 15, paddingBottom: 20 },
  messageRow: { marginBottom: 15, flexDirection: "row" },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAI: { justifyContent: "flex-start", width: '100%' },
  bubble: { maxWidth: "88%", padding: 14, borderRadius: 12 },
  bubbleUser: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomRightRadius: 2 },
  bubbleAI: { backgroundColor: "transparent", paddingLeft: 0 },
  messageText: { color: COLORS.textMain, fontSize: 15, lineHeight: 24 },
  terminalBox: { backgroundColor: COLORS.terminal, padding: 12, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  terminalHeader: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 6 },
  terminalText: { color: '#00FF00', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 18 },
  loadingIndicator: { alignSelf: 'flex-start', marginLeft: 10, marginTop: 5 },
  inputContainer: { flexDirection: "row", padding: 12, backgroundColor: COLORS.surface, alignItems: "flex-end", borderTopWidth: 1, borderColor: COLORS.border },
  textInput: { flex: 1, backgroundColor: COLORS.codeBox, color: COLORS.textMain, fontSize: 15, minHeight: 45, maxHeight: 120, borderRadius: 8, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  sendButton: { width: 45, height: 45, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.primary },
  sendIcon: { color: "#000", fontSize: 18, fontWeight: 'bold' }
});
    

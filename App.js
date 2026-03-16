import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

// --- CORE MODULE IMPORTS ---
import { COLORS } from './theme';
import { initKhazanaSystem, loadChatHistory, saveChatHistory, createAdminFile, readAdminFile, listAdminFiles, CORE_MEMORY_FILE } from './KhazanaManager';
import { processUserIntent } from './OmniRouter';
import { executeSafeMath, performWebSearch, fetchAndStripHTML } from './Toolbox';
import { callCloudAPI } from './ApiConnector';
import { executeSwarmTask } from './SwarmAgents';
import { captureAndProcessImage } from './VisionCore';
import { speakResponse, silenceSystem } from './VoiceCore';
import { triggerVoiceInput } from './EarCore';

const TypewriterText = ({ text, delay = 15 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, delay);
    return () => clearInterval(interval);
  }, [text]);

  return <Text style={styles.msgText}>{displayedText}</Text>;
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const scrollRef = useRef(null);

  const activeConn = { provider: "Gemini", modelId: "gemini-1.5-flash", key: "YOUR_GEMINI_API_KEY_HERE" };
  const tavilyKey = "YOUR_TAVILY_API_KEY_HERE";

  useEffect(() => {
    const bootSystem = async () => {
      try {
        await initKhazanaSystem();
        const history = await loadChatHistory();
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([{ id: "sys_boot", role: "ai", text: "Sovereign OS V14 Online. Hybrid RAG & Swarm Matrix fully operational.", terminalLogs: "[SYSTEM] Phase 3 Boot complete. Multi-Agent routing active.", isNew: true }]);
        }
        setIsSystemReady(true);
      } catch (error) {
        setIsSystemReady(true);
      }
    };
    bootSystem();
  }, []);

  useEffect(() => {
    if (isSystemReady && messages.length > 0) saveChatHistory(messages);
  }, [messages, isSystemReady]);

  const appendTerminalLog = (msgId, logText) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, terminalLogs: m.terminalLogs ? m.terminalLogs + "\n" + logText : logText } : m));
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Secured to clipboard.");
  };

  const handleCamera = async () => {
    const imageResult = await captureAndProcessImage(true);
    if (imageResult.success) setAttachedImage(imageResult);
  };

  const handleMic = async () => {
    setIsListening(true);
    const success = await triggerVoiceInput();
    if (success) Alert.alert("Voice Mode", "STT bridge active.");
    setIsListening(false);
  };

  const toggleAudio = async () => {
    if (isSpeaking) {
      await silenceSystem();
      setIsSpeaking(false);
    } else setIsSpeaking(true);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !attachedImage) return;
    
    const userText = inputText.trim();
    const userMsgId = Date.now().toString();
    
    setMessages(prev => [...prev.map(m => ({...m, isNew: false})), { id: userMsgId, role: "user", text: userText || "Analyze image", imageUri: attachedImage?.uri, isNew: false }]);
    
    setInputText("");
    const currentImg = attachedImage;
    setAttachedImage(null);
    setIsProcessing(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: "ai", text: "Processing...", terminalLogs: "[SYSTEM] Intercepting neural pathways...", isNew: true }]);

    try {
      let finalResponse = "";

      // 1. ADMIN COMMANDS OVERRIDE
      if (userText.startsWith("/")) {
          const parts = userText.split(" ");
          const command = parts[0].toLowerCase();

          if (command === "/create" && parts.length >= 3) {
              finalResponse = await createAdminFile(parts[1], parts.slice(2).join(" "));
              appendTerminalLog(aiMsgId, `[ADMIN] Executed file creation.`);
          } else if (command === "/read" && parts.length === 2) {
              finalResponse = `Contents:\n\n${await readAdminFile(parts[1])}`;
              appendTerminalLog(aiMsgId, `[ADMIN] Read file.`);
          } else if (command === "/list") {
              finalResponse = `Khazana Files:\n\n${await listAdminFiles()}`;
              appendTerminalLog(aiMsgId, `[ADMIN] Listed directory.`);
          } else if (command === "/swarm" && parts.length >= 2) {
              // Manual Swarm Override
              const swarmTask = parts.slice(1).join(" ");
              finalResponse = (await executeSwarmTask(swarmTask, tavilyKey, activeConn, callCloudAPI, (log) => appendTerminalLog(aiMsgId, log))).message;
          } else {
              finalResponse = "[ERROR] Valid: /create, /read, /list, /swarm";
          }
      } 
      else if (currentImg) {
        appendTerminalLog(aiMsgId, "[VISION] Forwarding to visual net...");
        finalResponse = activeConn.key === "YOUR_GEMINI_API_KEY_HERE" ? "Vision requires active API key." : "Image received.";
      } 
      else {
        // 2. OMNI-ROUTER (The Brain)
        const safeApiCaller = async (conn, sys, prmpt) => {
            if (conn.key === "YOUR_GEMINI_API_KEY_HERE") return '{"action":"chat", "query":"Mock Mode Active."}';
            return await callCloudAPI(conn, sys, prmpt);
        };
        
        const intent = await processUserIntent(userText, safeApiCaller, activeConn);
        appendTerminalLog(aiMsgId, `[ROUTER] Intent mapped: ${intent.action.toUpperCase()}`);

        switch (intent.action) {
          case "swarm":
            finalResponse = (await executeSwarmTask(intent.query, tavilyKey, activeConn, callCloudAPI, (log) => appendTerminalLog(aiMsgId, log))).message; 
            break;
            
          case "memory":
            // PHASE 3: HYBRID RAG (Silent Khazana Read)
            appendTerminalLog(aiMsgId, "[LIBRARIAN] Retrieving Core Memory from Khazana...");
            const coreMemoryData = await readAdminFile("Core_Memory.txt");
            const ragPrompt = `The user asked: "${userText}". Here is the user's secret background data from Core_Memory.txt: \n\n${coreMemoryData}\n\nAnswer the user based on this memory.`;
            finalResponse = await callCloudAPI(activeConn, "You are Sovereign OS. Use the provided memory context.", ragPrompt);
            break;

          case "calculate":
            finalResponse = `Result: ${executeSafeMath(intent.query)}`; 
            break;

          default:
            finalResponse = activeConn.key === "YOUR_GEMINI_API_KEY_HERE" ? "Offline Mode: Enter API keys to go online." : await callCloudAPI(activeConn, "You are Sovereign OS.", userText);
        }
      }

      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: finalResponse, isNew: true } : m));
      if (isSpeaking) speakResponse(finalResponse);

    } catch (error) {
      appendTerminalLog(aiMsgId, `[SHIELD] ${error.message}`);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: "System anomaly. Shield protocol active.", isNew: true } : m));
    }
    setIsProcessing(false);
  };

  if (!isSystemReady) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SOVEREIGN OS</Text>
        <TouchableOpacity onPress={toggleAudio}>
          <Text style={styles.headerIcon}>{isSpeaking ? "🔊" : "🔇"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.screenContainer}>
        <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd()} contentContainerStyle={styles.chatArea}>
          {messages.map(msg => (
            <View key={msg.id} style={[styles.msgRow, msg.role === "user" ? styles.msgUser : styles.msgAI]}>
              <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                {msg.terminalLogs && <View style={styles.termBox}><Text style={styles.termText}>{msg.terminalLogs}</Text></View>}
                {msg.imageUri && <Image source={{uri: msg.imageUri}} style={styles.chatImage} />}
                
                {msg.role === "ai" && msg.isNew ? <TypewriterText text={msg.text} /> : <Text style={styles.msgText}>{msg.text}</Text>}

                {msg.role === "ai" && (
                  <TouchableOpacity style={styles.copyBtn} onPress={() => copyToClipboard(msg.text)}>
                    <Text style={styles.copyText}>[ COPY ]</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {isProcessing && <ActivityIndicator color={COLORS.primary} style={{alignSelf: 'flex-start', margin: 10}} />}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleCamera}><Text style={styles.iconText}>📷</Text></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleMic}><Text style={styles.iconText}>{isListening ? "🔴" : "🎙️"}</Text></TouchableOpacity>
            <TextInput style={styles.input} placeholder="Terminal Command..." placeholderTextColor={COLORS.textMuted} value={inputText} onChangeText={setInputText} multiline />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isProcessing}><Text style={styles.sendIcon}>➤</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D1117' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  header: { padding: 15, backgroundColor: '#1F2937', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#374151' },
  headerTitle: { color: '#10B981', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  headerIcon: { fontSize: 22 },
  screenContainer: { flex: 1 },
  chatArea: { padding: 15 },
  msgRow: { marginBottom: 15, flexDirection: 'row' },
  msgUser: { justifyContent: 'flex-end' },
  msgAI: { justifyContent: 'flex-start', width: '100%' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 12 },
  bubbleUser: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderBottomRightRadius: 2 },
  bubbleAI: { backgroundColor: 'transparent', paddingLeft: 0 },
  msgText: { color: '#F9FAFB', fontSize: 15, lineHeight: 22 },
  chatImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 10 },
  termBox: { backgroundColor: '#000', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  termText: { color: '#00FF00', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  copyBtn: { marginTop: 8, alignSelf: 'flex-start' },
  copyText: { color: '#10B981', fontSize: 11, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#1F2937', alignItems: 'flex-end', borderTopWidth: 1, borderColor: '#374151' },
  iconBtn: { width: 35, height: 45, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  iconText: { fontSize: 20 },
  input: { flex: 1, backgroundColor: '#111827', color: '#FFF', borderRadius: 8, padding: 10, marginRight: 10, borderWidth: 1, borderColor: '#374151', minHeight: 45, maxHeight: 100 },
  sendBtn: { width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#10B981' },
  sendIcon: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});
      

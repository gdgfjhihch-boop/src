import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, Image } from 'react-native';

// --- CORE MODULE IMPORTS ---
import { COLORS } from './theme';
import { initKhazanaSystem, loadChatHistory, saveChatHistory } from './KhazanaManager';
import { processUserIntent } from './OmniRouter';
import { executeSafeMath, performWebSearch, fetchAndStripHTML } from './Toolbox';
import { callCloudAPI } from './ApiConnector';
import { executeSwarmTask } from './SwarmAgents';
import { captureAndProcessImage } from './VisionCore';
import { speakResponse, silenceSystem } from './VoiceCore';


export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const scrollRef = useRef(null);

  const activeConn = { provider: "Gemini", modelId: "gemini-1.5-flash", key: "YOUR_GEMINI_API_KEY_HERE" };
  const tavilyKey = "YOUR_TAVILY_API_KEY_HERE";

  useEffect(() => {
    const bootSystem = async () => {
      await initKhazanaSystem();
      const history = await loadChatHistory();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{ id: "sys_boot", role: "ai", text: "Sovereign OS V10 Online. Vision and Voice modules fully activated.", terminalLogs: "[SYSTEM] Boot complete. Awaiting multi-modal input.", isNew: true }]);
      }
      setIsSystemReady(true);
    };
    bootSystem();
  }, []);

  useEffect(() => {
    if (isSystemReady && messages.length > 0) saveChatHistory(messages);
  }, [messages, isSystemReady]);

  const appendTerminalLog = (msgId, logText) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, terminalLogs: m.terminalLogs ? m.terminalLogs + "\n" + logText : logText } : m));
  };

  // --- VISION: HANDLE CAMERA ---
  const handleCamera = async () => {
    const imageResult = await captureAndProcessImage(true);
    if (imageResult.success) {
      setAttachedImage(imageResult);
    }
  };

  // --- VOICE: TOGGLE MUTE ---
  const toggleAudio = async () => {
    if (isSpeaking) {
      await silenceSystem();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
    }
  };

  // --- CORE SYSTEM: SEND MESSAGE ---
  const handleSend = async () => {
    if (!inputText.trim() && !attachedImage) return;
    
    const userText = inputText.trim() || "Analyze this image.";
    const userMsgId = Date.now().toString();
    
    const newMsg = { id: userMsgId, role: "user", text: userText, imageUri: attachedImage?.uri, isNew: false };
    setMessages(prev => [...prev.map(m => ({...m, isNew: false})), newMsg]);
    
    setInputText("");
    const currentImg = attachedImage;
    setAttachedImage(null);
    setIsProcessing(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: "ai", text: "Processing neural request...", terminalLogs: "[SYSTEM] Analyzing input...", isNew: true }]);

    try {
      const safeApiCaller = async (conn, sys, prmpt) => {
          if (conn.key === "YOUR_GEMINI_API_KEY_HERE") return '{"action":"chat", "query":"Mock Mode Active."}';
          return await callCloudAPI(conn, sys, prmpt);
      };

      let finalResponse = "";

      if (currentImg) {
        appendTerminalLog(aiMsgId, "[VISION] Image attached. Forwarding to visual neural net...");
        finalResponse = activeConn.key === "YOUR_GEMINI_API_KEY_HERE" ? "Vision Module requires active API key." : "I have received the image. (Note: API connector update required for full visual analysis).";
      } else {
        const intent = await processUserIntent(userText, safeApiCaller, activeConn);
        appendTerminalLog(aiMsgId, `[ROUTER] Intent mapped: ${intent.action.toUpperCase()}`);

        switch (intent.action) {
          case "calculate":
            finalResponse = `Result: ${executeSafeMath(intent.query)}`; break;
          case "read_link":
            finalResponse = `Data extracted: ${(await fetchAndStripHTML(intent.url)).substring(0, 200)}...`; break;
          case "search":
            finalResponse = await performWebSearch(intent.query, tavilyKey); break;
          case "swarm":
            finalResponse = (await executeSwarmTask(intent.query, tavilyKey, activeConn, callCloudAPI, (log) => appendTerminalLog(aiMsgId, log))).message; break;
          default:
            finalResponse = activeConn.key === "YOUR_GEMINI_API_KEY_HERE" ? "Offline Mode: Enter API keys in App.js to go online." : await callCloudAPI(activeConn, "You are Sovereign OS. Be highly intelligent and professional.", userText);
        }
      }

      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: finalResponse, isNew: true } : m));
      
      if (isSpeaking) {
          speakResponse(finalResponse);
      }

    } catch (error) {
      appendTerminalLog(aiMsgId, `[ERROR] ${error.message}`);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: "System operation failed." } : m));
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
                
                <Text style={styles.msgText}>{msg.text}</Text>
              </View>
            </View>
          ))}
          {isProcessing && <ActivityIndicator color={COLORS.primary} />}
        </ScrollView>

        {attachedImage && (
            <View style={styles.attachmentBar}>
                <Text style={styles.attachmentText}>📷 Image attached</Text>
                <TouchableOpacity onPress={() => setAttachedImage(null)}><Text style={styles.removeText}>X</Text></TouchableOpacity>
            </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.camBtn} onPress={handleCamera}>
                <Text style={styles.camIcon}>📷</Text>
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Command sequence..." placeholderTextColor={COLORS.textMuted} value={inputText} onChangeText={setInputText} multiline />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isProcessing}>
                <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
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
  headerTitle: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
  headerIcon: { fontSize: 22 },
  screenContainer: { flex: 1 },
  chatArea: { padding: 15 },
  msgRow: { marginBottom: 15, flexDirection: 'row' },
  msgUser: { justifyContent: 'flex-end' },
  msgAI: { justifyContent: 'flex-start', width: '100%' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 12 },
  bubbleUser: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  bubbleAI: { backgroundColor: 'transparent' },
  msgText: { color: '#F9FAFB', fontSize: 15, lineHeight: 22 },
  chatImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 10 },
  termBox: { backgroundColor: '#000', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  termText: { color: '#00FF00', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  attachmentBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#111827', borderTopWidth: 1, borderColor: '#374151' },
  attachmentText: { color: '#10B981', fontSize: 12 },
  removeText: { color: '#EF4444', fontWeight: 'bold', paddingHorizontal: 10 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#1F2937', alignItems: 'flex-end' },
  camBtn: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  camIcon: { fontSize: 24 },
  input: { flex: 1, backgroundColor: '#111827', color: '#FFF', borderRadius: 8, padding: 12, marginRight: 10, borderWidth: 1, borderColor: '#374151', minHeight: 45, maxHeight: 100 },
  sendBtn: { width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#10B981' },
  sendIcon: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});
              

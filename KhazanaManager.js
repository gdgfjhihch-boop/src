import * as FileSystem from "expo-file-system";

export const KHAZANA_ROOT = FileSystem.documentDirectory + "Khazana/";
export const CHAT_FILE = KHAZANA_ROOT + "history.json";
export const CORE_MEMORY_FILE = KHAZANA_ROOT + "Core_Memory.txt"; // NEW: Eternal Memory

export const initKhazanaSystem = async () => {
  const info = await FileSystem.getInfoAsync(KHAZANA_ROOT);
  if (!info.exists) {
      await FileSystem.makeDirectoryAsync(KHAZANA_ROOT, { intermediates: true });
  }

  // --- PHASE 2: Initialize Core Memory ---
  const coreInfo = await FileSystem.getInfoAsync(CORE_MEMORY_FILE);
  if (!coreInfo.exists) {
    const defaultProfile = "Admin Name: Raju\nRole: Creator of Sovereign OS\nStatus: Supreme Commander";
    await FileSystem.writeAsStringAsync(CORE_MEMORY_FILE, defaultProfile);
  }
};

export const saveChatHistory = async (msgs) => FileSystem.writeAsStringAsync(CHAT_FILE, JSON.stringify(msgs));

export const loadChatHistory = async () => {
  const info = await FileSystem.getInfoAsync(CHAT_FILE);
  return info.exists ? JSON.parse(await FileSystem.readAsStringAsync(CHAT_FILE)) : [];
};

// ==========================================
// PHASE 2: ADMIN OS RIGHTS (FILE MANAGEMENT)
// ==========================================

export const createAdminFile = async (filename, content) => {
    try {
        const path = KHAZANA_ROOT + filename;
        await FileSystem.writeAsStringAsync(path, content);
        return `[SUCCESS] File '${filename}' successfully created and secured in Khazana Sandbox.`;
    } catch (error) {
        return `[ERROR] File creation failed: ${error.message}`;
    }
};

export const readAdminFile = async (filename) => {
    try {
        const path = KHAZANA_ROOT + filename;
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) return `[ERROR] File '${filename}' does not exist in the Khazana Vault.`;
        
        const content = await FileSystem.readAsStringAsync(path);
        return content;
    } catch (error) {
        return `[ERROR] Could not read file: ${error.message}`;
    }
};

export const listAdminFiles = async () => {
    try {
        const files = await FileSystem.readDirectoryAsync(KHAZANA_ROOT);
        return files.length > 0 ? files.join('\n') : "The Khazana directory is currently empty.";
    } catch (error) {
        return `[ERROR] Could not list directory contents: ${error.message}`;
    }
};

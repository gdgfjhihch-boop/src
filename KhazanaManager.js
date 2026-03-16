// src/KhazanaManager.js
import * as FileSystem from "expo-file-system";

export const KHAZANA_ROOT = FileSystem.documentDirectory + "Raju_Khazana/";
export const SYSTEM_DIR = KHAZANA_ROOT + "System/";
export const CORE_MEMORY_FILE = SYSTEM_DIR + "Core_Memory.txt";
export const CHAT_HISTORY_FILE = SYSTEM_DIR + "chat_history.json";
export const MASTER_INDEX_FILE = SYSTEM_DIR + "Master_Index.txt";

export const initKhazanaSystem = async () => {
  try {
    const rootInfo = await FileSystem.getInfoAsync(KHAZANA_ROOT);
    if (!rootInfo.exists) await FileSystem.makeDirectoryAsync(KHAZANA_ROOT, { intermediates: true });
    
    const sysInfo = await FileSystem.getInfoAsync(SYSTEM_DIR);
    if (!sysInfo.exists) await FileSystem.makeDirectoryAsync(SYSTEM_DIR, { intermediates: true });
  } catch (error) {
    console.error("Initialization Error:", error);
  }
};

export const loadCoreMemory = async () => {
  try {
    const info = await FileSystem.getInfoAsync(CORE_MEMORY_FILE);
    if (info.exists) return await FileSystem.readAsStringAsync(CORE_MEMORY_FILE);
  } catch (error) {
    console.error("Memory Load Error:", error);
  }
  return "No existing core memory records found.";
};

export const updateCoreMemory = async (newMemoryText) => {
  try {
    await FileSystem.writeAsStringAsync(CORE_MEMORY_FILE, newMemoryText);
    return true;
  } catch (error) {
    console.error("Memory Update Error:", error);
    return false;
  }
};

export const saveChatHistory = async (messages) => {
  try {
    const safeMessages = messages.map(m => ({ ...m, isNew: false }));
    await FileSystem.writeAsStringAsync(CHAT_HISTORY_FILE, JSON.stringify(safeMessages));
  } catch (error) {
    console.error("Chat Save Error:", error);
  }
};

export const loadChatHistory = async () => {
  try {
    const info = await FileSystem.getInfoAsync(CHAT_HISTORY_FILE);
    if (info.exists) {
      const data = await FileSystem.readAsStringAsync(CHAT_HISTORY_FILE);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Chat Load Error:", error);
  }
  return null;
};

export const clearChatHistory = async () => {
  try {
    await FileSystem.deleteAsync(CHAT_HISTORY_FILE, { idempotent: true });
  } catch (error) {
    console.error("Chat Clear Error:", error);
  }
};

export const getKhazanaCatalog = async (path = KHAZANA_ROOT, relativePath = "") => {
  let catalog = [];
  try {
    const items = await FileSystem.readDirectoryAsync(path);
    for (const item of items) {
      if (item === "System") continue; 
      
      const fullPath = path + item;
      const info = await FileSystem.getInfoAsync(fullPath);
      
      if (info.isDirectory) {
        catalog.push(relativePath + item + "/ (Directory)");
        catalog = catalog.concat(await getKhazanaCatalog(fullPath + "/", relativePath + item + "/"));
      } else if (item.endsWith('.txt') || item.endsWith('.md') || item.endsWith('.json')) {
        catalog.push(relativePath + item);
      }
    }
  } catch (error) {
    console.error("Catalog Build Error:", error);
  }
  return catalog;
};
  

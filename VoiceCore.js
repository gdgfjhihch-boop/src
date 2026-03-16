// src/VoiceCore.js
import * as Speech from 'expo-speech';

/**
 * System Voice Synthesizer.
 * Converts AI text responses into audible speech.
 */
export const speakResponse = async (text, onComplete) => {
    try {
        // Stop any ongoing speech before starting a new one
        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
            await Speech.stop();
        }

        // Clean text formatting (remove asterisks, brackets, etc. for cleaner audio)
        const cleanText = text.replace(/[*#_\[\]`]/g, '').trim();

        Speech.speak(cleanText, {
            language: 'en-US',
            pitch: 1.0,
            rate: 1.0, // Normal talking speed
            onDone: () => {
                if (onComplete) onComplete();
                console.log("[SYSTEM] Speech synthesis complete.");
            },
            onError: (err) => {
                console.error("Speech Synthesis Error:", err);
            }
        });
    } catch (error) {
        console.error("Voice Module Failure:", error);
    }
};

/**
 * Emergency override to stop all system audio immediately.
 */
export const silenceSystem = async () => {
    try {
        await Speech.stop();
        console.log("[SYSTEM] Audio output silenced.");
    } catch (error) {
        console.error("Silencing Error:", error);
    }
};

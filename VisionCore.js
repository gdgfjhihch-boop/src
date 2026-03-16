// src/VisionCore.js
import * as ImagePicker from 'expo-image-picker';

/**
 * Initializes the camera and gallery permissions.
 * Requests user authorization securely.
 */
export const requestVisionPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus.status !== 'granted' || galleryStatus.status !== 'granted') {
        throw new Error("System requires camera and gallery access to activate Vision Core.");
    }
    return true;
};

/**
 * Captures an image or selects from the gallery and converts it to Base64 format.
 * @param {boolean} useCamera - If true, opens the camera. If false, opens the gallery.
 */
export const captureAndProcessImage = async (useCamera = true) => {
    try {
        await requestVisionPermissions();
        
        const options = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            base64: true,
            quality: 0.7, // Optimized for faster API transmission
        };

        let result;
        if (useCamera) {
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (result.canceled) {
            return { success: false, message: "Image capture aborted by user." };
        }

        const base64Data = result.assets[0].base64;
        const mimeType = result.assets[0].mimeType || "image/jpeg";

        return { 
            success: true, 
            base64: base64Data, 
            mimeType: mimeType,
            uri: result.assets[0].uri 
        };

    } catch (error) {
        console.error("Vision Core Error:", error);
        return { success: false, message: `Vision module failure: ${error.message}` };
    }
};

/**
 * Formats the image data to be sent to the Gemini Vision API.
 */
export const formatImageForAPI = (base64Data, mimeType) => {
    return {
        inlineData: {
            data: base64Data,
            mimeType: mimeType
        }
    };
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, FlatList, ActivityIndicator, Alert, Linking, AppState, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useFocusEffect } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';
import { LinearGradient } from 'expo-linear-gradient';


// --- IMPORTANT: DO NOT USE IN PRODUCTION! ---
const API_KEY = "AIzaSyBnynLbX-Z2STQ0Rzz4aazrTbt5a0SKQJU";
// ---------------------------------------------------

if (API_KEY === 'YOUR_GEMINI_API_KEY' && process.env.NODE_ENV !== 'test') {
    Alert.alert("API Key Needed", "Please replace 'YOUR_GEMINI_API_KEY' in app/(tabs)/ai.tsx with your actual Gemini API key.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const ChatHeader = ({ isMuted, onToggleMute }) => {
    const headerColor = useThemeColor({}, 'header');
    const textColor = useThemeColor({}, 'text');

    return (
        <View style={[styles.header, { backgroundColor: headerColor }]}>
            <ThemedText type="title" style={{ color: textColor }}>{t('ai_assistant')}</ThemedText>
            <TouchableOpacity onPress={onToggleMute} style={styles.muteButton}>
                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color={textColor} />
            </TouchableOpacity>
        </View>
    );
};

export default function AiAssistantScreen() {
    const [status, setStatus] = useState('idle'); // 'idle', 'recording', 'thinking', 'no_permission'
    const [chatHistory, setChatHistory] = useState([]);
    const [propertyData, setPropertyData] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [recording, setRecording] = useState();
    const [isMuted, setIsMuted] = useState(false);
    const appState = useRef(AppState.currentState);

    const primaryColor = useThemeColor({}, 'primary');
    const cardColor = useThemeColor({}, 'card');
    const textColor = useThemeColor({}, 'text');
    const backgroundColor = useThemeColor({}, 'background');

    const requestMicPermission = useCallback(async () => {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status !== 'granted') setStatus('no_permission');
    }, []);

    useEffect(() => {
        requestMicPermission();
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                requestMicPermission();
            }
            appState.current = nextAppState;
        });
        return () => subscription.remove();
    }, [requestMicPermission]);

    const loadPropertyData = async () => {
        try {
            const storedGroups = await AsyncStorage.getItem('groups');
            setPropertyData(storedGroups ? JSON.parse(storedGroups) : []);
             setChatHistory([{ type: 'ai', text: 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?' }]);
        } catch (e) {
            Alert.alert("Error", "Failed to load property data.");
        }
    };

    useFocusEffect(useCallback(() => { loadPropertyData(); }, []));

    async function startRecording() {
        if (!hasPermission) {
            Alert.alert("Microphone Permission Needed", "Please grant microphone access in settings.",
                [{ text: "Open Settings", onPress: () => Linking.openSettings() }, { text: "Cancel", style: "cancel" }]
            );
            return;
        }
        if (API_KEY === 'YOUR_GEMINI_API_KEY') return;
        
        setStatus('recording');
        try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
            setRecording(recording);
        } catch (err) {
            console.error('Failed to start recording', err);
            setStatus('idle');
        }
    }

    async function stopRecording() {
        if (!recording) return;
        
        setStatus('thinking');
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(undefined);

        if (uri) {
            setChatHistory(prev => [...prev, { type: 'user', text: '🎤 Audio' }]);
            fetchAiResponse(uri);
        } else {
            setStatus('idle');
        }
    }
    
    const fetchAiResponse = async (audioUri) => {
        if (!audioUri || !propertyData) {
            setStatus('idle');
            return;
        }

        const thinkingMessage = { type: 'ai', text: '...', isLoading: true, timestamp: new Date() };
        setChatHistory(prev => [...prev, thinkingMessage]);

        try {
            const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const fileExtension = audioUri.split('.').pop();
            const mimeType = `audio/${fileExtension}`;

            const today = new Date().toLocaleDateString('en-CA');
            const prompt = `
                You are a specialized AI assistant for a property manager.

                ### 📜 PRIMARY DIRECTIVE: SCRIPT AND FORMATTING 📜 ###
                Your two most important rules are:
                1.  **HINDI SCRIPT ONLY:** Respond ONLY in pure Hindi, using the Devanagari script (हिन्दी देवनागरी लिपि). Do not use English letters (no Hinglish).
                2.  **TTS-FRIENDLY TEXT ONLY:** Your response must be plain text, suitable for a basic text-to-speech (TTS) engine.
                    -   **DO NOT USE** any special characters like *, #, _, -, or any markdown formatting. These symbols can be read aloud and sound robotic. [13]
                    -   Use only commas (,) for short pauses and full stops (.) to end sentences. This helps the speech engine sound more natural. [4, 5]
                    -   Write short, simple sentences. Long sentences can sound unnatural when read by a TTS engine. [1]
                    -   The final output must be clean, plain text.

                ### KNOWLEDGE AND SCOPE ###
                1.  Your knowledge is strictly limited to the property data provided below.
                2.  Do not use any external information.
                3.  Today's date is: ${today}. This is the most important date for all calculations.
                4.  Property Data: ${JSON.stringify(propertyData, null, 2)}

                ### 🧠 MENTAL WALKTHROUGH: INTERNAL CALCULATION ###
                Before responding, you MUST ALWAYS perform these calculations internally to understand the situation. This is your private thought process.
                1.  **Find Last Paid Month:** Check the 'payments' array to find the latest month paid.
                2.  **Determine Due Period:** Identify the start and end months for which rent is due. The start is the month *after* the last paid month. The end is the current month based on today's date (${today}).
                3.  **Count Unpaid Months:** Count the number of months in the due period one-by-one to avoid errors.
                4.  **Calculate Total Due:** Multiply the count of unpaid months by the 'rentAmount'.

                ### 🎯 YOUR TASK: Understand Intent and Respond Appropriately 🎯 ###
                Your main task is to first understand the user's question and then provide an answer with the right level of detail, following the TTS-friendly formatting rules. Choose one of the following two response modes.

                ---
                #### Response Mode 1: Direct Answer (संक्षिप्त जवाब)
                Use this mode if the user asks a specific, direct question. The answer must be short, to the point, and in clean plain text.

                *   **User Question Example:** "क्या रमेश ने जुलाई २०२५ का भाड़ा दिया है?"
                *   **Your Correct TTS-Friendly Response (if paid):** "जी, रमेश ने जुलाई २०२५ का भाड़ा दे दिया है।"
                *   **Your Correct TTS-Friendly Response (if not paid):** "नहीं, रमेश का जुलाई २०२५ का भाड़ा बाकी है।"

                ---
                #### Response Mode 2: Detailed Summary (विस्तृत जवाब)
                Use this mode if the user asks a general question about rent status or total dues. This response should include the full calculation, presented as simple, clean sentences.

                *   **User Question Example:** "रमेश का क्या हिसाब है?"
                *   **Your Correct TTS-Friendly Response:** "रमेश का किराया सितंबर २०२५ से दिसंबर २०२५ तक का बाकी है। कुल चार महीने से किराया नहीं दिया है। इसलिए कुल बीस हजार रुपये लेने हैं।"

                *   **If no rent is due for a tenant asked about in detail, respond:** "रमेश का कोई किराया बाकी नहीं है। सभी भुगतान समय पर हैं।"
                ---

                ### FINAL INSTRUCTION ###
                Now, please respond to the user's question.
                1.  First, perform your internal calculation.
                2.  Second, identify the user's intent.
                3.  Finally, provide the correct style of response in **pure Devanagari Hindi** and ensure the output is **clean plain text with no special characters**, suitable for a text-to-speech engine.
            `;
            const result = await model.generateContent([prompt, { inlineData: { mimeType, data: audioBase64 } }]);
            const responseText = result.response.text();
            
            if (!isMuted) {
                Speech.speak(responseText, { language: 'hi-IN', pitch: 1.0, rate: 0.9 });
            }
            
            setChatHistory(prev => prev.map(item => 
                item.isLoading && item.timestamp === thinkingMessage.timestamp 
                ? { type: 'ai', text: responseText, timestamp: new Date() } 
                : item
            ));

        } catch (error) {
            console.error("AI Error", error);
            const errorMessage = "माफ़ कीजिए, मुझे जवाब देने में कोई समस्या हुई।";
            setChatHistory(prev => prev.map(item => item.isLoading ? { type: 'ai', text: errorMessage, timestamp: new Date() } : item));
        } finally {
            setStatus('idle');
        }
    };

    const renderChatItem = ({ item }) => {
        const isUser = item.type === 'user';
        const bubbleStyle = isUser ? styles.userBubble : styles.aiBubble;
        const textStyle = isUser ? styles.userText : [styles.aiText, { color: textColor }];
        const bubbleColor = isUser ? primaryColor : cardColor;

        return (
            <View style={[styles.chatItem, isUser ? styles.userItem : styles.aiItem]}>
                <View style={[styles.bubble, bubbleStyle, { backgroundColor: bubbleColor }]}>
                    {item.isLoading ? (
                        <ActivityIndicator color={isUser ? 'white' : textColor} />
                    ) : (
                        <Text style={textStyle}>{item.text}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <ChatHeader isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />
            <LinearGradient
                colors={[backgroundColor, '#00000000'] }
                style={styles.gradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />
            <FlatList
                data={chatHistory}
                renderItem={renderChatItem}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={styles.chatContainer}
                inverted
            />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}>
                <View style={styles.micContainer}>
                    <ThemedText style={styles.statusText}>
                        {status === 'recording' ? 'Recording...' : status === 'thinking' ? 'Thinking...' : 'Hold to Speak'}
                    </ThemedText>
                    <Pressable 
                        style={({ pressed }) => [
                            styles.micButton, 
                            { backgroundColor: pressed || status === 'recording' ? '#F87171' : primaryColor, 
                            transform: [{ scale: pressed || status === 'recording' ? 1.1 : 1 }] }
                        ]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        disabled={status === 'thinking' || status === 'no_permission'}
                    >
                        {status === 'thinking' ? <ActivityIndicator color="white" size="large" /> : <Ionicons name="mic" size={40} color="white" />}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    muteButton: {
        padding: 5,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 100, // Adjust to be below the header
        height: 50,
        zIndex: 1,
    },
    chatContainer: {
        flexGrow: 1,
        paddingHorizontal: 10,
        paddingBottom: 10,
        justifyContent: 'flex-end',
    },
    chatItem: {
        marginVertical: 5,
        maxWidth: '80%',
    },
    userItem: {
        alignSelf: 'flex-end',
    },
    aiItem: {
        alignSelf: 'flex-start',
    },
    bubble: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 20,
    },
    userBubble: {
        borderBottomRightRadius: 5,
    },
    aiBubble: {
        borderBottomLeftRadius: 5,
    },
    userText: {
        color: 'white',
        fontSize: 16,
    },
    aiText: {
        fontSize: 16,
    },
    micContainer: {
        alignItems: 'center',
        paddingBottom: 30,
        paddingTop: 10,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
    },
    statusText: {
        marginBottom: 15,
        fontSize: 14,
        color: '#9CA3AF',
    },
});
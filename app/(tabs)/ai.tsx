import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Animated, SafeAreaView, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useAudioRecorder, useAudioRecorderState, AudioModule, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { doc, onSnapshot, setDoc, getDoc, Unsubscribe } from 'firebase/firestore';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';
import { db } from '@/firebase/config';

const CHAT_HISTORY_KEY = 'chatHistory';

type Status = 'idle' | 'recording' | 'thinking' | 'no_permission';

type UpdateCommand = {
    action: "updateLastPaidMonth";
    tenantName: string;
    locationName: string;
    shopName?: string;
    newLastPaidMonth: string;
};

const ChatHeader = memo(({ isMuted, onToggleMute }: { isMuted: boolean, onToggleMute: () => void }) => {
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
});

const ChatBubble = memo(({ item, isUser, onConfirmUpdate, onDenyUpdate }: { item: any; isUser: boolean; onConfirmUpdate?: (data: UpdateCommand) => void; onDenyUpdate?: (data: UpdateCommand) => void }) => {
    const primaryColor = useThemeColor({}, 'primary');
    const cardColor = useThemeColor({}, 'card');
    const textColor = useThemeColor({}, 'text');

    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
        }).start();
    }, [scaleAnim]);

    const bubbleColor = isUser ? primaryColor : cardColor;
    const bubbleStyle = isUser ? styles.userBubble : styles.aiBubble;
    const textStyle = isUser ? styles.userText : [styles.aiText, { color: textColor }];

    let isConfirmationRequest = false;
    let confirmationData: UpdateCommand | null = null;

    // Check if the AI response is a JSON update command
    if (item.type === 'ai' && typeof item.text === 'string' && item.text.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(item.text);
            if (parsed && parsed.action === "updateLastPaidMonth") {
                isConfirmationRequest = true;
                confirmationData = parsed as UpdateCommand;
            }
        } catch (e) {
            // Not JSON, or invalid JSON, treat as normal text
            console.warn("Failed to parse AI response as JSON:", e);
        }
    }

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={[styles.chatItem, isUser ? styles.userItem : styles.aiItem]}>
                <View style={[styles.bubble, bubbleStyle, { backgroundColor: bubbleColor }]}>
                    {item.isLoading ? (
                        <ActivityIndicator color={isUser ? 'white' : textColor} />
                    ) : isConfirmationRequest && confirmationData ? (
                        // Render confirmation UI
                        <View>
                            <Text style={textStyle}>
                                {confirmationData.tenantName} ({confirmationData.shopName || confirmationData.locationName}) का पिछला भुगतान {confirmationData.newLastPaidMonth} तक का है। क्या आप इसे अपडेट करना चाहते हैं?
                            </Text>
                            <View style={styles.confirmationButtons}>
                                <Pressable
                                    style={[styles.confirmButton, { backgroundColor: primaryColor }]}
                                    onPress={() => onConfirmUpdate && onConfirmUpdate(confirmationData)}
                                >
                                    <Text style={styles.buttonText}>हाँ</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.denyButton, { backgroundColor: '#F87171' }]}
                                    onPress={() => onDenyUpdate && onDenyUpdate(confirmationData)}
                                >
                                    <Text style={styles.buttonText}>नहीं</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <Text style={textStyle}>{item.text}</Text>
                    )}
                </View>
                <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
            </View>
        </Animated.View>
    );
});

export default function AiAssistantScreen() {
    const [status, setStatus] = useState<Status>('idle');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [propertyData, setPropertyData] = useState({ locations: [], api: '' });
    const [hasPermission, setHasPermission] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
    
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);

    const flatListRef = useRef<FlatList>(null);
    const isMutedRef = useRef(isMuted);
    const chatHistoryRef = useRef(chatHistory);
    const firestoreUnsubscribe = useRef<Unsubscribe | null>(null);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const primaryColor = useThemeColor({}, 'primary');

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        chatHistoryRef.current = chatHistory;
        if (chatHistory.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
        if (chatHistory.length > 1) {
            const dataToStore = { history: chatHistory, timestamp: new Date().toISOString() };
            AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(dataToStore));
        }
    }, [chatHistory]);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!AudioModule) {
                Alert.alert('Error', 'Audio module is not available.');
                return;
            }
            const status = await AudioModule.requestRecordingPermissionsAsync();
            setHasPermission(status.granted);
            if (status.granted) {
                await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
            } else {
                setStatus('no_permission');
            }
        };
        checkPermissions();
    }, []);

    const loadDataAndChatHistory = useCallback(async () => {
        const docRef = doc(db, "rentaData", "userProfile");
        firestoreUnsubscribe.current = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setPropertyData(data);
                if (data.api && data.api !== geminiApiKey) {
                    setGeminiApiKey(data.api);
                }
            } else {
                setDoc(docRef, { locations: [], api: '' });
            }
        });

        try {
            const storedChatData = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
            if (storedChatData) {
                const { history, timestamp } = JSON.parse(storedChatData);
                if (Date.now() - new Date(timestamp).getTime() < 10 * 60 * 1000) {
                    setChatHistory(history.map((item: any) => ({...item, timestamp: new Date(item.timestamp)})));
                } else {
                    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
                    setChatHistory([{ type: 'ai', text: 'Hello! मैं आपकी कैसे मदद कर सकता हूँ?', timestamp: new Date() }]);
                }
            } else {
                setChatHistory([{ type: 'ai', text: 'Hello! मैं आपकी कैसे मदद कर सकता हूँ?', timestamp: new Date() }]);
            }
        } catch (e) {
            setChatHistory([{ type: 'ai', text: 'Hello! मैं आपकी कैसे मदद कर सकता हूँ?', timestamp: new Date() }]);
        }
    }, [geminiApiKey]);

    useFocusEffect(useCallback(() => {
        loadDataAndChatHistory();
        return () => {
            if (firestoreUnsubscribe.current) {
                firestoreUnsubscribe.current();
            }
            Speech.stop();
            if (recorderState.isRecording) {
                audioRecorder.stop();
            }
            Keyboard.dismiss();
            setStatus('idle');
        };
    }, [loadDataAndChatHistory, audioRecorder, recorderState.isRecording]));

    const genAI = useMemo(() => geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null, [geminiApiKey]);
    const model = useMemo(() => {
        if (!genAI) return null;
        return genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Strictly maintaining gemini-2.0-flash
            generationConfig: {
                temperature: 0.1,
            }
        });
    }, [genAI]);
    
    const handleUpdateLastPaidMonth = useCallback(async (tenantName: string, locationName: string, newLastPaidMonth: string) => {
        try {
            console.log(`Attempting to update lastPaidMonth for tenant "${tenantName}" in location "${locationName}" to "${newLastPaidMonth}"`);
            
            const docRef = doc(db, "rentaData", "userProfile");
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.error("Document 'rentaData/userProfile' does not exist.");
                Alert.alert("Error", "Could not find user profile document.");
                return;
            }

            const currentData = docSnap.data();
            let updatedLocations = [...(currentData.locations || [])]; 

            const locationIndex = updatedLocations.findIndex((loc: any) => loc.name.trim() === locationName.trim());
            
            if (locationIndex === -1) {
                console.error(`Location with name "${locationName.trim()}" not found.`);
                Alert.alert("Error", `Location "${locationName.trim()}" not found.`);
                return;
            }

            const propertyIndex = updatedLocations[locationIndex].properties.findIndex((prop: any) => prop.tenantName.trim() === tenantName.trim());

            if (propertyIndex === -1) {
                console.error(`Tenant "${tenantName.trim()}" not found in location "${locationName.trim()}".`);
                Alert.alert("Error", `Tenant "${tenantName.trim()}" not found.`);
                return;
            }

            updatedLocations[locationIndex].properties[propertyIndex].lastPaidMonth = newLastPaidMonth;

            const updatedDocumentData = {
                ...currentData,
                locations: updatedLocations
            };

            await setDoc(docRef, updatedDocumentData);
            
            setPropertyData(updatedDocumentData);

            console.log("Firestore document updated successfully!");
            Alert.alert("Success", "Last paid month updated.");

        } catch (error) {
            console.error("Error updating lastPaidMonth:", error);
            Alert.alert("Error", "Failed to update last paid month.");
        }
    }, []); 

    const fetchAiResponse = useCallback(async ({ audioUri, text }: { audioUri?: string; text?: string }) => {
        if ((!audioUri && !text) || !propertyData || !model) {
            setStatus('idle');
            return;
        }

        setStatus('thinking');
        const thinkingMessage = { type: 'ai', text: '...', isLoading: true, timestamp: new Date() };
        setChatHistory(prev => [...prev, thinkingMessage]);
        
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const formattedHistory = chatHistoryRef.current.filter(item => !item.isLoading).map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');
            
            const sanitizedPropertyData = {
                locations: propertyData.locations.map((location: any) => ({
                    ...location,
                    properties: location.properties.map((property: any) => {
                        const { api, dueDate, ...restOfProperty } = property; 
                        return restOfProperty;
                    })
                }))
            };
            
            const prompt = `
            You are a specialized AI assistant for a property manager. Your primary role is to understand user queries about rent, provide accurate summaries, and process rent payment updates. You can also chat and greet with your employer.

            ### PREVIOUS CONVERSATION HISTORY ###
            ${formattedHistory}

            ### 📜 PRIMARY DIRECTIVE: SCRIPT AND FORMATTING 📜 ###
            Your two most important rules are:
            1.  **HINDI SCRIPT ONLY:** Respond ONLY in pure Hindi, using the Devanagari script (हिन्दी देवनागरी लिपि). Do not use English letters (no Hinglish).
            2.  **TTS-FRIENDLY TEXT ONLY:** Your response must be plain text, suitable for a basic text-to-speech (TTS) engine.
                -   **DO NOT USE** any special characters like *, #, _, -, or any markdown formatting.
                -   Use only commas (,) for short pauses and full stops (.) to end sentences. This helps the speech engine sound more natural.
                -   Write short, simple sentences.

            ### KNOWLEDGE AND SCOPE ###
            1.  Your knowledge is strictly limited to the property data provided below.
            2.  Do not use any external information.
            3.  Today's date is: ${today}. This is the most important date for all calculations.
            4.  Property Data: ${JSON.stringify(sanitizedPropertyData, null, 2)}

            ### 🎯 YOUR TASK: Understand Intent and Respond Appropriately 🎯 ###
            Your main task is to understand the user's intent. You have two primary functions: providing information and updating payment records.

            ---
            #### Function 1: Update Rent Payment Records ####

            If the user provides information about a rent payment, your goal is to generate a JSON command for the system to process.

            **1. Keyword Recognition for Rent Payments:**
            To understand the user's intent to update rent, you MUST recognize various words for "rent" and "payment" in Hindi and Gujarati. Pay close attention to these words and their variations:
            *   **Words for Rent:** किराया (kiraya), भाड़ा (bhada), ભાડું (bhadu).
            *   **Words for 'Paid' or 'Gave':** दिया (diya), दे दिया है (de diya hai), चुका दिया है (chuka diya hai), जमा किया (jama kiya), भर दिया (bhar diya), આપ્યું (aapyu), ભરી દીધું છે (bhari didhu chhe).
            *   **Example User Phrases:** "Rafik ne 3 mahine ka bhada de diya hai" or "रमेश का २ महीने का किराया आ गया है". Both mean rent has been paid.

            **2. Calculation and Identification:**
            *   Based on these keywords, identify the tenant by matching their tenantName and locationName from the property data.
            *   Calculate the new 'lastPaidMonth' based on their current lastPaidMonth and the user's statement (e.g., if lastPaidMonth is "2025-03" and user says "paid for 3 months", the new month is "2025-06").

            **3. Output Format (Strictly Enforced):**
            *   If you can confidently identify the tenant, location, and the new lastPaidMonth, you **MUST** respond **ONLY** with a JSON object.
            *   **DO NOT** include any conversational text, greetings, or explanations with the JSON. Your entire response must be the JSON object itself.
            *   **JSON Format:** \`{"action": "updateLastPaidMonth", "tenantName": "TENANT_NAME", "locationName": "LOCATION_NAME", "shopName": "SHOP_NAME", "newLastPaidMonth": "YYYY-MM"}\`

            *   If the user's statement is unclear or you cannot find an exact match for the tenant/location, **DO NOT** output JSON. Instead, respond with a clarifying question in Hindi as per Function 2.

            ---
            #### Function 2: Provide Information ####

            If the user's request is not a payment update, provide an answer in clean, TTS-friendly Hindi.

            *   **Direct Questions:** Answer with short, simple sentences.
                *   *User:* "क्या रमेश ने जुलाई २०२५ का भाड़ा दिया है?"
                *   *Your Response:* "जी, रमेश ने जुलाई २०२५ का भाड़ा दे दिया है।"

            *   **General Summaries:** Provide a detailed summary with full sentences.
                *   *User:* "रमेश का क्या हिसाब है?"
                *   *Your Response:* "रमेश का किराया सितंबर २०२५ से दिसंबर २०२५ तक का बाकी है। कुल चार महीने से किराया नहीं दिया है। इसलिए कुल बीस हजार रुपये लेने हैं।"

            ### FINAL INSTRUCTION ###
            Analyze the user's latest message. First, determine if it is a payment update command. If yes, and you are confident, respond with only the JSON. If no, or if you are uncertain, respond with a helpful, conversational answer in pure, TTS-friendly Hindi.
        `;
        
            let result;
            if (audioUri) {
                const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
                if (audioBase64.length < 1000) throw new Error("Recorded audio file is too small or empty.");
                const fileExtension = audioUri.split('.').pop();
                const mimeType = `audio/${fileExtension}`;
                result = await model.generateContent([prompt, { inlineData: { mimeType, data: audioBase64 } }]);
            } else {
                result = await model.generateContent([prompt, text]);
            }
            
            const responseText = result.response.text();

            let updateCommand: UpdateCommand | null = null;

            try {
                if (responseText.trim().startsWith('{"action": "updateLastPaidMonth"')) {
                    const parsed = JSON.parse(responseText);
                    if (parsed && parsed.action === "updateLastPaidMonth") {
                        updateCommand = parsed as UpdateCommand;
                    }
                }
            } catch (parseError) {
                console.warn("AI response is not a valid JSON update command or parsing failed:", parseError);
            }
            
            // --- Update UI state first ---
            // This will add the AI's response to the chat history.
            // If it's a JSON command, the ChatBubble will render buttons.
            setChatHistory(prev => [
                ...prev.filter(item => !item.isLoading), // Remove any pending loading states
                { type: 'ai', text: responseText, timestamp: new Date() } // Add the AI's response (could be JSON or Hindi text)
            ]);

            // --- Speak the response AFTER UI update (if it's normal Hindi text) ---
            if (!isMutedRef.current && !updateCommand) { 
                Speech.speak(responseText, { language: 'hi-IN', pitch: 1.0, rate: 0.9 });
            }

        } catch (error) {
            console.error("Error in fetchAiResponse:", error);
            const errorMessage = "माफ़ कीजिए, मुझे जवाब देने में कोई समस्या हुई।";
            
            // Ensure loading bubble is removed and replaced with error message
            setChatHistory(prev => [
                ...prev.filter(item => !item.isLoading), 
                { type: 'ai', text: errorMessage, timestamp: new Date() }
            ]);
            
            if (!isMutedRef.current) {
                Speech.speak(errorMessage, { language: 'hi-IN', pitch: 1.0, rate: 0.9 });
            }
        } finally {
            setStatus('idle');
        }
    }, [model, propertyData, handleUpdateLastPaidMonth, isMutedRef]);

    const startRecording = useCallback(async () => {
        if (!hasPermission) {
            Alert.alert("Microphone Permission", "Please grant microphone access in your device settings.");
            return;
        }
        if (!geminiApiKey) {
            Alert.alert("API Key Not Loaded", "Please check your configuration.");
            return;
        }
        
        try {
            setStatus('recording');
            await audioRecorder.prepareToRecordAsync();
            await audioRecorder.record();
        } catch (err) {
            console.error('Failed to start recording:', err);
            Alert.alert('Recording Failed', 'Could not start the audio recording.');
            setStatus('idle');
        }
    }, [hasPermission, geminiApiKey, audioRecorder]);

    const stopRecording = useCallback(async () => {
        if (!recorderState.isRecording) return;
        
        setStatus('thinking');
        try {
            const result = await audioRecorder.stop();
            const uri = result.url;

            if (uri) {
                setChatHistory(prev => [...prev, { type: 'user', text: '🎤 Audio', timestamp: new Date() }]);
                fetchAiResponse({ audioUri: uri });
            } else {
                setStatus('idle');
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            Alert.alert('Error', 'An error occurred while stopping the recording.');
            setStatus('idle');
        }
    }, [recorderState.isRecording, audioRecorder, fetchAiResponse]);
    
    const handleSendText = useCallback(() => {
        if (textInput.trim().length > 0) {
            setChatHistory(prev => [...prev, { type: 'user', text: textInput, timestamp: new Date() }]);
            fetchAiResponse({ text: textInput });
            setTextInput('');
            Keyboard.dismiss();
        }
    }, [textInput, fetchAiResponse]);

    const onToggleMute = useCallback(() => setIsMuted(prev => !prev), []);
    
    const renderChatItem = useCallback(({ item }: { item: any }) => (
        <ChatBubble 
            item={item} 
            isUser={item.type === 'user'} 
            onConfirmUpdate={(data) => {
                console.log("User confirmed update:", data);
                // Call the Firestore update function with trimmed data
                handleUpdateLastPaidMonth(data.tenantName.trim(), data.locationName.trim(), data.newLastPaidMonth);
                // Remove the confirmation UI from chat history
                setChatHistory(prev => prev.filter(msg => msg.timestamp !== item.timestamp));
                // Optionally, add a confirmation message to chat
                setChatHistory(prev => [...prev, { type: 'ai', text: `${data.tenantName} का lastPaidMonth ${data.newLastPaidMonth} पर अपडेट कर दिया गया है।`, timestamp: new Date() }]);
            }} 
            onDenyUpdate={(data) => {
                console.log("User denied update:", data);
                // Remove the confirmation UI
                setChatHistory(prev => prev.filter(msg => msg.timestamp !== item.timestamp));
                // Optionally, send a "No" message to AI or just let it be
            }}
        />
    ), [handleUpdateLastPaidMonth]); 
    
    const isMicDisabled = status === 'thinking' || !hasPermission || !geminiApiKey;
    const isRecording = status === 'recording' && recorderState.isRecording;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <ChatHeader isMuted={isMuted} onToggleMute={onToggleMute} />
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
                <FlatList
                    ref={flatListRef}
                    data={chatHistory}
                    renderItem={renderChatItem}
                    keyExtractor={(item, index) => `${item.timestamp.toISOString()}-${index}`}
                    contentContainerStyle={styles.chatContainer}
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.textInput, { color: textColor, backgroundColor: cardColor }]}
                        placeholder={t('type_a_message')}
                        placeholderTextColor="#9CA3AF"
                        value={textInput}
                        onChangeText={setTextInput}
                        onSubmitEditing={handleSendText}
                    />
                    <TouchableOpacity onPress={handleSendText} style={[styles.sendButton, { backgroundColor: primaryColor }]}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                    <Pressable
                        style={({ pressed }) => [
                            styles.micButton,
                            {
                                backgroundColor: isMicDisabled ? '#9CA3AF' : (pressed || isRecording ? '#F87171' : primaryColor),
                                transform: [{ scale: (pressed && !isMicDisabled) || isRecording ? 1.05 : 1 }]
                            }
                        ]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        disabled={isMicDisabled}
                    >
                        {status === 'thinking' ? <ActivityIndicator color="white" /> : <Ionicons name="mic" size={24} color="white" />}
                    </Pressable>
                </View>
                {Platform.OS === 'android' && <ThemedText style={styles.statusText}>{isRecording ? 'Recording...' : status === 'thinking' ? 'Thinking...' : isMicDisabled ? 'Loading...' : 'Hold to Speak'}</ThemedText>}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
    muteButton: { padding: 5 },
    chatContainer: { flexGrow: 1, paddingHorizontal: 10, paddingBottom: 10, justifyContent: 'flex-end' },
    chatItem: { marginVertical: 8, maxWidth: '85%' },
    userItem: { alignSelf: 'flex-end' },
    aiItem: { alignSelf: 'flex-start' },
    bubble: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20 },
    userBubble: { borderBottomRightRadius: 5 },
    aiBubble: { borderBottomLeftRadius: 5 },
    userText: { color: 'white', fontSize: 16 },
    aiText: { fontSize: 16 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#333' },
    textInput: { flex: 1, height: 45, borderRadius: 25, paddingHorizontal: 20, marginRight: 10, borderWidth: 1, borderColor: '#4A5568', fontSize: 16 },
    sendButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    micButton: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center' },
    statusText: { textAlign: 'center', paddingBottom: 5, fontSize: 12, color: '#9CA3AF' },
    timestamp: { fontSize: 10, color: '#9CA3AF', marginTop: 5, textAlign: 'right', paddingRight: 5 },
    confirmationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    confirmButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    denyButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
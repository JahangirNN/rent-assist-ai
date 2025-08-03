import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Animated, SafeAreaView, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useAudioRecorder, useAudioRecorderState, AudioModule, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { doc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';
import { db } from '@/firebase/config';

const CHAT_HISTORY_KEY = 'chatHistory';

type Status = 'idle' | 'recording' | 'thinking' | 'no_permission';

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

const ChatBubble = memo(({ item, isUser }: { item: any; isUser: boolean }) => {
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

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={[styles.chatItem, isUser ? styles.userItem : styles.aiItem]}>
                <View style={[styles.bubble, bubbleStyle, { backgroundColor: bubbleColor }]}>
                    {item.isLoading ? (
                        <ActivityIndicator color={isUser ? 'white' : textColor} />
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
            model: "gemini-2.0-flash", 
            generationConfig: {
                temperature: 0.5,
            }
        });
    }, [genAI]);
    
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
            const prompt = `You are a specialized AI assistant for a property manager. Also advice and formally chat with the your employer.
    
                ### PREVIOUS CONVERSATION HISTORY ###
                ${formattedHistory}
    
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
            
            let result;
            if (audioUri) {
                const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
                const fileExtension = audioUri.split('.').pop();
                const mimeType = `audio/${fileExtension}`;
                result = await model.generateContent([prompt, { inlineData: { mimeType, data: audioBase64 } }]);
            } else {
                result = await model.generateContent([prompt, text]);
            }
            
            const responseText = result.response.text();
            
            if (!isMutedRef.current) Speech.speak(responseText, { language: 'hi-IN', pitch: 1.0, rate: 0.9 });
            
            // --- THIS IS THE FIX ---
            setChatHistory(prev => [
                ...prev.filter(item => !item.isLoading), // Remove all loading bubbles
                { type: 'ai', text: responseText, timestamp: new Date() } // Add the new response
            ]);
    
        } catch (error) {
            const errorMessage = "माफ़ कीजिए, मुझे जवाब देने में कोई समस्या हुई।";
            
            // --- THIS IS THE FIX FOR THE ERROR CASE ---
            setChatHistory(prev => [
                ...prev.filter(item => !item.isLoading), // Remove all loading bubbles
                { type: 'ai', text: errorMessage, timestamp: new Date() } // Add the new error message
            ]);
        } finally {
            setStatus('idle');
        }
    }, [model, propertyData]);
    
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
    const renderChatItem = useCallback(({ item }: { item: any }) => <ChatBubble item={item} isUser={item.type === 'user'} />, []);
    
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
});
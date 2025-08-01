import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    initializeAuth, 
    getReactNativePersistence,
    signInAnonymously
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNxa-T9U7naCSmUYuOUjFV3AgCJD8KPxE",
  authDomain: "rent-manager-200b4.firebaseapp.com",
  projectId: "rent-manager-200b4",
  storageBucket: "rent-manager-200b4.firebasestorage.app",
  messagingSenderId: "534377120717",
  appId: "1:534377120717:android:d1c18951e59bccd9b7ba84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Sign in anonymously
signInAnonymously(auth).catch(error => {
  console.error("Anonymous sign-in failed:", error);
});


// Initialize other Firebase services
const db = getFirestore(app);

export { app, auth, db };

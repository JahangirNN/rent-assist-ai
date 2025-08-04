import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { db } from '@/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';

interface AppContextType {
  isLocked: boolean;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "rentaData", "userProfile");
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Lock the app if the 'switch' value is '1'.
        // The app works if it's '0' or any other value.
        setIsLocked(data.switch !== '1');
      } else {
        // If the document doesn't exist, default to not locked.
        setIsLocked(false);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to fetch remote config:", error);
      // In case of error, default to not locked to avoid locking users out.
      setIsLocked(false);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ isLocked, isLoading }}>
      {children}
      <Modal
        visible={isLocked}
        animationType="slide"
        transparent={false}
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedText type="title">App Unavailable</ThemedText>
          <ThemedText style={styles.modalText}>Please contact Jahangir for assistance.</ThemedText>
        </ThemedView>
      </Modal>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalText: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 16,
  },
});
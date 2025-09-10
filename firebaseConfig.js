// firebaseConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDGQvUaSljmXzsa7aVcUJAv7RK_yarVakc",
  authDomain: "shopping-list-demo-5f3ad.firebaseapp.com",
  projectId: "shopping-list-demo-5f3ad",
  storageBucket: "shopping-list-demo-5f3ad.appspot.com",
  messagingSenderId: "231119785010",
  appId: "1:231119785010:android:54d65f54f5fdb18f01402b"
};

// Validate configuration
const validateConfig = (config) => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field] || config[field].includes('your-'));
  
  if (missingFields.length > 0) {
    throw new Error(`Firebase config is missing or invalid. Please update the following fields: ${missingFields.join(', ')}`);
  }
};

// Validate the config before initializing
validateConfig(firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
let auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // For React Native, use AsyncStorage for persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (error) {
  // If auth is already initialized, just get the existing instance
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

console.log('Firebase initialized successfully');

export { auth, db };
export default app;
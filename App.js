// App.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

// Firebase Imports
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Import Firebase Auth - different approaches for web vs React Native
let onAuthStateChanged;
let initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence, setPersistence;
let ReactNativeAsyncStorage;

// Platform-specific imports at module level
if (Platform.OS === 'web') {
  // Web imports
  const firebaseAuth = require('firebase/auth');
  getAuth = firebaseAuth.getAuth;
  browserLocalPersistence = firebaseAuth.browserLocalPersistence;
  setPersistence = firebaseAuth.setPersistence;
  onAuthStateChanged = firebaseAuth.onAuthStateChanged;
} else {
  // React Native imports
  try {
    ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    const firebaseAuth = require('firebase/auth');
    initializeAuth = firebaseAuth.initializeAuth;
    getReactNativePersistence = firebaseAuth.getReactNativePersistence;
    onAuthStateChanged = firebaseAuth.onAuthStateChanged;
  } catch (error) {
    console.error('Error importing React Native dependencies:', error);
  }
}

// React Navigation Imports
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import components
import CreateEditListScreen from './CreateEditListScreen';
import ShoppingLists from './ShoppingLists';
import SignInScreen from './SignInScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeFirebaseAndAuth() {
      try {
        // Firebase configuration
        const firebaseConfig = {
          apiKey: "AIzaSyDGQvUaSljmXzsa7aVcUJAv7RK_yarVakc",
          authDomain: "shopping-list-demo-5f3ad.firebaseapp.com",
          projectId: "shopping-list-demo-5f3ad",
          storageBucket: "shopping-list-demo-5f3ad.firebasestorage.app",
          messagingSenderId: "231119785010",
          appId: "1:231119785010:web:2ebb7789fe6727eff01402b",
          measurementId: "G-7Z1179RC0V"
        };

        // Initialize Firebase app
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        
        // Initialize Analytics only in production and if properly configured
        if (!__DEV__ && typeof window !== 'undefined') {
          try {
            // Only initialize analytics if we're in a proper web environment
            getAnalytics(app);
          } catch (analyticsError) {
            console.warn('Analytics initialization failed:', analyticsError);
            // Don't fail the entire app if analytics fails
          }
        }

        let firebaseAuth;

        // Platform-specific Firebase Auth initialization
        if (Platform.OS === 'web') {
          // Web-specific Firebase Auth setup
          firebaseAuth = getAuth(app);
          
          // Set persistence for web
          try {
            await setPersistence(firebaseAuth, browserLocalPersistence);
          } catch (persistenceError) {
            console.warn('Web persistence setup failed:', persistenceError);
          }
        } else {
          // React Native-specific Firebase Auth setup
          if (!ReactNativeAsyncStorage || !initializeAuth || !getReactNativePersistence) {
            throw new Error('React Native dependencies not available');
          }
          
          firebaseAuth = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
          });
        }

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setUserId(user.uid);
            console.log("User signed in:", user.uid);
          } else {
            console.log("No user signed in. Ready to prompt for sign-in.");
            setUserId(null);
          }
          setIsLoading(false);
        });

        return () => unsubscribe();

      } catch (error) {
        console.error("Error initializing Firebase:", error);
        alert("Failed to initialize app. Please check your network or try again.");
        setIsLoading(false);
      }
    }

    initializeFirebaseAndAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading app...</Text>
      </View>
    );
  }

  if (!db || !auth) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize Firebase. Please check your setup.</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <SignInScreen auth={auth} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ShoppingLists">
        <Stack.Screen name="ShoppingLists" options={{ title: 'My Shopping Lists' }}>
          {props => <ShoppingLists {...props} db={db} auth={auth} userId={userId} />}
        </Stack.Screen>
        <Stack.Screen name="CreateEditList" options={{ title: 'Loading...' }}>
          {props => <CreateEditListScreen {...props} db={db} auth={auth} userId={userId} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffe0e0',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
});
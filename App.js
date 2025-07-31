// App.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

// Firebase Imports
import { getAnalytics } from "firebase/analytics"; // Keep Analytics import here
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Import ALL Firebase Auth functions directly (modern approach)
import {
  browserLocalPersistence as _browserLocalPersistence,
  getAuth as _getAuth,
  getReactNativePersistence as _getReactNativePersistence,
  initializeAuth as _initializeAuth,
  onAuthStateChanged as _onAuthStateChanged,
  setPersistence as _setPersistence,
} from 'firebase/auth';

// Only import AsyncStorage for React Native platforms
// Use a try-catch to prevent web build failures if not properly excluded by bundler
let ReactNativeAsyncStorage;
try {
  if (Platform.OS !== 'web') {
    ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  }
} catch (error) {
  console.warn('Could not import @react-native-async-storage/async-storage. This is expected on web, but an error on native:', error);
}

// Declare variables to hold platform-specific auth functions
let onAuthStateChanged, initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence, setPersistence;

// Conditionally assign based on platform
if (Platform.OS === 'web') {
  onAuthStateChanged = _onAuthStateChanged;
  getAuth = _getAuth;
  browserLocalPersistence = _browserLocalPersistence;
  setPersistence = _setPersistence;
  // initializeAuth and getReactNativePersistence are not used on web
} else {
  onAuthStateChanged = _onAuthStateChanged;
  initializeAuth = _initializeAuth;
  getReactNativePersistence = _getReactNativePersistence;
  // getAuth, browserLocalPersistence, setPersistence are not used in this specific RN setup logic here
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

        // Initialize Analytics only if not in development
        if (!__DEV__) {
          try {
            getAnalytics(app);
          } catch (analyticsError) {
            console.warn('Analytics initialization failed:', analyticsError);
          }
        }

        let firebaseAuthInstance; // Renamed to avoid confusion with the module itself

        // Platform-specific Firebase Auth initialization
        if (Platform.OS === 'web') {
          // Web-specific Firebase Auth setup
          firebaseAuthInstance = getAuth(app);

          // Set persistence for web
          try {
            if (setPersistence && browserLocalPersistence) { // Ensure functions are defined
              await setPersistence(firebaseAuthInstance, browserLocalPersistence);
            } else {
              console.warn('Web persistence functions not available, skipping.');
            }
          } catch (persistenceError) {
            console.warn('Web persistence setup failed:', persistenceError);
          }
        } else {
          // React Native-specific Firebase Auth setup
          if (!ReactNativeAsyncStorage || !initializeAuth || !getReactNativePersistence) {
            throw new Error('React Native Firebase Auth dependencies not available. Ensure @react-native-async-storage/async-storage is installed and correctly linked.');
          }

          firebaseAuthInstance = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
          });
        }

        setDb(firestoreDb);
        setAuth(firebaseAuthInstance);

        // Set up auth state listener
        // Ensure onAuthStateChanged is defined before calling it
        if (onAuthStateChanged) {
          const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (user) => {
            if (user) {
              setUserId(user.uid);
              console.log("User signed in:", user.uid);
            } else {
              console.log("No user signed in. Ready to prompt for sign-in.");
              setUserId(null);
            }
            setIsLoading(false); // Set loading to false once auth state is determined
          });

          return () => unsubscribe(); // Cleanup the listener
        } else {
          console.error("onAuthStateChanged function is not defined. Firebase Auth setup issue.");
          setIsLoading(false); // Stop loading even if auth listener couldn't be set
        }

      } catch (error) {
        console.error("Error initializing Firebase:", error);
        alert("Failed to initialize app. Please check your network or try again. Error: " + error.message);
        setIsLoading(false);
      }
    }

    initializeFirebaseAndAuth();
  }, []); // Empty dependency array means this runs once on mount

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading app...</Text>
      </View>
    );
  }

  // Handle case where Firebase initialization itself failed (db or auth are null)
  if (!db || !auth) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize Firebase. Please check your setup and console for errors.</Text>
      </View>
    );
  }

  if (!userId) {
    // Pass the auth instance to SignInScreen
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
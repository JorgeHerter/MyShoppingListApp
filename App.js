// App.js
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import {
  browserLocalPersistence as _browserLocalPersistence,
  getAuth as _getAuth,
  getReactNativePersistence as _getReactNativePersistence,
  initializeAuth as _initializeAuth,
  onAuthStateChanged as _onAuthStateChanged,
  setPersistence as _setPersistence,
} from 'firebase/auth';

let ReactNativeAsyncStorage;
try {
  if (Platform.OS !== 'web') {
    ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  }
} catch (error) {
  console.warn('Could not import @react-native-async-storage/async-storage. This is expected on web, but an error on native:', error);
}

let onAuthStateChanged, initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence, setPersistence;

if (Platform.OS === 'web') {
  onAuthStateChanged = _onAuthStateChanged;
  getAuth = _getAuth;
  browserLocalPersistence = _browserLocalPersistence;
  setPersistence = _setPersistence;
} else {
  onAuthStateChanged = _onAuthStateChanged;
  initializeAuth = _initializeAuth;
  getReactNativePersistence = _getReactNativePersistence;
}

// React Navigation Imports
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import components
import CreateEditListScreen from './CreateEditListScreen';
import ShareListScreen from './ShareListScreen'; // NEW: Import the new screen
import ShoppingLists from './ShoppingLists';
import SignInScreen from './SignInScreen';

const Stack = createNativeStackNavigator();

/**
 * A dedicated component for the authenticated user's navigation stack.
 * This makes the main App component cleaner.
 */
function AppStack({ db, auth, userId }) {
  return (
    <Stack.Navigator initialRouteName="ShoppingLists">
      <Stack.Screen name="ShoppingLists" options={{ title: 'My Shopping Lists' }}>
        {props => <ShoppingLists {...props} db={db} auth={auth} userId={userId} />}
      </Stack.Screen>
      <Stack.Screen name="CreateEditList" options={{ title: 'Shopping List' }}>
        {props => <CreateEditListScreen {...props} db={db} auth={auth} userId={userId} />}
      </Stack.Screen>
      {/* NEW: Add the ShareListScreen to the navigation stack */}
      <Stack.Screen name="ShareList" options={{ title: 'Share List' }}>
        {props => <ShareListScreen {...props} db={db} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeFirebaseAndAuth() {
      try {
        const firebaseConfig = {
          apiKey: "AIzaSyDGQvUaSljmXzsa7aVcUJAv7RK_yarVakc",
          authDomain: "shopping-list-demo-5f3ad.firebaseapp.com",
          projectId: "shopping-list-demo-5f3ad",
          storageBucket: "shopping-list-demo-5f3ad.firebasestorage.app",
          messagingSenderId: "231119785010",
          appId: "1:231119785010:web:2ebb7789fe6727eff01402b",
          measurementId: "G-7Z1179RC0V"
        };

        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);

        if (!__DEV__) {
          try {
            getAnalytics(app);
          } catch (analyticsError) {
            console.warn('Analytics initialization failed:', analyticsError);
          }
        }

        let firebaseAuthInstance;

        if (Platform.OS === 'web') {
          firebaseAuthInstance = getAuth(app);
          try {
            if (setPersistence && browserLocalPersistence) {
              await setPersistence(firebaseAuthInstance, browserLocalPersistence);
            } else {
              console.warn('Web persistence functions not available, skipping.');
            }
          } catch (persistenceError) {
            console.warn('Web persistence setup failed:', persistenceError);
          }
        } else {
          if (!ReactNativeAsyncStorage || !initializeAuth || !getReactNativePersistence) {
            throw new Error('React Native Firebase Auth dependencies not available. Ensure @react-native-async-storage/async-storage is installed and correctly linked.');
          }
          firebaseAuthInstance = initializeAuth(app, {
            persistence: getReactNativePersistence(ReactNativeAsyncStorage)
          });
        }

        setDb(firestoreDb);
        setAuth(firebaseAuthInstance);

        if (onAuthStateChanged) {
          const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (user) => {
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
        } else {
          console.error("onAuthStateChanged function is not defined. Firebase Auth setup issue.");
          setIsLoading(false);
        }

      } catch (error) {
        console.error("Error initializing Firebase:", error);
        alert("Failed to initialize app. Please check your network or try again. Error: " + error.message);
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
        <Text style={styles.errorText}>Failed to initialize Firebase. Please check your setup and console for errors.</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* Conditionally render the appropriate stack based on authentication */}
      {userId ? (
        <AppStack db={db} auth={auth} userId={userId} />
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="SignIn" options={{ headerShown: false }}>
            {props => <SignInScreen {...props} auth={auth} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
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
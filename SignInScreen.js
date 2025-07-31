// SignInScreen.js
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Ensure WebBrowser is closed when the app is focused
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen({ auth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Google OAuth configuration with proper web support
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: Platform.select({
      web: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
      ios: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
      android: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
    }),
    webClientId: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ 
      useProxy: Platform.OS !== 'web', // Don't use proxy in web production
      scheme: Platform.OS === 'web' ? 'https' : undefined 
    }),
  });

  // Listen for Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.authentication;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          console.log('Google sign-in successful!');
          // App.js auth state listener will handle navigation
        })
        .catch(error => {
          console.error('Google sign-in error:', error);
          Alert.alert('Google Sign-In Failed', error.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (response?.type === 'cancel') {
      console.log('Google sign-in cancelled.');
      setLoading(false);
    } else if (response?.type === 'error') {
      console.error('Google sign-in response error:', response.error);
      Alert.alert('Google Sign-In Error', response.error);
      setLoading(false);
    }
  }, [response, auth]);

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Account created! You are now signed in.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Success', 'Signed in successfully!');
      }
      // App.js auth state listener will handle navigation
    } catch (error) {
      console.error('Email/Password Auth Error:', error);
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!request) {
      Alert.alert('Configuration Error', 'Google Sign-In request not configured. Check your client IDs.');
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('Error prompting Google sign-in:', error);
      Alert.alert('Google Sign-In Error', error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Your Shopping List App</Text>
      <Text style={styles.subtitle}>
        {isRegistering ? 'Create your account' : 'Sign in to manage your lists'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading && !response ? <ActivityIndicator color="#fff" /> : (isRegistering ? 'Register' : 'Sign In')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={handleGoogleSignIn}
        disabled={!request || loading}
      >
        <Text style={styles.buttonText}>
          {loading && response?.type === 'success' ? <ActivityIndicator color="#fff" /> : 'Sign In with Google'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsRegistering(prev => !prev)}
        disabled={loading}
      >
        <Text style={styles.toggleButtonText}>
          {isRegistering ? 'Already have an account? Sign In' : 'New user? Register'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  toggleButton: {
    marginTop: 20,
    padding: 10,
  },
  toggleButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 20,
  }
});
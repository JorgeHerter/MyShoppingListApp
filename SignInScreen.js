// SignInScreen.js
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider, // Used for Google sign-in
  onAuthStateChanged, // To listen for auth state changes
  signInWithCredential,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { useEffect, useState } from 'react'; // Import React
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

export default function SignInScreen({ auth, navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // NEW STATE for password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: Platform.select({
      web: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com', // Your Web Client ID
      ios: '231119785010-rsjvmqq7836bblr5s583ehc2rkj2h5e1.apps.googleusercontent.com', // Your iOS Client ID
      android: '231119785010-c4hd37ol1vqutqeddlf4dkbdglrc5c5e.apps.googleusercontent.com', // Your Android Client ID
    }),
    webClientId: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
    iosClientId: '231119785010-rsjvmqq7836bblr5s583ehc2rkj2h5e1.apps.googleusercontent.com',
    androidClientId: '231119785010-c4hd37ol1vqutqeddlf4dkbdglrc5c5e.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ useProxy: true }),
    scopes: ['openid', 'profile', 'email'],
    responseType: 'id_token', // Requesting an ID token
  });

  // Listen for Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Google Auth Response (Success Type):', response);
      if (response.params && response.params.id_token) {
        const id_token = response.params.id_token;
        const credential = GoogleAuthProvider.credential(id_token);
        setLoading(true);
        signInWithCredential(auth, credential)
          .then(() => {
            console.log('Google sign-in successful!');
          })
          .catch(error => {
            console.error('Google sign-in error:', error);
            Alert.alert('Google Sign-In Failed', error.message);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        console.error('Google sign-in response missing id_token in params. Unexpected structure:', response);
        Alert.alert('Google Sign-In Error', 'Authentication token missing from response. Please try again.');
        setLoading(false);
      }
    } else if (response?.type === 'cancel') {
      console.log('Google sign-in cancelled.');
      setLoading(false);
    } else if (response?.type === 'error') {
      console.error('Google sign-in response error:', response.error);
      Alert.alert('Google Sign-In Error', response.error?.error_description || response.error);
      setLoading(false);
    }
  }, [response, auth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        console.log('User signed in:', user.uid);
      } else {
        console.log('No user signed in. Ready to prompt for sign-in.');
      }
    });
    return unsubscribe;
  }, [auth]);

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
      {/* Password Input with Toggle */}
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.passwordInput} // Use a new style for the text input itself
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword} // Toggle secureTextEntry based on state
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.passwordVisibilityToggle}
          onPress={() => setShowPassword(prev => !prev)}
          disabled={loading}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'} // Change icon based on state
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>

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
  // Original input style remains for email
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
  // NEW styles for password input and toggle
  passwordInputContainer: {
    flexDirection: 'row', // Arrange children horizontally
    alignItems: 'center', // Vertically center items
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1, // Take up remaining space
    padding: 15,
    fontSize: 16,
  },
  passwordVisibilityToggle: {
    padding: 10,
    marginRight: 5,
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
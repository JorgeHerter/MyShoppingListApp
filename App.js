import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from './firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

const appId = 'shopping-app';
const LIST_CACHE_KEY = 'shopping_lists_cache';

const VIEWS = {
  SIGN_IN: 'signIn',
  SHOPPING_LISTS: 'shoppingLists',
  CREATE_EDIT_LIST: 'createEditList',
  SHARE_LIST: 'shareList',
};

const MessageModal = ({ message, visible, onClose }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalText}>{message}</Text>
        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
          <Text style={styles.modalButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const SignInScreen = ({ onMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: Platform.select({
      web: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
      ios: '231119785010-rsjvmqq7836bblr5s583ehc2rkj2h5e1.apps.googleusercontent.com',
      android: '231119785010-c4hd37ol1vqutqeddlf4dkbdglrc5c5e.apps.googleusercontent.com',
    }),
    webClientId: '231119785010-ljas6ahbcr1k1fi7d824egknqitq43es.apps.googleusercontent.com',
    iosClientId: '231119785010-rsjvmqq7836bblr5s583ehc2rkj2h5e1.apps.googleusercontent.com',
    androidClientId: '231119785010-c4hd37ol1vqutqeddlf4dkbdglrc5c5e.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ useProxy: true }),
    scopes: ['openid', 'profile', 'email'],
    responseType: 'id_token',
  });

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
            onMessage('Successfully signed in with Google!');
          })
          .catch(error => {
            console.error('Google sign-in error:', error);
            onMessage('Google sign-in failed: ' + error.message);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        console.error('Google sign-in response missing id_token in params:', response);
        onMessage('Authentication token missing from response. Please try again.');
        setLoading(false);
      }
    } else if (response?.type === 'cancel') {
      console.log('Google sign-in cancelled.');
      setLoading(false);
    } else if (response?.type === 'error') {
      console.error('Google sign-in response error:', response.error);
      onMessage('Google sign-in error: ' + (response.error?.error_description || response.error));
      setLoading(false);
    }
  }, [response, onMessage]);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      onMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        onMessage('Account created! You are now signed in.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onMessage('Signed in successfully!');
      }
    } catch (error) {
      console.error('Email/Password Auth Error:', error);
      onMessage('Authentication error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!request) {
      onMessage('Google Sign-In not configured. Check your client IDs.');
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('Error prompting Google sign-in:', error);
      onMessage('Google sign-in error: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.signInContainer}>
      <Text style={styles.signInTitle}>Welcome to Your Shopping List App</Text>
      <Text style={styles.signInSubtitle}>
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
      
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.passwordVisibilityToggle}
          onPress={() => setShowPassword(prev => !prev)}
          disabled={loading}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.authButton}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        {loading && !response ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.authButtonText}>
            {isRegistering ? 'Register' : 'Sign In'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.authButton, styles.googleButton]}
        onPress={handleGoogleSignIn}
        disabled={!request || loading}
      >
        {loading && response?.type === 'success' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.authButtonText}>Sign In with Google</Text>
        )}
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

      {loading && (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loadingIndicator} />
      )}
    </View>
  );
};

const App = () => {
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState(VIEWS.SIGN_IN);
  const [selectedList, setSelectedList] = useState(null);
  const [message, setMessage] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const { isConnected, isInternetReachable } = useNetInfo();
  const isOnline = isConnected && isInternetReachable;

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User signed in with UID:", user.uid);
        setUserId(user.uid);
        setCurrentView(VIEWS.SHOPPING_LISTS);
      } else {
        console.log("No user signed in.");
        setUserId(null);
        setCurrentView(VIEWS.SIGN_IN);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline) {
      console.log("Network is online. Enabling Firestore network.");
      enableNetwork(db).catch(error => {
        console.error("Error enabling network:", error);
      });
    } else {
      console.log("Network is offline. Disabling Firestore network.");
      disableNetwork(db).catch(error => {
        console.error("Error disabling network:", error);
      });
    }
  }, [isOnline]);

  const showMessageModal = (msg) => {
    setMessage(msg);
    setShowMessage(true);
  };

  const hideMessageModal = () => {
    setShowMessage(false);
    setMessage(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showMessageModal('Successfully signed out!');
    } catch (error) {
      console.error('Error signing out:', error);
      showMessageModal('Failed to sign out. Please try again.');
    }
  };

  const handleNavigate = (view, list = null) => {
    setCurrentView(view);
    setSelectedList(list);
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading app...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MessageModal 
        message={message} 
        visible={showMessage} 
        onClose={hideMessageModal} 
      />
      
      {userId && (
        <View style={styles.header}>
          <Text style={styles.userIdText} numberOfLines={1}>
            User ID: {userId}
          </Text>
          {isOnline ? (
            <Text style={styles.networkStatusText}>Online</Text>
          ) : (
            <Text style={[styles.networkStatusText, styles.offlineText]}>Offline</Text>
          )}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {(() => {
          switch (currentView) {
            case VIEWS.SIGN_IN:
              return <SignInScreen onMessage={showMessageModal} />;
            case VIEWS.SHOPPING_LISTS:
              return <ShoppingLists
                userId={userId}
                onNavigate={handleNavigate}
                onMessage={showMessageModal}
                isOnline={isOnline}
              />;
            case VIEWS.CREATE_EDIT_LIST:
              return <CreateEditListScreen
                userId={userId}
                onNavigate={handleNavigate}
                selectedList={selectedList}
                onMessage={showMessageModal}
                isOnline={isOnline}
              />;
            case VIEWS.SHARE_LIST:
              return <ShareListScreen
                selectedList={selectedList}
                onNavigate={handleNavigate}
                onMessage={showMessageModal}
                isOnline={isOnline}
              />;
            default:
              return (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>View not found.</Text>
                </View>
              );
          }
        })()}
      </View>
    </View>
  );
};

const ShoppingLists = ({ userId, onNavigate, onMessage, isOnline }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchLists = async () => {
      if (isOnline) {
        // Online: Fetch from Firestore and cache locally
        const shoppingListsRef = collection(db, `artifacts/${appId}/public/data/shopping_lists`);
        const unsubscribe = onSnapshot(shoppingListsRef, async (snapshot) => {
          const fetchedLists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          const userLists = fetchedLists.filter(list => 
            list.ownerId === userId || (list.sharedWith && list.sharedWith.includes(userId))
          );
          setLists(userLists);
          try {
            await AsyncStorage.setItem(LIST_CACHE_KEY, JSON.stringify(userLists));
          } catch (e) {
            console.error("Error caching data to AsyncStorage:", e);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching shopping lists:", error);
          onMessage("Error fetching lists. Please try again later.");
          setLoading(false);
        });
        return () => unsubscribe();
      } else {
        // Offline: Fetch from AsyncStorage
        try {
          const cachedLists = await AsyncStorage.getItem(LIST_CACHE_KEY);
          if (cachedLists !== null) {
            const parsedLists = JSON.parse(cachedLists);
            const userLists = parsedLists.filter(list => 
              list.ownerId === userId || (list.sharedWith && list.sharedWith.includes(userId))
            );
            setLists(userLists);
            onMessage("App is offline. Displaying cached lists.");
          } else {
            setLists([]);
            onMessage("App is offline and no cached data is available.");
          }
        } catch (e) {
          console.error("Error loading data from AsyncStorage:", e);
          onMessage("Error loading cached data. Please try again when online.");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchLists();
  }, [userId, isOnline, onMessage]);

  const handleCreateList = () => {
    if (!isOnline) {
      onMessage("Cannot create a new list while offline. Please connect to the internet.");
      return;
    }
    onNavigate(VIEWS.CREATE_EDIT_LIST);
  };

  const handleEditList = (list) => {
    onNavigate(VIEWS.CREATE_EDIT_LIST, list);
  };

  const handleDeleteList = async (listId) => {
    if (!isOnline) {
      onMessage("Cannot delete a list while offline. Please connect to the internet.");
      return;
    }

    Alert.alert(
      "Delete List",
      "Are you sure you want to delete this list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, `artifacts/${appId}/public/data/shopping_lists`, listId));
              onMessage("List deleted successfully!");
            } catch (error) {
              console.error("Error deleting document:", error);
              onMessage("Failed to delete the list. Please try again.");
            }
          }
        }
      ]
    );
  };

  const renderListItem = ({ item: list }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemName}>{list.name}</Text>
      <View style={styles.listItemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditList(list)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={() => onNavigate(VIEWS.SHARE_LIST, list)}
          disabled={!isOnline}
        >
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteList(list.id)}
          disabled={!isOnline}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>My Shopping Lists</Text>
      {lists.length > 0 ? (
        <FlatList
          data={lists}
          keyExtractor={item => item.id}
          renderItem={renderListItem}
          style={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You have no shopping lists yet. Create one!</Text>
        </View>
      )}
      <TouchableOpacity 
        style={styles.createButton} 
        onPress={handleCreateList}
        disabled={!isOnline}
      >
        <Text style={styles.createButtonText}>Create New List</Text>
      </TouchableOpacity>
    </View>
  );
};

const CreateEditListScreen = ({ userId, onNavigate, selectedList, onMessage, isOnline }) => {
  const [listName, setListName] = useState(selectedList ? selectedList.name : '');
  const [items, setItems] = useState(selectedList ? (selectedList.items || []) : []);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, { name: newItem.trim(), completed: false }]);
      setNewItem('');
    }
  };

  const handleToggleCompleted = (index) => {
    const newItems = [...items];
    newItems[index].completed = !newItems[index].completed;
    setItems(newItems);
  };
  
  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveList = async () => {
    if (!listName.trim()) {
      onMessage("Please enter a list name.");
      return;
    }

    if (!isOnline) {
      onMessage("Cannot save changes while offline. Please connect to the internet.");
      return;
    }

    const listData = {
      name: listName.trim(),
      items: items,
      ownerId: userId,
      sharedWith: selectedList ? selectedList.sharedWith || [] : [],
      createdAt: selectedList ? selectedList.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (selectedList) {
        await updateDoc(doc(db, `artifacts/${appId}/public/data/shopping_lists`, selectedList.id), listData);
        onMessage("List updated successfully!");
      } else {
        await addDoc(collection(db, `artifacts/${appId}/public/data/shopping_lists`), listData);
        onMessage("List created successfully!");
      }
      onNavigate(VIEWS.SHOPPING_LISTS);
    } catch (error) {
      console.error("Error saving list:", error);
      onMessage("Failed to save the list. Please try again.");
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleToggleCompleted(index)}
      >
        {item.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>
      <Text style={[styles.itemText, item.completed && styles.completedItem]}>
        {item.name}
      </Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(index)}
      >
        <Ionicons name="close" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.screenContainer}>
      <Text style={styles.screenTitle}>
        {selectedList ? 'Edit Shopping List' : 'Create New List'}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="List Name"
        value={listName}
        onChangeText={setListName}
      />
      
      <View style={styles.addItemContainer}>
        <TextInput
          style={[styles.input, styles.addItemInput]}
          placeholder="New Item"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={items}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        style={styles.itemsList}
        scrollEnabled={false}
      />
      
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => onNavigate(VIEWS.SHOPPING_LISTS)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.saveButton]} 
          onPress={handleSaveList}
          disabled={!isOnline}
        >
          <Text style={styles.saveButtonText}>Save List</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const ShareListScreen = ({ selectedList, onNavigate, onMessage, isOnline }) => {
  const [sharedUserId, setSharedUserId] = useState('');

  const handleShare = async () => {
    if (!selectedList || !sharedUserId.trim()) {
      onMessage("Please select a list and enter a valid user ID.");
      return;
    }

    if (!isOnline) {
      onMessage("Cannot share a list while offline. Please connect to the internet.");
      return;
    }

    try {
      const listRef = doc(db, `artifacts/${appId}/public/data/shopping_lists`, selectedList.id);
      
      const currentSharedWith = selectedList.sharedWith || [];
      if (currentSharedWith.includes(sharedUserId.trim())) {
        onMessage("This list is already shared with that user.");
        return;
      }
      
      const updatedSharedWith = [...currentSharedWith, sharedUserId.trim()];
      await updateDoc(listRef, { sharedWith: updatedSharedWith });
      
      onMessage("List shared successfully!");
      onNavigate(VIEWS.SHOPPING_LISTS);
    } catch (error) {
      console.error("Error sharing list:", error);
      onMessage("Failed to share the list. Please try again.");
    }
  };
  
  if (!selectedList) {
    onMessage("No list selected to share.");
    onNavigate(VIEWS.SHOPPING_LISTS);
    return null;
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Share "{selectedList.name}"</Text>
      <Text style={styles.shareDescription}>
        Enter the User ID of the person you want to share this list with.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter User ID"
        value={sharedUserId}
        onChangeText={setSharedUserId}
      />
      
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => onNavigate(VIEWS.SHOPPING_LISTS)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.shareActionButton]} 
          onPress={handleShare}
          disabled={!isOnline}
        >
          <Text style={styles.saveButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userIdText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  networkStatusText: {
    marginHorizontal: 10,
    fontWeight: 'bold',
    color: '#10b981',
  },
  offlineText: {
    color: '#ef4444',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  // Sign In Screen Styles
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#111827',
  },
  signInSubtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#6b7280',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  passwordVisibilityToggle: {
    padding: 10,
    marginRight: 5,
  },
  authButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    marginBottom: 10,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
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
    color: '#6366f1',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 300,
    width: '100%',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#111827',
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    color: '#111827',
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#6366f1',
  },
  shareButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addItemInput: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemsList: {
    maxHeight: 300,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6366f1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  completedItem: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  removeButton: {
    padding: 4,
  },
  saveButtonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  shareActionButton: {
    backgroundColor: '#10b981',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  shareDescription: {
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default App;

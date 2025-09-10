// ShoppingLists.js - Implemented Offline-First Logic with Fixed Collection Path
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, or, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// App ID for Firestore collections - must match your security rules
const appId = 'shopping-app';

// We now pass `isConnected` as a prop from App.js
export default function ShoppingLists({ db, auth, userId, navigation, route, isConnected }) {
  const [loadingLists, setLoadingLists] = useState(true);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [error, setError] = useState(null);
  const [listName, setListName] = useState("");
  const [item1, setItem1] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  
  // Define a constant for the AsyncStorage key to avoid typos
  const CACHE_KEY_PREFIX = `shopping_lists_${userId}`;

  // The main effect to handle both online and offline data fetching
  useEffect(() => {
    // Only proceed if the user is authenticated
    if (!userId) {
      setLoadingLists(false);
      return;
    }

    // This function will fetch from Firestore and set up the real-time listener
    const fetchOnlineAndCache = () => {
      console.log('Online: Attaching onSnapshot listener to Firestore...');
      // FIXED: Use the correct collection path that matches security rules
      const q = query(
        collection(db, `artifacts/${appId}/public/data/shopping_lists`),
        or(
          where("ownerId", "==", userId),
          where("sharedWith", "array-contains", userId)
        )
      );

      // `onSnapshot` is the key to real-time and offline functionality
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const fetchedLists = [];
        querySnapshot.forEach((docObject) => {
          const data = docObject.data();
          if (data.name && Array.isArray(data.items)) {
            const itemsWithChecked = data.items.map(item =>
              typeof item === 'object' && item !== null && 'name' in item && 'checked' in item
                ? item
                : { name: item, checked: false }
            );
            const isOwner = data.ownerId === userId;
            fetchedLists.push({ id: docObject.id, ...data, items: itemsWithChecked, isOwner });
          }
        });

        // When new data arrives, cache it locally in AsyncStorage
        try {
          await AsyncStorage.setItem(CACHE_KEY_PREFIX, JSON.stringify(fetchedLists));
          console.log('Lists synchronized and cached locally.');
        } catch (e) {
          console.error('Failed to cache lists:', e);
        }
        setShoppingLists(fetchedLists);
        setLoadingLists(false);
        setError(null); // Clear any previous errors
      }, (error) => {
        console.error("onSnapshot error:", error);
        setError("Failed to sync lists. You may be offline.");
        // If an error occurs (e.g., no network), fall back to cache
        loadFromCache();
      });

      // Cleanup function to detach the listener when the component unmounts
      return () => unsubscribe();
    };

    // This function will load data from AsyncStorage when offline
    const loadFromCache = async () => {
      try {
        setLoadingLists(true);
        const cachedLists = await AsyncStorage.getItem(CACHE_KEY_PREFIX);
        if (cachedLists !== null) {
          console.log('Offline: Loading lists from cache.');
          setShoppingLists(JSON.parse(cachedLists));
        } else {
          console.log('Offline: No cached lists found.');
          setShoppingLists([]);
          setError("No cached data available. Connect to the internet to load your lists.");
        }
      } catch (e) {
        console.error("Error loading cached data:", e);
        setError("Failed to load cached data.");
      } finally {
        setLoadingLists(false);
      }
    };

    // Main logic that decides whether to go online or offline
    if (db) {
      if (isConnected) {
        // We are online, so fetch from Firestore and enable network
        return fetchOnlineAndCache();
      } else {
        // We are offline, so load from the local cache
        loadFromCache();
      }
    }
  }, [db, userId, isConnected]);

  const addShoppingList = async () => {
    // Prevent adding lists when offline
    if (!isConnected) {
      Alert.alert("Offline", "Cannot add new lists while offline. Please connect to the internet to create new lists.");
      return;
    }

    if (!listName.trim() || !item1.trim()) {
      Alert.alert("Missing Information", "Please enter a list name and at least one item.");
      return;
    }

    try {
      const itemsArray = item1.split(',').map(item => ({
        name: item.trim(),
        checked: false
      })).filter(item => item.name !== '');

      if (itemsArray.length === 0) {
        Alert.alert("Missing Information", "Please enter at least one item.");
        return;
      }

      const newListData = {
        name: listName.trim(),
        items: itemsArray,
        ownerId: userId,
        sharedWith: [],
        isPublic: isPublic,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // FIXED: Use the correct collection path
      await addDoc(collection(db, `artifacts/${appId}/public/data/shopping_lists`), newListData);
      
      Alert.alert(`Success`, `The list "${listName.trim()}" has been added.`);
      setListName('');
      setItem1('');
      setIsPublic(false);
    } catch (error) {
      console.error("Error adding shopping list:", error);
      Alert.alert("Error adding list", error.message);
    }
  };

  const handleDeleteList = async (listId, listName) => {
    if (!isConnected) {
      Alert.alert("Offline", "Cannot delete lists while offline. Please connect to the internet.");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete the list "${listName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const listToDelete = shoppingLists.find(list => list.id === listId);
              if (!listToDelete || !listToDelete.isOwner) {
                Alert.alert('Error', 'You can only delete your own lists.');
                return;
              }
              // FIXED: Use the correct collection path
              const listDocRef = doc(db, `artifacts/${appId}/public/data/shopping_lists`, listId);
              await deleteDoc(listDocRef);
              Alert.alert("Success", `"${listName}" has been deleted.`);
            } catch (error) {
              console.error("Error deleting shopping list:", error);
              Alert.alert('Delete Failed', `Error: ${error.message || 'Unknown error'}`);
            }
          }
        }
      ]
    );
  };
  
  const handleEditList = (list) => {
    navigation.navigate('CreateEditList', { list: list });
  };
  
  const handleShareList = (listId, listName) => {
    navigation.navigate('ShareList', { listId, listName });
  };
  
  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Failed to sign out: " + error.message);
    }
  };
  
  const toggleItemChecked = async (listId, itemIndex) => {
    // Update local state immediately for better UX
    setShoppingLists(currentLists => {
      return currentLists.map(list => {
        if (list.id === listId) {
          const newItems = [...list.items];
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            checked: !newItems[itemIndex].checked,
          };
          return { ...list, items: newItems };
        }
        return list;
      });
    });

    // If online, also update Firestore
    if (isConnected) {
      try {
        const list = shoppingLists.find(l => l.id === listId);
        if (list) {
          const updatedItems = [...list.items];
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            checked: !updatedItems[itemIndex].checked,
          };
          
          // FIXED: Use the correct collection path
          const listDocRef = doc(db, `artifacts/${appId}/public/data/shopping_lists`, listId);
          await updateDoc(listDocRef, {
            items: updatedItems,
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error updating item:", error);
        // Revert the local change if Firestore update fails
        setShoppingLists(currentLists => {
          return currentLists.map(list => {
            if (list.id === listId) {
              const newItems = [...list.items];
              newItems[itemIndex] = {
                ...newItems[itemIndex],
                checked: !newItems[itemIndex].checked,
              };
              return { ...list, items: newItems };
            }
            return list;
          });
        });
        Alert.alert("Error", "Failed to update item. Please try again.");
      }
    }
  };

  if (loadingLists) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>
          {isConnected ? 'Loading shopping lists...' : 'Loading cached lists...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            setError(null);
            setLoadingLists(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Your Shopping Lists</Text>
        <Button title="Sign Out" onPress={handleSignOut} color="#dc3545" />
      </View>
      
      {/* Connection status indicator */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, isConnected ? styles.online : styles.offline]}>
          {isConnected ? '🟢 Online' : '🔴 Offline'}
        </Text>
        {userId ? <Text style={styles.userIdText}>Logged in as: {userId}</Text> :
          <Text style={styles.userIdText}>Not logged in.</Text>}
      </View>

      {/* Conditionally render the form based on network status */}
      <View style={styles.listForm}>
        <TextInput
          style={[styles.listInput, !isConnected && styles.disabledInput]}
          placeholder="List Name"
          value={listName}
          onChangeText={setListName}
          editable={isConnected} // Disable input when offline
        />
        <TextInput
          style={[styles.listInput, !isConnected && styles.disabledInput]}
          placeholder="Add Items (separated by commas)"
          value={item1}
          onChangeText={setItem1}
          editable={isConnected} // Disable input when offline
        />

        <View style={styles.privacyToggleContainer}>
          <Text style={styles.privacyToggleText}>Private</Text>
          <Switch
            onValueChange={value => setIsPublic(value)}
            value={isPublic}
            trackColor={{ false: "#767577", true: "#007AFF" }}
            thumbColor={isPublic ? "#f4f3f4" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            disabled={!isConnected} // Disable the switch when offline
          />
          <Text style={styles.privacyToggleText}>Public</Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, !isConnected && styles.disabledButton]}
          onPress={addShoppingList}
          disabled={!isConnected} // Disable the button when offline
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {shoppingLists.length > 0 && userId && !loadingLists && (
        <Text style={styles.editHintText}>Click a list to view/edit</Text>
      )}

      {shoppingLists.length === 0 && !loadingLists && userId && !isConnected ? (
        <Text style={styles.noListsText}>
          No cached lists found. Connect to the internet to load your lists.
        </Text>
      ) : (
        <FlatList
          style={styles.listsContainer}
          data={shoppingLists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItemContainer}>
              <TouchableOpacity onPress={() => handleEditList(item)} style={styles.listItem}>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listName}>{item.name}</Text>
                  {!item.isOwner && <Text style={styles.sharedTag}>Shared with you</Text>}
                  {item.isPublic && <Text style={styles.publicTag}>Public</Text>}
                </View>
                <View style={styles.itemsWrapper}>
                  {item.items.map((listItem, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.itemRow}
                      onPress={() => toggleItemChecked(item.id, index)}
                    >
                      <MaterialCommunityIcons
                        name={listItem.checked ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={24}
                        color={listItem.checked ? "#007AFF" : "#555"}
                      />
                      <Text
                        style={[
                          styles.listItems,
                          listItem.checked && styles.strikethroughText,
                        ]}
                      >
                        {listItem.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
              <View style={styles.listActions}>
                {item.isOwner && isConnected && (
                  <TouchableOpacity onPress={() => handleShareList(item.id, item.name)} style={styles.actionButton}>
                    <Ionicons name="share-social-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
                {item.isOwner && isConnected && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => handleDeleteList(item.id, item.name)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#dc3545" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
      {Platform.OS === "ios" ? <KeyboardAvoidingView behavior="padding" /> : null}
    </View>
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  online: {
    color: '#28a745',
  },
  offline: {
    color: '#dc3545',
  },
  userIdText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  noListsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 50,
    width: '100%',
  },
  listsContainer: {
    flex: 1,
    width: '100%',
    marginTop: 20,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
      },
    }),
    paddingRight: 10,
  },
  listItem: {
    flex: 1,
    padding: 15,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  listName: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 10,
    color: '#007AFF',
  },
  itemsWrapper: {
    flexDirection: 'column',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  listItems: {
    fontSize: 16,
    color: '#555',
    marginLeft: 5,
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  listForm: {
    width: '100%',
    marginVertical: 15,
    padding: 15,
    backgroundColor: "#e9ecef",
    borderRadius: 8,
  },
  listInput: {
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderColor: "#555",
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: '#FFF',
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
    borderColor: '#ccc',
  },
  addButton: {
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 20,
  },
  editHintText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontStyle: 'italic',
    width: '100%',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  deleteActionButton: {
    marginLeft: 5,
  },
  sharedTag: {
    backgroundColor: '#e9ecef',
    color: '#6c757d',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginRight: 5,
  },
  publicTag: {
    backgroundColor: '#d1e7dd',
    color: '#0f5132',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  privacyToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  privacyToggleText: {
    fontSize: 16,
    color: '#333',
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
});
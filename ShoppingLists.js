// ShoppingLists.js
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, or, query, where } from "firebase/firestore";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button, FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity, View
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ShoppingLists({ db, auth, userId, navigation, route }) {
  const [loadingLists, setLoadingLists] = useState(true);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [error, setError] = useState(null);
  const [listName, setListName] = useState("");
  const [item1, setItem1] = useState("");

  const fetchShoppingLists = async () => {
    try {
      setLoadingLists(true);
      setError(null);

      if (!db || !userId) {
        setShoppingLists([]);
        setLoadingLists(false);
        return;
      }

      // MODIFIED: Query for lists where the user is either the owner OR is in the 'sharedWith' array
      const q = query(
        collection(db, "shoppinglists"),
        or(where("ownerId", "==", userId), where("sharedWith", "array-contains", userId))
      );
      const listsDocuments = await getDocs(q);

      let newLists = [];
      listsDocuments.forEach(docObject => {
        const data = docObject.data();
        if (data.name && Array.isArray(data.items)) {
          const itemsWithChecked = data.items.map(item =>
            typeof item === 'object' && item !== null && 'name' in item && 'checked' in item
              ? item
              : { name: item, checked: false }
          );
          // Add a property to easily check if the current user is the owner
          const isOwner = data.ownerId === userId;
          newLists.push({ id: docObject.id, ...data, items: itemsWithChecked, isOwner });
        } else {
          console.warn(`Document ${docObject.id} missing 'name', 'items' array. Skipping.`);
        }
      });

      setShoppingLists(newLists);
    } catch (err) {
      console.error("Error fetching shopping lists:", err);
      setError("Failed to load shopping lists. Please check your internet connection or try again later.");
    } finally {
      setLoadingLists(false);
    }
  };


  const addShoppingList = async () => {
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
        sharedWith: [], // NEW: Initialize an empty array for sharing
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newListRef = await addDoc(collection(db, "shoppinglists"), newListData);
      if (newListRef.id) {
        fetchShoppingLists();
        Alert.alert(`Success`, `The list "${listName.trim()}" has been added.`);
        setListName('');
        setItem1('');
      } else {
        Alert.alert("Error", "Unable to add list. Please try again later.");
      }
    } catch (error) {
      console.error("Error adding shopping list:", error);
      Alert.alert("Error adding list", error.message);
    }
  };

  const handleDeleteList = (listId, listName) => {
    const executeDeletion = async () => {
      try {
        if (!db || !userId) {
          Alert.alert('Error', 'Database not initialized or user not authenticated. Cannot delete list.');
          return;
        }
        const listDocRef = doc(db, "shoppinglists", listId);
        await deleteDoc(listDocRef);
        Alert.alert("Deleted!", `"${listName}" has been removed.`);
        fetchShoppingLists();
      } catch (error) {
        console.error("Error deleting shopping list:", error);
        Alert.alert("Error", "Failed to delete list: " + error.message);
      }
    };

    Alert.alert("Delete List", `Are you sure you want to delete "${listName}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", onPress: executeDeletion, style: "destructive" }
    ]);
  };

  useEffect(() => {
    if (userId) {
      fetchShoppingLists();
    } else {
      setShoppingLists([]);
      setLoadingLists(false);
    }
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (userId) {
        fetchShoppingLists();
      }
    });
    return unsubscribeFocus;
  }, [db, userId, navigation]);

  const handleEditList = (list) => {
    // Navigate to the edit screen regardless of ownership, but the screen will handle permissions
    navigation.navigate('CreateEditList', { list: list });
  };

  // NEW: Function to navigate to the ShareList screen
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

  const toggleItemChecked = (listId, itemIndex) => {
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
  };

  if (loadingLists) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading shopping lists...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Your Shopping Lists</Text>
        <Button title="Sign Out" onPress={handleSignOut} color="#dc3545" />
      </View>
      {userId ? <Text style={styles.userIdText}>Logged in as: {userId}</Text> :
        <Text style={styles.userIdText}>Not logged in.</Text>}

      {userId && (
        <View style={styles.listForm}>
          <TextInput style={styles.listInput} placeholder="List Name" value={listName} onChangeText={setListName} />
          <TextInput style={styles.listInput} placeholder="Add Items (separated by commas)" value={item1} onChangeText={setItem1} />
          <TouchableOpacity style={styles.addButton} onPress={addShoppingList}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {shoppingLists.length > 0 && userId && !loadingLists && (
        <Text style={styles.editHintText}>Click a list to view/edit</Text>
      )}

      {shoppingLists.length === 0 && !loadingLists && userId ? (
        <Text style={styles.noListsText}>No shopping lists found. Start by adding some!</Text>
      ) : (
        <FlatList
          style={styles.listsContainer}
          data={shoppingLists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItemContainer}>
              <TouchableOpacity onPress={() => handleEditList(item)} style={styles.listItem}>
                <Text style={styles.listName}>{item.name}</Text>
                {/* NEW: Display a 'Shared' tag if the user is not the owner */}
                {!item.isOwner && <Text style={styles.sharedTag}>Shared with you</Text>}
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
                {/* NEW: Share button, only visible if the user is the owner */}
                {item.isOwner && (
                  <TouchableOpacity onPress={() => handleShareList(item.id, item.name)} style={styles.actionButton}>
                    <Ionicons name="share-social-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
                {/* Delete button, only visible if the user is the owner */}
                {item.isOwner && (
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
  // ... (existing styles)
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
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  userIdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
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
  listName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
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
    backgroundColor: "#CCC",
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
  // NEW styles
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
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
});
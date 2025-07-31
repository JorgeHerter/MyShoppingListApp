// ShoppingLists.js
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore"; // <-- ADD query, where
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

export default function ShoppingLists({ db, auth, userId, navigation, route }) {

  console.log("ShoppingLists component rendered. Current userId:", userId);

  const [loadingLists, setLoadingLists] = useState(true);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [error, setError] = useState(null);

  // States for the new list form
  const [listName, setListName] = useState("");
  const [item1, setItem1] = useState("");
  // Removed item2, as per your updated form structure which only has 'Add Items'
  // If you want multiple item inputs, you'll need to re-add setItem2 and the corresponding TextInput

  const fetchShoppingLists = async () => {
    try {
      console.log("Fetching shopping lists...");
      setLoadingLists(true);
      setError(null);

      if (!db || !userId) {
        console.warn("Firestore DB or User ID not available yet for fetching lists. Skipping fetch.");
        // If there's no userId, there are no lists to fetch for this user
        setShoppingLists([]);
        setLoadingLists(false);
        return;
      }

      // MODIFIED QUERY: Only fetch documents where ownerId matches the current userId
      const q = query(collection(db, "shoppinglists"), where("ownerId", "==", userId));
      const listsDocuments = await getDocs(q);

      console.log(`Fetched documents count for user ${userId}:`, listsDocuments.size);

      let newLists = [];
      listsDocuments.forEach(docObject => {
        const data = docObject.data();
        if (data.name && Array.isArray(data.items) && data.ownerId) { // Also check for ownerId
          newLists.push({ id: docObject.id, ...data });
        } else {
          console.warn(`Document ${docObject.id} missing 'name', 'items' array, or 'ownerId'. Skipping.`);
        }
      });

      setShoppingLists(newLists);
      console.log("ShoppingLists state updated with:", newLists);

    } catch (err) {
      console.error("Error fetching shopping lists:", err);
      setError("Failed to load shopping lists. Please check your internet connection or try again later.");
    } finally {
      setLoadingLists(false);
    }
  };


  const addShoppingList = async () => {
    // Check if listName is empty OR if item1 is empty
    if (!listName.trim() || !item1.trim()) {
      Alert.alert("Missing Information", "Please enter a list name and at least one item.");
      return;
    }

    try {
      // Split the single item1 input by commas and trim each item
      const itemsArray = item1.split(',').map(item => item.trim()).filter(item => item !== '');

      if (itemsArray.length === 0) {
        Alert.alert("Missing Information", "Please enter at least one item.");
        return;
      }

      const newListData = {
        name: listName.trim(),
        items: itemsArray,
        ownerId: userId, // CRITICAL: Add ownerId here for security rules
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newListRef = await addDoc(collection(db, "shoppinglists"), newListData);

      if (newListRef.id) {
        fetchShoppingLists();
        Alert.alert(`Success`, `The list "${listName.trim()}" has been added.`);

        // Clear the form
        setListName('');
        setItem1('');
        // setItem2(''); // Removed as per your updated form
      } else {
        Alert.alert("Error", "Unable to add list. Please try again later.");
      }
    } catch (error) {
      console.error("Error adding shopping list:", error);
      Alert.alert("Error adding list", error.message);
    }
  };

  const handleDeleteList = (listId, listName) => {
    console.log("Attempting to delete list (initial call):", listName, "with ID:", listId);

    const executeDeletion = async () => {
      try {
        if (!db) {
          console.error("Firestore DB object is null or undefined.");
          Platform.OS === 'web' ? window.alert('Error: Database not initialized. Cannot delete list.') : Alert.alert('Error', 'Database not initialized. Cannot delete list.');
          return;
        }
        if (!userId) { // Added check for userId here before attempting delete
          console.warn("User ID is null or undefined when attempting delete.");
          Platform.OS === 'web' ? window.alert('Error: User not authenticated. Cannot delete list.') : Alert.alert('Error', 'User not authenticated. Cannot delete list.');
          return;
        }

        const listDocRef = doc(db, "shoppinglists", listId);
        console.log("Attempting to delete document reference:", listDocRef.path);

        await deleteDoc(listDocRef);
        console.log("Successfully deleted document:", listId);

        Platform.OS === 'web' ? window.alert(`"${listName}" has been removed.`) : Alert.alert("Deleted!", `"${listName}" has been removed.`);
        fetchShoppingLists();
      } catch (error) {
        console.error("Error deleting shopping list (catch block):", error);
        Platform.OS === 'web' ? window.alert("Failed to delete list: " + error.message) : Alert.alert("Error", "Failed to delete list: " + error.message);
      }
    };

    Platform.select({
      ios: () => {
        Alert.alert(
          "Delete List",
          `Are you sure you want to delete "${listName}"? This cannot be undone.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => console.log("Delete cancelled for list:", listId) },
            { text: "Delete", onPress: executeDeletion, style: "destructive" }
          ]
        );
      },
      android: () => {
        Alert.alert(
          "Delete List",
          `Are you sure you want to delete "${listName}"? This cannot be undone.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => console.log("Delete cancelled for list:", listId) },
            { text: "Delete", onPress: executeDeletion, style: "destructive" }
          ]
        );
      },
      web: () => {
        const confirmed = window.confirm(`Are you sure you want to delete "${listName}"? This cannot be undone.`);
        if (confirmed) {
          console.log("Web browser confirm: Delete confirmed.");
          executeDeletion();
        } else {
          console.log("Web browser confirm: Delete cancelled.");
        }
      }
    })();
  };

  useEffect(() => {
    // Only fetch lists if userId is available.
    // The dependency array will re-run this when userId changes (e.g., on sign-in)
    if (userId) {
      fetchShoppingLists();
    } else {
      // Clear lists if user logs out or userId becomes null
      setShoppingLists([]);
      setLoadingLists(false);
      console.log("No userId, not fetching shopping lists.");
    }

    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (userId) { // Re-fetch on focus only if user is logged in
        fetchShoppingLists();
      }
    });
    return unsubscribeFocus;
  }, [db, userId, navigation]); // Added userId to dependency array

  const handleEditList = (list) => {
    // Ensure the user owns the list before navigating to edit
    if (list.ownerId === userId) {
      navigation.navigate('CreateEditList', { list: list });
    } else {
      Alert.alert("Permission Denied", "You can only edit your own shopping lists.");
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      console.warn("Auth object not available for sign out.");
      return;
    }
    try {
      await signOut(auth);
      console.log("User signed out successfully.");
      // After sign out, the userId prop will likely become null,
      // which will trigger the useEffect to clear lists.
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Failed to sign out: " + error.message);
    }
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
      {/* Header and Sign Out Button */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Your Shopping Lists</Text>
        <Button title="Sign Out" onPress={handleSignOut} color="#dc3545" />
      </View>

      {/* Only show "Logged in as" if userId is available */}
      {userId ? <Text style={styles.userIdText}>Logged in as: {userId}</Text> :
                <Text style={styles.userIdText}>Not logged in.</Text>}

      {/* Only show New List Form if userId is available */}
      {userId ? (
        <View style={styles.listForm}>
          <TextInput
            style={styles.listInput}
            placeholder="List Name"
            value={listName}
            onChangeText={setListName}
          />
          <TextInput
            style={styles.listInput}
            placeholder="Add Items (separated by commas)"
            value={item1}
            onChangeText={setItem1}
          />
          {/* Removed item2 TextInput */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={addShoppingList}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noListsText}>Please sign in to add or view your shopping lists.</Text>
      )}


      {/* Conditionally render FlatList or message */}
      {shoppingLists.length === 0 && !loadingLists && userId ? ( // Added userId check here
        <Text style={styles.noListsText}>No shopping lists found for you. Start by adding some!</Text>
      ) : (
        <FlatList
          style={styles.listsContainer}
          data={shoppingLists}
          keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <View style={styles.listItemContainer}>
              {/* Only allow editing if the current user owns the list */}
              <TouchableOpacity onPress={() => handleEditList(item)} style={styles.listItem}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listItems}>{item.items.join(', ')}</Text>
              </TouchableOpacity>
              {/* Only show delete button if the current user owns the list */}
              {item.ownerId === userId && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteList(item.id, item.name)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
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
  listItems: {
    fontSize: 16,
    color: '#555',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
});
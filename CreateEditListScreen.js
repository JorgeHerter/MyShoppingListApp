// CreateEditListScreen.js
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore"; // Import serverTimestamp
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CreateEditListScreen({ db, auth, userId, navigation, route }) {
  const [listName, setListName] = useState('');
  const [itemsText, setItemsText] = useState(''); // Items as a comma-separated string
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // To determine if we're editing or creating
  const [currentListId, setCurrentListId] = useState(null); // The ID of the list being edited

  // useEffect to pre-fill form if we are in edit mode
  useEffect(() => {
    if (route.params?.list) {
      // If list data is passed, it means we are editing
      const { id, name, items } = route.params.list;
      setListName(name);
      setItemsText(items.join(', ')); // Convert array back to comma-separated string
      setIsEditing(true);
      setCurrentListId(id);
      navigation.setOptions({ title: 'Edit Shopping List' }); // Update header title
    } else {
      navigation.setOptions({ title: 'Create New List' }); // Update header title
    }
  }, [route.params?.list]); // Only re-run when list param changes

  const handleSaveList = async () => {
    if (!listName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your shopping list.');
      return;
    }
    if (!db || !userId) {
      Alert.alert('Error', 'Database not initialized or user not logged in.');
      return;
    }

    setIsSaving(true);
    try {
      const itemsArray = itemsText.split(',').map(item => item.trim()).filter(item => item.length > 0);

      // Data common to both new and updated lists (for their mutable fields)
      const commonListData = {
        name: listName.trim(),
        items: itemsArray,
        updatedAt: serverTimestamp(), // Use serverTimestamp for updates
      };

      if (isEditing && currentListId) {
        // Update existing list
        const listRef = doc(db, "shoppinglists", currentListId);
        // ONLY send fields that should be updated. DO NOT send ownerId or createdAt.
        await updateDoc(listRef, commonListData); // <--- MODIFIED HERE
        Alert.alert('Success', 'Shopping list updated!');
      } else {
        // Add new list
        const newListData = {
          ...commonListData, // Include common fields
          createdAt: serverTimestamp(), // Add creation timestamp for new documents
          ownerId: userId, // CRUCIAL: Associate list with the current user ONLY on creation
        };
        await addDoc(collection(db, "shoppinglists"), newListData); // <--- MODIFIED HERE
        Alert.alert('Success', 'New shopping list added!');
      }

      navigation.goBack(); // Go back to the ShoppingLists screen

    } catch (error) {
      console.error("Error saving shopping list:", error);
      Alert.alert('Error', 'Failed to save shopping list: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>List Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Weekly Groceries"
        value={listName}
        onChangeText={setListName}
        editable={!isSaving}
      />

      <Text style={styles.label}>Items (comma-separated):</Text>
      <TextInput
        style={[styles.input, styles.itemsInput]}
        placeholder="e.g., Milk, Eggs, Bread"
        value={itemsText}
        onChangeText={setItemsText}
        multiline
        editable={!isSaving}
      />

      <Button
        title={isSaving ? "Saving..." : (isEditing ? "Update List" : "Add List")}
        onPress={handleSaveList}
        disabled={isSaving}
        color="#007AFF"
      />

      {isSaving && <ActivityIndicator size="small" color="#0000ff" style={styles.activityIndicator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  itemsInput: {
    minHeight: 80,
    textAlignVertical: 'top', // For multiline TextInput on Android
  },
  activityIndicator: {
    marginTop: 20,
  },
});
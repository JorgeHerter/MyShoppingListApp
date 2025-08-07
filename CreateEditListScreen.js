// CreateEditListScreen.js
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CreateEditListScreen({ db, auth, userId, navigation, route }) {
  const [listName, setListName] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentListId, setCurrentListId] = useState(null);
  const [isOwner, setIsOwner] = useState(true); // NEW: State to track ownership

  useEffect(() => {
    if (route.params?.list) {
      const { id, name, items, ownerId } = route.params.list;
      setListName(name);
      const itemsString = items.map(item => item.name).join(', ');
      setItemsText(itemsString);
      setIsEditing(true);
      setCurrentListId(id);

      // Check if the current user is the owner
      const isCurrentUserOwner = ownerId === userId;
      setIsOwner(isCurrentUserOwner);

      // Update header title based on ownership
      navigation.setOptions({
        title: isCurrentUserOwner ? 'Edit Shopping List' : 'View Shopping List',
      });
    } else {
      setIsOwner(true); // New lists are always owned by the creator
      navigation.setOptions({ title: 'Create New List' });
    }
  }, [route.params?.list, userId]);

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
      const itemsArray = itemsText
        .split(',')
        .map(item => ({
          name: item.trim(),
          checked: false
        }))
        .filter(item => item.name.length > 0);

      const commonListData = {
        name: listName.trim(),
        items: itemsArray,
        updatedAt: serverTimestamp(),
      };

      if (isEditing && currentListId) {
        if (!isOwner) {
          Alert.alert("Permission Denied", "You can only edit lists you own.");
          setIsSaving(false);
          return;
        }
        const listRef = doc(db, "shoppinglists", currentListId);
        await updateDoc(listRef, commonListData);
        Alert.alert('Success', 'Shopping list updated!');
      } else {
        const newListData = {
          ...commonListData,
          createdAt: serverTimestamp(),
          ownerId: userId,
          sharedWith: [], // Initialize sharedWith array for new lists
        };
        await addDoc(collection(db, "shoppinglists"), newListData);
        Alert.alert('Success', 'New shopping list added!');
      }

      navigation.goBack();
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
        editable={!isSaving && isOwner} // Disabled if not owner
      />

      <Text style={styles.label}>Items (comma-separated):</Text>
      <TextInput
        style={[styles.input, styles.itemsInput]}
        placeholder="e.g., Milk, Eggs, Bread"
        value={itemsText}
        onChangeText={setItemsText}
        multiline
        editable={!isSaving && isOwner} // Disabled if not owner
      />

      {/* Only show the Save button if the user is the owner */}
      {isOwner && (
        <Button
          title={isSaving ? "Saving..." : (isEditing ? "Update List" : "Add List")}
          onPress={handleSaveList}
          disabled={isSaving}
          color="#007AFF"
        />
      )}

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
    textAlignVertical: 'top',
  },
  activityIndicator: {
    marginTop: 20,
  },
});
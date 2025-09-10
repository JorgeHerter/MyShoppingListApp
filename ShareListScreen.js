// ShareListScreen.js - Fixed with correct collection paths
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

// App ID for Firestore collections - must match your security rules
const appId = 'shopping-app';

export default function ShareListScreen({ db, navigation, route, userId }) {
    const { listId, listName } = route.params;
    const [userIdToShare, setUserIdToShare] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!userIdToShare.trim()) {
            Alert.alert('Missing User ID', 'Please enter the User ID of the person you want to share with.');
            return;
        }

        if (userIdToShare.trim() === userId) {
            Alert.alert('Invalid User ID', 'You cannot share a list with yourself.');
            return;
        }

        setIsSharing(true);
        try {
            const trimmedUserId = userIdToShare.trim();

            // Get the current list document to update its sharedWith array
            const listDocRef = doc(db, `artifacts/${appId}/public/data/shopping_lists`, listId);
            
            // First, we need to get the current sharedWith array
            // We'll query the list to get current data
            const listsRef = collection(db, `artifacts/${appId}/public/data/shopping_lists`);
            const listQuery = query(listsRef, where("__name__", "==", listId));
            const listSnapshot = await getDocs(listQuery);

            if (listSnapshot.empty) {
                Alert.alert('Error', 'List not found.');
                return;
            }

            const listData = listSnapshot.docs[0].data();
            const currentSharedWith = listData.sharedWith || [];

            // Check if already shared with this user
            if (currentSharedWith.includes(trimmedUserId)) {
                Alert.alert('Already Shared', 'This list is already shared with that user.');
                return;
            }

            // Check if the current user is the owner
            if (listData.ownerId !== userId) {
                Alert.alert('Permission Denied', 'You can only share lists that you own.');
                return;
            }

            // Add the new user to the sharedWith array
            const updatedSharedWith = [...currentSharedWith, trimmedUserId];
            
            // Update the document
            await updateDoc(listDocRef, {
                sharedWith: updatedSharedWith,
                updatedAt: new Date()
            });

            Alert.alert(
                'Success', 
                `List "${listName}" has been shared with user ID: ${trimmedUserId}`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );

        } catch (error) {
            console.error("Error sharing list:", error);
            let errorMessage = 'Failed to share list';
            
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. You may not have permission to share this list.';
            } else if (error.message) {
                errorMessage = `Failed to share list: ${error.message}`;
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setIsSharing(false);
        }
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Share "{listName}"</Text>
            <Text style={styles.subtitle}>
                Enter the User ID of the person you want to share this list with. 
                They will be able to view and edit the list.
            </Text>
            
            <TextInput
                style={[styles.input, isSharing && styles.disabledInput]}
                placeholder="Enter User ID (e.g., xabJJRa3g5MzliqhdebakehlONI2)"
                value={userIdToShare}
                onChangeText={setUserIdToShare}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSharing}
                multiline={true}
                numberOfLines={3}
            />
            
            <Text style={styles.helpText}>
                Note: The user must provide you with their User ID for sharing to work.
                You can find your User ID in the main screen.
            </Text>
            
            <View style={styles.buttonContainer}>
                <Button
                    title="Cancel"
                    onPress={handleCancel}
                    color="#6c757d"
                />
                
                <View style={styles.buttonSpacer} />
                
                {isSharing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.loadingText}>Sharing...</Text>
                    </View>
                ) : (
                    <Button
                        title="Share List"
                        onPress={handleShare}
                        color="#007AFF"
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    input: {
        width: '100%',
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
        textAlignVertical: 'top',
        minHeight: 80,
    },
    disabledInput: {
        backgroundColor: '#f5f5f5',
        color: '#999',
    },
    helpText: {
        fontSize: 14,
        color: '#888',
        marginBottom: 30,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buttonSpacer: {
        width: 20,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    loadingText: {
        marginLeft: 10,
        fontSize: 16,
        color: '#007AFF',
    },
});
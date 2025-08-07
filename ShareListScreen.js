// ShareListScreen.js
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ShareListScreen({ db, navigation, route }) {
    const { listId, listName } = route.params;
    const [emailToShare, setEmailToShare] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!emailToShare.trim()) {
            Alert.alert('Missing Email', 'Please enter the email address of the user you want to share with.');
            return;
        }

        setIsSharing(true);
        try {
            // Step 1: Find the user ID based on the provided email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", emailToShare.trim().toLowerCase()));
            const userSnapshot = await getDocs(q);

            if (userSnapshot.empty) {
                Alert.alert('User Not Found', `No user found with the email: ${emailToShare.trim()}`);
                setIsSharing(false);
                return;
            }

            const sharedUserId = userSnapshot.docs[0].id;
            const listRef = doc(db, "shoppinglists", listId);

            // Step 2: Update the shopping list document with the new shared user ID
            await updateDoc(listRef, {
                sharedWith: [...listRef.sharedWith, sharedUserId]
            });

            Alert.alert('Success', `List "${listName}" has been shared with ${emailToShare.trim()}.`);
            navigation.goBack();

        } catch (error) {
            console.error("Error sharing list:", error);
            Alert.alert('Error', 'Failed to share list: ' + error.message);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Share "{listName}"</Text>
            <Text style={styles.subtitle}>Enter the email of the person you want to share this list with.</Text>
            <TextInput
                style={styles.input}
                placeholder="User's email"
                value={emailToShare}
                onChangeText={setEmailToShare}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSharing}
            />
            <Button
                title={isSharing ? 'Sharing...' : 'Share List'}
                onPress={handleShare}
                disabled={isSharing}
                color="#007AFF"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f8f8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
    },
});
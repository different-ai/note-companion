import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';
import { SharedFile } from '@/utils/file-handler'; // Import necessary types/functions

// Function to request camera permissions
const requestCameraPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera access is required to take photos. Please enable it in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
};

// Simplified function to launch camera and return the result
export const launchCamera = async (): Promise<SharedFile | null> => {
  const hasCameraPermission = await requestCameraPermissions();
  if (!hasCameraPermission) return null;

  // Media library permission might be implicitly needed by handleFileProcess or saving steps
  // Let's request it proactively, especially for Android
  // await requestMediaLibraryPermissions(); // Removed for simplification, add back if saving locally is needed

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      // aspect: [4, 3], // Removed aspect ratio constraint
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      console.log('Image taken:', result.assets[0].uri);
      const asset = result.assets[0];
      // Prepare file object conforming to SharedFile
      const capturedFile: SharedFile = {
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`, // Generate a name if missing
        mimeType: asset.mimeType || 'image/jpeg', // Default to jpeg if missing
      };
      return capturedFile;
      
    } else {
      console.log('Camera Canceled');
      return null;
      // Optionally set status back to idle if needed, though usually no status change is expected on cancel
      // setStatus('idle');
    }
  } catch (error) {
    console.error('Error launching camera:', error);
    // setStatus('error'); // Status handling removed
    Alert.alert('Error', error instanceof Error ? error.message : 'Could not open camera.');
    return null;
  }
};

// Removed requestMediaLibraryPermissions function
// Removed the old launchCameraAndUpload function 
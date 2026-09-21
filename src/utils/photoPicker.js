import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Camera access is required to take photos.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

async function pickFromGallery() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Gallery access is required to choose photos.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export function pickPhotoWithOptions(onPicked) {
  Alert.alert('Photo evidence', 'How would you like to add a photo?', [
    { text: 'Take photo', onPress: async () => { const uri = await takePhoto(); if (uri) onPicked(uri); } },
    { text: 'Choose from gallery', onPress: async () => { const uri = await pickFromGallery(); if (uri) onPicked(uri); } },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

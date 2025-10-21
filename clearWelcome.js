// Temporary script to clear the welcome screen flag
// This allows you to see the Welcome screen again

import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearWelcomeFlag() {
  try {
    await AsyncStorage.removeItem('hasSeenWelcome');
    console.log('Welcome flag cleared! Restart the app to see the Welcome screen.');
  } catch (error) {
    console.error('Error clearing welcome flag:', error);
  }
}

clearWelcomeFlag();

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_UI_MODE = 'ui:singleFieldMode';

export async function setSingleFieldMode(enabled = false) {
  try {
    await AsyncStorage.setItem(KEY_UI_MODE, JSON.stringify(!!enabled));
  } catch (e) {
    console.warn('Failed to save UI mode', e);
  }
}

export async function getSingleFieldMode() {
  try {
    const raw = await AsyncStorage.getItem(KEY_UI_MODE);
    if (!raw) return false;
    return JSON.parse(raw) === true;
  } catch (e) {
    console.warn('Failed to load UI mode', e);
    return false;
  }
}

export default { setSingleFieldMode, getSingleFieldMode };

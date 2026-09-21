import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';
import { PICKER_MAP as DEFAULT_PICKER_MAP } from '../utils/constants';

const CACHE_KEY = 'farm_config_lookups';

const CATEGORY_TO_PICKER = {
  coffee_type: 'coffee_type',
  coffee_variety: 'coffee_variety',
  fertilizer: 'fertilizers',
  pesticide: 'pesticides',
  standard_practice: 'practices',
  seedling_type: 'seedling_type',
  grade: 'grade',
  spacing: 'spacing',
};

/** Fetch grouped lookup options from API and merge with local defaults. */
export const loadPickerMap = async () => {
  const merged = { ...DEFAULT_PICKER_MAP };

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.entries(CATEGORY_TO_PICKER).forEach(([apiKey, pickerKey]) => {
        if (parsed[apiKey]?.length) merged[pickerKey] = parsed[apiKey];
      });
    }
  } catch {
    // ignore cache read errors
  }

  try {
    const response = await ApiService.get('config/lookups/grouped/');
    const grouped = response.data || {};
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(grouped));

    Object.entries(CATEGORY_TO_PICKER).forEach(([apiKey, pickerKey]) => {
      if (grouped[apiKey]?.length) {
        merged[pickerKey] = grouped[apiKey];
      }
    });
  } catch (error) {
    console.warn('[configService] Using default picker values:', error.message);
  }

  return merged;
};

export default { loadPickerMap };

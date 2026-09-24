import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';
import { PICKER_MAP as DEFAULT_PICKER_MAP } from '../utils/constants';

const CACHE_KEY = 'farm_config_lookups_v2';

const CATEGORY_TO_PICKER = {
  coffee_type: 'coffee_type',
  coffee_variety: 'coffee_variety',
  fertilizer: 'fertilizers',
  fertilizer_organic: 'fertilizer_organic',
  fertilizer_inorganic: 'fertilizer_inorganic',
  pesticide: 'pesticides',
  standard_practice: 'practices',
  seedling_type: 'seedling_type',
  grade: 'grade',
  spacing: 'spacing',
};

const mapSubTypes = (types, typeName) => {
  const match = (types || []).find(t => t.name?.toLowerCase() === typeName.toLowerCase());
  return (match?.sub_types || []).filter(s => s.is_active !== false).map(s => s.name);
};

/** Fetch grouped lookup options from API and merge with local defaults. */
export const loadPickerMap = async () => {
  const merged = { ...DEFAULT_PICKER_MAP };

  try {
    const [groupedRes, fertilizerRes] = await Promise.all([
      ApiService.get('config/lookups/grouped/'),
      ApiService.get('config/fertilizer-types/?active_only=1'),
    ]);

    const grouped = groupedRes.data || {};
    const fertilizerTypes = fertilizerRes.data?.results || fertilizerRes.data || [];

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...grouped, fertilizer_types: fertilizerTypes }));

    Object.entries(CATEGORY_TO_PICKER).forEach(([apiKey, pickerKey]) => {
      if (grouped[apiKey]?.length) {
        merged[pickerKey] = grouped[apiKey];
      }
    });

    if (grouped.fertilizer_types?.length) {
      merged.fertilizer_types = grouped.fertilizer_types;
    } else if (fertilizerTypes.length) {
      merged.fertilizer_types = fertilizerTypes;
    }

    if (merged.fertilizer_types?.length) {
      const organic = mapSubTypes(merged.fertilizer_types, 'organic');
      const inorganic = mapSubTypes(merged.fertilizer_types, 'inorganic');
      const mixed = mapSubTypes(merged.fertilizer_types, 'mixed');
      if (organic.length) merged.fertilizer_organic = organic;
      if (inorganic.length) merged.fertilizer_inorganic = inorganic;
      if (mixed.length) merged.fertilizer_mixed = mixed;
    } else if (grouped.fertilizer_organic?.length) {
      merged.fertilizer_organic = grouped.fertilizer_organic;
      merged.fertilizer_inorganic = grouped.fertilizer_inorganic || merged.fertilizer_inorganic;
      merged.fertilizer_mixed = grouped.fertilizer_mixed || merged.fertilizer_mixed;
    }
  } catch (error) {
    console.warn('[configService] API fetch failed, trying cache:', error.message);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.entries(CATEGORY_TO_PICKER).forEach(([apiKey, pickerKey]) => {
          if (parsed[apiKey]?.length) merged[pickerKey] = parsed[apiKey];
        });
        if (parsed.fertilizer_types?.length) merged.fertilizer_types = parsed.fertilizer_types;
      }
    } catch {
      // ignore
    }
  }

  return merged;
};

export default { loadPickerMap };

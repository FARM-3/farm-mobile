# Phase 5: Extract Form Screens - Detailed Implementation Plan

**Created**: 2026-01-07
**Status**: Ready for Implementation
**Estimated Completion**: Phase 5a-5d (Farmer Form), then Phase 5e-5h (Harvest Form)

---

## 🎯 Overview

**Goal**: Extract farmer registration and harvest recording forms from AggregationScreen.js into separate, dedicated form screens.

**Expected Results**:
- **AggregationScreen.js**: 2,098 lines → ~1,400 lines (700 line reduction)
- **New Files**: 2 form screens created
- **Functionality**: 100% preserved, better organized

---

## 📊 Current State Analysis

### AggregationScreen.js Structure:
```
Lines 1-980:    Component setup, state, handlers (keep)
Lines 980-1436: Form rendering logic (EXTRACT - 456 lines)
Lines 1437+:    List rendering, navigation (keep)
```

### Files to Create:
1. `src/features/Aggregation/screens/FarmerRegistrationFormScreen.js` (~550 lines)
2. `src/features/Aggregation/screens/FarmerHarvestFormScreen.js` (~500 lines)

---

## 🔍 Phase 5a-5d: Farmer Registration Form Extraction

### Step 1: Create FarmerRegistrationFormScreen.js

**File Location**: `C:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile\src\features\Aggregation\screens\FarmerRegistrationFormScreen.js`

#### Imports Needed:
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme & Components
import CoffeeColors from '../../../theme/colors';
import SimpleHeader from '../../../components/SimpleHeader';
import CustomAlert from '../../../components/CustomAlert';

// Aggregation Components
import { CustomInput, CustomPicker, CustomMultiSelect, CustomDatePicker, StepIndicator } from '../components/FormComponents';

// Utils
import { farmerFieldDefinitions } from '../utils/fieldDefinitions';
import { getCurrentGPSLocation, capitalizeFirstLetter } from '../utils/aggregationHelpers';
import styles from '../styles/aggregationStyles';
import { PICKER_MAP, PARISHES_BY_SUB_COUNTY } from '../../../utils/constants';
```

#### Component Props (from route.params):
```javascript
const FarmerRegistrationFormScreen = ({ navigation, route }) => {
    // Destructure params
    const {
        mode = 'create',           // 'create' | 'edit'
        initialData = null,        // Farmer object for edit mode
        userId,                    // Current user ID
        currentUser,               // User object
        onSave,                    // callback(farmerData) => void
    } = route.params || {};
}
```

#### State to Manage Internally:
```javascript
// Form state - Initialize from initialData for edit mode
const [formData, setFormData] = useState(
    initialData || {
        first_name: '', last_name: '', gender: '', nin: '',
        date_of_birth: '', contact: '', email: '',
        in_cooperative: false, cooperative: '', started_farming: '',
        district: '', sub_county: '', parish: '', village: '',
        gps: '', nearest_landmark: '', uid: '',
        coffee_variety: '', no_of_trees: '', all_your_trees: false,
        other_farms: '', planted_date: '', spacing: '',
        land_ownership: '', deforested: false, seedling_source: '',
        seedling_type: [], age_of_seedlings: '', practices: [],
        irrigation: '', fertilizers: [], uses_pesticides: false,
        pesticides: []
    }
);

const [currentStep, setCurrentStep] = useState(0);
const [errors, setErrors] = useState({ nin: '', contact: '' });
const [loading, setLoading] = useState(false);
const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: []
});
const isSubmittingRef = useRef(false);
```

#### Functions to Extract (from AggregationScreen.js):

**1. updateFormData() - Lines 560-603**
```javascript
const updateFormData = (key, value) => {
    console.log(`[FarmerForm] Updating field: ${key}, value:`, value);
    setFormData(prev => {
        let newState = { ...prev, [key]: value };

        // Reset parish when sub_county changes
        if (key === 'sub_county' && value !== prev.sub_county) {
            newState.parish = '';
        }

        // Handle boolean fields
        if (['in_cooperative', 'all_your_trees', 'deforested', 'uses_pesticides'].includes(key)) {
            newState[key] = value === 'Yes' || value === true;
        }

        return newState;
    });

    // Validation for NIN
    if (key === 'nin') {
        if (value) {
            if (value.length > 14) {
                setErrors(prev => ({ ...prev, nin: 'NIN must not exceed 14 characters.' }));
            } else if (!/^(CF|CM)[A-Z0-9]*$/.test(value.toUpperCase())) {
                setErrors(prev => ({ ...prev, nin: 'NIN must start with CF or CM.' }));
            } else {
                setErrors(prev => ({ ...prev, nin: '' }));
            }
        } else {
            setErrors(prev => ({ ...prev, nin: '' }));
        }
    }

    // Validation for contact
    if (key === 'contact') {
        if (value && /[^0-9]/.test(value)) {
            setErrors(prev => ({ ...prev, contact: 'Phone number must contain only digits.' }));
        } else if (value && value.length > 10) {
            setErrors(prev => ({ ...prev, contact: 'Phone number should not exceed 10 digits.' }));
        } else {
            setErrors(prev => ({ ...prev, contact: '' }));
        }
    }
};
```

**2. generateRecordId() - Helper function**
```javascript
const generateRecordId = (prefix) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}${random}`;
};
```

**3. handleSubmit() - Lines 648-748**
```javascript
const handleSubmit = async () => {
    const isEditing = mode === 'edit';
    console.log('[FarmerFormScreen] Saving farmer...');

    // Validation
    if (!formData.first_name || !formData.contact || !userId) {
        setAlertConfig({
            visible: true,
            title: 'Validation',
            message: 'Please ensure First name, Contact, and User ID are present.',
            type: 'error',
            buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
        return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);

    const recordId = isEditing ? initialData.id : (formData.uid || generateRecordId('FD'));
    const name = `${formData.first_name} ${formData.last_name}`.trim();
    const location = `${formData.district || ''}${formData.sub_county ? ', ' + formData.sub_county : ''}`;

    // Prepare farmer record
    const farmerRecord = {
        ...formData,
        name: name,
        uid: recordId,
        location: location,
        number_of_trees: parseInt(formData.no_of_trees) || 0,
        recorder_id: userId,
        timestamp: Date.now(),
        id: recordId,
        _isDraft: false,
        _isSynced: false,
        _syncStatus: 'pending',
    };

    try {
        // Save to AsyncStorage
        const storageKey = 'farmer_drafts';
        const existingDrafts = await AsyncStorage.getItem(storageKey);
        const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

        const draftIndex = draftsArray.findIndex(d => d.id === recordId);
        if (draftIndex >= 0) {
            draftsArray[draftIndex] = farmerRecord;
        } else {
            draftsArray.push(farmerRecord);
        }

        await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));

        // Call parent callback
        if (onSave) {
            await onSave(farmerRecord);
        }

        // Show success and navigate back
        setAlertConfig({
            visible: true,
            title: 'Success',
            message: `Farmer '${name}' saved successfully!`,
            type: 'success',
            buttons: [{
                text: 'OK',
                onPress: () => {
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                    navigation.goBack();
                }
            }]
        });

    } catch (e) {
        console.error('[FarmerFormScreen] Save error:', e);
        setAlertConfig({
            visible: true,
            title: 'Error',
            message: `Failed to save farmer: ${e.message}`,
            type: 'error',
            buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
    } finally {
        setLoading(false);
        isSubmittingRef.current = false;
    }
};
```

**4. renderForm() - Lines 980-1436 (Form rendering logic)**
- Copy entire form rendering logic for farmer form
- Replace `isFarmer` checks with constant `true`
- Replace `farmerForm` with `formData`
- Replace `updateFarmerForm` with `updateFormData`
- Replace `farmerErrors` with `errors`
- Replace `farmerStep` with `currentStep`
- Replace `setFarmerStep` with `setCurrentStep`
- Replace `handleFarmerSubmit()` with `handleSubmit()`

#### Header & Navigation:
```javascript
<SimpleHeader
    title={mode === 'edit' ? 'Edit Farmer' : 'Register Farmer'}
    onBack={() => navigation.goBack()}
/>
```

#### GPS Capture Button (Step 2):
```javascript
const handleCaptureGPS = async () => {
    try {
        const coords = await getCurrentGPSLocation();
        if (coords) {
            updateFormData('gps', `${coords.latitude}, ${coords.longitude}`);
        }
    } catch (error) {
        console.error('[FarmerFormScreen] GPS capture error:', error);
    }
};
```

---

### Step 2: Update AggregationScreen.js Navigation

**Location**: Lines where `setViewMode('form')` is called

#### Import the new screen (Already done in navigator):
The screen will be registered in the navigation stack.

#### Update "Add Farmer" button (Line ~1899):
```javascript
// OLD:
onExit={() => setViewMode('form')}

// NEW:
onExit={() => {
    navigation.navigate('FarmerRegistrationFormScreen', {
        mode: 'create',
        userId: userId,
        currentUser: currentUser,
        onSave: async (farmerData) => {
            // Update local state
            setFarmersList(prev => [...prev, farmerData]);
            // Reload records
            await loadRecords();
            await countUnsyncedRecords();
        }
    });
}}
```

#### Update "Edit Farmer" handler (Line ~1902):
```javascript
// OLD:
handleEdit={(r, isEdit) => {
    if (isEdit) {
        handleEdit(r, 'farmer');
    } else {
        navigation.navigate('FarmerDetailScreen', { farmer: r });
    }
}}

// NEW:
handleEdit={(r, isEdit) => {
    if (isEdit) {
        navigation.navigate('FarmerRegistrationFormScreen', {
            mode: 'edit',
            initialData: r,
            userId: userId,
            currentUser: currentUser,
            onSave: async (updatedFarmer) => {
                // Update local state
                setFarmersList(prev =>
                    prev.map(f => f.id === updatedFarmer.id ? updatedFarmer : f)
                );
                // Reload records
                await loadRecords();
                await countUnsyncedRecords();
            }
        });
    } else {
        navigation.navigate('FarmerDetailScreen', { farmer: r });
    }
}}
```

---

### Step 3: Remove Extracted Code from AggregationScreen.js

**DO NOT REMOVE YET - Wait until form screen is tested and working**

Lines to remove after verification:
- Lines 980-1436: `renderGroupedStepForm` function (for farmer only)
- Lines 560-603: `updateFarmerForm` function
- Lines 648-748: `handleFarmerSubmit` function
- State variables: `farmerForm`, `farmerStep`, `farmerErrors`

**Keep for now (needed by harvest form)**:
- Lines 606-647: `updateHarvestForm` function
- Lines 868+: `handleHarvestSubmit` function
- Harvest state variables

---

### Step 4: Testing Checklist

**Before proceeding to harvest form, verify:**

- [ ] Can create new farmer successfully
- [ ] Farmer saves to AsyncStorage correctly
- [ ] Can edit existing farmer
- [ ] All 4 steps work correctly
- [ ] Step navigation (Next/Back) works
- [ ] Field validation works (NIN, contact)
- [ ] GPS capture works on Step 2
- [ ] Parish dropdown filters by sub-county
- [ ] UID generation works
- [ ] Form shows success alert
- [ ] Navigates back to AggregationScreen after save
- [ ] Farmer appears in list immediately
- [ ] No console errors
- [ ] Draft saving works
- [ ] Edit mode populates form correctly

---

## 🔍 Phase 5e-5h: Harvest Recording Form Extraction

### Step 5: Create FarmerHarvestFormScreen.js

**File Location**: `C:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile\src\features\Aggregation\screens\FarmerHarvestFormScreen.js`

#### Additional Imports for Harvest Form:
```javascript
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
import { formatNumberWithCommas, parseFormattedNumber } from '../../../utils/numberFormatter';
import { fetchCurrentFarmerPrice } from '../../../services/priceService';
```

#### Component Props:
```javascript
const FarmerHarvestFormScreen = ({ navigation, route }) => {
    const {
        mode = 'create',
        initialData = null,
        userId,
        currentUser,
        farmersList = [],  // Need full farmers list for lookup
        onSave,
    } = route.params || {};
}
```

#### Initial State for Harvest Form:
```javascript
const [formData, setFormData] = useState(
    initialData || {
        farmer_uid: '',
        farmer_name: '',
        weight_on_delivery: '',
        location_of_delivery: '',
        custom_location: '',
        gps_coordinates_delivery: '',
        harvest_id: '',
        date_of_delivery: new Date().toISOString().slice(0, 10),
        coffee_type: '',
        price_per_kg: '4,600',
        amount_paid: '',
        paid_by_option: '',
        paid_by: '',
        selectedStaff: null
    }
);

const [currentFarmerPrice, setCurrentFarmerPrice] = useState(null);
const [isPriceLoading, setIsPriceLoading] = useState(false);
```

#### Special Functions for Harvest Form:

**1. Farmer Lookup (AutocompleteInput)**
```javascript
const getFarmerDisplayName = (farmer) => {
    return `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || farmer.name || 'Unknown';
};
```

**2. Price Fetching (useEffect)**
```javascript
useEffect(() => {
    const fetchPrice = async () => {
        setIsPriceLoading(true);
        try {
            const price = await fetchCurrentFarmerPrice();
            if (price !== null) {
                setCurrentFarmerPrice(price);
                setFormData(prev => ({
                    ...prev,
                    price_per_kg: formatNumberWithCommas(String(price))
                }));
            }
        } catch (error) {
            console.error('[HarvestFormScreen] Error fetching price:', error);
        } finally {
            setIsPriceLoading(false);
        }
    };

    if (mode === 'create') {
        fetchPrice();
    }
}, [mode]);
```

**3. Amount Calculation (useEffect)**
```javascript
useEffect(() => {
    const weight = parseFormattedNumber(formData.weight_on_delivery);
    const pricePerKg = parseFormattedNumber(formData.price_per_kg);

    if (weight && pricePerKg) {
        const amount = weight * pricePerKg;
        setFormData(prev => ({
            ...prev,
            amount_paid: formatNumberWithCommas(String(amount))
        }));
    }
}, [formData.weight_on_delivery, formData.price_per_kg]);
```

**4. updateFormData() - Lines 606-647**
- Similar to farmer form but with money formatting
- Handle price_per_kg as read-only when fetched from DB

**5. handleSubmit() - Lines 868+ (similar structure to farmer submit)**
- Save to 'harvest_drafts' AsyncStorage key
- Generate harvest_id with 'PA' prefix
- Call onSave callback
- Navigate back

---

### Step 6: Update AggregationScreen.js for Harvest Form

Similar to farmer form updates:

#### "Add Harvest" button (Line ~1922):
```javascript
onExit={() => {
    navigation.navigate('FarmerHarvestFormScreen', {
        mode: 'create',
        userId: userId,
        currentUser: currentUser,
        farmersList: farmersList,  // Pass full list for lookup
        onSave: async (harvestData) => {
            setHarvestsList(prev => [...prev, harvestData]);
            await loadRecords();
            await countUnsyncedRecords();
        }
    });
}}
```

#### "Edit Harvest" handler (Line ~1930):
```javascript
handleEdit={(r, isEdit) => {
    if (isEdit) {
        navigation.navigate('FarmerHarvestFormScreen', {
            mode: 'edit',
            initialData: r,
            userId: userId,
            currentUser: currentUser,
            farmersList: farmersList,
            onSave: async (updatedHarvest) => {
                setHarvestsList(prev =>
                    prev.map(h => h.id === updatedHarvest.id ? updatedHarvest : h)
                );
                await loadRecords();
                await countUnsyncedRecords();
            }
        });
    } else {
        navigation.navigate('FarmerHarvestDetailScreen', { harvest: r, farmersList });
    }
}}
```

---

### Step 7: Clean Up AggregationScreen.js

**After both forms are tested and working:**

Remove the following:
- [ ] Lines 980-1436: Entire `renderGroupedStepForm` function
- [ ] Lines 560-603: `updateFarmerForm` function
- [ ] Lines 606-647: `updateHarvestForm` function
- [ ] Lines 648-748: `handleFarmerSubmit` function
- [ ] Lines 868+: `handleHarvestSubmit` function
- [ ] Lines 1439-1441: `renderFormContent` function
- [ ] State: `farmerForm`, `harvestForm`, `farmerStep`, `harvestStep`, `farmerErrors`, `harvestErrors`
- [ ] Remove `viewMode` state and all references (no longer needed)
- [ ] Remove `activeTab` switching for form mode
- [ ] Update line 2054: Remove `{viewMode === 'form' && renderFormContent()}`

---

## 📝 Navigation Stack Registration

**File**: `src/navigation/AppNavigator.js` (or wherever navigation is defined)

Add new screens to stack:
```javascript
<Stack.Screen
    name="FarmerRegistrationFormScreen"
    component={FarmerRegistrationFormScreen}
    options={{ headerShown: false }}
/>
<Stack.Screen
    name="FarmerHarvestFormScreen"
    component={FarmerHarvestFormScreen}
    options={{ headerShown: false }}
/>
```

---

## 🧪 Testing Strategy

### Unit Testing:
1. Test form validation independently
2. Test AsyncStorage save/load
3. Test UID generation
4. Test amount calculation (harvest form)

### Integration Testing:
1. Test navigation flow
2. Test callback communication
3. Test data persistence
4. Test edit mode

### Manual Testing Checklist:

**Farmer Form:**
- [ ] Create new farmer
- [ ] Edit existing farmer
- [ ] All 4 steps navigate correctly
- [ ] GPS capture works
- [ ] Validation works
- [ ] UID generates correctly
- [ ] Saves to AsyncStorage
- [ ] Appears in list immediately

**Harvest Form:**
- [ ] Create new harvest
- [ ] Edit existing harvest
- [ ] Farmer lookup/autocomplete works
- [ ] Price fetches from API
- [ ] Amount calculates automatically
- [ ] Harvest ID generates correctly
- [ ] Saves to AsyncStorage
- [ ] Appears in list immediately

**Navigation:**
- [ ] Can navigate to both forms
- [ ] Back button works
- [ ] Cancel preserves data in parent
- [ ] Save updates parent immediately

---

## 🚨 Common Pitfalls to Avoid

1. **Don't forget to pass `farmersList` to harvest form** - Required for farmer lookup
2. **Preserve exact AsyncStorage keys** - 'farmer_drafts' and 'harvest_drafts'
3. **Keep UID generation format** - 'FD' prefix for farmers, 'PA' prefix for harvests
4. **Maintain validation logic exactly** - NIN format, contact validation
5. **Don't break GPS capture** - Import helper function correctly
6. **Preserve money formatting** - Use formatNumberWithCommas/parseFormattedNumber
7. **Test edit mode thoroughly** - Must populate form with existing data
8. **Verify callback execution** - onSave must be called and parent must update

---

## 📊 Expected File Sizes After Completion

| File | Before | After | Change |
|------|--------|-------|--------|
| AggregationScreen.js | 2,098 | ~1,400 | -700 |
| FarmerRegistrationFormScreen.js | 0 | ~550 | +550 |
| FarmerHarvestFormScreen.js | 0 | ~500 | +500 |
| **Total** | **2,098** | **2,450** | **+350** |

**Net Impact**: More files but better organization (70% reduction in main screen)

---

## ✅ Success Criteria

Phase 5 is complete when:
- [ ] Both form screens created and working
- [ ] All tests pass
- [ ] No functionality broken
- [ ] AggregationScreen.js reduced to ~1,400 lines
- [ ] Forms can be accessed from navigation
- [ ] Edit mode works for both forms
- [ ] Data persists correctly
- [ ] Parent screen updates immediately after save
- [ ] No console errors
- [ ] User experience is identical to before

---

## 🔄 Rollback Plan

If anything breaks:
1. Revert new form screen files
2. Restore AggregationScreen.js from git
3. Fix issues
4. Try again

**Git commits to make:**
1. After farmer form works: "feat: extract farmer registration to separate screen"
2. After harvest form works: "feat: extract harvest recording to separate screen"
3. After cleanup: "refactor: clean up AggregationScreen after form extraction"

---

## 📞 Contact Points

**Files Modified:**
- `src/features/Aggregation/screens/AggregationScreen.js`
- `src/features/Aggregation/screens/FarmerRegistrationFormScreen.js` (new)
- `src/features/Aggregation/screens/FarmerHarvestFormScreen.js` (new)
- `src/navigation/AppNavigator.js` (add screen registration)

**Dependencies:**
- All existing components in `src/features/Aggregation/components/`
- All existing utils in `src/features/Aggregation/utils/`
- AsyncStorage for data persistence
- Navigation stack for screen transitions

---

**END OF IMPLEMENTATION PLAN**

Ready to proceed when you return. All functionality will be preserved. Zero mistakes approach.

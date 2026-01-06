import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Pressable, Switch, FlatList, KeyboardAvoidingView, Platform, LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// Suppress all console logs and warnings from appearing on UI
// Logs will still appear in the terminal for debugging
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
  '[ApiService]',
  'Network Error',
]);
// Hide all yellow box warnings on screen
LogBox.ignoreAllLogs(true);

// --- UTILITIES AND THEME IMPORTS ---
// NOTE: Assuming these imports are correctly path-resolved in your environment
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoffeeColors from '../../../theme/colors';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
import CustomAlert from '../../../components/CustomAlert';
import HarvestActionMenu from '../../../components/HarvestActionMenu';
import { PICKER_MAP, PARISHES_BY_SUB_COUNTY } from '../../../utils/constants';
import { initializeAuth, generateFarmerId, generateHarvestId, fetchFarmers, submitFarmer, fetchHarvests, submitHarvest, deleteFarmer, deleteHarvest } from '../../../utils/firebaseSetup';
import { formatNumberWithCommas, parseFormattedNumber } from '../../../utils/numberFormatter';
import { fetchCurrentFarmerPrice } from '../../../services/priceService';
import { syncAggregationRecords } from '../../../services/aggregationService';
import AuthService from '../../../services/AuthService';

// --- AGGREGATION FEATURE IMPORTS ---
import { farmerFieldDefinitions, harvestFieldDefinitions, farmerTableFields, harvestTableFields } from '../utils/fieldDefinitions';
import { getCurrentGPSLocation, capitalizeFirstLetter } from '../utils/aggregationHelpers';
import styles from '../styles/aggregationStyles';
import { CustomInput, CustomPicker, CustomToggle, CustomMultiSelect, CustomDatePicker, AutocompleteInput, StepIndicator } from '../components/FormComponents';
import SearchableDataList from '../components/SearchableDataList';

// ================================================
// === DASHBOARD COLOR PALETTE & TYPOGRAPHY ===
// ================================================
const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const LIGHT_BROWN = CoffeeColors.LIGHT_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const TEXT_GRAY = CoffeeColors.GRAY_TEXT;

// ===============================================
// === EXTRACTED COMPONENTS ===
// ===============================================
// Field definitions moved to ../utils/fieldDefinitions.js
// Helper functions moved to ../utils/aggregationHelpers.js
// Styles moved to ../styles/aggregationStyles.js
// Form components moved to ../components/FormComponents.js
// SearchableDataList moved to ../components/SearchableDataList.js

// ===============================================
// === DETAIL VIEW COMPONENTS - NOW SEPARATE SCREENS ===
// ===============================================
// FarmerDetailView moved to FarmerDetailScreen.js
// HarvestDetailView moved to FarmerHarvestDetailScreen.js
// These components are now standalone screens with proper navigation

// REMOVED: const FarmerDetailView = ({ farmer, onBack }) => { ... }

// ===============================================
// === MAIN COMPONENT (POLISHED)            ===
// ===============================================

const AggregationScreen = ({ navigation, route, onNavigate: onNavigateProp }) => {
    const onNavigate = onNavigateProp ?? ((screen, params) => { if (navigation && navigation.navigate) navigation.navigate(screen, params); });

    // --- State declarations ---
    const [farmersList, setFarmersList] = useState([]);
    const [harvestsList, setHarvestsList] = useState([]);
    // Simplified initial state to ensure 'yes-no' fields are correctly initialized as booleans
    const [farmerForm, setFarmerForm] = useState({
        first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
        district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
        coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: [], age_of_seedlings: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
    });
    const [harvestForm, setHarvestForm] = useState({ farmer_uid: '', farmer_name: '', weight_on_delivery: '', location_of_delivery: '', custom_location: '', gps_coordinates_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', price_per_kg: '4,600', amount_paid: '', paid_by_option: '', paid_by: '', selectedStaff: null });

    const [farmerStep, setFarmerStep] = useState(0);
    const [harvestStep, setHarvestStep] = useState(0);
    const [viewMode, setViewMode] = useState('table'); // CHANGED: Show records first instead of form
    const [activeTab, setActiveTab] = useState('farmers');
    const [loading, setLoading] = useState(false);
    const isSubmittingRef = useRef(false);
    const paramsProcessedRef = useRef(false);
    const [userId, setUserId] = useState('user123');

    // NEW: State for detail view
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [selectedHarvest, setSelectedHarvest] = useState(null);

    // State for unsynced records count
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    // State for sync status message
    const [syncStatus, setSyncStatus] = useState('');

    // State for custom alert modal
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });

    // State for sync loading indicator
    const [isSyncing, setIsSyncing] = useState(false);

    // State for validation errors
    const [farmerErrors, setFarmerErrors] = useState({});
    const [harvestErrors, setHarvestErrors] = useState({});

    // State for current farmer price
    const [currentFarmerPrice, setCurrentFarmerPrice] = useState(null);
    const [isPriceLoading, setIsPriceLoading] = useState(false);

    // State for harvest action menu
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [selectedHarvestForAction, setSelectedHarvestForAction] = useState(null);

    // State for current logged-in user
    const [currentUser, setCurrentUser] = useState(null);

    // Handle navigation params from Dashboard quick actions and PaymentVoucher back navigation
    useEffect(() => {
        if (route?.params?.activeTab || route?.params?.viewMode) {
            console.log('[AggregationScreen] Received navigation params:', {
                activeTab: route.params.activeTab,
                viewMode: route.params.viewMode,
                alreadyProcessed: paramsProcessedRef.current
            });
            if (!paramsProcessedRef.current) {
                paramsProcessedRef.current = true;
                const { activeTab: tab, viewMode: mode } = route.params;
                if (tab) {
                    console.log('[AggregationScreen] Setting activeTab to:', tab);
                    setActiveTab(tab);
                }
                if (mode) {
                    console.log('[AggregationScreen] Setting viewMode to:', mode);
                    setViewMode(mode);
                }
                // Clear params after handling to prevent re-triggering
                navigation.setParams({ activeTab: undefined, viewMode: undefined });
            }
        } else {
            // Reset the flag when params are cleared
            paramsProcessedRef.current = false;
        }
    }, [route?.params?.activeTab, route?.params?.viewMode, navigation]);

    // Fetch current logged-in user from /users/me/ API on mount
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                console.log('[AggregationScreen] Fetching current user from /users/me/ API...');
                const result = await AuthService.getCurrentUser();
                if (result.success && result.user) {
                    setCurrentUser(result.user);
                    console.log('[AggregationScreen] Current user loaded from API:', {
                        phone: result.user.phone,
                        first_name: result.user.first_name,
                        last_name: result.user.last_name,
                        username: result.user.username
                    });
                }
            } catch (error) {
                console.error('[AggregationScreen] Error fetching current user from API:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    // Auto-populate paid_by when user's name is selected
    useEffect(() => {
        if (currentUser && harvestForm.paid_by_option) {
            // Get user's name using same logic as Dashboard
            let userName = 'Me';
            if (currentUser.name) {
                userName = currentUser.name;
            } else if (currentUser.first_name) {
                userName = currentUser.first_name;
                if (currentUser.last_name) {
                    userName += ' ' + currentUser.last_name;
                }
            } else if (currentUser.username) {
                userName = currentUser.username;
            }

            // Check if user selected their own name (or "Me" as fallback)
            if (harvestForm.paid_by_option === userName || harvestForm.paid_by_option === 'Me') {
                setHarvestForm(prev => ({
                    ...prev,
                    paid_by: userName,
                    selectedStaff: currentUser // Store full user object
                }));
                console.log('[AggregationScreen] Auto-populated paid_by with current user:', userName);
            } else if (harvestForm.paid_by_option === 'Other Staff Member') {
                // Clear paid_by when switching to "Other Staff Member"
                setHarvestForm(prev => ({
                    ...prev,
                    paid_by: '',
                    selectedStaff: null
                }));
            }
        }
    }, [harvestForm.paid_by_option, currentUser]);

    // --- Data Loading and Initialization ---
    const loadRecords = async () => {
        console.log('[loadRecords] ========== FETCHING RECORDS ==========');
        setLoading(true);
        try {
            // Fetch submitted farmers from backend
            const f = await fetchFarmers();
            console.log('[loadRecords] Fetched farmers count:', Array.isArray(f) ? f.length : 0);
            console.log('[loadRecords] First 3 farmers:', Array.isArray(f) ? f.slice(0, 3) : 'Not an array');
            console.log('[loadRecords] Full farmers response:', JSON.stringify(f, null, 2));

            // Mark backend farmers as synced (not drafts, not pending)
            const syncedFarmers = Array.isArray(f) ? f.map(farmer => ({
                ...farmer,
                _isDraft: false,
                _isSynced: true
            })) : [];

            // Load farmer drafts from AsyncStorage
            const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
            const farmerDrafts = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
            console.log('[loadRecords] Loaded farmer drafts count:', farmerDrafts.length);

            // Log any farmer drafts that claim to be synced (this shouldn't happen)
            const incorrectlySyncedFarmerDrafts = farmerDrafts.filter(f => f._isSynced === true);
            if (incorrectlySyncedFarmerDrafts.length > 0) {
                console.warn('[loadRecords] ⚠️ Found farmer drafts incorrectly marked as synced:', incorrectlySyncedFarmerDrafts.map(f => f.uid || f.farmer_id || f.id));
            }

            // Create a Set of farmer IDs that exist in backend (truly synced)
            const backendFarmerIds = new Set(syncedFarmers.map(f => f.uid || f.farmer_id || f.id));

            // Filter out any drafts that already exist in backend (avoid duplicates)
            // Also ensure remaining drafts are marked as not synced
            const uniqueFarmerDrafts = farmerDrafts
                .filter(draft => {
                    const draftId = draft.uid || draft.farmer_id || draft.id;
                    if (backendFarmerIds.has(draftId)) {
                        console.log(`[loadRecords] Removing duplicate draft for farmer ${draftId} (already in backend)`);
                        return false;
                    }
                    return true;
                })
                .map(draft => ({
                    ...draft,
                    // Ensure drafts are not marked as synced if they're still in AsyncStorage
                    _isSynced: false
                }));

            console.log('[loadRecords] Unique farmer drafts after deduplication:', uniqueFarmerDrafts.length);

            // If we removed duplicates, update AsyncStorage
            if (uniqueFarmerDrafts.length !== farmerDrafts.length) {
                console.log('[loadRecords] Cleaning up farmer duplicates in AsyncStorage...');
                if (uniqueFarmerDrafts.length > 0) {
                    await AsyncStorage.setItem('farmer_drafts', JSON.stringify(uniqueFarmerDrafts));
                } else {
                    await AsyncStorage.removeItem('farmer_drafts');
                }
                console.log('[loadRecords] ✓ Farmer drafts cleaned up');
            }

            // Combine synced farmers from backend and local drafts
            const allFarmers = [...syncedFarmers, ...uniqueFarmerDrafts];
            console.log('[loadRecords] Total farmers (submitted + drafts):', allFarmers.length);
            setFarmersList(allFarmers);

        } catch (e) {
            console.error('[loadRecords] Failed to load farmers:', e);
            console.error('[loadRecords] Error details:', JSON.stringify(e, null, 2));
            setFarmersList([]);
        }
        try {
            // Fetch submitted harvests from backend
            const h = await fetchHarvests();
            console.log('[loadRecords] Fetched harvests count:', Array.isArray(h) ? h.length : 0);

            // Mark backend harvests as synced (not drafts, not pending)
            const syncedHarvests = Array.isArray(h) ? h.map(harvest => ({
                ...harvest,
                _isDraft: false,
                _isSynced: true
            })) : [];

            // Load harvest drafts from AsyncStorage
            const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
            const harvestDrafts = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];
            console.log('[loadRecords] Loaded harvest drafts count:', harvestDrafts.length);

            // Log any harvest drafts that claim to be synced (this shouldn't happen)
            const incorrectlySyncedDrafts = harvestDrafts.filter(h => h._isSynced === true);
            if (incorrectlySyncedDrafts.length > 0) {
                console.warn('[loadRecords] ⚠️ Found harvest drafts incorrectly marked as synced:', incorrectlySyncedDrafts.map(h => h.harvest_id || h.id));
            }

            // Create a Set of harvest IDs that exist in backend (truly synced)
            const backendHarvestIds = new Set(syncedHarvests.map(h => h.harvest_id || h.id));

            // Filter out any drafts that already exist in backend (avoid duplicates)
            // Also ensure remaining drafts are marked as not synced
            const uniqueHarvestDrafts = harvestDrafts
                .filter(draft => {
                    const draftId = draft.harvest_id || draft.id;
                    if (backendHarvestIds.has(draftId)) {
                        console.log(`[loadRecords] Removing duplicate draft for harvest ${draftId} (already in backend)`);
                        return false;
                    }
                    return true;
                })
                .map(draft => ({
                    ...draft,
                    // Ensure drafts are not marked as synced if they're still in AsyncStorage
                    _isSynced: false
                }));

            console.log('[loadRecords] Unique harvest drafts after deduplication:', uniqueHarvestDrafts.length);

            // If we removed duplicates, update AsyncStorage
            if (uniqueHarvestDrafts.length !== harvestDrafts.length) {
                console.log('[loadRecords] Cleaning up harvest duplicates in AsyncStorage...');
                if (uniqueHarvestDrafts.length > 0) {
                    await AsyncStorage.setItem('harvest_drafts', JSON.stringify(uniqueHarvestDrafts));
                } else {
                    await AsyncStorage.removeItem('harvest_drafts');
                }
                console.log('[loadRecords] ✓ Harvest drafts cleaned up');
            }

            // Combine synced harvests from backend and local drafts
            const allHarvests = [...syncedHarvests, ...uniqueHarvestDrafts];
            setHarvestsList(allHarvests);

        } catch (e) {
            console.error('[loadRecords] Failed to load harvests:', e);
            setHarvestsList([]);
        }
        setLoading(false);
    };

    // Count unsynced records from drafts
    const countUnsyncedRecords = async () => {
        try {
            const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
            const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
            const farmerDrafts = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
            const harvestDrafts = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];
            const total = farmerDrafts.length + harvestDrafts.length;
            setUnsyncedCount(total);
            return total;
        } catch (error) {
            console.error('[countUnsyncedRecords] Error:', error);
            return 0;
        }
    };

    // Sync unsynced records - UPDATED to use syncAggregationRecords service
    const handleSyncRecords = async () => {
        setIsSyncing(true);
        try {
            const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
            const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
            const allFarmerRecords = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
            const allHarvestRecords = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];

            // Separate drafts from pending records (drafts are incomplete, pending are submitted but unsynced)
            const farmerDrafts = allFarmerRecords.filter(r => r._isDraft === true);
            const farmerPending = allFarmerRecords.filter(r => r._isDraft === false && r._isSynced !== true);
            const harvestDrafts = allHarvestRecords.filter(r => r._isDraft === true);
            const harvestPending = allHarvestRecords.filter(r => r._isDraft === false && r._isSynced !== true);

            // Combine both drafts and pending for syncing (all unsynced records)
            const farmerRecordsToSync = [...farmerDrafts, ...farmerPending];
            const harvestRecordsToSync = [...harvestDrafts, ...harvestPending];

            console.log('[handleSyncRecords] Starting sync...');
            console.log('[handleSyncRecords] Farmer records to sync:', farmerRecordsToSync.length, '(drafts:', farmerDrafts.length, ', pending:', farmerPending.length, ')');
            console.log('[handleSyncRecords] Harvest records to sync:', harvestRecordsToSync.length, '(drafts:', harvestDrafts.length, ', pending:', harvestPending.length, ')');

            // Use the new sync service that handles both CREATE and UPDATE
            const syncResult = await syncAggregationRecords(farmerRecordsToSync, harvestRecordsToSync);

            console.log(`[handleSyncRecords] Sync result:`, syncResult);

            // Only remove records that were successfully synced
            if (syncResult.syncedFarmerIds.length > 0) {
                const remainingFarmerRecords = allFarmerRecords.filter(d => !syncResult.syncedFarmerIds.includes(d.id));
                if (remainingFarmerRecords.length > 0) {
                    await AsyncStorage.setItem('farmer_drafts', JSON.stringify(remainingFarmerRecords));
                } else {
                    await AsyncStorage.removeItem('farmer_drafts');
                }
            }

            if (syncResult.syncedHarvestIds.length > 0) {
                const remainingHarvestRecords = allHarvestRecords.filter(d => !syncResult.syncedHarvestIds.includes(d.id));
                if (remainingHarvestRecords.length > 0) {
                    await AsyncStorage.setItem('harvest_drafts', JSON.stringify(remainingHarvestRecords));
                } else {
                    await AsyncStorage.removeItem('harvest_drafts');
                }
            }

            // Reload records and update count
            await loadRecords();
            await countUnsyncedRecords();

            // Show alert based on sync results
            if (syncResult.failedCount === 0) {
                // All synced successfully
                setAlertConfig({
                    visible: true,
                    title: 'Sync Successful',
                    message: `${syncResult.syncedCount} record${syncResult.syncedCount !== 1 ? 's have' : ' has'} been synced to the cloud successfully!`,
                    type: 'success',
                    buttons: [
                        { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                    ]
                });
            } else if (syncResult.syncedCount > 0) {
                // Some synced, some failed - show detailed error info
                const failedErrors = syncResult.failedRecords
                    .map(f => `${f.harvest_id || f.id}: ${f.error}`)
                    .join('\n');

                setAlertConfig({
                    visible: true,
                    title: 'Partial Sync',
                    message: `Successfully synced ${syncResult.syncedCount} record${syncResult.syncedCount !== 1 ? 's' : ''}, but ${syncResult.failedCount} record${syncResult.failedCount !== 1 ? 's' : ''} failed.\n\nFailed records:\n${failedErrors}\n\nThe failed records remain in your pending list.`,
                    type: 'warning',
                    buttons: [
                        { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                    ]
                });
            } else {
                // All failed - show detailed error info
                const failedErrors = syncResult.failedRecords
                    .map(f => `${f.harvest_id || f.id}: ${f.error}`)
                    .join('\n');

                setAlertConfig({
                    visible: true,
                    title: 'Sync Failed',
                    message: `All records failed to sync.\n\nErrors:\n${failedErrors}\n\nPlease fix the errors and try again. Your records are still saved locally.`,
                    type: 'error',
                    buttons: [
                        { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                    ]
                });
            }
        } catch (error) {
            console.error('[handleSyncRecords] Sync error:', error);
            // Show custom error alert
            setAlertConfig({
                visible: true,
                title: 'Sync Error',
                message: 'An unexpected error occurred during sync. Please try again.',
                type: 'error',
                buttons: [
                    { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                ]
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Fetch current farmer price when harvest tab is active
    useEffect(() => {
        if (activeTab === 'harvests') {
            const fetchPrice = async () => {
                setIsPriceLoading(true);
                try {
                    const price = await fetchCurrentFarmerPrice();
                    setCurrentFarmerPrice(price);
                    console.log('[AggregationScreen] Fetched current farmer price:', price);
                } catch (error) {
                    console.error('[AggregationScreen] Error fetching farmer price:', error);
                    setCurrentFarmerPrice(null);
                } finally {
                    setIsPriceLoading(false);
                }
            };
            fetchPrice();
        }
    }, [activeTab]);

    useEffect(() => {
        (async () => {
            try {
                // Initialize auth service (assuming this fetches the real userId)
                await initializeAuth();
            } catch (e) {
                console.warn('init auth failed', e);
            }
            await loadRecords();
            await countUnsyncedRecords();
        })();
    }, []);

    // Generate Farmer UID when user moves to step 1 (step 2 in UI)
    useEffect(() => {
        if (farmerStep === 1 && !farmerForm.uid && activeTab === 'farmers' && farmerForm.first_name && farmerForm.last_name) {
            setFarmerForm(p => ({
                ...p,
                uid: generateFarmerId(farmerForm.first_name, farmerForm.last_name)
            }));
        }
    }, [farmerStep, activeTab, farmerForm.first_name, farmerForm.last_name]);

    // Generate Harvest ID when farmer name and date are available
    useEffect(() => {
        if (activeTab === 'harvests' && harvestForm.farmer_name && harvestForm.date_of_delivery && !harvestForm.harvest_id) {
            const harvestId = generateHarvestId(harvestForm.farmer_name, harvestForm.date_of_delivery);
            setHarvestForm(p => ({
                ...p,
                harvest_id: harvestId
            }));
        }
    }, [harvestForm.farmer_name, harvestForm.date_of_delivery, activeTab, harvestForm.harvest_id]);

    const resetForms = () => {
        // Reset boolean fields to false and string fields to ''
        setFarmerForm(p => ({
            ...p,
            first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
            district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
            coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: [], age_of_seedlings: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
        }));

        setHarvestForm(p => ({
            ...p,
            farmer_uid: '', farmer_name: '', weight_on_delivery: '', location_of_delivery: '', custom_location: '', gps_coordinates_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', price_per_kg: currentFarmerPrice ? formatNumberWithCommas(currentFarmerPrice.toString()) : '4,600', amount_paid: '', paid_by_option: '', paid_by: '', selectedStaff: null,
        }));

        // Reset price loading state when resetting forms
        setIsPriceLoading(false);
        setFarmerStep(0);
        setHarvestStep(0);
        setFarmerErrors({});
        setHarvestErrors({});
    };

    const getFarmerDisplayName = (f) => {
        if (!f) return '';
        return f.name || f.full_name || f.farmer_name || f.displayName || `${f.first_name || ''} ${f.last_name || ''}`.trim();
    };

    // --- Form Update Logic ---
    // FIXED: Update farmer form with special logic for booleans and dependencies
    const updateFarmerForm = (key, value) => {
        console.log(`[Farmer Form] Updating field: ${key}, value:`, value);
        setFarmerForm(p => {
            let newState = { ...p, [key]: value };

            // Logic to reset parish when sub_county changes
            if (key === 'sub_county' && value !== p.sub_county) {
                newState.parish = ''; // Reset parish selection
            }
            // Logic for 'Yes'/'No' pickers (which represent booleans in state)
            if (['in_cooperative', 'all_your_trees', 'deforested', 'uses_pesticides'].includes(key)) {
                  newState[key] = value === 'Yes' || value === true;
            }

            console.log('[Farmer Form] New state after update:', newState);
            return newState;
        });

        // Validation for NIN
        if (key === 'nin') {
            if (value) {
                if (value.length > 14) {
                    setFarmerErrors(prev => ({ ...prev, nin: 'NIN must not exceed 14 characters.' }));
                } else if (!/^(CF|CM)[A-Z0-9]*$/.test(value.toUpperCase())) {
                    setFarmerErrors(prev => ({ ...prev, nin: 'NIN must start with CF or CM in uppercase letters.' }));
                } else {
                    setFarmerErrors(prev => ({ ...prev, nin: '' }));
                }
            } else {
                setFarmerErrors(prev => ({ ...prev, nin: '' }));
            }
        }

        // Validation for contact
        if (key === 'contact') {
            if (value && /[^0-9]/.test(value)) {
                setFarmerErrors(prev => ({ ...prev, contact: 'Phone number must contain only digits.' }));
            } else if (value && value.length > 10) {
                setFarmerErrors(prev => ({ ...prev, contact: 'Phone number should not exceed 10 digits.' }));
            } else {
                setFarmerErrors(prev => ({ ...prev, contact: '' }));
            }
        }
    };

    // FIXED: Create proper update function for harvest form
    const updateHarvestForm = (key, value) => {
        console.log(`[Harvest Form] Updating field: ${key}, value:`, value);
        setHarvestForm(p => {
            let processedValue = value;

            // Handle money fields with comma formatting, but prevent editing price_per_kg if it's set from DB
            if (key === 'price_per_kg') {
                // If price_per_kg is set from database, don't allow manual editing
                if (currentFarmerPrice !== null && currentFarmerPrice !== undefined) {
                    console.log('[Harvest Form] price_per_kg is read-only when set from database');
                    return p; // Don't update if price is set from database
                }
                // Remove any non-numeric characters except decimal point
                const cleaned = String(value).replace(/[^0-9.]/g, '');
                // Prevent multiple decimal points
                const parts = cleaned.split('.');
                if (parts.length > 2) {
                    return p; // Don't update if multiple decimal points
                }
                // Format with commas
                processedValue = formatNumberWithCommas(cleaned);
            }

            const newState = { ...p, [key]: processedValue };

            // Auto-calculate amount_paid when weight or price_per_kg changes
            if (key === 'weight_on_delivery' || key === 'price_per_kg') {
                const weight = parseFormattedNumber(key === 'weight_on_delivery' ? processedValue : newState.weight_on_delivery) || 0;
                const pricePerKg = parseFormattedNumber(key === 'price_per_kg' ? processedValue : newState.price_per_kg) || 0;
                const calculatedAmount = weight * pricePerKg;

                // Format calculated amount with commas
                newState.amount_paid = calculatedAmount > 0 ? formatNumberWithCommas(calculatedAmount.toFixed(2)) : '';
                console.log(`[Harvest Form] Auto-calculated amount_paid: ${newState.amount_paid} (${weight} kg × ${pricePerKg} UGX/kg)`);
            }

            console.log('[Harvest Form] New state after update:', newState);
            return newState;
        });
    };

    // --- Submission Handlers (Kept clean) ---
    const handleFarmerSubmit = async () => {
        const isEditing = farmerForm._isEditing;
        console.log(`[handleFarmerSubmit] ========== SAVING FARMER LOCALLY ==========`);
        console.log('[handleFarmerSubmit] Current form state:', farmerForm);

        // Validation
        if (!farmerForm.first_name || !farmerForm.contact || !userId) {
            console.error('[handleFarmerSubmit] Validation failed - missing required fields');
            setAlertConfig({
                visible: true,
                title: 'Validation',
                message: 'Please ensure First name, Contact, and User ID are present.',
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const recordId = isEditing ? farmerForm._originalId : (farmerForm.uid || generateRecordId('FD'));
        const name = `${farmerForm.first_name} ${farmerForm.last_name}`.trim();
        const location = `${farmerForm.district || ''}${farmerForm.sub_county ? ', ' + farmerForm.sub_county : ''}`;

        console.log(`[handleFarmerSubmit] ${isEditing ? 'Updating' : 'Saving'} farmer locally with ID:`, recordId);
        console.log('[handleFarmerSubmit] Farmer name:', name);

        // Prepare farmer record
        const farmerRecord = {
            ...farmerForm,
            name: name,
            uid: recordId,
            location: location,
            number_of_trees: parseInt(farmerForm.no_of_trees) || 0,
            recorder_id: userId,
            timestamp: Date.now(),
            id: recordId,
            _isDraft: false,  // Mark as submitted (not a draft)
            _isSynced: false, // Mark as pending sync
            _syncStatus: 'pending',
        };

        console.log('[handleFarmerSubmit] Final farmer record:', JSON.stringify(farmerRecord, null, 2));

        try {
            // Save to local AsyncStorage as draft
            const storageKey = 'farmer_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === recordId);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = farmerRecord;
                console.log(`[handleFarmerSubmit] Updated existing farmer draft with ID: ${recordId}`);
            } else {
                draftsArray.push(farmerRecord);
                console.log(`[handleFarmerSubmit] Created new farmer draft with ID: ${recordId}`);
            }

            // Save updated drafts array to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));
            console.log(`[handleFarmerSubmit] ✅ Farmer saved locally!`);

            // Show success using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Success',
                message: `Farmer '${name}' saved locally and ready to sync!`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            setViewMode('table');
                        }
                    }
                ]
            });

            resetForms();
            await loadRecords();
            await countUnsyncedRecords();
        } catch (e) {
            console.error(`[handleFarmerSubmit] ❌ Save error:`, e);
            console.error("[handleFarmerSubmit] Error details:", {
                message: e.message,
            });
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    // --- Save Draft Handler ---
    const handleSaveDraft = async () => {
        const type = activeTab === 'farmers' ? 'farmer' : 'harvest';
        const formData = type === 'farmer' ? farmerForm : harvestForm;
        const currentStepNum = type === 'farmer' ? farmerStep : harvestStep;

        console.log(`[handleSaveDraft] ========== SAVING ${type.toUpperCase()} DRAFT - STEP ${currentStepNum + 1} ==========`);
        console.log(`[handleSaveDraft] Current form data:`, formData);

        // Get step information
        const steps = type === 'farmer' ? farmerFieldDefinitions : harvestFieldDefinitions;
        const currentStepData = steps[currentStepNum];

        if (!currentStepData) {
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Unable to save draft. Step information not found.',
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        try {
            // Generate unique ID for draft if not already present
            const draftId = formData.uid || formData.harvest_id || formData.id || generateRecordId(type === 'farmer' ? 'FR' : 'PA');

            // Prepare draft record
            const draftRecord = {
                ...formData,
                id: draftId, // Unique identifier for the draft
                _isDraft: true,
                _draftStep: currentStepNum,
                _draftStepTitle: currentStepData.title,
                _draftSavedAt: new Date().toISOString(),
                _draftType: type,
                recorder_id: userId,
            };

            console.log(`[handleSaveDraft] Saving draft for ${type}:`, JSON.stringify(draftRecord, null, 2));

            // Save draft to AsyncStorage
            const storageKey = type === 'farmer' ? 'farmer_drafts' : 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === draftId);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = draftRecord;
                console.log(`[handleSaveDraft] Updated existing draft with ID: ${draftId}`);
            } else {
                draftsArray.push(draftRecord);
                console.log(`[handleSaveDraft] Created new draft with ID: ${draftId}`);
            }

            // Save updated drafts array to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));
            console.log(`[handleSaveDraft] ✅ Draft saved to AsyncStorage successfully`);

            // Show success dialog using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Draft Saved',
                message: `Your ${type} information has been saved as a draft at "${currentStepData.title}".\n\nYou can continue filling this form later.`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            setViewMode('table');
                            setActiveTab(type + 's');
                        }
                    }
                ]
            });

            // Reload records to show the new draft
            await loadRecords();
            // Update unsynced count
            await countUnsyncedRecords();
        } catch (e) {
            console.error(`[handleSaveDraft] ❌ Error saving draft:`, e);
            setAlertConfig({
                visible: true,
                title: 'Save Failed',
                message: e.message || `Failed to save ${type} draft.`,
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleHarvestSubmit = async () => {
        const isEditing = harvestForm._isEditing;
        console.log(`[handleHarvestSubmit] ========== SAVING HARVEST LOCALLY ==========`);
        console.log('[handleHarvestSubmit] Current form state:', harvestForm);

        if (!harvestForm.farmer_uid || !harvestForm.weight_on_delivery || !harvestForm.price_per_kg || !userId) {
            console.error('[handleHarvestSubmit] Validation failed - missing required fields');
            setAlertConfig({
                visible: true,
                title: 'Validation',
                message: 'Please fill Farmer UID, Weight, Price per Kg and ensure you are logged in.',
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const recordId = isEditing ? harvestForm._originalId : (harvestForm.harvest_id || generateRecordId('PA'));
        console.log(`[handleHarvestSubmit] ${isEditing ? 'Updating' : 'Saving'} harvest locally with ID:`, recordId);

        const harvestRecord = {
            ...harvestForm,
            id: recordId,
            weight_on_delivery: parseFormattedNumber(harvestForm.weight_on_delivery) || 0,
            price_per_kg: parseFormattedNumber(harvestForm.price_per_kg) || 0,
            amount_paid: parseFormattedNumber(harvestForm.amount_paid) || 0,
            recorder_id: userId,
            timestamp: Date.now(),
            _isDraft: false,  // Mark as submitted (not a draft)
            _isSynced: false, // Mark as pending sync
            _syncStatus: 'pending',
        };

        console.log('[handleHarvestSubmit] Final harvest record:', JSON.stringify(harvestRecord, null, 2));

        try {
            // Save to local AsyncStorage as draft
            const storageKey = 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === recordId);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = harvestRecord;
                console.log(`[handleHarvestSubmit] Updated existing harvest draft with ID: ${recordId}`);
            } else {
                draftsArray.push(harvestRecord);
                console.log(`[handleHarvestSubmit] Created new harvest draft with ID: ${recordId}`);
            }

            // Save updated drafts array to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));
            console.log(`[handleHarvestSubmit] ✅ Harvest saved locally!`);

            resetForms();
            await loadRecords();
            await countUnsyncedRecords();

            // Auto-generate voucher
            const voucherData = {
                ...harvestRecord,
                workerName: harvestForm.farmer_name || harvestForm.farmer_uid,
                blockId: 'N/A', // Aggregation might not have blocks
                pricePerKg: harvestRecord.price_per_kg, // Use raw numeric value
                amountPaid: harvestRecord.amount_paid, // Use raw numeric value
                paidBy: harvestForm.paid_by,
                date: harvestForm.date_of_delivery,
            };
            onNavigate('PaymentVoucher', {
                harvestData: voucherData,
                source: 'Aggregation' // Indicate where voucher was generated from
            });
        } catch (e) {
            console.error(`[handleHarvestSubmit] ❌ Save error:`, e);
            console.error('[handleHarvestSubmit] Error details:', {
                message: e.message,
            });

            setAlertConfig({
                visible: true,
                title: 'Save Failed',
                message: e.message || 'Failed to save harvest details locally.',
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };
    
    // --- Step Form Renderer (Unified Logic) ---

    const renderGroupedStepForm = (type) => {
        const isFarmer = type === 'farmers';
        const steps = isFarmer ? farmerFieldDefinitions : harvestFieldDefinitions;
        const currentStep = isFarmer ? farmerStep : harvestStep;
        const setStep = isFarmer ? setFarmerStep : setHarvestStep;
        const formData = isFarmer ? farmerForm : harvestForm;
        const setFormData = isFarmer ? updateFarmerForm : updateHarvestForm; // FIXED: Use proper update functions for both forms
        const currentStepFields = steps[currentStep];

        // Debug log
        if (!isFarmer && currentStep === 1) {
            console.log('[AggregationScreen] Rendering harvest form step 2 (Quality & Payment)');
            console.log('[AggregationScreen] Fields in step:', currentStepFields.fields.map(f => ({ key: f.key, type: f.type })));
        }

        const updateForm = (key, value) => {
            setFormData(key, value);
        };
        
        const handleNext = () => {
            // Check for validation errors
            const hasErrors = isFarmer ? Object.values(farmerErrors).some(error => error) : Object.values(harvestErrors).some(error => error);
            if (hasErrors) {
                setAlertConfig({
                    visible: true,
                    title: 'Input Error',
                    message: 'Please fix the validation errors before proceeding.',
                    type: 'error',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                            }
                        }
                    ]
                });
                return;
            }

            // Basic required field validation for current step
            const missingRequired = currentStepFields.fields.some(f => {
                // Check if field is required OR if it has dependsOn condition that is met
                const isRequired = f.required;
                const isDependentAndActive = f.dependsOn && formData[f.dependsOn.field] === f.dependsOn.value;

                // Skip validation if field is neither required nor conditionally active
                if (!isRequired && !isDependentAndActive) return false;

                // If field has dependsOn but the condition is not met, skip validation
                if (f.dependsOn && formData[f.dependsOn.field] !== f.dependsOn.value) return false;

                const value = formData[f.key];

                // Handle different field types
                if (f.type === 'yes-no') {
                    // Boolean fields - false is a valid value
                    return value !== true && value !== false;
                } else if (f.type === 'multi-select') {
                    // Array fields - check if array is empty
                    return !Array.isArray(value) || value.length === 0;
                } else if (typeof value === 'string') {
                    // String fields - check for empty or whitespace
                    return !value || value.trim() === '';
                } else {
                    // Other types - just check for falsy (but not false/0)
                    return value === null || value === undefined || value === '';
                }
            });

            if (missingRequired) {
                setAlertConfig({
                    visible: true,
                    title: 'Input Error',
                    message: 'Please fill all required fields in this step.',
                    type: 'error',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                            }
                        }
                    ]
                });
                return;
            }

            // Handle step-specific actions (e.g., UID generation, Farmer lookup) BEFORE advancing
            currentStepFields.fields.forEach(f => {
                if (f.special === 'generate_uid' && isFarmer && !formData.uid) {
                    setFormData('uid', generateRecordId('FD'));
                } else if (f.special === 'generate_harvest_id' && !isFarmer && !formData.harvest_id) {
                     setFormData('harvest_id', generateRecordId('PA'));
                } else if (f.action === 'lookup' && !isFarmer && formData.farmer_uid) {
                    const farmerUID = formData.farmer_uid;
                    // Check for farmer_id (Django API), uid (legacy), or id (fallback)
                    const found = farmersList.find(f =>
                        String(f.farmer_id) === String(farmerUID) ||
                        String(f.uid) === String(farmerUID) ||
                        String(f.id) === String(farmerUID)
                    );
                    if (found) {
                        setFormData('farmer_name', getFarmerDisplayName(found));
                    } else {
                        setAlertConfig({
                            visible: true,
                            title: 'Farmer Not Found',
                            message: 'No farmer with that UID was found in local records.',
                            type: 'error',
                            buttons: [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        setAlertConfig(prev => ({ ...prev, visible: false }));
                                    }
                                }
                            ]
                        });
                    }
                }
            });

            if (currentStep < steps.length - 1) {
                setStep(s => s + 1);
            } else {
                // Final step - trigger submission
                isFarmer ? handleFarmerSubmit() : handleHarvestSubmit();
            }
        };

        const handleBack = () => {
            if (currentStep > 0) setStep(s => s - 1);
        };

        const isEditing = isFarmer ? farmerForm._isEditing : harvestForm._isEditing;

        return (
            <View style={styles.formSection}>
                <Text style={styles.formTitle}>
                    {isEditing ? '✏️ Edit ' : ''}
                    {currentStepFields.title}
                </Text>
                <StepIndicator currentStep={currentStep + 1} totalSteps={steps.length} steps={steps} styles={styles} />

                {/* Form Fields - ScrollView now takes available space */}
                <ScrollView
                    style={styles.stepFormScroll}
                    contentContainerStyle={styles.stepFormContent}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                >
                    {currentStepFields.fields.map(field => {
                        // Handle conditional visibility
                        if (field.dependsOn) {
                            // Check if the dependency value is explicitly 'Yes'/'No' string for boolean state (false/true)
                            const dependencyValue = field.dependsOn.value === true ? 'Yes' : (field.dependsOn.value === false ? 'No' : field.dependsOn.value);
                            
                            // Check the form value, which is stored as a boolean (true/false) in the state
                            const formValue = formData[field.dependsOn.field] === true ? 'Yes' : (formData[field.dependsOn.field] === false ? 'No' : formData[field.dependsOn.field]);
                            
                            if (formValue !== dependencyValue) {
                                return null;
                            }
                        }
                        
                        const fieldValue = (field.special === 'generate_uid' || field.special === 'generate_harvest_id')
                            ? formData[field.key] || 'Press Next to Generate ID'
                            : (field.type === 'multi-select' ? (Array.isArray(formData[field.key]) && formData[field.key].length > 0 ? formData[field.key].join(', ') : '') : (field.array ? (Array.isArray(formData[field.key]) ? formData[field.key].join(', ') : '') : String(formData[field.key] ?? '')));

                        // Determine field type and render
                        if (field.type === 'yes-no') {
                            const selectedValue = formData[field.key] === true ? 'Yes' : (formData[field.key] === false ? 'No' : '');
                            return <CustomPicker key={field.key} label={field.label} selectedValue={selectedValue} onValueChange={(v) => updateForm(field.key, v === 'Yes' ? true : false)} items={['Yes', 'No']} styles={styles} />;
                        }
                        if (field.type === 'multi-select') {
                            const items = PICKER_MAP[field.pickerKey] || [];
                            return <CustomMultiSelect key={field.key} label={field.label} selectedValues={formData[field.key] || []} onValueChange={(v) => updateForm(field.key, v)} items={items} styles={styles} />;
                        }
                        if (field.type === 'date') {
                            return <CustomDatePicker key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} value={formData[field.key]} onChange={(v) => updateForm(field.key, v)} styles={styles} />;
                        }
                        if (field.type === 'picker') {
                            let items = PICKER_MAP[field.pickerKey] || [];

                            // Dynamic filtering for Parish
                            if (field.dynamic && field.pickerKey === 'parish' && formData.sub_county) {
                                items = PARISHES_BY_SUB_COUNTY[formData.sub_county] || [];
                            } else if (field.dynamic && field.pickerKey === 'parish' && !formData.sub_county) {
                                items = [{ label: 'Select Sub-county first', value: '', disabled: true }];
                            }

                            // Dynamic options for paid_by_option - show actual user name instead of "Me"
                            if (field.pickerKey === 'paid_by_option') {
                                let userName = 'Me'; // Default fallback

                                if (currentUser) {
                                    // Use same logic as Dashboard for consistency
                                    if (currentUser.name) {
                                        userName = currentUser.name;
                                    } else if (currentUser.first_name) {
                                        userName = currentUser.first_name;
                                        // Add last name if available
                                        if (currentUser.last_name) {
                                            userName += ' ' + currentUser.last_name;
                                        }
                                    } else if (currentUser.username) {
                                        userName = currentUser.username;
                                    }
                                    console.log('[AggregationScreen] Picker showing user name:', userName);
                                }

                                items = [userName, 'Other Staff Member'];
                            }

                            return <CustomPicker key={field.key} label={field.label} selectedValue={formData[field.key]} onValueChange={(v) => updateForm(field.key, v)} items={items} styles={styles} />;
                        }

                        // Special handling for farmer_uid autocomplete in harvest form
                        if (field.key === 'farmer_uid' && field.action === 'lookup' && !isFarmer) {
                            return (
                                <View key={field.key}>
                                    <AutocompleteInput
                                        label={`${field.label}${field.required ? ' *' : ''}`}
                                        value={fieldValue}
                                        onChangeText={(v) => updateForm(field.key, v)}
                                        onSelect={(farmer, selectedId) => {
                                            // When user selects from dropdown, update both UID and name
                                            updateForm('farmer_uid', selectedId);
                                            updateForm('farmer_name', getFarmerDisplayName(farmer));
                                        }}
                                        suggestions={farmersList}
                                        keyboardType={field.keyboardType}
                                        placeholder="Start typing farmer name, ID, or contact..."
                                        styles={styles}
                                    />
                                    {/* Display selected farmer name below the UID field */}
                                    {formData.farmer_name && (
                                        <View style={styles.farmerNameDisplay}>
                                            <Ionicons name="person" size={16} color={PRIMARY_BROWN} style={{ marginRight: 8 }} />
                                            <Text style={styles.farmerNameText}>{formData.farmer_name}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        // Special handling for paid_by searchable staff picker in harvest form
                        if (field.key === 'paid_by' && field.type === 'searchable-staff' && !isFarmer) {
                            console.log('[AggregationScreen] Rendering SearchableStaffPicker for paid_by field');
                            return (
                                <SearchableStaffPicker
                                    key={field.key}
                                    label={`${field.label}${field.required ? ' *' : ''}`}
                                    selectedStaffId={formData.paid_by}
                                    onStaffSelect={(staff) => {
                                        // Update both the ID and the staff object
                                        updateForm('paid_by', staff.id);
                                        updateForm('selectedStaff', staff);
                                    }}
                                    selectedStaff={formData.selectedStaff}
                                />
                            );
                        }

                        // Default to CustomInput
                        const handleTextChange = (v) => {
                            let processedValue = v;
                            if (field.keyboardType === 'numeric') {
                                processedValue = v.replace(/[^0-9.]/g, '');
                            }
                            if (field.array) {
                                processedValue = v.split(',').map(s => s.trim()).filter(Boolean);
                            }
                            updateForm(field.key, processedValue);
                        };

                        // Special handling for price_per_kg field - make it read-only when price is set from DB
                        const isPriceReadOnly = field.key === 'price_per_kg' && !isFarmer && currentFarmerPrice !== null && currentFarmerPrice !== undefined;

                        const inputElement = (
                            <CustomInput
                                key={field.key}
                                label={`${field.label}${field.required ? ' *' : ''}`}
                                value={isPriceLoading && field.key === 'price_per_kg' && !isFarmer ? 'Loading...' : fieldValue}
                                onChangeText={(isPriceReadOnly || field.readOnly) ? null : handleTextChange}
                                keyboardType={field.keyboardType}
                                editable={!(isPriceReadOnly || field.readOnly)}
                                placeholder={field.readOnly ? '' : (field.placeholder || `Enter ${field.label}`)}
                                error={isFarmer ? farmerErrors[field.key] : harvestErrors[field.key]}
                                styles={styles}
                            />
                        );

                        // Show button after GPS field for farmer form
                        if (field.key === 'gps' && isFarmer) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <TouchableOpacity
                                        style={styles.generateButton}
                                        onPress={async () => {
                                            const gpsLocation = await getCurrentGPSLocation();
                                            updateForm('gps', gpsLocation);
                                            setAlertConfig({
                                                visible: true,
                                                title: 'GPS Location Captured',
                                                message: `Location: ${gpsLocation}`,
                                                type: 'success',
                                                buttons: [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            setAlertConfig(prev => ({ ...prev, visible: false }));
                                                        }
                                                    }
                                                ]
                                            });
                                        }}
                                    >
                                        <Text>
                                            <Text style={styles.generateButtonText}>Get Current GPS Location</Text>
                                            <Text>{'\n'}</Text>
                                            <Text style={styles.generateButtonSubtext}>(Use when on farm site)</Text>
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }

                        // Show button after GPS coordinates field for harvest form
                        if (field.key === 'gps_coordinates_delivery' && !isFarmer) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <TouchableOpacity
                                        style={styles.generateButton}
                                        onPress={async () => {
                                            const gpsLocation = await getCurrentGPSLocation();
                                            updateForm('gps_coordinates_delivery', gpsLocation);
                                            setAlertConfig({
                                                visible: true,
                                                title: 'GPS Coordinates Captured',
                                                message: `Coordinates: ${gpsLocation}`,
                                                type: 'success',
                                                buttons: [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            setAlertConfig(prev => ({ ...prev, visible: false }));
                                                        }
                                                    }
                                                ]
                                            });
                                        }}
                                    >
                                        <Text>
                                            <Text style={styles.generateButtonText}>Capture Current GPS Location</Text>
                                            <Text>{'\n'}</Text>
                                            <Text style={styles.generateButtonSubtext}>(Capture exact delivery location)</Text>
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }

                        // Show helper text for calculated amount_paid field
                        if (field.calculated && field.key === 'amount_paid') {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <Text style={styles.helperText}>Auto-calculated: Weight × Price per Kg</Text>
                                </View>
                            );
                        }

                        // Show helper text for price_per_kg field when it's read-only
                        if (field.key === 'price_per_kg' && !isFarmer && isPriceReadOnly) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <Text style={styles.helperText}>Price fetched from database (latest price)</Text>
                                </View>
                            );
                        }

                        // Show helper text for price_per_kg field when no price is set
                        if (field.key === 'price_per_kg' && !isFarmer && currentFarmerPrice === null && !isPriceLoading) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <Text style={styles.helperText}>No price set in database - enter manually</Text>
                                </View>
                            );
                        }

                        return inputElement;
                    })}

                </ScrollView>

                {/* Step Navigation */}
                <View style={styles.stepNavContainer}>
                    <View style={styles.stepNav}>
                        {currentStep > 0 && (
                            <TouchableOpacity style={styles.stepButton} onPress={handleBack}>
                                <Ionicons name="chevron-back" size={20} color={PRIMARY_BROWN} style={styles.prevButtonIcon} />
                                <Text style={styles.stepButtonText}>Previous</Text>
                            </TouchableOpacity>
                        )}
                        {currentStep < steps.length - 1 ? (
                            <TouchableOpacity
                                style={styles.stepButton}
                                onPress={handleNext}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={PRIMARY_BROWN} /> : (
                                    <>
                                        <Text style={styles.stepButtonText}>Next</Text>
                                        <Ionicons name="chevron-forward" size={20} color={PRIMARY_BROWN} style={styles.nextButtonIcon} />
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleNext}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={'#fff'} /> : (
                                    <Text style={styles.submitButtonText}>
                                        {`${isEditing ? 'Update' : 'Submit'} ${isFarmer ? 'Farmer' : 'Harvest'}`}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Save Draft Button - Available on all steps */}
                    <TouchableOpacity
                        style={styles.saveDraftButton}
                        onPress={handleSaveDraft}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={PRIMARY_BROWN} />
                        ) : (
                            <>
                                <Ionicons name="save" size={18} color={PRIMARY_BROWN} style={{ marginRight: 6 }} />
                                <Text style={styles.saveDraftButtonText}>Save Draft</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Main Content Renderers ---
    const renderFormContent = () => {
        return activeTab === 'farmers' ? renderGroupedStepForm('farmers') : renderGroupedStepForm('harvests');
    };
    
    // Handler for deleting a record with confirmation
    /**
     * Performs the actual delete operation
     */
    const performDelete = async (record, type, displayName) => {
        console.log(`[handleDelete] Deleting ${type}:`, record);
        setLoading(true);

        try {
            // Check if this is a draft record
            const isDraft = record._isDraft === true;

            if (type === 'farmer') {
                const farmerId = record.farmer_id || record.uid || record.id;
                console.log('[handleDelete] Deleting farmer with ID:', farmerId);

                if (isDraft) {
                    // Delete draft from AsyncStorage
                    const storageKey = 'farmer_drafts';
                    const existingDrafts = await AsyncStorage.getItem(storageKey);
                    const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];
                    const updatedDrafts = draftsArray.filter(d => d.id !== farmerId);
                    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));
                    console.log('[handleDelete] Draft deleted from local storage');
                } else {
                    // Delete submitted farmer from API
                    await deleteFarmer(farmerId);
                    console.log('[handleDelete] Farmer deleted from API');
                }

                // Remove from local state immediately for better UX
                setFarmersList(prev => prev.filter(f =>
                    f.farmer_id !== farmerId && f.uid !== farmerId && f.id !== farmerId
                ));

                // Show success using CustomAlert
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: `Farmer "${displayName}" has been deleted successfully.`,
                    type: 'success',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: async () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                await loadRecords();
                            }
                        }
                    ]
                });
            } else {
                const harvestId = record.id || record.harvest_id;
                console.log('[handleDelete] Deleting harvest with ID:', harvestId);

                if (isDraft) {
                    // Delete draft from AsyncStorage
                    const storageKey = 'harvest_drafts';
                    const existingDrafts = await AsyncStorage.getItem(storageKey);
                    const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];
                    const updatedDrafts = draftsArray.filter(d => d.id !== harvestId && d.harvest_id !== harvestId);
                    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));
                    console.log('[handleDelete] Draft deleted from local storage');
                } else {
                    // Try to delete from API first
                    try {
                        await deleteHarvest(harvestId);
                        console.log('[handleDelete] Harvest deleted from API');
                    } catch (apiError) {
                        // If API delete fails (404 or 500), also try to remove from AsyncStorage
                        console.warn('[handleDelete] API delete failed, attempting to remove from local storage:', apiError.message);

                        const storageKey = 'harvest_drafts';
                        const existingDrafts = await AsyncStorage.getItem(storageKey);
                        if (existingDrafts) {
                            const draftsArray = JSON.parse(existingDrafts);
                            const updatedDrafts = draftsArray.filter(d => d.id !== harvestId && d.harvest_id !== harvestId);
                            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));
                            console.log('[handleDelete] Removed from local storage as fallback');
                        }

                        // Re-throw the error if it's not a 404 (record not found)
                        if (apiError.response?.status !== 404) {
                            throw apiError;
                        } else {
                            console.log('[handleDelete] Record not found in API (404), treating as successful deletion');
                        }
                    }
                }

                // Remove from local state immediately for better UX
                setHarvestsList(prev => prev.filter(h =>
                    h.id !== harvestId && h.harvest_id !== harvestId
                ));

                // Show success using CustomAlert
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: `Harvest record has been deleted successfully.`,
                    type: 'success',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: async () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                await loadRecords();
                            }
                        }
                    ]
                });
            }
        } catch (error) {
            console.error('[handleDelete] Delete failed:', error);

            // Build user-friendly error message
            let errorMsg = 'Failed to delete record.';
            if (error.response?.status === 500) {
                errorMsg = 'Server error occurred. The record may have been deleted. Please refresh and check.';
            } else if (error.response?.status === 404) {
                errorMsg = 'Record not found. It may have already been deleted.';
            } else if (error.response?.data?.detail) {
                errorMsg = error.response.data.detail;
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.message) {
                errorMsg = error.message;
            }

            // Show error using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Delete Failed',
                message: errorMsg,
                type: 'error',
                buttons: [
                    {
                        text: 'Refresh',
                        onPress: async () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            await loadRecords();
                        }
                    },
                    {
                        text: 'OK',
                        style: 'cancel',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (record, type) => {
        const displayName = type === 'farmer'
            ? `${record.first_name || ''} ${record.last_name || ''}`.trim()
            : `Harvest ${record.id || record.harvest_id || 'Unknown'}`;

        // Show confirmation using CustomAlert
        setAlertConfig({
            visible: true,
            title: 'Delete Record',
            message: `Are you sure you want to delete ${displayName}?`,
            type: 'warning',
            buttons: [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                    }
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        await performDelete(record, type, displayName);
                    }
                }
            ]
        });
    };

    // Handler for editing a record - populates form with existing data
    const handleEdit = (record, type) => {
        console.log(`[handleEdit] Editing ${type}:`, record);

        if (type === 'farmer') {
            // Populate farmer form with existing data
            // Need to map backend field names to form field names
            setFarmerForm({
                // Personal Info
                first_name: record.first_name || '',
                last_name: record.last_name || '',
                gender: record.gender || '',
                nin: record.nin || '',
                date_of_birth: record.date_of_birth || '',
                contact: record.contact || '',
                email: record.email || '',
                in_cooperative: record.in_cooperative || false,
                cooperative: record.cooperative || '',
                started_farming: record.started_coffee_farming_year ? `${record.started_coffee_farming_year}-01-01` : '',

                // Location
                district: record.district || '',
                sub_county: record.sub_county || '',
                parish: record.parish || '',
                village: record.village || '',
                gps: record.gps_coordinates || record.gps || '',
                nearest_landmark: record.nearest_landmark || '',
                uid: record.farmer_id || record.uid || '',

                // Farm Details
                coffee_variety: record.coffee_variety || '',
                no_of_trees: String(record.number_of_trees || ''),
                all_your_trees: record.ownership_of_trees !== false,
                other_farms: record.other_farms || '',
                planted_date: record.planted_date || '',
                spacing: record.spacing_between_trees || record.spacing || '',
                land_ownership: record.land_ownership || '',
                deforested: record.defforestation_status || false,
                seedling_source: record.source_of_seedlings || record.seedling_source || '',
                seedling_type: Array.isArray(record.type_of_seedlings) ? record.type_of_seedlings : (record.type_of_seedlings ? [record.type_of_seedlings] : []),
                age_of_seedlings: record.age_of_seedlings || '',

                // Practices
                practices: Array.isArray(record.practices) ? record.practices : [],
                irrigation: record.irrigation_source || record.irrigation || '',
                fertilizers: typeof record.fertilizers === 'string'
                    ? record.fertilizers.split(',').map(f => f.trim()).filter(Boolean)
                    : (Array.isArray(record.fertilizers) ? record.fertilizers : []),
                uses_pesticides: record.pesticide ? true : false,
                pesticides: typeof record.pesticide === 'string'
                    ? record.pesticide.split(',').map(p => p.trim()).filter(Boolean)
                    : (Array.isArray(record.pesticides) ? record.pesticides : []),

                // Store the original ID for update
                _isEditing: true,
                _originalId: record.farmer_id || record.uid || record.id,
            });

            // Reset step to beginning
            setFarmerStep(0);
            setViewMode('form');
            setActiveTab('farmers');
        } else {
            // Populate harvest form with existing data
            setHarvestForm({
                farmer_uid: record.name || record.farmer_uid || '',
                farmer_name: record.farmer_name || '',
                weight_on_delivery: String(record.weight_on_delivery || ''),
                location_of_delivery: record.location_of_delivery || record.location_on_delivery || '',
                gps_coordinates_delivery: record.gps_coordinates_delivery || record.gps_coordinates || '',
                date_of_delivery: record.date_of_delivery || '',
                coffee_type: record.grade || record.coffee_type || '',
                price_per_kg: record.price_per_kg ? formatNumberWithCommas(String(record.price_per_kg)) : (currentFarmerPrice ? formatNumberWithCommas(currentFarmerPrice.toString()) : ''),
                amount_paid: record.amount_paid ? formatNumberWithCommas(String(record.amount_paid)) : '',
                paid_by: record.paid_by || record.who_paid || '',
                selectedStaff: null, // Will be set by SearchableStaffPicker
                harvest_id: record.id || record.harvest_id || '',

                // Store the original ID for update
                _isEditing: true,
                _originalId: record.id || record.harvest_id,
            });

            // Reset step to beginning
            setHarvestStep(0);
            setViewMode('form');
            setActiveTab('harvests');
        }
    };

    /**
     * Handles the actual sync operation after confirmation
     */
    const performDraftSync = async (draftRecord, type, displayName) => {
        setLoading(true);
        try {
            if (type === 'farmer') {
                // Sync farmer draft to database
                console.log('[handleSyncDraft] Submitting farmer draft to API...');
                console.log('[handleSyncDraft] Draft record being synced:', draftRecord);

                const farmerData = {
                    uid: draftRecord.uid || draftRecord.farmer_id || draftRecord.id,
                    first_name: draftRecord.first_name || '',
                    last_name: draftRecord.last_name || '',
                    gender: draftRecord.gender || '',
                    nin: draftRecord.nin || '',
                    date_of_birth: draftRecord.date_of_birth || '',
                    contact: draftRecord.contact || '',
                    email: draftRecord.email || '',
                    farmer_type: draftRecord.farmer_type || 'individual',
                    started_farming: draftRecord.started_farming || '',
                    district: draftRecord.district || '',
                    other_district: draftRecord.other_district || '',
                    sub_county: draftRecord.sub_county || '',
                    other_sub_county: draftRecord.other_sub_county || '',
                    parish: draftRecord.parish || '',
                    village: draftRecord.village || '',
                    gps: draftRecord.gps || '',
                    nearest_landmark: draftRecord.nearest_landmark || '',
                    coffee_variety: draftRecord.coffee_variety || '',
                    no_of_trees: draftRecord.no_of_trees || 0,
                    all_your_trees: draftRecord.all_your_trees !== false,
                    other_farms: draftRecord.other_farms || '',
                    planted_date: draftRecord.planted_date || '',
                    spacing: draftRecord.spacing || '',
                    land_ownership: draftRecord.land_ownership || '',
                    deforested: draftRecord.deforested !== false,
                    seedling_source: draftRecord.seedling_source || '',
                    seedling_type: draftRecord.seedling_type || '',
                    age_of_seedlings: draftRecord.age_of_seedlings || '',
                    practices: draftRecord.practices || [],
                    irrigation: draftRecord.irrigation || '',
                    fertilizers: draftRecord.fertilizers || [],
                    pesticides: draftRecord.pesticides || [],
                };

                console.log('[handleSyncDraft] Farmer data prepared for submission:', JSON.stringify(farmerData, null, 2));
                await submitFarmer(farmerData);
                console.log('[handleSyncDraft] Farmer draft synced successfully');
            } else {
                // Sync harvest draft to database
                console.log('[handleSyncDraft] Submitting harvest draft to API...');
                console.log('[handleSyncDraft] Draft record being synced:', draftRecord);

                const harvestData = {
                    id: draftRecord.id || draftRecord.harvest_id,
                    farmer_uid: draftRecord.farmer_uid || draftRecord.name || '',
                    farmer_name: draftRecord.farmer_name || '',
                    weight_on_delivery: draftRecord.weight_on_delivery || 0,
                    location_of_delivery: draftRecord.location_of_delivery || '',
                    gps_coordinates_delivery: draftRecord.gps_coordinates_delivery || '',
                    date_of_delivery: draftRecord.date_of_delivery || '',
                    coffee_type: draftRecord.coffee_type || draftRecord.grade || '',
                    amount_paid: draftRecord.amount_paid || '',
                    paid_by: draftRecord.paid_by || '',
                };

                console.log('[handleSyncDraft] Harvest data prepared for submission:', JSON.stringify(harvestData, null, 2));
                await submitHarvest(harvestData);
                console.log('[handleSyncDraft] Harvest draft synced successfully');
            }

            // Remove draft from AsyncStorage
            const storageKey = type === 'farmer' ? 'farmer_drafts' : 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];
            const updatedDrafts = draftsArray.filter(d => d.id !== draftRecord.id);
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));

            console.log(`[handleSyncDraft] Draft removed from local storage`);

            // Update local state to remove the synced draft
            if (type === 'farmer') {
                setFarmersList(prev => prev.filter(f => f.id !== draftRecord.id));
            } else {
                setHarvestsList(prev => prev.filter(h => h.id !== draftRecord.id));
            }

            // Show success using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Sync Successful',
                message: `${type === 'farmer' ? 'Farmer' : 'Harvest'} draft "${displayName}" has been synced to the database successfully!`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: async () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            // Reload records from server to ensure complete sync
                            await loadRecords();
                        }
                    }
                ]
            });
        } catch (error) {
            console.error('[handleSyncDraft] Sync failed:', error);
            const errorMsg = error.response?.data?.detail
                || error.response?.data?.message
                || error.message
                || `Failed to sync ${type} draft`;

            // Show error using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Sync Failed',
                message: errorMsg,
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles syncing a draft record to the database.
     * This function submits an incomplete draft without requiring full form completion.
     * Empty/missing fields will be filled with sensible defaults by submitFarmer/submitHarvest.
     */
    const handleSyncDraft = async (draftRecord) => {
        const type = draftRecord._draftType || (draftRecord.first_name ? 'farmer' : 'harvest');
        const displayName = type === 'farmer'
            ? `${draftRecord.first_name || ''} ${draftRecord.last_name || ''}`.trim()
            : `Harvest ${draftRecord.id || draftRecord.harvest_id || 'Unknown'}`;

        console.log(`[handleSyncDraft] Syncing ${type} draft:`, draftRecord);

        // Show confirmation using CustomAlert
        setAlertConfig({
            visible: true,
            title: 'Sync Draft to Database',
            message: `Are you sure you want to submit this ${type === 'farmer' ? 'farmer' : 'harvest'} draft to the database?\n\nYou can edit it later if needed.`,
            type: 'info',
            buttons: [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                    }
                },
                {
                    text: 'Sync',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        await performDraftSync(draftRecord, type, displayName);
                    }
                }
            ]
        });
    };

    const renderTableContent = () => {
        if (activeTab === 'farmers') {
            return (
                <SearchableDataList
                    records={farmersList}
                    fields={farmerTableFields}
                    title="Farmer Records"
                    onExit={() => setViewMode('form')}
                    isFarmer={true}
                    onEdit={(r, isEdit) => {
                        if (isEdit) {
                            // Edit mode - populate form
                            handleEdit(r, 'farmer');
                        } else {
                            // View mode - navigate to detail screen
                            navigation.navigate('FarmerDetailScreen', { farmer: r });
                        }
                    }}
                    onDelete={(r) => handleDelete(r, 'farmer')}
                    onSyncDraft={(r) => handleSyncDraft(r)}
                    onVoucher={null}
                    styles={styles}
                />
            );
        } else {
            return (
                <SearchableDataList
                    records={harvestsList}
                    fields={harvestTableFields}
                    title="Harvest Records"
                    onExit={() => setViewMode('form')}
                    isFarmer={false}
                    farmersList={farmersList}
                    onHarvestAction={(item) => {
                        console.log('[AggregationScreen] Opening action menu for harvest:', item);
                        setSelectedHarvestForAction(item);
                        setActionMenuVisible(true);
                    }}
                    onEdit={(r, isEdit) => {
                        if (isEdit) {
                            // Edit mode - populate form
                            handleEdit(r, 'harvest');
                        } else {
                            // View mode - navigate to detail screen
                            navigation.navigate('FarmerHarvestDetailScreen', { harvest: r, farmersList });
                        }
                    }}
                    onDelete={(r) => handleDelete(r, 'harvest')}
                    onSyncDraft={(r) => handleSyncDraft(r)}
                    onVoucher={(r) => {
                        // Extract data from __raw if it exists (from Firebase), otherwise use r directly
                        const rawData = r.__raw || r;

                        // Prepare harvest data for voucher - lookup farmer name from farmersList
                        const farmerUID = rawData.name || rawData.farmer_name || rawData.farmer_uid || r.farmer_uid;
                        let farmerName = farmerUID || 'Unknown';

                        // Look up farmer name from farmersList
                        if (farmerUID && Array.isArray(farmersList)) {
                            const farmer = farmersList.find(f =>
                                String(f.farmer_id) === String(farmerUID) ||
                                String(f.uid) === String(farmerUID) ||
                                String(f.id) === String(farmerUID)
                            );

                            if (farmer) {
                                farmerName = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || farmer.name || farmerUID;
                            }
                        }

                        const voucherData = {
                            ...rawData, // Spread raw data first
                            farmer_name: farmerName, // Use farmer_name to match PaymentVoucherScreen expectations
                            blockId: 'N/A', // Aggregation might not have blocks
                            harvest_id: rawData.harvest_id || r.harvest_id,
                            price_per_kg: parseFormattedNumber(rawData.price_per_kg) || 0, // Parse formatted strings from API
                            amount_paid: parseFormattedNumber(rawData.amount_paid) || 0, // Parse formatted strings from API
                            weight_on_delivery: parseFormattedNumber(rawData.weight_on_delivery) || 0, // Parse formatted strings from API
                            pricePerKg: parseFormattedNumber(rawData.price_per_kg) || 0,
                            amountPaid: parseFormattedNumber(rawData.amount_paid) || 0,
                            paidBy: rawData.paid_by || 'N/A',
                            date: rawData.date_of_delivery || rawData.date,
                            date_of_delivery: rawData.date_of_delivery || rawData.date,
                            coffee_type: rawData.coffee_type || 'Coffee',
                        };

                        console.log('[AggregationScreen] Prepared voucherData:', JSON.stringify(voucherData, null, 2));
                        onNavigate('PaymentVoucher', {
                            harvestData: voucherData,
                            source: 'Aggregation' // Indicate where voucher was generated from
                        });
                    }}
                    styles={styles}
                />
            );
        }
    };
    
    // --- Screen Layout ---
    const handleBackPress = () => {
        // If in form or detail view, go back to table view
        if (viewMode === 'form' || viewMode === 'detail') {
            setViewMode('table');
        } else {
            // Otherwise, go back to previous screen
            navigation.goBack();
        }
    };

    return (
        <View style={styles.screen}>
            <SimpleHeader
                title="External Harvest Records"
                onBackPress={handleBackPress}
                unsyncedCount={unsyncedCount}
                onSync={handleSyncRecords}
                isSyncing={isSyncing}
            />

            {/* Main content container - BottomNav will sit below this */}
            <View style={{ flex: 1 }}>
            {/* FIXED: KeyboardAvoidingView wraps entire scrollable content - optimized for Android */}
            <KeyboardAvoidingView
                style={styles.container}
                behavior="height"
                enabled={Platform.OS === 'android'}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                >
                
                {/* Tab Navigation - Always visible */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'farmers' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('farmers');
                            resetForms();
                            setSelectedFarmer(null);
                            setViewMode('table'); // Go to records view
                        }}>
                        <Text style={[styles.tabText, activeTab === 'farmers' && styles.activeTabText]}>Farmer Registry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'harvests' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('harvests');
                            resetForms();
                            setViewMode('table'); // Go to records view
                        }}>
                        <Text style={[styles.tabText, activeTab === 'harvests' && styles.activeTabText]}>Farmer Harvests</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                <View style={styles.contentWrapper}>
                    {loading && viewMode !== 'table' && viewMode !== 'detail' && <ActivityIndicator size="large" color={DARK_BROWN} />}

                    {viewMode === 'form' && renderFormContent()}

                    {viewMode === 'table' && renderTableContent()}
                </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals and Overlays */}

            </View>

            {/* BottomNav now part of layout, not floating */}
            <BottomNav onNavigate={onNavigate} active="Aggregation" />

            {/* Custom Alert Modal */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
            />

            {/* Harvest Action Menu */}
            <HarvestActionMenu
                visible={actionMenuVisible}
                onClose={() => {
                    setActionMenuVisible(false);
                    setSelectedHarvestForAction(null);
                }}
                harvestId={selectedHarvestForAction?.harvest_id || selectedHarvestForAction?.id}
                harvestData={selectedHarvestForAction}
                navigation={navigation}
            />
        </View>
    );
};

// ===============================================
// === STYLES - NOW IMPORTED ===
// ===============================================
// Styles moved to ../styles/aggregationStyles.js and imported at the top

export default AggregationScreen;

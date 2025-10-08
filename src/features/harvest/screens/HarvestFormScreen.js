import React, { useState, useEffect } from "react";
import CoffeeColors from '../../../theme/colors';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert, // NOTE: We are using Alert for simplicity, but for production, a custom modal is better
    ScrollView,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
// Import services - CHANGED: Using DatabaseService instead of AsyncStorage
import DatabaseService from "../../../services/DatabaseService";
import SyncService from "../../../services/SyncService";
// Import shared components
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav'; 

/**
 * Utility function to format date for API (YYYY-MM-DD string).
 * @param {Date} d - The JavaScript Date object.
 * @returns {string} Date string in YYYY-MM-DD format.
 */
function formatDateForApi(d) {
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${mon}-${day}`;
}

/**
 * Utility function to format date for local display (DD-MM-YYYY string).
 * @param {Date} d - The JavaScript Date object.
 * @returns {string} Date string in DD-MM-YYYY format.
 */
function formatDateForDisplay(d) {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear(); 
    return `${day}-${mon}-${year}`;
}

function generateHarvestId(date) {
    // format: PA + DDMMYY + H (example: PA120825H)
    const d = date;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `PA${dd}${mm}${yy}H`;
}

const BLOCK_OPTIONS = ["Block A-1", "Block B-2", "Block C-3"];
const GRADE_OPTIONS = ["Grade 1", "Grade 2", "Grade 3"];
const CHERRY_COLORS = ["Red", "Green"];

// Updated to accept onNavigate, aligning with App.js router
export default function HarvestFormScreen({ onNavigate }) { 
    // form state
    const [grade, setGrade] = useState(GRADE_OPTIONS[0]);
    const [weight, setWeight] = useState("");
    const [block, setBlock] = useState(BLOCK_OPTIONS[0]);
    const [cherryColor, setCherryColor] = useState(CHERRY_COLORS[0]);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [name, setName] = useState("");
    const [amountPaid, setAmountPaid] = useState("");
    const [generatedId, setGeneratedId] = useState(generateHarvestId(new Date()));
    const [isSaving, setIsSaving] = useState(false); // Loading state

    // updating generated id when date changes
    useEffect(() => {
        setGeneratedId(generateHarvestId(date));
    }, [date]);

    // simple validation
    const validate = () => {
        if (!grade) return "Please select grade";
        if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) return "Enter valid weight (> 0)";
        if (!block) return "Block is required";
        if (!cherryColor) return "Cherry color is required";
        if (!date) return "Date is required";
        if (!name.trim()) return "Enter recorder name";
        if (amountPaid === "" || isNaN(Number(amountPaid)) || Number(amountPaid) < 0)
            return "Enter valid amount paid (>= 0)";
        return null;
    };

    const handleSubmit = async () => {
        if (isSaving) return;

        const err = validate();
        if (err) {
            Alert.alert("Validation Error", err);
            return;
        }

        setIsSaving(true);

        try {
            // CRITICAL: Save to local database FIRST (offline-first pattern)
            const harvestData = {
                farmer_name: name.trim(),
                harvest_date: formatDateForApi(date),
                weight: Number(weight),
                quality: grade,
                notes: `Block: ${block}, Cherry: ${cherryColor}, Amount Paid: ${amountPaid}`,
                synced: 0  // Will be marked as 1 after successful sync
            };

            console.log('[HarvestForm] Saving to local database...', harvestData);
            const localId = await DatabaseService.insert('harvests', harvestData);
            console.log('[HarvestForm] Saved locally with ID:', localId);

            // Try to sync immediately to cloud (silent fail if offline)
            try {
                console.log('[HarvestForm] Attempting immediate sync...');
                const synced = await SyncService.syncImmediately('harvests', localId);

                if (synced) {
                    Alert.alert("Success", "Harvest saved and synced to cloud!");
                } else {
                    Alert.alert("Saved Locally", "Harvest saved. Will sync when online.");
                }
            } catch (syncError) {
                // Silent fail for sync - data is safe in local DB
                console.log('[HarvestForm] Sync failed (offline?), staying in queue:', syncError.message);
                Alert.alert("Saved Locally", "Harvest saved. Will sync when online.");
            }

            // Reset form
            setWeight("");
            setAmountPaid("");
            setName("");
            setDate(new Date());
            setGrade(GRADE_OPTIONS[0]);
            setBlock(BLOCK_OPTIONS[0]);
            setCherryColor(CHERRY_COLORS[0]);

            // Navigate back to summary
            if (onNavigate) {
                onNavigate('Harvests');
            }
        } catch (error) {
            console.error('[HarvestForm] Local save failed:', error);
            Alert.alert("Error", "Failed to save harvest. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const openDatePicker = () => setShowDatePicker(true);
    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) setDate(selectedDate);
    };

    // A small placeholder view to navigate back to the summary screen
    const BackButton = () => (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onNavigate('Harvests')}>
            <Text style={styles.secondaryBtnText}>Back to Harvest Summary</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <Header title="Harvest Form" onNavigate={onNavigate} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.heading}>Harvest Recording (Block Champion)</Text>

                <Text style={styles.label}>Grade</Text>
                <View style={styles.pickerWrap}>
                    <Picker selectedValue={grade} onValueChange={(v) => setGrade(v)}>
                        {GRADE_OPTIONS.map((g) => (
                            <Picker.Item key={g} label={g} value={g} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={(t) => setWeight(t.replace(",", "."))}
                    placeholder="e.g. 12.5"
                />

                <Text style={styles.label}>Block (pre-assigned)</Text>
                <View style={styles.pickerWrap}>
                    <Picker selectedValue={block} onValueChange={(v) => setBlock(v)}>
                        {BLOCK_OPTIONS.map((b) => (
                            <Picker.Item key={b} label={b} value={b} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Cherry colour</Text>
                <View style={styles.pickerWrap}>
                    <Picker selectedValue={cherryColor} onValueChange={(v) => setCherryColor(v)}>
                        {CHERRY_COLORS.map((c) => (
                            <Picker.Item key={c} label={c} value={c} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={openDatePicker} accessibilityLabel="Select date">
                    <Ionicons name="calendar-outline" size={18} />
                    <Text style={{ marginLeft: 8 }}>{formatDateForDisplay(date)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}

                <Text style={styles.label}>Recorder name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Name of recorder"
                    autoCapitalize="words"
                />

                <Text style={styles.label}>Amount Paid (UGX)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={amountPaid}
                    onChangeText={(t) => setAmountPaid(t.replace(",", "."))}
                    placeholder="e.g. 5000"
                />

                <Text style={styles.label}>Generated ID (Local)</Text>
                <View style={[styles.input, { justifyContent: "center" }]}>
                    <Text>{generatedId}</Text>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                    {isSaving ? (
                        <Text style={styles.saveBtnText}>Saving...</Text>
                    ) : (
                        <Text style={styles.saveBtnText}>Save Harvest (Offline Ready)</Text>
                    )}
                </TouchableOpacity>

                    <BackButton />

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
            <BottomNav activeScreen="Harvests" onNavigate={onNavigate} />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: CoffeeColors.LIGHT_GRAY, 
    },
    heading: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 12,
        color: CoffeeColors.DARK_BROWN, 
    },
    label: {
        marginTop: 12,
        marginBottom: 6,
        fontWeight: "600",
        color: CoffeeColors.MEDIUM_BROWN, 
    },
    input: {
        backgroundColor: CoffeeColors.WHITE, 
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN, 
    },
    pickerWrap: {
        backgroundColor: CoffeeColors.WHITE, 
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN, 
    },
    dateButton: {
        backgroundColor: CoffeeColors.WHITE, 
        padding: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN, 
    },
    saveBtn: {
        marginTop: 18,
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    saveBtnText: {
        color: CoffeeColors.CREAM, 
        fontWeight: "700",
    },
    secondaryBtn: {
        marginTop: 12,
        alignItems: "center",
        padding: 10,
    },
    secondaryBtnText: {
        color: CoffeeColors.MEDIUM_BROWN, 
        textDecorationLine: "underline",
    },
});






// // src/features/harvest/screens/HarvestFormScreen.js
// import React, { useState, useEffect } from "react";
// import CoffeeColors from '../../../theme/colors';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   Platform,
//   KeyboardAvoidingView,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import { Ionicons } from "@expo/vector-icons";
// import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Re-added AsyncStorage
// // Import the API service function
// import { postHarvestRecord } from "../../../services/harvestRecord";

// /**
//  * Harvest form screen
//  * Fields:
//  * - Grade (picker)
//  * - Weight (numeric)
//  * - Block (picker; pre-assigned list we can change)
//  * - Cherry colour (picker)
//  * - Date (date picker)
//  * - Name (text)
//  * - Amount_Paid (numeric)
//  * - Id (auto-generated, readonly) -> format: PA + DDMMYY + H  (example: PA120825H)
//  */

// const BLOCK_OPTIONS = ["Block A-1", "Block B-2", "Block C-3"]; // I shall replace with real blocks or fetch from API
// const GRADE_OPTIONS = ["Grade 1", "Grade 2", "Grade 3"];
// const CHERRY_COLORS = ["Red", "Green"];

// // Key for the local queue of unsynced records
// const SYNC_QUEUE_KEY = "harvests_sync_queue";

// function formatDateForDisplay(d) {
//   const day = String(d.getDate()).padStart(2, "0");
//   const mon = String(d.getMonth() + 1).padStart(2, "0");
//   const year = d.getFullYear(); 
//   return `${day}-${mon}-${year}`;
// }

// function generateHarvestId(date) {
//   // date is a JS Date object
//   // produce string like PA120825H (DDMMYY with prefix PA and suffix H)
//   const d = date;
//   const dd = String(d.getDate()).padStart(2, "0");
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const yy = String(d.getFullYear()).slice(-2);
//   return `PA${dd}${mm}${yy}H`;
// }

// export default function HarvestFormScreen({ route, navigation }) {
//   // form state
//   const [grade, setGrade] = useState(GRADE_OPTIONS[0]);
//   const [weight, setWeight] = useState("");
//   const [block, setBlock] = useState(BLOCK_OPTIONS[0]);
//   const [cherryColor, setCherryColor] = useState(CHERRY_COLORS[0]);
//   const [date, setDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [name, setName] = useState("");
//   const [amountPaid, setAmountPaid] = useState("");
//   const [generatedId, setGeneratedId] = useState(generateHarvestId(new Date()));
//   const [isSaving, setIsSaving] = useState(false); // Loading state

//   // updating generated id when date changes
//   useEffect(() => {
//     setGeneratedId(generateHarvestId(date));
//   }, [date]);

  
//   // simple validation
//   const validate = () => {
//     if (!grade) return "Please select grade";
//     if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) return "Enter valid weight (> 0)";
//     if (!block) return "Block is required";
//     if (!cherryColor) return "Cherry color is required";
//     if (!date) return "Date is required";
//     if (!name.trim()) return "Enter recorder name";
//     if (amountPaid === "" || isNaN(Number(amountPaid)) || Number(amountPaid) < 0)
//       return "Enter valid amount paid (>= 0)";
//     return null;
//   };

//   /**
//    * Saves the harvest object to the local synchronization queue.
//    * @param {object} harvestObject - The complete harvest record payload.
//    * @returns {boolean} True if local save was successful.
//    */
//   const saveToSyncQueue = async (harvestObject) => {
//     try {
//       const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
//       const currentQueue = raw ? JSON.parse(raw) : [];
//       currentQueue.push(harvestObject);
//       await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(currentQueue));
//       return true;
//     } catch (err) {
//       console.error("Failed to save to sync queue:", err);
//       return false;
//     }
//   };


//   const handleSubmit = async () => {
//     if (isSaving) return;

//     const err = validate();
//     if (err) {
//       Alert.alert("Validation Error", err);
//       return;
//     }

//     setIsSaving(true);

//     // 1. Build the payload with all UI fields
//     const payload = {
//       id: generatedId,
//       grade, 
//       weight: Number(weight),
//       block, 
//       cherryColor, 
//       date: date, // Keep as Date object for utility functions
//       dateReadable: formatDateForDisplay(date), // Readable date for local display
//       name: name.trim(), 
//       amountPaid: Number(amountPaid), 
//       isSynced: false, // Flag for offline status
//     };

//     // 2. Local Save (Critical for Offline Functionality)
//     const isLocalSaveSuccessful = await saveToSyncQueue(payload);

//     if (!isLocalSaveSuccessful) {
//       Alert.alert("Local Error", "Data capture failed. Could not save harvest locally.");
//       setIsSaving(false);
//       return;
//     }

//     // 3. Attempt Remote Sync
//     let remoteSuccess = false;
//     try {
//         const response = await postHarvestRecord(payload);

//         if (response.success) {
//             // Success: Notify the user and refresh UI.
//             const harvestId = response.remoteData.cherry_color || payload.id;
//             Alert.alert("Success & Synced", `Harvest record saved remotely. Record ID: ${harvestId}`);
            
//             // NOTE: A proper sync mechanism would now remove this record from the local queue.
//             // For now, we'll just confirm success. The summary screen will handle the sync cleanup.

//             remoteSuccess = true;
//         } else {
//             // Failure: Assume offline or temporary API error. Notify user that it's locally saved.
//             const msg = response.status === 0 ? "You appear to be offline. " : "API encountered an error. ";
//             Alert.alert("Offline Mode", `${msg}The harvest has been saved locally and will sync when you go online.`);
//         }
//     } catch(e) {
//         // Network error (definitely offline)
//         Alert.alert("Offline Mode", "No internet connection detected. The harvest has been saved locally and will sync when you go online.");
//     }


//     // 4. Reset Form
//     setWeight("");
//     setAmountPaid("");
//     setName("");
//     setDate(new Date());
//     setGrade(GRADE_OPTIONS[0]);
//     setBlock(BLOCK_OPTIONS[0]);
//     setCherryColor(CHERRY_COLORS[0]);
//     setIsSaving(false);
    
//     // Refresh the list if navigation object is available (assuming summary screen exists)
//     if (navigation?.navigate) {
//         // This is a simple way to tell the list screen to reload
//         navigation.navigate('HarvestSummary', { shouldRefresh: true }); 
//     }
//   };

//   const openDatePicker = () => setShowDatePicker(true);
//   const onDateChange = (event, selectedDate) => {
//     setShowDatePicker(Platform.OS === "ios"); // on Android the picker closes automatically; on iOS we keep it open if needed
//     if (selectedDate) setDate(selectedDate);
//   };

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1 }}
//       behavior={Platform.select({ ios: "padding", android: undefined })}
//     >
//       <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
//         <Text style={styles.heading}>Harvest Recording (Block Champion)</Text>

//         <Text style={styles.label}>Grade</Text>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={grade} onValueChange={(v) => setGrade(v)}>
//             {GRADE_OPTIONS.map((g) => (
//               <Picker.Item key={g} label={g} value={g} />
//             ))}
//           </Picker>
//         </View>

//         <Text style={styles.label}>Weight (kg)</Text>
//         <TextInput
//           style={styles.input}
//           keyboardType="numeric"
//           value={weight}
//           onChangeText={(t) => setWeight(t.replace(",", "."))}
//           placeholder="e.g. 12.5"
//         />

//         <Text style={styles.label}>Block (pre-assigned)</Text>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={block} onValueChange={(v) => setBlock(v)}>
//             {BLOCK_OPTIONS.map((b) => (
//               <Picker.Item key={b} label={b} value={b} />
//             ))}
//           </Picker>
//         </View>

//         <Text style={styles.label}>Cherry colour</Text>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={cherryColor} onValueChange={(v) => setCherryColor(v)}>
//             {CHERRY_COLORS.map((c) => (
//               <Picker.Item key={c} label={c} value={c} />
//             ))}
//           </Picker>
//         </View>

//         <Text style={styles.label}>Date</Text>
//         <TouchableOpacity style={styles.dateButton} onPress={openDatePicker} accessibilityLabel="Select date">
//           <Ionicons name="calendar-outline" size={18} />
//           <Text style={{ marginLeft: 8 }}>{formatDateForDisplay(date)}</Text>
//         </TouchableOpacity>
//         {showDatePicker && (
//           <DateTimePicker
//             value={date}
//             mode="date"
//             display={Platform.OS === "ios" ? "spinner" : "default"}
//             onChange={onDateChange}
//             maximumDate={new Date()}
//           />
//         )}

//         <Text style={styles.label}>Recorder name</Text>
//         <TextInput
//           style={styles.input}
//           value={name}
//           onChangeText={setName}
//           placeholder="Name of recorder"
//           autoCapitalize="words"
//         />

//         <Text style={styles.label}>Amount Paid (UGX)</Text>
//         <TextInput
//           style={styles.input}
//           keyboardType="numeric"
//           value={amountPaid}
//           onChangeText={(t) => setAmountPaid(t.replace(",", "."))}
//           placeholder="e.g. 5000"
//         />

//         <Text style={styles.label}>Generated ID</Text>
//         <View style={[styles.input, { justifyContent: "center" }]}>
//           <Text>{generatedId}</Text>
//         </View>

//         <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
//           {isSaving ? (
//             <Text style={styles.saveBtnText}>Saving...</Text>
//           ) : (
//             <Text style={styles.saveBtnText}>Save Harvest (Offline Ready)</Text>
//           )}
//         </TouchableOpacity>

//         <View style={{ height: 60 }} />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }


// const styles = StyleSheet.create({
//   container: {
//     padding: 16,
//     paddingBottom: 32,
//     backgroundColor: CoffeeColors.LIGHT_GRAY, 
//   },
//   heading: {
//     fontSize: 20,
//     fontWeight: "700",
//     marginBottom: 12,
//     color: CoffeeColors.DARK_BROWN, 
//   },
//   label: {
//     marginTop: 12,
//     marginBottom: 6,
//     fontWeight: "600",
//     color: CoffeeColors.MEDIUM_BROWN, 
//   },
//   input: {
//     backgroundColor: CoffeeColors.WHITE, 
//     paddingHorizontal: 12,
//     paddingVertical: Platform.OS === "ios" ? 12 : 8,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN, 
//   },
//   pickerWrap: {
//     backgroundColor: CoffeeColors.WHITE, 
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN, 
//   },
//   dateButton: {
//     backgroundColor: CoffeeColors.WHITE, 
//     padding: 12,
//     borderRadius: 8,
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN, 
//   },
//   saveBtn: {
//     marginTop: 18,
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     padding: 14,
//     borderRadius: 8,
//     alignItems: "center",
//   },
//   saveBtnText: {
//     color: CoffeeColors.CREAM, 
//     fontWeight: "700",
//   },
//   secondaryBtn: {
//     marginTop: 12,
//     alignItems: "center",
//     padding: 10,
//   },
//   secondaryBtnText: {
//     color: CoffeeColors.MEDIUM_BROWN, 
//     textDecorationLine: "underline",
//   },
// });

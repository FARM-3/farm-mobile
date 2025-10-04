// src/features/harvest/screens/HarvestFormScreen.js
import React, { useState, useEffect } from "react";
import CoffeeColors from '../../../theme/colors';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

/**
 * Harvest form screen
 * Fields:
 * - Grade (picker)
 * - Weight (numeric)
 * - Block (picker; pre-assigned list we can change)
 * - Cherry colour (picker)
 * - Date (date picker)
 * - Name (text)
 * - Amount_Paid (numeric)
 * - Id (auto-generated, readonly) -> format: PA + DDMMYY + H  (example: PA120825H)
 */

const BLOCK_OPTIONS = ["Block A-1", "Block B-2", "Block C-3"]; // I shall replace with real blocks or fetch from API
const GRADE_OPTIONS = ["Grade 1", "Grade 2", "Grade 3"];
const CHERRY_COLORS = ["Red", "Green"];

const STORAGE_KEY = "harvests_list_v1";

function formatDateForDisplay(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear(); 
  return `${day}-${mon}-${year}`;
}

function generateHarvestId(date) {
  // date is a JS Date object
  // produce string like PA120825H (DDMMYY with prefix PA and suffix H)
  const d = date;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `PA${dd}${mm}${yy}H`;
}

export default function HarvestFormScreen({ route, navigation }) {
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

  // update generated id when date changes
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
  // save to AsyncStorage
  const saveToLocal = async (harvestObject) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : [];
      current.push(harvestObject);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return true;
    } catch (err) {
      console.error("Failed to save harvest:", err);
      return false;
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Validation", err);
      return;
    }

    const payload = {
      id: generatedId,
      grade,
      weight: Number(weight),
      block,
      cherryColor,
      date: date.toISOString(),
      dateReadable: formatDateForDisplay(date),
      name: name.trim(),
      amountPaid: Number(amountPaid),
      createdAt: new Date().toISOString(),
    };

    // Save locally (AsyncStorage
    const ok = await saveToLocal(payload);
    if (ok) {
      Alert.alert("Saved", `Harvest saved with id ${payload.id}`);
      // reset form (optional)
      setWeight("");
      setAmountPaid("");
      setName("");
      setDate(new Date());
      setGrade(GRADE_OPTIONS[0]);
      setBlock(BLOCK_OPTIONS[0]);
      setCherryColor(CHERRY_COLORS[0]);
    } else {
      Alert.alert("Error", "Could not save harvest locally.");
    }

    // OPTIONAL: If we have an API to post to, it will be done here
    // try {
    //   await fetch("https://your-api.example/harvests", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload),
    //   });
    // } catch(e) { console.warn("Remote save failed:", e) }
  };

  const openDatePicker = () => setShowDatePicker(true);
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios"); // on Android the picker closes automatically; on iOS keep it open if needed
    if (selectedDate) setDate(selectedDate);
  };

  // helper to quickly inspect saved records (for debugging)
  const debugShowSaved = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      Alert.alert("Saved harvests count", String(arr.length));
      console.log("Saved harvests:", arr);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
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

        <Text style={styles.label}>Generated ID</Text>
        <View style={[styles.input, { justifyContent: "center" }]}>
          <Text>{generatedId}</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
          <Text style={styles.saveBtnText}>Save Harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={debugShowSaved}>
          <Text style={styles.secondaryBtnText}>Show saved count (debug)</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     padding: 16,
//     paddingBottom: 32,
//     backgroundColor: "#F7F7F8",
//   },
//   heading: {
//     fontSize: 20,
//     fontWeight: "700",
//     marginBottom: 12,
//     color: "#222",
//   },
//   label: {
//     marginTop: 12,
//     marginBottom: 6,
//     fontWeight: "600",
//     color: "#333",
//   },
//   input: {
//     backgroundColor: "#fff",
//     paddingHorizontal: 12,
//     paddingVertical: Platform.OS === "ios" ? 12 : 8,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#E6E6E6",
//   },
//   pickerWrap: {
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#E6E6E6",
//   },
//   dateButton: {
//     backgroundColor: "#fff",
//     padding: 12,
//     borderRadius: 8,
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#E6E6E6",
//   },
//   saveBtn: {
//     marginTop: 18,
//     backgroundColor: "#2E7D32",
//     padding: 14,
//     borderRadius: 8,
//     alignItems: "center",
//   },
//   saveBtnText: {
//     color: "#fff",
//     fontWeight: "700",
//   },
//   secondaryBtn: {
//     marginTop: 12,
//     alignItems: "center",
//     padding: 10,
//   },
//   secondaryBtnText: {
//     color: "#2E7D32",
//     textDecorationLine: "underline",
//   },
// });






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
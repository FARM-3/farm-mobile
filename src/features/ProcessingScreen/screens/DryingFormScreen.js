// src/features/ProcessingScreen/screens/DryingFormScreen.js

import React, { useState, useEffect, useCallback } from "react";
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
    ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';
import CustomPicker from '../../../components/CustomPicker';
import { getUnsyncedDryingRecords } from '../../../services/dryingService';

const SYNC_QUEUE_KEY = "drying_records_sync_queue";

// Utility Functions
function formatDateForApi(d) {
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${mon}-${day}`;
}

function formatDateForDisplay(d) {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${mon}-${year}`;
}

// Generate lot_id based on ISO week
function generateLotId(date = new Date()) {
    const iso_week = getISOWeek(date);
    return `W${String(iso_week).padStart(2, '0')}`;
}

function getISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNum = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// Weather options
const WEATHER_OPTIONS = [
    { id: 'sunny', name: 'Sunny' },
    { id: 'cloudy', name: 'Cloudy' },
    { id: 'drizzle', name: 'Drizzle' },
    { id: 'rainy', name: 'Rainy' },
];

// Processing type options (for when entering a new processing_id)
const PROCESSING_TYPE_OPTIONS = [
    { id: 'natural_sundried', name: 'Natural Sundried' },
    { id: 'washed', name: 'Washed' },
    { id: 'fermented', name: 'Fermented' },
];

// Form Component
export default function DryingFormScreen({ navigation, route = {} }) {
    const [formData, setFormData] = useState({
        // User inputs
        processing_id: '',
        lot_id: '',
        date: new Date(),
        weather_condition: WEATHER_OPTIONS[0].id,
        moisture_content: '',
        weight: '',
        moisture_before: '',
        weight_before: '',

        // Calculated fields (will be computed)
        processing_type: '',
        type_of_coffee: '',
        days: null,
        moisture_deviation: 0,
        rate_of_drying: 0,
        rate_of_weightloss: 0,
        outturn: 0,
        outturn_deviation: 0,

        // UI state
        showDatePicker: false,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState(null);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    // Auto-generate lot_id when date changes
    useEffect(() => {
        if (formData.date) {
            const lotId = generateLotId(formData.date);
            setFormData(prev => ({ ...prev, lot_id: lotId }));
        }
    }, [formData.date]);

    // Calculate all fields whenever relevant inputs change
    useEffect(() => {
        calculateFields();
    }, [
        formData.moisture_content,
        formData.weight,
        formData.moisture_before,
        formData.weight_before,
        formData.processing_id,
        formData.lot_id,
        formData.date
    ]);

    const calculateFields = async () => {
        const moistureContent = Number(formData.moisture_content) || 0;
        const weight = Number(formData.weight) || 0;
        const moistureBefore = Number(formData.moisture_before) || 0;
        const weightBefore = Number(formData.weight_before) || 0;

        // 1. Moisture Deviation (Ideal is 12%)
        const moistureDeviation = moistureContent - 12;

        // 2. Rate of Drying (moisture_before - moisture_content)
        const rateOfDrying = moistureBefore ? moistureBefore - moistureContent : 0;

        // 3. Rate of Weight Loss (weight_before - weight)
        const rateOfWeightloss = weightBefore && weight ? weightBefore - weight : 0;

        // 4. Outturn calculation (needs first day weight)
        let outturn = 0;
        let outturnDeviation = 0;

        if (formData.processing_id) {
            // Get first entry for this processing_id
            const { records } = await getUnsyncedDryingRecords();
            const firstEntry = records
                .filter(r => r.processing_id === formData.processing_id)
                .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

            if (firstEntry && firstEntry.weight && weight) {
                const firstWeight = Number(firstEntry.weight);
                outturn = ((firstWeight - weight) / firstWeight) * 100;
            }
        } else if (formData.lot_id) {
            // Get all entries for this lot
            const { records } = await getUnsyncedDryingRecords();
            const lotEntries = records
                .filter(r => r.lot_id === formData.lot_id)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (lotEntries.length > 0) {
                const firstDate = lotEntries[0].date;
                const firstDayEntries = lotEntries.filter(r => r.date === firstDate);
                const totalFirstWeight = firstDayEntries.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

                if (totalFirstWeight && weight) {
                    outturn = ((totalFirstWeight - weight) / totalFirstWeight) * 100;
                }
            }
        }

        // Outturn Deviation (Target is 60%)
        outturnDeviation = outturn - 60;

        // 5. Days calculation
        let days = null;
        if (formData.processing_id) {
            // Would need first entry date for processing_id
            // For simplicity, set to null or calculate from first entry
            const { records } = await getUnsyncedDryingRecords();
            const firstEntry = records
                .filter(r => r.processing_id === formData.processing_id)
                .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

            if (firstEntry) {
                const firstDate = new Date(firstEntry.date);
                const currentDate = new Date(formData.date);
                days = Math.floor((currentDate - firstDate) / (1000 * 60 * 60 * 24));
            }
        } else if (formData.lot_id) {
            // Days since Monday of this week
            const currentDate = new Date(formData.date);
            const dayOfWeek = currentDate.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            days = daysFromMonday;
        }

        setFormData(prev => ({
            ...prev,
            moisture_deviation: moistureDeviation,
            rate_of_drying: rateOfDrying,
            rate_of_weightloss: rateOfWeightloss,
            outturn: outturn,
            outturn_deviation: outturnDeviation,
            days: days
        }));
    };

    const updateField = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    const onDateChange = (event, selectedDate) => {
        updateField('showDatePicker', Platform.OS === "ios");
        if (selectedDate) {
            updateField('date', selectedDate);
        }
    };

    const validateForm = () => {
        // Required fields
        if (!formData.moisture_content || Number(formData.moisture_content) <= 0) {
            return "Moisture content is required and must be greater than 0.";
        }

        if (Number(formData.moisture_content) > 100) {
            return "Moisture content cannot exceed 100%.";
        }

        // Either processing_id or lot_id must be provided (but not both)
        if (!formData.processing_id && !formData.lot_id) {
            return "Please provide either a Processing ID or select a Lot ID.";
        }

        return null;
    };

    const handleSubmit = async () => {
        if (isSaving) return;

        const validationError = validateForm();
        if (validationError) {
            setAlertConfig({
                title: "Validation Error",
                message: validationError,
                type: 'warning',
                buttons: [
                    {
                        text: "OK",
                        onPress: () => setAlertVisible(false)
                    }
                ]
            });
            setAlertVisible(true);
            return;
        }

        setIsSaving(true);

        try {
            const dryingData = {
                id: formData.id || Date.now().toString(),
                processing_id: formData.processing_id || null,
                lot_id: formData.lot_id,
                date: formatDateForApi(formData.date),
                weather_condition: formData.weather_condition,
                moisture_content: Number(formData.moisture_content),
                weight: formData.weight ? Number(formData.weight) : null,
                moisture_before: formData.moisture_before ? Number(formData.moisture_before) : null,
                weight_before: formData.weight_before ? Number(formData.weight_before) : null,
                processing_type: formData.processing_type,
                type_of_coffee: formData.type_of_coffee,
                days: formData.days,
                moisture_deviation: formData.moisture_deviation,
                rate_of_drying: formData.rate_of_drying,
                rate_of_weightloss: formData.rate_of_weightloss,
                outturn: formData.outturn,
                outturn_deviation: formData.outturn_deviation,
                synced: false,
            };

            // Save to local storage
            const { records: currentRecords } = await getUnsyncedDryingRecords();
            const updatedRecords = [...currentRecords, dryingData];
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

            console.log('[DryingForm] Saved to local storage:', dryingData);

            // Reset form
            setFormData({
                processing_id: '',
                lot_id: '',
                date: new Date(),
                weather_condition: WEATHER_OPTIONS[0].id,
                moisture_content: '',
                weight: '',
                moisture_before: '',
                weight_before: '',
                processing_type: '',
                type_of_coffee: '',
                days: null,
                moisture_deviation: 0,
                rate_of_drying: 0,
                rate_of_weightloss: 0,
                outturn: 0,
                outturn_deviation: 0,
                showDatePicker: false,
            });

            setAlertConfig({
                title: "Success!",
                message: "Drying record saved successfully. It will sync when online.",
                type: 'success',
                buttons: [
                    {
                        text: "Add Another",
                        onPress: () => setAlertVisible(false)
                    },
                    {
                        text: "View Records",
                        onPress: () => {
                            setAlertVisible(false);
                            navigation.navigate('DryingSummary');
                        }
                    }
                ]
            });
            setAlertVisible(true);

        } catch (error) {
            console.error('[DryingForm] Save failed:', error);
            setAlertConfig({
                title: "Error",
                message: "Failed to save drying record. Please try again.",
                type: 'error',
                buttons: [
                    {
                        text: "OK",
                        onPress: () => setAlertVisible(false)
                    }
                ]
            });
            setAlertVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title="New Drying Entry" />
            <View style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.select({ ios: "padding", android: undefined })}
                >
                    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                        <Text style={styles.mainTitle}>Drying Record Form</Text>

                        {/* Basic Information */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Basic Information</Text>

                            <Text style={styles.label}>Date *</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => updateField('showDatePicker', true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color={CoffeeColors.DARK_BROWN} />
                                <Text style={{ marginLeft: 10, fontSize: 16, color: CoffeeColors.DARK_BROWN }}>
                                    {formatDateForDisplay(formData.date)}
                                </Text>
                            </TouchableOpacity>

                            {formData.showDatePicker && (
                                <DateTimePicker
                                    value={formData.date}
                                    mode="date"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                />
                            )}

                            <Text style={styles.label}>Lot ID (Auto-generated)</Text>
                            <View style={[styles.input, { justifyContent: "center", backgroundColor: CoffeeColors.VERY_LIGHT_BROWN }]}>
                                <Text style={{ color: CoffeeColors.MEDIUM_BROWN, fontWeight: 'bold' }}>
                                    {formData.lot_id}
                                </Text>
                            </View>

                            <Text style={styles.label}>Processing ID (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.processing_id}
                                onChangeText={(t) => updateField('processing_id', t)}
                                placeholder="e.g. FERM-20250114-001"
                            />
                            <Text style={styles.helperText}>
                                Leave blank if continuing from previous week's lot
                            </Text>

                            <CustomPicker
                                label="Weather Condition"
                                selectedValue={formData.weather_condition}
                                onValueChange={(val) => updateField('weather_condition', val)}
                                items={WEATHER_OPTIONS}
                            />
                        </View>

                        {/* Measurements */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Measurements</Text>

                            <Text style={styles.label}>Moisture Content (%) *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.moisture_content}
                                onChangeText={(t) => updateField('moisture_content', t.replace(",", "."))}
                                placeholder="e.g. 15.5"
                            />

                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.weight}
                                onChangeText={(t) => updateField('weight', t.replace(",", "."))}
                                placeholder="e.g. 98.5"
                            />

                            <Text style={styles.label}>Moisture Before (%)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.moisture_before}
                                onChangeText={(t) => updateField('moisture_before', t.replace(",", "."))}
                                placeholder="Previous day's moisture"
                            />

                            <Text style={styles.label}>Weight Before (kg)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.weight_before}
                                onChangeText={(t) => updateField('weight_before', t.replace(",", "."))}
                                placeholder="Previous day's weight"
                            />
                        </View>

                        {/* Calculated Metrics (Read-only) */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Calculated Metrics</Text>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Moisture Deviation:</Text>
                                <Text style={styles.metricValue}>{formData.moisture_deviation.toFixed(2)}%</Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Rate of Drying:</Text>
                                <Text style={styles.metricValue}>{formData.rate_of_drying.toFixed(2)}%</Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Rate of Weight Loss:</Text>
                                <Text style={styles.metricValue}>{formData.rate_of_weightloss.toFixed(2)} kg</Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Outturn:</Text>
                                <Text style={styles.metricValue}>{formData.outturn.toFixed(2)}%</Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Outturn Deviation:</Text>
                                <Text style={styles.metricValue}>{formData.outturn_deviation.toFixed(2)}%</Text>
                            </View>

                            {formData.days !== null && (
                                <View style={styles.metricRow}>
                                    <Text style={styles.metricLabel}>Days:</Text>
                                    <Text style={styles.metricValue}>{formData.days}</Text>
                                </View>
                            )}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={'#fff'} />
                            ) : (
                                <Text style={styles.submitButtonText}>Save Drying Record</Text>
                            )}
                        </TouchableOpacity>

                        {/* View Records Button */}
                        <TouchableOpacity
                            style={styles.viewRecordsButton}
                            onPress={() => navigation.navigate('DryingSummary')}
                        >
                            <Ionicons name="list" size={18} color={CoffeeColors.PRIMARY_BROWN} style={{ marginRight: 6 }} />
                            <Text style={styles.viewRecordsButtonText}>View Drying Records</Text>
                        </TouchableOpacity>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
            <BottomNav activeScreen="Processing" />

            <CustomAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: "800",
        fontFamily: Fonts.bold,
        marginBottom: 20,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
    },
    section: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    heading: {
        fontSize: 18,
        fontWeight: "700",
        fontFamily: Fonts.bold,
        marginBottom: 15,
        color: CoffeeColors.MEDIUM_BROWN,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_BROWN,
        paddingBottom: 5,
    },
    label: {
        marginTop: 15,
        marginBottom: 8,
        fontWeight: "600",
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        fontSize: 16,
    },
    helperText: {
        marginTop: 4,
        fontSize: 12,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: CoffeeColors.WHITE,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === "ios" ? 14 : 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        fontSize: 16,
    },
    dateButton: {
        backgroundColor: CoffeeColors.WHITE,
        padding: 15,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        justifyContent: 'flex-start',
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.semiBold,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 10,
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        marginTop: 20,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontFamily: Fonts.bold,
        fontSize: 17,
    },
    viewRecordsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        borderWidth: 1,
        borderColor: CoffeeColors.PRIMARY_BROWN,
        marginTop: 10,
    },
    viewRecordsButtonText: {
        color: CoffeeColors.PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        marginLeft: 6,
    },
});

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// Utilities and Theme Imports
import CoffeeColors from '../../../theme/colors';
// IMPORTING THE NEW API FUNCTIONS
import { initializeAuth, generateRecordId, fetchFarmers, submitFarmer, fetchHarvests, submitHarvest } from '../../../utils/firebaseSetup'; 

// --- CONSTANTS ---
const GRADES = ['A', 'B', 'C', 'D'];
const CHERRY_COLORS = ['Red', 'Yellow', 'Green'];
const STAGES = ['dried', 'fresh_cherry'];

// --- COMPONENTS ---
const CustomInput = ({ label, value, onChangeText, keyboardType = 'default', editable = true }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
            style={[styles.textInput, !editable && styles.textInputDisabled]}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor={CoffeeColors.GRAY_TEXT}
            editable={editable}
        />
    </View>
);

const CustomPicker = ({ label, selectedValue, onValueChange, items }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.pickerContainer}>
            <Picker
                selectedValue={selectedValue}
                onValueChange={onValueChange}
                style={styles.picker}
                itemStyle={{ color: CoffeeColors.DARK_BROWN, fontSize: 16 }}
            >
                {items && items.length > 0 ? (
                    items.map((item) => (
                        <Picker.Item key={item} label={item} value={item} />
                    ))
                ) : (
                    <Picker.Item label={`-- No ${label} available --`} value="" />
                )}
            </Picker>
        </View>
    </View>
);

const SuccessMessage = ({ message, onExit, onView }) => (
    <View style={styles.overlay}>
        <View style={styles.modal}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalMessage}>{message}</Text>
            
            <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: CoffeeColors.MEDIUM_BROWN }]} onPress={onView}>
                    <Text style={styles.modalButtonText}>View Records</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: CoffeeColors.LIGHT_GRAY, borderWidth: 1, borderColor: CoffeeColors.GRAY_TEXT }]} onPress={onExit}>
                    <Text style={[styles.modalButtonText, { color: CoffeeColors.GRAY_TEXT }]}>Continue Recording</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

const RecordsTable = ({ records, title, onExit, fields }) => {
    const sortedRecords = useMemo(() => 
        [...records].sort((a, b) => (b.timestamp || b.id) - (a.timestamp || a.id)), 
        [records]
    );

    return (
        <View style={styles.recordsContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title} Records</Text>
                <TouchableOpacity onPress={onExit} style={styles.exitButton}>
                    <Ionicons name="close-circle-outline" size={30} color={CoffeeColors.CREAM} />
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.tableScroll}>
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRow}>
                        {fields.map(field => (
                            <Text key={field.key} style={[styles.tableHeader, { width: field.width || '25%' }]}>
                                {field.label}
                            </Text>
                        ))}
                    </View>
                    {/* Table Rows */}
                    {sortedRecords.length === 0 ? (
                        <Text style={styles.noRecords}>No records found.</Text>
                    ) : (
                        sortedRecords.map((record, index) => (
                            <View key={record.id || index} style={[styles.tableRow, index % 2 && styles.tableRowAlt]}>
                                {fields.map(field => (
                                    <Text 
                                        key={`${record.id}-${field.key}`} 
                                        style={[styles.tableCell, { width: field.width || '25%' }]}
                                    >
                                        {record[field.key]}
                                    </Text>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
};


// --- MAIN AGGREGATION SCREEN ---

const AggregationScreen = ({ onNavigate }) => {
    // App State
    const [activeTab, setActiveTab] = useState('farmers'); 
    const [viewMode, setViewMode] = useState('form'); 
    const [successMessage, setSuccessMessage] = useState('');
    const [farmersList, setFarmersList] = useState([]);
    const [harvestsList, setHarvestsList] = useState([]);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form States
    const [farmerForm, setFarmerForm] = useState({ name: '', location: '', trees: '', contact: '' });
    const [harvestForm, setHarvestForm] = useState({
        farmerName: '', 
        weightOnDelivery: '',
        weightAfterFloating: '',
        grade: GRADES[0],
        cherryColour: CHERRY_COLORS[0],
        stage: STAGES[0],
        amountPaid: '',
        whoPaid: '',
        date: new Date().toISOString().slice(0, 10),
    });

    // API Data Fetching (Replaces Real-time Firestore Listener)
    const loadRecords = async () => {
        setLoading(true);
        try {
            const fetchedFarmers = await fetchFarmers();
            setFarmersList(fetchedFarmers);
            
            const fetchedHarvests = await fetchHarvests();
            setHarvestsList(fetchedHarvests); 
        } catch (error) {
            console.error("Failed to load all records from Django:", error);
            Alert.alert("API Error", "Could not load data from the Django server. Check the API_BASE_URL.");
        } finally {
            setLoading(false);
        }
    };

    // Initial Auth & Data Load
    useEffect(() => {
        const init = async () => {
            const id = await initializeAuth(); 
            if (id) {
                setUserId(id);
            }
            await loadRecords(); // Initial data load
        };
        init();
    }, []); 

    // --- FORM SUBMISSION LOGIC ---
    const isSubmittingRef = useRef(false);

    const resetForms = () => {
        setFarmerForm({ name: '', location: '', trees: '', contact: '' });
        setHarvestForm(p => ({
            ...p,
            farmerName: farmersList[0]?.name || '',
            weightOnDelivery: '',
            weightAfterFloating: '',
            amountPaid: '',
            whoPaid: '',
            date: new Date().toISOString().slice(0, 10),
        }));
    };

    const handleFarmerSubmit = async () => {
        if (!farmerForm.name || !farmerForm.contact || !userId) {
            Alert.alert("Validation", "Please fill in Name and Contact.");
            return;
        }

        // Prevent double submissions (fast double-tap or remounts)
        if (isSubmittingRef.current) {
            console.log('Submission already in progress, ignoring duplicate submit');
            return;
        }
        isSubmittingRef.current = true;

        setLoading(true);
        const newRecordId = generateRecordId('FD');
        // NOTE: Omit client-side id to avoid server conflicts; backend typically assigns PKs
        const farmerRecord = {
            name: farmerForm.name,
            location: farmerForm.location,
            num_trees: parseInt(farmerForm.trees) || 0, // Snake_case for Django
            contact: farmerForm.contact,
            recorder_id: userId, // Provide recorder id expected by backend
            timestamp: Date.now(),
        };
        console.log(" Farmer JSON about to be sent:", JSON.stringify(farmerRecord, null, 2));

        try {
            await submitFarmer(farmerRecord);

            setSuccessMessage(`Farmer '${farmerForm.name}' recorded successfully! ID: ${newRecordId}`);
            setViewMode('success');
            resetForms();
            await loadRecords(); // Refresh data from API
        } catch (e) {
            console.error("Error adding farmer:", e);
            // Show the raw message and suggest checking server logs
            Alert.alert("Submission Failed", e.message || "Failed to save farmer details. Check server logs for a 500 error.");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleHarvestSubmit = async () => {
        if (!harvestForm.farmerName || !harvestForm.weightOnDelivery || !userId) {
            Alert.alert("Validation", "Please fill in Farmer's Name and Weight on Delivery.");
            return;
        }

        setLoading(true);
        const newRecordId = generateRecordId('PA');
        const harvestRecord = {
            id: newRecordId,
            farmer_name: harvestForm.farmerName,
            weight_on_delivery: parseFloat(harvestForm.weightOnDelivery) || 0,
            weight_after_floating: parseFloat(harvestForm.weightAfterFloating) || 0,
            date_of_delivery: harvestForm.date,
            grade: harvestForm.grade,
            cherry_colour: harvestForm.cherryColour,
            stage: harvestForm.stage,
            amount_paid: parseFloat(harvestForm.amountPaid) || 0,
            who_paid: harvestForm.whoPaid,
            recorder_id: userId,
            timestamp: Date.now(),
        };

        try {
            await submitHarvest(harvestRecord);

            setSuccessMessage(`Harvest for '${harvestForm.farmerName}' recorded successfully! ID: ${newRecordId}`);
            setViewMode('success');
            resetForms();
            await loadRecords(); // Refresh data from API
        } catch (e) {
            console.error("Error adding harvest:", e);
            Alert.alert("Submission Failed", e.message || "Failed to save harvest details.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER CONTENT BASED ON MODE ---

    const renderFormContent = () => {
        if (activeTab === 'farmers') {
            return (
                <View style={styles.formSection}>
                    <Text style={styles.formTitle}>Farmer's Details</Text>
                    <CustomInput label="Name" value={farmerForm.name} onChangeText={(name) => setFarmerForm(p => ({ ...p, name }))} />
                    <CustomInput label="Location" value={farmerForm.location} onChangeText={(location) => setFarmerForm(p => ({ ...p, location }))} />
                    <CustomInput label="Number of Trees" value={farmerForm.trees} onChangeText={(trees) => setFarmerForm(p => ({ ...p, trees }))} keyboardType="numeric" />
                    <CustomInput label="Contact" value={farmerForm.contact} onChangeText={(contact) => setFarmerForm(p => ({ ...p, contact }))} keyboardType="phone-pad" />
                    
                    <TouchableOpacity style={styles.submitButton} onPress={handleFarmerSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color={CoffeeColors.WHITE} /> : <Text style={styles.submitButtonText}>Submit Farmer Details</Text>}
                    </TouchableOpacity>
                </View>
            );
        } else {
            const availableFarmers = farmersList.map(f => f.name);

            return (
                <View style={styles.formSection}>
                    <Text style={styles.formTitle}>Farmer's Harvest Details</Text>

                    {availableFarmers.length > 0 ? (
                        <CustomPicker 
                            label="Farmer's Name" 
                            selectedValue={harvestForm.farmerName || availableFarmers[0]} 
                            onValueChange={(name) => setHarvestForm(p => ({ ...p, farmerName: name }))} 
                            items={availableFarmers} 
                        />
                    ) : (
                        <Text style={styles.noFarmersWarning}>No farmers registered. Please register a farmer first.</Text>
                    )}

                    <CustomInput label="Weight on Delivery (kg)" value={harvestForm.weightOnDelivery} onChangeText={(v) => setHarvestForm(p => ({ ...p, weightOnDelivery: v }))} keyboardType="numeric" />
                    <CustomInput label="Weight after Floating (kg)" value={harvestForm.weightAfterFloating} onChangeText={(v) => setHarvestForm(p => ({ ...p, weightAfterFloating: v }))} keyboardType="numeric" />
                    <CustomInput label="Date of Delivery (YYYY-MM-DD)" value={harvestForm.date} onChangeText={(v) => setHarvestForm(p => ({ ...p, date: v }))} />

                    <CustomPicker label="Grade" selectedValue={harvestForm.grade} onValueChange={(v) => setHarvestForm(p => ({ ...p, grade: v }))} items={GRADES} />
                    <CustomPicker label="Cherry Colour" selectedValue={harvestForm.cherryColour} onValueChange={(v) => setHarvestForm(p => ({ ...p, cherryColour: v }))} items={CHERRY_COLORS} />
                    <CustomPicker label="Stage" selectedValue={harvestForm.stage} onValueChange={(v) => setHarvestForm(p => ({ ...p, stage: v }))} items={STAGES} />

                    <CustomInput label="Amount Paid" value={harvestForm.amountPaid} onChangeText={(v) => setHarvestForm(p => ({ ...p, amountPaid: v }))} keyboardType="numeric" />
                    <CustomInput label="Who Paid" value={harvestForm.whoPaid} onChangeText={(v) => setHarvestForm(p => ({ ...p, whoPaid: v }))} />

                    <TouchableOpacity 
                        style={[styles.submitButton, {opacity: availableFarmers.length === 0 || loading ? 0.5 : 1}]} 
                        onPress={handleHarvestSubmit} 
                        disabled={availableFarmers.length === 0 || loading}
                    >
                        {loading ? <ActivityIndicator color={CoffeeColors.WHITE} /> : <Text style={styles.submitButtonText}>Submit Harvest Details</Text>}
                    </TouchableOpacity>
                </View>
            );
        }
    };

    if (loading && viewMode === 'form') {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading data from Django...</Text>
            </View>
        );
    }
    
    // Determine the current view to render
    let mainContent;
    
    if (viewMode === 'success') {
        mainContent = (
            <SuccessMessage
                message={successMessage}
                onExit={() => setViewMode('form')}
                onView={() => setViewMode('table')}
            />
        );
    } else if (viewMode === 'table') {
        const tableFields = activeTab === 'farmers' 
            ? [
                { key: 'id', label: 'ID', width: '25%' },
                { key: 'name', label: 'Name', width: '35%' },
                { key: 'num_trees', label: 'Trees', width: '20%' },
                { key: 'location', label: 'location', width: '35%' }, // Assumes Django returns snake_case
                { key: 'contact', label: 'Contact', width: '20%' },
              ]
            : [
                { key: 'id', label: 'ID', width: '20%' },
                { key: 'farmer_name', label: 'Farmer', width: '25%' }, // Assumes Django returns snake_case
                { key: 'weight_on_delivery', label: 'Wgt (kg)', width: '15%' }, // Assumes Django returns snake_case
                { key: 'grade', label: 'Grade', width: '10%' },
                { key: 'amount_paid', label: 'Paid', width: '15%' }, // Assumes Django returns snake_case
                { key: 'date_of_delivery', label: 'Date', width: '15%' }, // Assumes Django returns snake_case
              ];

        mainContent = (
            <RecordsTable 
                records={activeTab === 'farmers' ? farmersList : harvestsList}
                title={activeTab === 'farmers' ? "Farmer Details" : "Farmer's Harvest"}
                onExit={() => setViewMode('form')}
                fields={tableFields}
            />
        );
    } else {
        // Default to Form View
        mainContent = <ScrollView contentContainerStyle={styles.scrollContent}>{renderFormContent()}</ScrollView>;
    }


    return (
        <View style={styles.container}>
            {/* Header displaying User ID */}
                    <View style={styles.header}>
                        {/* Back to Dashboard */}
                        <TouchableOpacity onPress={() => onNavigate && onNavigate('Dashboard')} style={{ paddingRight: 12 }}>
                            <Ionicons name="arrow-back" size={24} color={CoffeeColors.CREAM} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Record Aggregation</Text>
                        <Text style={styles.userIdText}>Recorder ID: {userId ? userId.slice(0, 15) + '...' : 'N/A'}</Text>
                    </View>
            
            <View style={styles.contentArea}>
                        {/* Add a small back button above the content as a fallback */}
                        <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
                            <TouchableOpacity onPress={() => onNavigate && onNavigate('Dashboard')} style={{ padding: 8 }}>
                                <Text style={{ color: CoffeeColors.CREAM }}>Back to Dashboard</Text>
                            </TouchableOpacity>
                        </View>
                        {mainContent}
            </View>

            {/* Bottom Navigation Bar */}
            <View style={styles.bottomNavBar}>
                <TouchableOpacity 
                    style={[styles.navItem, activeTab === 'farmers' && styles.activeNavItem]} 
                    onPress={() => { console.log('Nav: Farmers pressed'); setActiveTab('farmers'); setViewMode('form'); }}
                >
                    <Ionicons 
                        name="person-add-outline" 
                        size={24} 
                        color={activeTab === 'farmers' ? CoffeeColors.CREAM : CoffeeColors.MEDIUM_BROWN} 
                    />
                    <Text style={[styles.navText, activeTab === 'farmers' && styles.activeNavText]}>Farmers Details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.navItem, activeTab === 'harvests' && styles.activeNavItem]} 
                    onPress={() => { console.log("Nav: Harvests pressed"); setActiveTab('harvests'); setViewMode('form'); }}
                >
                    <Ionicons 
                        name="leaf-outline" 
                        size={24} 
                        color={activeTab === 'harvests' ? CoffeeColors.CREAM : CoffeeColors.MEDIUM_BROWN} 
                    />
                    <Text style={[styles.navText, activeTab === 'harvests' && styles.activeNavText]}>Farmer's Harvest</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: CoffeeColors.DARK_BROWN,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: CoffeeColors.DARK_BROWN,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: CoffeeColors.WHITE,
    },
    userIdText: {
        fontSize: 12,
        color: CoffeeColors.LIGHT_BROWN,
    },
    contentArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100, // Space for the floating nav bar
    },
    formSection: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 15,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.MEDIUM_BROWN,
        marginBottom: 5,
    },
    textInput: {
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
    },
    textInputDisabled: {
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: CoffeeColors.CREAM,
    },
    picker: {
        height: 50,
        width: '100%',
        color: CoffeeColors.DARK_BROWN,
    },
    noFarmersWarning: {
        color: '#FF6347',
        textAlign: 'center',
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 15,
    },
    submitButton: {
        backgroundColor: '#d1580dff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: CoffeeColors.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },

    // --- Modal/Success Styles ---
    overlay: {
        ...StyleSheet.absoluteFillObject,
        // backgroundColor: '#7c7c3c',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    modal: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 15,
        padding: 30,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 10,
    },
    modalMessage: {
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
        marginVertical: 15,
    },
    modalActions: {
        width: '100%',
        marginTop: 15,
    },
    modalButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 5,
    },
    modalButtonText: {
        color: CoffeeColors.WHITE,
        fontSize: 16,
        fontWeight: '600',
    },

    // --- Table/Records Styles ---
    recordsContainer: {
        flex: 1,
    },
    tableScroll: {
        flex: 1,
        paddingHorizontal: 20,
    },
    table: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 100,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    tableRowAlt: {
        backgroundColor: CoffeeColors.CREAM + '40', // Slightly transparent cream
    },
    tableHeader: {
        fontWeight: 'bold',
        fontSize: 12,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    tableCell: {
        fontSize: 12,
        color: CoffeeColors.GRAY_TEXT,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    noRecords: {
        padding: 20,
        textAlign: 'center',
        color: CoffeeColors.GRAY_TEXT,
    },
    exitButton: {
        padding: 5,
    },

    // --- Nav Bar Styles ---
    bottomNavBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: CoffeeColors.DARK_BROWN,
        borderTopWidth: 1,
        borderTopColor: CoffeeColors.LIGHT_BROWN,
        paddingVertical: 15,
        paddingBottom: 30, // Extra padding for safety on modern devices
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 20,
        zIndex: 50,
    },
    navItem: {
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
    },
    activeNavItem: {
        backgroundColor: CoffeeColors.MEDIUM_BROWN, // Highlight active tab
    },
    navText: {
        fontSize: 10,
        color: CoffeeColors.LIGHT_BROWN,
        marginTop: 4,
        fontWeight: '600',
    },
    activeNavText: {
        color: CoffeeColors.CREAM,
    }
});

export default AggregationScreen;

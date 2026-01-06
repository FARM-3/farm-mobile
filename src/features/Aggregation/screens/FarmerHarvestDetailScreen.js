// ===============================================
// === FARMER HARVEST DETAIL SCREEN ===
// ===============================================
// Extracted from AggregationScreen.js
// Mobile-friendly detail screen for viewing harvest information

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import styles from '../styles/aggregationStyles';
import { getStaffById } from '../../../services/staffService';

const DARK_BROWN = CoffeeColors.DARK_BROWN;

/**
 * FarmerHarvestDetailScreen - Mobile-friendly detail screen for viewing harvest information
 * Displays all harvest data organized in logical sections with proper labels
 */
const FarmerHarvestDetailScreen = ({ route, navigation }) => {
    const { harvest, farmersList } = route.params;

    // Helper function to get staff name from ID using staff service
    const [staffNameCache, setStaffNameCache] = useState({});

    useEffect(() => {
        const fetchStaffNames = async () => {
            if (harvest?.paid_by && !staffNameCache[harvest.paid_by]) {
                try {
                    const staff = await getStaffById(harvest.paid_by);
                    if (staff) {
                        setStaffNameCache(prev => ({
                            ...prev,
                            [harvest.paid_by]: staff.displayName || staff.firstName + ' ' + staff.lastName || 'Unknown Staff'
                        }));
                    }
                } catch (error) {
                    console.error('[FarmerHarvestDetailScreen] Error fetching staff name:', error);
                }
            }
        };
        fetchStaffNames();
    }, [harvest?.paid_by, staffNameCache]);

    const getStaffNameById = (staffId) => {
        if (!staffId) return 'Not provided';
        // Check cache first
        if (staffNameCache[staffId]) {
            return staffNameCache[staffId];
        }
        // Fallback to showing the ID if not in cache yet
        return 'Loading...';
    };

    if (!harvest) {
        return (
            <View style={styles.detailViewContainer}>
                <Text style={styles.noRecords}>No harvest data available</Text>
            </View>
        );
    }

    // Helper to format field values properly
    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided';
        return String(value);
    };

    // Lookup farmer details from farmersList using the harvest.name field (which contains farmer's full name)
    const harvestFarmerName = harvest.name || harvest.farmer_uid;
    let farmerDetails = null;
    let farmerUID = null;
    if (harvestFarmerName && Array.isArray(farmersList)) {
        // Try multiple lookup strategies
        farmerDetails = farmersList.find(f => {
            // Construct full name from farmer record
            const farmerFullName = `${f.first_name || ''} ${f.last_name || ''}`.trim();

            return (
                String(f.farmer_id) === String(harvestFarmerName) ||
                String(f.uid) === String(harvestFarmerName) ||
                String(f.id) === String(harvestFarmerName) ||
                String(f.name) === String(harvestFarmerName) ||
                farmerFullName === String(harvestFarmerName)  // Match by full name
            );
        });

        // Set farmerUID to the actual farmer_id from the matched farmer record
        if (farmerDetails) {
            farmerUID = farmerDetails.farmer_id || farmerDetails.uid || farmerDetails.id;
        }

        // Log for debugging
        if (!farmerDetails) {
            console.warn('[FarmerHarvestDetailScreen] Farmer not found for name:', harvestFarmerName);
            console.log('[FarmerHarvestDetailScreen] Available farmers:', farmersList.map(f => ({
                farmer_id: f.farmer_id,
                full_name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                uid: f.uid,
                id: f.id
            })));
        }
    }

    const farmerDisplayName = farmerDetails
        ? `${farmerDetails.first_name || ''} ${farmerDetails.last_name || ''}`.trim()
        : 'Unknown Farmer';

    // Field sections for organized display
    // Only display fields that are actually in the harvest form
    // Match exact field names from the API response
    const sections = [
        {
            title: 'Farmer Information',
            fields: [
                { label: 'Farmer Name', value: farmerDisplayName || harvest.name },
                { label: 'Farmer ID', value: farmerUID || harvest.farmer_uid },
                { label: 'Contact', value: farmerDetails?.contact || 'Not available' },
                { label: 'District', value: farmerDetails?.district || 'Not available' },
            ]
        },
        {
            title: 'Harvest Details',
            fields: [
                { label: 'Harvest ID', value: formatValue(harvest.harvest_id || harvest.id || harvest.code) },
                { label: 'Date of Delivery', value: formatValue(harvest.date_of_delivery) },
                { label: 'Weight on Delivery', value: harvest.weight_on_delivery ? `${harvest.weight_on_delivery} kg` : 'Not provided' },
                { label: 'Location on Delivery', value: formatValue(harvest.location_of_delivery || harvest.location_on_delivery) },
                { label: 'GPS Coordinates', value: harvest.gps_coordinates_delivery || harvest.gps_coordinates || 'Not captured' },
            ]
        },
        {
            title: 'Coffee Information',
            fields: [
                { label: 'Coffee Type', value: harvest.coffee_type || 'Not provided' },
            ]
        },
        {
            title: 'Payment Information',
            fields: [
                { label: 'Price per kg', value: harvest.price_per_kg ? `UGX ${Number(harvest.price_per_kg).toLocaleString()}` : 'Not provided' },
                { label: 'Amount Paid', value: harvest.amount_paid ? `UGX ${Number(harvest.amount_paid).toLocaleString()}` : 'Not provided' },
                { label: 'Paid By', value: getStaffNameById(harvest.paid_by) },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            {/* Header with back button */}
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Harvest Details</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scrollable content */}
            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                {/* Harvest ID Card */}
                <View style={styles.detailNameCard}>
                    <Text style={styles.detailFarmerName}>
                        {farmerDisplayName}
                    </Text>
                    <Text style={styles.detailFarmerId}>
                        Harvest ID: {harvest.id || harvest.harvest_id || 'N/A'}
                    </Text>
                </View>

                {/* Information Sections */}
                {sections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>{section.title}</Text>
                        {section.fields.map((field, fieldIndex) => (
                            <View key={fieldIndex} style={styles.detailFieldRow}>
                                <Text style={styles.detailFieldLabel}>{field.label}:</Text>
                                <Text style={styles.detailFieldValue}>{formatValue(field.value)}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

export default FarmerHarvestDetailScreen;

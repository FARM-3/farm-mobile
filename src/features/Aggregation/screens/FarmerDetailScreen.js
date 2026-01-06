// ===============================================
// === FARMER DETAIL SCREEN ===
// ===============================================
// Extracted from AggregationScreen.js
// Mobile-friendly detail screen for viewing farmer information

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import styles from '../styles/aggregationStyles';

const DARK_BROWN = CoffeeColors.DARK_BROWN;

/**
 * FarmerDetailScreen - Mobile-friendly detail screen for viewing farmer information
 * Displays all farmer data organized in logical sections with proper labels
 */
const FarmerDetailScreen = ({ route, navigation }) => {
    const { farmer } = route.params;

    if (!farmer) {
        return (
            <View style={styles.detailViewContainer}>
                <Text style={styles.noRecords}>No farmer data available</Text>
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

    // Field sections for organized display
    const sections = [
        {
            title: 'Personal Information',
            fields: [
                { label: 'Full Name', value: `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() },
                { label: 'Farmer ID', value: farmer.farmer_id || farmer.uid || farmer.id },
                { label: 'Gender', value: farmer.gender },
                { label: 'Date of Birth', value: farmer.date_of_birth },
                { label: 'NIN', value: farmer.nin },
                { label: 'Contact', value: farmer.contact },
                { label: 'Email', value: farmer.email },
            ]
        },
        {
            title: 'Location Details',
            fields: [
                { label: 'District', value: farmer.district },
                { label: 'Sub-county', value: farmer.sub_county },
                { label: 'Parish', value: farmer.parish },
                { label: 'Village', value: farmer.village },
                { label: 'GPS Coordinates', value: farmer.gps_coordinates || farmer.gps },
                { label: 'Nearest Landmark', value: farmer.nearest_landmark },
            ]
        },
        {
            title: 'Farm Information',
            fields: [
                { label: 'Coffee Variety', value: farmer.coffee_variety },
                { label: 'Number of Trees', value: farmer.number_of_trees },
                { label: 'Owns All Trees', value: farmer.ownership_of_trees },
                { label: 'Date Planted', value: farmer.planted_date },
                { label: 'Spacing Between Trees', value: farmer.spacing_between_trees || farmer.spacing },
                { label: 'Land Ownership', value: farmer.land_ownership },
                { label: 'Started Farming Year', value: farmer.started_coffee_farming_year },
            ]
        },
        {
            title: 'Seedling Information',
            fields: [
                { label: 'Source of Seedlings', value: farmer.source_of_seedlings || farmer.seedling_source },
                { label: 'Type of Seedlings', value: farmer.type_of_seedlings || farmer.seedling_type },
                { label: 'Age of Seedlings', value: farmer.age_of_seedlings },
            ]
        },
        {
            title: 'Farming Practices',
            fields: [
                { label: 'Standard Practices', value: farmer.standard_practices },
                { label: 'Irrigation Source', value: farmer.irrigation_source || farmer.irrigation },
                { label: 'Fertilizers Used', value: farmer.fertilizers },
                { label: 'Pesticides Used', value: farmer.pesticide || farmer.pesticides },
                { label: 'Deforestation Status', value: farmer.defforestation_status || farmer.deforested },
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
                <Text style={styles.detailHeaderTitle}>Farmer Details</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scrollable content */}
            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                {/* Farmer Name Card */}
                <View style={styles.detailNameCard}>
                    <Text style={styles.detailFarmerName}>
                        {`${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || 'Unnamed Farmer'}
                    </Text>
                    <Text style={styles.detailFarmerId}>
                        ID: {farmer.farmer_id || farmer.uid || farmer.id || 'N/A'}
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

export default FarmerDetailScreen;

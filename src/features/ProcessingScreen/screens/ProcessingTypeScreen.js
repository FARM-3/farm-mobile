// src/features/ProcessingScreen/screens/ProcessingTypeScreen.js
// Main hub screen for processing types (Fermenting, Washing, Natural Sundrying)

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';

export default function ProcessingTypeScreen({ navigation }) {
    const processingTypes = [
        {
            id: 'fermenting',
            title: 'Fermenting',
            description: 'Manage coffee fermenting processes',
            icon: 'water',
            color: CoffeeColors.MEDIUM_BROWN,
            route: 'FermentingSummary'
        },
        {
            id: 'washing',
            title: 'Washing',
            description: 'Manage coffee washing processes',
            icon: 'water-outline',
            color: CoffeeColors.ACCENT,
            route: 'WashingSummary'
        },
        {
            id: 'natural-sundrying',
            title: 'Natural Sundrying',
            description: 'Manage natural sundrying processes',
            icon: 'sunny',
            color: '#FF9800',
            route: 'NaturalSundryingSummary'
        }
    ];

    const renderProcessingCard = (type) => (
        <TouchableOpacity
            key={type.id}
            style={[styles.card, { borderLeftColor: type.color }]}
            onPress={() => navigation.navigate(type.route)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon} size={40} color={type.color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{type.title}</Text>
                <Text style={styles.cardDescription}>{type.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={CoffeeColors.MEDIUM_BROWN} />
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title="Coffee Processing" />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.headerSection}>
                    <Text style={styles.mainTitle}>Processing Types</Text>
                    <Text style={styles.subtitle}>
                        Select a processing type to view or add records
                    </Text>
                </View>

                <View style={styles.cardsContainer}>
                    {processingTypes.map(renderProcessingCard)}
                </View>

                <View style={styles.infoSection}>
                    <Ionicons name="information-circle" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                    <Text style={styles.infoText}>
                        All processing records are linked to Quality Control (Floating) grades
                    </Text>
                </View>
            </ScrollView>
            <BottomNav activeScreen="Processing" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    headerSection: {
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '800',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
    },
    cardsContainer: {
        gap: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 5,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.regular,
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        padding: 12,
        borderRadius: 8,
        marginTop: 24,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
    },
});

// ===============================================
// === AGGREGATION SCREEN STYLES ===
// ===============================================
// Extracted from AggregationScreen.js for better organization
// All styles for Aggregation feature screens

import { StyleSheet } from 'react-native';
import Fonts from '../../../theme/fonts';
import CoffeeColors from '../../../theme/colors';

const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const LIGHT_BROWN = CoffeeColors.LIGHT_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;
const CREAM_BG = CoffeeColors.CREAM;
const LIGHT_GRAY_BG = CoffeeColors.LIGHT_GRAY;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const TEXT_DARK = CoffeeColors.DARK_BROWN;
const TEXT_GRAY = CoffeeColors.GRAY_TEXT;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: LIGHT_GRAY_BG,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    contentWrapper: {
        flex: 1, // FIXED: Takes remaining space after tabs/header
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 100, // Make room for BottomNav
    },
    // --- Tabs ---
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 10,
        padding: 5,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: PRIMARY_BROWN,
    },
    tabText: {
        color: DARK_BROWN,
        fontWeight: '500',
        fontFamily: Fonts.regular,
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '700',
        fontFamily: Fonts.semiBold,
    },
    // --- Forms ---
    formSection: {
        flex: 1, // FIXED: Allow form to take available height
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        elevation: 3,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        maxHeight: '100%', // Prevent overflow on small screens
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 14,
        color: DARK_BROWN,
        marginBottom: 5,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    textInput: {
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    readOnlyInput: {
        backgroundColor: LIGHT_GRAY_BG,
        color: TEXT_GRAY,
    },
    errorInput: {
        borderColor: '#d32f2f',
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 12,
        marginTop: 4,
        fontFamily: Fonts.regular,
    },
    helperText: {
        fontSize: 12,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        fontStyle: 'italic',
        marginTop: 4,
        marginBottom: 10,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    pickerButtonText: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 1,
    },
    picker: {
        height: 50,
        width: '100%',
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        display: 'none',
    },
    pickerItem: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    // Custom Modal Picker Styles
    pickerModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPickerContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: '60%',
        width: '80%',
        maxWidth: 400,
        elevation: 8,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    modalPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    modalPickerTitle: {
        fontSize: 16,
        fontWeight: Fonts.weights.bold,
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    modalPickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: VERY_LIGHT_BROWN,
    },
    modalPickerItemSelected: {
        backgroundColor: '#fef5f0',
    },
    modalPickerItemText: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 1,
    },
    modalPickerItemTextSelected: {
        fontWeight: Fonts.weights.semiBold,
        fontFamily: Fonts.semiBold,
        color: PRIMARY_BROWN,
    },
    stepFormScroll: {
        // REMOVED fixed maxHeight to allow proper scrolling on all screen sizes
        // The form will now flex properly within the available space
        flex: 1, // Take remaining space in the KeyboardAvoidingView
    },
    stepFormContent: {
        // Content container for ScrollView - adds padding for last items
        paddingRight: 10,
        paddingBottom: 20, // Extra space at bottom so last field is visible when keyboard appears
    },
    // Date Picker Button
    datePickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
    },
    datePickerText: {
        fontSize: 16,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    // Multi-Select Button
    multiSelectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
    },
    multiSelectText: {
        fontSize: 16,
        color: DARK_BROWN,
        flex: 1,
        fontFamily: Fonts.regular,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    multiSelectModal: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
    },
    multiSelectScroll: {
        paddingVertical: 10,
        maxHeight: 300,
    },
    multiSelectItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_GRAY_BG,
    },
    multiSelectItemText: {
        fontSize: 16,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    checkbox: {
        height: 24,
        width: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: PRIMARY_BROWN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: PRIMARY_BROWN,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    // --- Step Indicator ---
    stepIndicatorContainer: {
        marginBottom: 24,
        paddingVertical: 12,
    },
    stepCirclesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    stepItemWrapper: {
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: VERY_LIGHT_BROWN,
        borderWidth: 2,
        borderColor: LIGHT_BROWN,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepCircleActive: {
        backgroundColor: PRIMARY_BROWN,
        borderColor: PRIMARY_BROWN,
    },
    stepCircleCompleted: {
        backgroundColor: PRIMARY_BROWN,
        borderColor: PRIMARY_BROWN,
    },
    stepCircleText: {
        fontSize: 16,
        fontWeight: Fonts.weights.bold,
        color: LIGHT_BROWN,
        fontFamily: Fonts.bold,
    },
    stepCircleTextActive: {
        color: '#fff',
    },
    stepConnector: {
        position: 'absolute',
        top: 20,
        left: '25.5%',
        width: '100%',
        height: 2,
        backgroundColor: VERY_LIGHT_BROWN,
        marginLeft: '50%',
        zIndex: 0,
    },
    stepConnectorActive: {
        backgroundColor: PRIMARY_BROWN,
    },
    // --- Step Connector for 2-step forms (Harvest) ---
    stepConnectorTwoStep: {
        position: 'absolute',
        top: 20,
        left: '63%',
        width: '90%',
        height: 2,
        backgroundColor: VERY_LIGHT_BROWN,
        zIndex: 0,
    },
    stepConnectorTwoStepActive: {
        backgroundColor: PRIMARY_BROWN,
    },
    stepLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 8,
    },
    stepLabelWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: Fonts.weights.semiBold,
        color: LIGHT_BROWN,
        textAlign: 'center',
        fontFamily: Fonts.semiBold,
        flexWrap: 'wrap',
        maxWidth: 70,
    },
    stepLabelActive: {
        color: PRIMARY_BROWN,
        fontWeight: Fonts.weights.bold,
        fontFamily: Fonts.bold,
    },
    // --- Step Navigation ---
    stepNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 5,
        gap: 12,
    },
    stepButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    stepButtonText: {
        color: PRIMARY_BROWN,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    prevButtonIcon: {
        marginRight: 8,
    },
    nextButtonIcon: {
        marginLeft: 8,
    },
    nextButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        backgroundColor: PRIMARY_BROWN,
        marginHorizontal: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    // --- Step Navigation Container & Save Draft ---
    stepNavContainer: {
        width: '100%',
        marginTop: 20,
        paddingHorizontal: 5,
        gap: 12,
    },
    saveDraftButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: VERY_LIGHT_BROWN,
        borderWidth: 1,
        borderColor: PRIMARY_BROWN,
    },
    saveDraftButtonText: {
        color: PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        marginLeft: 6,
    },
    generateButton: {
        marginTop: 5,
        marginBottom: 10,
        padding: 12,
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    generateButtonText: {
        color: PRIMARY_BROWN,
        fontWeight: '600',
        fontSize: 12,
        fontFamily: Fonts.semiBold,
        textAlign: 'center',
        lineHeight: 18,
    },
    generateButtonSubtext: {
        color: PRIMARY_BROWN,
        fontWeight: '400',
        fontSize: 11,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        lineHeight: 16,
    },
    viewRecordsButton: {
        padding: 10,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: DARK_BROWN,
    },
    viewRecordsButtonText: {
        color: DARK_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    // --- Modal/Success ---
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    modal: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        marginBottom: 20,
    },
    modalActions: {
        width: '100%',
    },
    modalButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    // --- Data List (Replaces Table) ---
    recordsContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 3,
    },
    tableHeaderSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_GRAY_BG,
    },
    tableTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 10,
    },
    backToFormText: {
        color: PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        marginTop: 5,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    dataListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: PRIMARY_BROWN,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dataListItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    dataListItemUID: {
        fontSize: 14,
        fontWeight: '500',
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
    },
    harvestIdButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 4,
    },
    dataListItemSubtitle: {
        fontSize: 13,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    // --- Draft Styles ---
    draftListItem: {
        backgroundColor: 'rgba(255, 193, 7, 0.05)', // Subtle yellow background for draft items
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107', // Amber/yellow color for draft indicator
    },
    draftBadge: {
        backgroundColor: '#FFC107',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginLeft: 4,
    },
    draftBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    draftStepText: {
        fontSize: 12,
        color: '#FF9800',
        fontFamily: Fonts.regular,
        marginTop: 4,
        fontStyle: 'italic',
    },
    // --- Pending (Submitted but Unsynced) Styles ---
    pendingListItem: {
        backgroundColor: CoffeeColors.WHITE,
        borderLeftWidth: 4,
        borderLeftColor: LIGHT_BROWN, // Light brown for pending records (matching Harvest styling)
    },
    syncStatusInline: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    syncStatusText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        marginLeft: 4,
    },
    noRecords: {
        textAlign: 'center',
        padding: 20,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
    },
    // --- Search Container ---
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchButton: {
        backgroundColor: PRIMARY_BROWN,
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -15, // Align with input field (accounts for label spacing)
        elevation: 2,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    // --- Action Button ---
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    recordCount: {
        fontSize: 14,
        color: TEXT_GRAY,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    // --- Farmer Detail View ---
    detailViewContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: PRIMARY_BROWN,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 20,
    },
    detailHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        fontFamily: Fonts.bold,
        flex: 1,
        textAlign: 'center',
    },
    detailScrollView: {
        flex: 1,
    },
    detailContent: {
        padding: 16,
    },
    detailNameCard: {
        backgroundColor: '#fef5f0',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    detailFarmerName: {
        fontSize: 24,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 8,
        textAlign: 'center',
    },
    detailFarmerId: {
        fontSize: 16,
        fontWeight: '600',
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
    },
    detailSection: {
        marginBottom: 24,
        backgroundColor: LIGHT_GRAY_BG,
        borderRadius: 10,
        padding: 16,
    },
    detailSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: PRIMARY_BROWN,
    },
    detailFieldRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    detailFieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_GRAY,
        fontFamily: Fonts.semiBold,
        flex: 1,
    },
    detailFieldValue: {
        fontSize: 14,
        fontWeight: '500',
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 2,
        textAlign: 'right',
    },
    // --- Autocomplete Dropdown ---
    autocompleteDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        marginTop: 2,
        maxHeight: 250,
        elevation: 5,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1000,
    },
    autocompleteScroll: {
        maxHeight: 200,
    },
    autocompleteSuggestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_GRAY_BG,
    },
    autocompleteName: {
        fontSize: 16,
        fontWeight: '600',
        color: DARK_BROWN,
        fontFamily: Fonts.semiBold,
        marginBottom: 4,
    },
    autocompleteDetails: {
        fontSize: 13,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
    },
    autocompleteClose: {
        padding: 10,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: LIGHT_GRAY_BG,
        backgroundColor: VERY_LIGHT_BROWN,
    },
    autocompleteCloseText: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
    },
    // --- Farmer Name Display (below autocomplete) ---
    farmerNameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -10,
        marginBottom: 15,
        padding: 10,
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: PRIMARY_BROWN,
    },
    farmerNameText: {
        fontSize: 15,
        fontWeight: '600',
        color: DARK_BROWN,
        flex: 1,
    },
    // --- Record Actions (Edit/Delete Buttons) ---
    recordActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: LIGHT_GRAY_BG,
        elevation: 1,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    // --- Autocomplete Suggestions Dropdown ---
    suggestionsDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: VERY_LIGHT_BROWN,
        marginTop: 4,
        zIndex: 1000,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: VERY_LIGHT_BROWN,
    },
    suggestionItemLast: {
        borderBottomWidth: 0,
    },
    suggestionName: {
        fontSize: 14,
        fontWeight: '600',
        color: DARK_BROWN,
        fontFamily: Fonts.semiBold,
        flex: 1,
    },
    suggestionSubtitle: {
        fontSize: 12,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        marginTop: 2,
    },
    suggestionArrow: {
        marginLeft: 8,
    },
});

export default styles;

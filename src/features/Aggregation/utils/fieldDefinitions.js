// ===============================================
// === FORM & TABLE FIELD DEFINITIONS ===
// ===============================================
// Extracted from AggregationScreen.js for better organization
// Contains all field configurations for farmer and harvest forms

/**
 * Farmer Registration Form - 4 Steps
 * Step 1: Personal Info
 * Step 2: Location & UID
 * Step 3: Farm Details
 * Step 4: Farming Practices
 */
export const farmerFieldDefinitions = [
    // Step 1: Personal Info
    {
        title: 'Personal Info',
        fields: [
            { key: 'first_name', label: 'First Name', keyboardType: 'default', required: true },
            { key: 'last_name', label: 'Last Name', keyboardType: 'default', required: true },
            { key: 'gender', label: 'Gender', type: 'picker', pickerKey: 'gender' },
            { key: 'nin', label: 'NIN', keyboardType: 'default', required: true },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
            { key: 'contact', label: 'Phone Number', keyboardType: 'phone-pad', required: true, placeholder: 'Example: 0770123456' },
            { key: 'email', label: 'Email (optional)', keyboardType: 'email-address', placeholder: 'Example: johnkato@gmail.com' },
            { key: 'in_cooperative', label: 'Are you in a cooperative?', type: 'yes-no' },
            { key: 'cooperative', label: 'Cooperative Name', keyboardType: 'default', dependsOn: { field: 'in_cooperative', value: true } },
            { key: 'started_farming', label: 'When did you start coffee farming?', type: 'date', required: true },
        ]
    },
    // Step 2: Location & UID
    {
        title: 'Location & ID',
        fields: [
            { key: 'district', label: 'District', type: 'picker', pickerKey: 'district', required: true },
            { key: 'sub_county', label: 'Sub-county', type: 'picker', pickerKey: 'sub_county', required: true },
            // Parish will dynamically filter based on sub_county
            { key: 'parish', label: 'Parish', type: 'picker', pickerKey: 'parish', dynamic: true, required: true },
            { key: 'village', label: 'Village', keyboardType: 'default' },
            { key: 'gps', label: 'GPS Location (optional)', keyboardType: 'default' },
            { key: 'nearest_landmark', label: 'Nearest Landmark', keyboardType: 'default', required: true },
            { key: 'uid', label: 'Farmer UID (Generated)', special: 'generate_uid', readOnly: true },
        ]
    },
    // Step 3: Farm Details
    {
        title: 'Farm Details',
        fields: [
            { key: 'coffee_variety', label: 'Coffee Variety', type: 'picker', pickerKey: 'coffee_variety', required: true },
            { key: 'no_of_trees', label: 'Number of Trees', keyboardType: 'numeric', required: true },
            { key: 'all_your_trees', label: 'Are these all your trees?', type: 'yes-no', required: true },
            { key: 'other_farms', label: 'If no, which farms (location, owner)', keyboardType: 'default', dependsOn: { field: 'all_your_trees', value: false } },
            { key: 'planted_date', label: 'Date planted', type: 'date', required: true },
            { key: 'spacing', label: 'Spacing', type: 'picker', pickerKey: 'spacing', required: true },
            { key: 'land_ownership', label: 'Land Ownership', type: 'picker', pickerKey: 'land_ownership', required: true },
            { key: 'deforested', label: 'Has the land ever been deforested?', type: 'yes-no', required: true },
            { key: 'seedling_source', label: 'Source of seedlings', type: 'picker', pickerKey: 'seedling_source', required: true },
            { key: 'seedling_type', label: 'Type of seedlings', type: 'multi-select', pickerKey: 'seedling_type', required: true },
            { key: 'age_of_seedlings', label: 'Age of seedlings (Days)', keyboardType: 'numeric', required: true },
        ]
    },
    // Step 4: Practices & Chemicals
    {
        title: 'Farming Practices',
        fields: [
            { key: 'practices', label: 'Standard practices carried out', type: 'multi-select', pickerKey: 'practices', required: true },
            { key: 'irrigation', label: 'Irrigation source', type: 'picker', pickerKey: 'irrigation', required: true },
            { key: 'fertilizers', label: 'Fertilizers', type: 'picker', pickerKey: 'fertilizers', array: true, required: true },
            { key: 'uses_pesticides', label: 'Use pesticides?', type: 'yes-no', required: true },
            { key: 'pesticides', label: 'If yes, list pesticides (comma separated)', array: true, dependsOn: { field: 'uses_pesticides', value: true } },
        ]
    }
];

/**
 * Farmer Harvest Form - 2 Steps
 * Step 1: Harvest Details
 * Step 2: Quality & Payment
 */
export const harvestFieldDefinitions = [
    // Step 1: Farmer & Weight
    {
        title: "Harvest Details",
        fields: [
            { key: 'farmer_uid', label: 'Farmer UID', keyboardType: 'default', required: true, action: 'lookup' },
            { key: 'weight_on_delivery', label: 'Weight on Delivery (kg)', keyboardType: 'numeric', required: true },
            { key: 'location_of_delivery', label: 'Location on Delivery', type: 'picker', pickerKey: 'location_on_delivery', required: true },
            { key: 'custom_location', label: 'Specify Location', keyboardType: 'default', dependsOn: { field: 'location_of_delivery', value: 'Other' } },
            { key: 'gps_coordinates_delivery', label: 'GPS Coordinates', keyboardType: 'default', action: 'capture_gps' },
            { key: 'date_of_delivery', label: 'Date of Delivery', type: 'date', required: true },
        ]
    },
    // Step 2: Quality & Payment
    {
        title: 'Quality & Payment',
        fields: [
            { key: 'coffee_type', label: 'Coffee Type', type: 'picker', pickerKey: 'coffee_type', required: true },
            { key: 'price_per_kg', label: 'Price per Kg (UGX)', keyboardType: 'numeric', required: true },
            { key: 'amount_paid', label: 'Amount Paid (UGX)', keyboardType: 'numeric', readOnly: true, calculated: true },
            { key: 'paid_by_option', label: 'Paid By', type: 'picker', pickerKey: 'paid_by_option', required: true },
            { key: 'paid_by', label: 'Select Staff Member', type: 'searchable-staff', required: true, dependsOn: { field: 'paid_by_option', value: 'Other Staff Member' } },
            { key: 'harvest_id', label: 'Harvest ID (Generated)', special: 'generate_harvest_id', readOnly: true },
        ]
    }
];

/**
 * Farmer Table/List Field Definitions
 */
export const farmerTableFields = [
    { key: 'name', label: 'Name', width: '30%' },
    { key: 'contact', label: 'Contact', width: '20%' },
    { key: 'sub_county', label: 'Sub-county', width: '20%' },
    { key: 'number_of_trees', label: 'Trees', width: '15%' },
    { key: 'uid', label: 'UID', width: '15%' },
];

/**
 * Harvest Table/List Field Definitions
 */
export const harvestTableFields = [
    { key: 'farmer_name', label: 'Farmer', width: '30%' },
    { key: 'date_of_delivery', label: 'Date', width: '20%' },
    { key: 'weight_on_delivery', label: 'Weight (kg)', width: '20%' },
    { key: 'amount_paid', label: 'Paid', width: '15%' },
    { key: 'id', label: 'ID', width: '15%' },
];

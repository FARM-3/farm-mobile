// BlockRegistrationStepper.js - Updated with Navigation and SuccessModal
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Modal, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import SimpleHeader from '../../components/SimpleHeader';
import BottomNav from '../../components/BottomNav';
import CustomPicker from '../../components/CustomPicker';
import MultiSelectPicker from '../../components/MultiSelectPicker';
import CustomAlert from '../../components/CustomAlert';
import CoffeeColors from '../../theme/colors';
import Fonts from '../../theme/fonts';
import ApiService from '../../services/ApiService';
import { loadPickerMap } from '../../services/configService';

// Helper function to generate sequential block ID (BLK-01, BLK-02, etc.)
const generateBlockId = async () => {
  try {
    // Get the last used block number from AsyncStorage
    const lastBlockNumber = await AsyncStorage.getItem('last_block_number');
    const nextNumber = lastBlockNumber ? parseInt(lastBlockNumber) + 1 : 1;

    // Save the new number
    await AsyncStorage.setItem('last_block_number', nextNumber.toString());

    // Format with leading zeros (e.g., 01, 02, 03)
    return `BLK-${String(nextNumber).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error generating block ID:', error);
    // Fallback to timestamp-based ID if AsyncStorage fails
    return `BLK-${Date.now().toString().slice(-4)}`;
  }
};

// === Success Modal Component (Moved here for simplicity) ===
const SuccessModal = ({ isVisible, message, blockId, onClose, onGoToSummary }) => (
  <Modal
    visible={isVisible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <Text style={modalStyles.modalTitle}>Success!</Text>
        <Text style={modalStyles.modalText}>{message}</Text>
        {blockId && <Text style={modalStyles.modalTextSmall}>Block ID: {blockId}</Text>}
        <View style={modalStyles.buttonContainer}>
          <TouchableOpacity style={modalStyles.button} onPress={onClose}>
            <Text style={modalStyles.textStyle}>Add Another Block</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modalStyles.button, modalStyles.secondaryButton]} onPress={onGoToSummary}>
            <Text style={modalStyles.textStyle}>Go to Summary</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// [Remaining Options Data and Step Components (Step1_TreeDetails, Step2_FertilizersPesticides, Step3_StandardPractices) go here]
// Since the step components are lengthy, I'll only include the main component and the data/styles.

// === OPTIONS DATA (Copied from your provided code) ===
const COFFEE_VARIETIES = [
  { label: 'Select Variety', value: '' },
  { label: 'Robusta', value: 'robusta' },
  { label: 'Arabica', value: 'arabica' },
  { label: 'Liberica', value: 'liberica' },
];

const ROBUSTA_SUBTYPES = [
  { label: 'Select Subtype', value: '' },
  ...Array.from({ length: 10 }, (_, i) => ({ label: `KR${i + 1}`, value: `KR${i + 1}` })),
  ...Array.from({ length: 5 }, (_, i) => ({ label: `CWDR${i + 1}`, value: `CWDR${i + 1}` })),
];

const SEEDLING_SOURCES = [
  { label: 'Select Source', value: '' },
  { label: 'Local Nursery', value: 'localNursery' },
  { label: 'Private Farm', value: 'privateFarm' },
  { label: 'Research Institute', value: 'researchInstitute' },
  { label: 'Other (Specify below)', value: 'other' },
];

const FERTILIZER_OPTIONS = {
  organic: [
    { label: 'Bird Droppings', value: 'birdDroppings' },
    { label: 'Rabbit Urine', value: 'rabbitUrine' },
    { label: 'Other', value: 'other' },
  ],
  inorganic: [
    { label: 'NPK', value: 'npk' },
    { label: 'Other', value: 'other' },
  ],
  mixed: [
    { label: 'Other', value: 'other' },
  ],
};

const PESTICIDE_OPTIONS = [
  { label: 'Striker', value: 'striker' },
  { label: 'Fungicide', value: 'fungicide' },
  { label: 'Other', value: 'other' },
];

const STANDARD_PRACTICES = [
  { label: 'Stamping', value: 'stamping' },
  { label: 'Pruning', value: 'pruning' },
  { label: 'Spot Weeding', value: 'spotWeeding' },
  { label: 'Desuckering', value: 'desuckering' },
  { label: 'Slashing', value: 'slashing' },
  { label: 'Other', value: 'other' },
];

// === INITIAL STATE ===
const initialFormState = {
  numTrees: '',
  ageTrees: '',
  typeCoffee: '',
  datePlanted: new Date(),
  sourceSeedling: '',
  otherSourceSeedling: '',
  typeOfSeedling: '',
  robustaSubtypes: [], // Array for multiple Robusta subtypes
  fertilizerType: '',
  fertilizerList: '',
  otherFertilizer: '',
  usePesticides: 'no',
  pesticidesList: [],
  otherPesticide: '',
  standardPractices: [],
  otherStandardPractice: ''
};

// === STEP 1: TREE DETAILS (Copy from your provided code) ===
const Step1_TreeDetails = ({ formData, updateField }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleCoffeeTypeChange = (value) => {
    updateField('typeCoffee', value);
    // Reset seedling type when coffee type changes
    updateField('typeOfSeedling', '');
    updateField('robustaSubtypes', []);
  };


  const onDateChange = (_event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) updateField('datePlanted', selectedDate);
  };

  return (
    <View style={styles.stepContent}>
      <Text style={styles.label}>Number of Trees *</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={formData.numTrees}
        onChangeText={v => updateField('numTrees', v)}
        placeholder="Enter number of trees"
      />

      <Text style={styles.label}>Age of Seedling (months)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={formData.ageTrees}
        onChangeText={v => updateField('ageTrees', v)}
        placeholder="Enter age in months"
      />

      <Text style={styles.label}>Date Planted *</Text>
      <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
        <Text>{formData.datePlanted ? formData.datePlanted.toDateString() : 'Select Date'}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={formData.datePlanted || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      <CustomPicker
        label="Coffee Type *"
        selectedValue={formData.typeCoffee}
        onValueChange={handleCoffeeTypeChange}
        items={COFFEE_VARIETIES}
      />

      {formData.typeCoffee === 'robusta' && (
        <MultiSelectPicker
          label="Robusta Subtypes (Select Multiple)"
          selectedValues={formData.robustaSubtypes || []}
          onValueChange={(updatedValues) => {
            updateField('robustaSubtypes', updatedValues);
            // Update typeOfSeedling with comma-separated subtypes
            if (updatedValues.length > 0) {
              updateField('typeOfSeedling', `Robusta (${updatedValues.join(', ')})`);
            } else {
              updateField('typeOfSeedling', '');
            }
          }}
          items={ROBUSTA_SUBTYPES.filter(item => item.value !== '')}
        />
      )}

      <CustomPicker
        label="Type of Seedling"
        selectedValue={formData.typeOfSeedling}
        onValueChange={(value) => updateField('typeOfSeedling', value)}
        items={[
          { label: 'Select Seedling Type', value: '' },
          { label: 'KR1', value: 'KR1' },
          { label: 'KR2', value: 'KR2' },
          { label: 'KR3', value: 'KR3' },
          { label: 'KR4', value: 'KR4' },
          { label: 'KR5', value: 'KR5' },
          { label: 'KR6', value: 'KR6' },
          { label: 'KR7', value: 'KR7' },
          { label: 'KR8', value: 'KR8' },
          { label: 'KR9', value: 'KR9' },
          { label: 'KR10', value: 'KR10' },
          { label: 'CWDR1', value: 'CWDR1' },
          { label: 'CWDR2', value: 'CWDR2' },
          { label: 'CWDR3', value: 'CWDR3' },
          { label: 'CWDR4', value: 'CWDR4' },
          { label: 'CWDR5', value: 'CWDR5' },
        ]}
      />

      <CustomPicker
        label="Seedling Source *"
        selectedValue={formData.sourceSeedling}
        onValueChange={v => updateField('sourceSeedling', v)}
        items={SEEDLING_SOURCES}
      />

      {formData.sourceSeedling !== '' && formData.sourceSeedling !== 'localNursery' && (
        <>
          <Text style={styles.label}>Specify Source Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.otherSourceSeedling}
            onChangeText={v => updateField('otherSourceSeedling', v)}
            placeholder={formData.sourceSeedling === 'privateFarm' ? 'Enter farm name' : formData.sourceSeedling === 'researchInstitute' ? 'Enter institute name' : 'Enter source name'}
          />
        </>
      )}
    </View>
  );
};

// === STEP 2: FERTILIZERS & PESTICIDES (Copy from your provided code) ===
const Step2_FertilizersPesticides = ({ formData, updateField, configOptions = {} }) => {
  const [showOtherFertilizer, setShowOtherFertilizer] = useState(false);
  const mapProducts = (list) => (list || []).map(v =>
    typeof v === 'string' ? { label: v, value: v.toLowerCase().replace(/\s+/g, '_') } : v
  );
  const fertilizerOptions = {
    organic: mapProducts(configOptions.fertilizer_organic || FERTILIZER_OPTIONS.organic),
    inorganic: mapProducts(configOptions.fertilizer_inorganic || FERTILIZER_OPTIONS.inorganic),
    mixed: mapProducts(configOptions.fertilizer_mixed || FERTILIZER_OPTIONS.mixed || []),
  };
  const pesticideOptions = (configOptions.pesticides || PESTICIDE_OPTIONS).map(v => (
    typeof v === 'string' ? { label: v, value: v.toLowerCase().replace(/\s+/g, '_') } : v
  ));

  useEffect(() => {
    // Sync state with formData.fertilizerList on component mount/update
    setShowOtherFertilizer(formData.fertilizerList === 'other');
  }, [formData.fertilizerList]);

  const handleFertilizerTypeChange = (type) => {
    updateField('fertilizerType', type);
    updateField('fertilizerList', '');
    updateField('otherFertilizer', '');
    setShowOtherFertilizer(false);
  };

  const handleFertilizerSelection = (value) => {
    updateField('fertilizerList', value);
    setShowOtherFertilizer(value === 'other');
    if (value !== 'other') {
      updateField('otherFertilizer', '');
    }
  };

  return (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Fertilizers</Text>

      <Text style={styles.label}>Fertilizer Type</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => handleFertilizerTypeChange('organic')}
        >
          <View style={[
            styles.radioCircle,
            formData.fertilizerType === 'organic' && styles.radioCircleSelected
          ]} />
          <Text style={styles.radioText}>Organic</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => handleFertilizerTypeChange('inorganic')}
        >
          <View style={[
            styles.radioCircle,
            formData.fertilizerType === 'inorganic' && styles.radioCircleSelected
          ]} />
          <Text style={styles.radioText}>Inorganic</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => handleFertilizerTypeChange('mixed')}
        >
          <View style={[
            styles.radioCircle,
            formData.fertilizerType === 'mixed' && styles.radioCircleSelected
          ]} />
          <Text style={styles.radioText}>Mixed</Text>
        </TouchableOpacity>
      </View>

      {formData.fertilizerType && fertilizerOptions[formData.fertilizerType] && (
        <CustomPicker
          label="Select Fertilizer"
          selectedValue={formData.fertilizerList}
          onValueChange={handleFertilizerSelection}
          items={fertilizerOptions[formData.fertilizerType] || []}
        />
      )}

      {showOtherFertilizer && (
        <>
          <Text style={styles.label}>Specify Other Fertilizer</Text>
          <TextInput
            style={styles.input}
            value={formData.otherFertilizer}
            onChangeText={v => updateField('otherFertilizer', v)}
            placeholder="Enter fertilizer name"
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Pesticides</Text>

      <Text style={styles.label}>Use Pesticides?</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => updateField('usePesticides', 'no')}
        >
          <View style={[
            styles.radioCircle,
            formData.usePesticides === 'no' && styles.radioCircleSelected
          ]} />
          <Text style={styles.radioText}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioButton}
          onPress={() => updateField('usePesticides', 'yes')}
        >
          <View style={[
            styles.radioCircle,
            formData.usePesticides === 'yes' && styles.radioCircleSelected
          ]} />
          <Text style={styles.radioText}>Yes</Text>
        </TouchableOpacity>
      </View>

      {formData.usePesticides === 'yes' && (
        <>
          <Text style={styles.label}>Select Pesticides</Text>
          {pesticideOptions.map(p => (
            <TouchableOpacity
              key={p.value}
              style={styles.checkboxContainer}
              onPress={() => {
                updateField('pesticidesList', prev => {
                  if (prev.includes(p.value)) return prev.filter(i => i !== p.value);
                  else return [...prev, p.value];
                });
              }}
            >
              <Text style={styles.checkboxText}>{formData.pesticidesList.includes(p.value) ? '☑️' : '⬜'} {p.label}</Text>
            </TouchableOpacity>
          ))}
          {formData.pesticidesList.includes('other') && (
            <>
              <Text style={styles.label}>Specify Other Pesticide</Text>
              <TextInput
                style={styles.input}
                value={formData.otherPesticide}
                onChangeText={v => updateField('otherPesticide', v)}
                placeholder="Enter pesticide name"
              />
            </>
          )}
        </>
      )}
    </View>
  );
};

// === STEP 3: STANDARD PRACTICES (Copy from your provided code) ===
const Step3_StandardPractices = ({ formData, updateField, configOptions = {} }) => {
  const practiceOptions = (configOptions.practices || STANDARD_PRACTICES).map(v => (
    typeof v === 'string' ? { label: v, value: v.toLowerCase().replace(/\s+/g, '_') } : v
  ));
  return (
  <View style={styles.stepContent}>
    <Text style={styles.label}>Standard Practices</Text>
    {practiceOptions.map(p => (
      <TouchableOpacity
        key={p.value}
        style={styles.checkboxContainer}
        onPress={() => {
          updateField('standardPractices', prev => {
            if (prev.includes(p.value)) return prev.filter(i => i !== p.value);
            else return [...prev, p.value];
          });
        }}
      >
        <Text style={styles.checkboxText}>{formData.standardPractices.includes(p.value) ? '☑️' : '⬜'} {p.label}</Text>
      </TouchableOpacity>
    ))}
    {formData.standardPractices.includes('other') && (
      <>
        <Text style={styles.label}>Other Practice</Text>
        <TextInput
          style={styles.input}
          value={formData.otherStandardPractice}
          onChangeText={v => updateField('otherStandardPractice', v)}
          placeholder="Specify other practice"
        />
      </>
    )}
  </View>
  );
};

// === STEPS ===
const STEPS = [
  { title: 'Tree Details', Component: Step1_TreeDetails, requiredFields: ['numTrees', 'typeCoffee', 'sourceSeedling', 'typeOfSeedling'] },
  { title: 'Fertilizers & Pesticides', Component: Step2_FertilizersPesticides, requiredFields: [] },
  { title: 'Standard Practices', Component: Step3_StandardPractices, requiredFields: [] }
];

// === MAIN COMPONENT ===
const BlockRegistrationStepper = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedBlockId, setGeneratedBlockId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: []
  });
  const [configOptions, setConfigOptions] = useState({});

  useEffect(() => {
    loadPickerMap().then(setConfigOptions).catch(() => {});
  }, []);

  const showAlert = (title, message, type = 'info', buttons = []) => {
    const defaultButtons = buttons.length > 0 ? buttons : [
      { text: 'OK', onPress: () => setAlert({ ...alert, visible: false }) }
    ];
    setAlert({
      visible: true,
      title,
      message,
      type,
      buttons: defaultButtons
    });
  };

  const updateField = useCallback((key, valueOrFn) => {
    setFormData(prev => ({
      ...prev,
      [key]: typeof valueOrFn === 'function' ? valueOrFn(prev[key]) : valueOrFn
    }));
  }, []);

  // Handle edit mode initialization
  useEffect(() => {
    if (route?.params?.editMode && route?.params?.blockData) {
      setIsEditMode(true);
      const blockData = route.params.blockData;

      // Extract Robusta subtypes from typeOfSeedling field if present
      // Format is "Robusta (KR1, KR2, ...)"
      let robustaSubtypesArray = [];
      const typeOfSeedling = blockData.type_of_seedling || '';
      if (typeOfSeedling.startsWith('Robusta (') && typeOfSeedling.endsWith(')')) {
        const subtypesString = typeOfSeedling.substring(9, typeOfSeedling.length - 1); // Extract between parentheses
        robustaSubtypesArray = subtypesString.split(', ').map(s => s.trim()).filter(s => s.length > 0);
      }

      // Pre-fill form with existing block data
      setFormData({
        numTrees: blockData.trees?.toString() || '',
        ageTrees: blockData.age_of_seedling?.toString() || '',
        typeCoffee: blockData.type || '',
        datePlanted: blockData.date ? new Date(blockData.date) : new Date(),
        sourceSeedling: blockData.source || '',
        otherSourceSeedling: '',
        typeOfSeedling: blockData.type_of_seedling || '',
        robustaSubtypes: robustaSubtypesArray,
        fertilizerType: blockData.fertilizers || '',
        fertilizerList: blockData.fertilizer_names || '',
        otherFertilizer: '',
        usePesticides: blockData.use_pesticides || 'no',
        pesticidesList: Array.isArray(blockData.pesticides_list)
          ? blockData.pesticides_list
          : (blockData.pesticides_list ? blockData.pesticides_list.split(', ') : []),
        otherPesticide: '',
        standardPractices: Array.isArray(blockData.standard_practices)
          ? blockData.standard_practices
          : (blockData.standard_practices ? blockData.standard_practices.split(', ') : []),
        otherStandardPractice: ''
      });

      setGeneratedBlockId(blockData.block_id || '');
    }
  }, [route?.params]);

  // OFFLINE SYNC FUNCTIONS (omitted for brevity, assume they are correct)

  const validateStep = (stepIndex) => {
    const required = STEPS[stepIndex].requiredFields;
    const errors = [];
    for (const field of required) {
      if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        errors.push(field);
      }
      if (field === 'sourceSeedling' && formData.sourceSeedling === 'other' && (!formData.otherSourceSeedling || formData.otherSourceSeedling.trim() === '')) {
        errors.push('otherSourceSeedling');
      }
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (errors.length === 0) {
      setCurrentStep(prev => prev < STEPS.length - 1 ? prev + 1 : prev);
    } else {
      const errorMessages = errors.map(field => {
        if (field === 'numTrees') return 'Number of Trees is required';
        if (field === 'typeCoffee') return 'Coffee Type is required';
        if (field === 'sourceSeedling') return 'Seedling Source is required';
        if (field === 'typeOfSeedling') return 'Type of Seedling is required';
        if (field === 'otherSourceSeedling') return 'Specify Source is required when "Other" is selected';
        return `${field} is required`;
      });
      showAlert('Validation Error', errorMessages.join('\n'), 'error');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev > 0 ? prev - 1 : prev);
  };

  const saveBlockOffline = async (block) => {
    try {
      const pending = await AsyncStorage.getItem('blocks_sync_queue');
      const pendingBlocks = pending ? JSON.parse(pending) : [];
      pendingBlocks.push(block);
      await AsyncStorage.setItem('blocks_sync_queue', JSON.stringify(pendingBlocks));
    } catch (err) {
      console.error('Offline save error:', err);
    }
  };

  const syncPendingBlocks = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;
    try {
      const pending = await AsyncStorage.getItem('blocks_sync_queue');
      const pendingBlocks = pending ? JSON.parse(pending) : [];
      if (pendingBlocks.length === 0) return;

      let syncedCount = 0;
      const failedBlocks = [];

      for (const block of pendingBlocks) {
        try {
          // Ensure block has block_id before syncing
          if (!block.block_id) {
            console.warn('Generating block_id for legacy block');
            // Generate block_id for legacy blocks saved without it
            block.block_id = await generateBlockId();
          }

          // Check if block already exists before attempting to sync
          try {
            const checkResponse = await ApiService.get(`harvests/blocks/${block.block_id}/`);
            if (checkResponse.status === 200) {
              // Block already exists, remove from queue
              console.log(`✓ Block ${block.block_id} already exists, removing from sync queue`);
              syncedCount++;
              continue;
            }
          } catch (checkError) {
            // Block doesn't exist, proceed with creation
          }

          const response = await ApiService.post('harvests/blocks/', block);
          if (response.status === 201 || response.status === 200) {
            syncedCount++;
            console.log(`✓ Synced block: ${block.block_id}`);
          }
        } catch (error) {
          console.warn(`Sync failed for block ${block.block_id || 'undefined'}:`, error.message);
          failedBlocks.push(block);
        }
      }
      // Update queue - keep only failed blocks
      if (failedBlocks.length > 0) {
        await AsyncStorage.setItem('blocks_sync_queue', JSON.stringify(failedBlocks));
      } else {
        await AsyncStorage.removeItem('blocks_sync_queue');
      }

      console.log(`Block synchronization complete. Synced ${syncedCount} of ${pendingBlocks.length} blocks.`);

      if (syncedCount > 0) {
        showAlert('Sync Complete', `${syncedCount} block(s) synced successfully!${failedBlocks.length > 0 ? ` ${failedBlocks.length} failed.` : ''}`, 'success');
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  // Initialize block counter from backend on mount
  const initializeBlockCounter = async () => {
    try {
      const response = await ApiService.get('harvests/blocks/');
      if (response.data && response.data.results) {
        // Find the highest block number from existing blocks
        let maxNumber = 0;
        response.data.results.forEach(block => {
          if (block.block_id && block.block_id.startsWith('BLK-')) {
            const numberPart = block.block_id.replace('BLK-', '');
            const num = parseInt(numberPart);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        });

        // Update AsyncStorage with the highest number found
        const currentStored = await AsyncStorage.getItem('last_block_number');
        if (!currentStored || parseInt(currentStored) < maxNumber) {
          await AsyncStorage.setItem('last_block_number', maxNumber.toString());
          console.log(`Initialized block counter to ${maxNumber}`);
        }
      }
    } catch (error) {
      console.log('Could not initialize block counter from backend:', error.message);
    }
  };

  useEffect(() => {
    initializeBlockCounter(); // Sync counter with backend
    syncPendingBlocks(); // Initial check/sync
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        initializeBlockCounter();
        syncPendingBlocks();
      }
    });
    return () => unsubscribe();
  }, []);
  
  const handleSubmit = async () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      const errorMessages = errors.map(field => {
        if (field === 'numTrees') return 'Number of Trees is required';
        if (field === 'typeCoffee') return 'Coffee Type is required';
        if (field === 'sourceSeedling') return 'Seedling Source is required';
        if (field === 'typeOfSeedling') return 'Type of Seedling is required';
        if (field === 'otherSourceSeedling') return 'Specify Source is required when "Other" is selected';
        return `${field} is required`;
      });
      showAlert('Validation Error', errorMessages.join('\n'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare payload
      const fertilizerValue = formData.fertilizerList === 'other'
        ? formData.otherFertilizer
        : formData.fertilizerList;

      const sourceSeedlingValue = formData.sourceSeedling === 'other'
        ? formData.otherSourceSeedling
        : formData.sourceSeedling;

      const pesticidesValue = formData.pesticidesList.includes('other')
        ? formData.pesticidesList.filter(p => p !== 'other').concat(formData.otherPesticide).join(', ')
        : formData.pesticidesList.join(', ');

      const standardPracticesValue = formData.standardPractices.join(', ') +
        (formData.otherStandardPractice && formData.standardPractices.includes('other') ? `, ${formData.otherStandardPractice}` : '');

      // Use existing block_id for edit mode, generate new one for new blocks
      const blockId = isEditMode ? generatedBlockId : await generateBlockId();

      const payload = {
        block_id: blockId,
        no_of_trees: Number(formData.numTrees),
        date_planted: formData.datePlanted.toISOString().split('T')[0],
        type_of_coffee: formData.typeCoffee,
        source_of_seedling: sourceSeedlingValue,
        type_of_seedling: formData.typeOfSeedling,
        age_of_seedling: Number(formData.ageTrees) || 0,
        fertilizers: formData.fertilizerType,
        fertilizer_names: fertilizerValue,
        use_pesticides: formData.usePesticides,
        pesticides_list: pesticidesValue,
        standard_practices: standardPracticesValue,
      };

      // ALWAYS save offline first
      await saveBlockOffline(payload);

      // Check connectivity and attempt to sync immediately
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        setGeneratedBlockId(blockId);
        setSuccessMessage('Block saved locally. No internet connection - will sync when online.');
        setShowSuccessModal(true);
        setIsLoading(false);
        return;
      }

      // Attempt to sync using ApiService (includes authentication)
      try {
        let response;
        if (isEditMode) {
          // For edit mode, use PUT to update the existing block
          response = await ApiService.put(`harvests/blocks/${blockId}/`, payload);
        } else {
          // For new blocks, use POST to create
          response = await ApiService.post('harvests/blocks/', payload);
        }

        // Success - response.data contains the result
        const syncedBlockId = response.data.block_id || blockId;

        // Remove from offline queue since it synced successfully
        const pending = await AsyncStorage.getItem('blocks_sync_queue');
        const pendingBlocks = pending ? JSON.parse(pending) : [];
        const updatedQueue = pendingBlocks.filter(b =>
          b.block_id !== payload.block_id
        );
        await AsyncStorage.setItem('blocks_sync_queue', JSON.stringify(updatedQueue));

        setGeneratedBlockId(syncedBlockId);
        setSuccessMessage(`Block ${isEditMode ? 'updated' : 'submitted'} successfully! Block ID: ${syncedBlockId}`);
        setShowSuccessModal(true);
      } catch (err) {
        console.error('Sync error:', err);
        const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
        Alert.alert('Sync Failed', `Failed to sync to cloud: ${errorMsg}. Block saved locally and will sync later.`);
        setGeneratedBlockId(blockId);
        setSuccessMessage('Block saved locally. Sync failed, will retry later.');
        setShowSuccessModal(true);
      } finally {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      showAlert('Error', 'Failed to save block. Please try again.', 'error');
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    // Reset form after successful submission/offline save
    setFormData(initialFormState);
    setCurrentStep(0);
    setIsEditMode(false);
  };
  
  const handleGoToSummary = () => {
    setShowSuccessModal(false);
    setFormData(initialFormState);
    setCurrentStep(0);
    // Navigate to the BlockSummary screen with refresh parameter
    navigation.navigate('BlockSummary', { shouldRefresh: true });
  };
  
  const handleViewSummary = () => {
      // Navigate to the BlockSummary screen
      navigation.navigate('BlockSummary'); 
  };

  const CurrentStepComponent = STEPS[currentStep].Component;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
      <SimpleHeader title={isEditMode ? "Edit Block" : "Block Registration"} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity onPress={handleViewSummary} style={styles.backToSummaryButton}>
          <Ionicons name="arrow-back" size={18} color={CoffeeColors.MEDIUM_BROWN} style={styles.backToSummaryIcon} />
          <Text style={styles.backToSummaryText}>Back to Block Summary</Text>
        </TouchableOpacity>

        {/* Step Indicator with Circles and Lines */}
        <View style={stepStyles.indicatorContainer}>
          <View style={stepStyles.stepConnectorLine} />
          {STEPS.map((step, index) => (
            <View key={index} style={stepStyles.stepWrapper}>
              <View
                style={[
                  stepStyles.stepCircle,
                  { backgroundColor: index === currentStep ? CoffeeColors.ACCENT : (index < currentStep ? CoffeeColors.PRIMARY_BROWN : CoffeeColors.LIGHT_BROWN) }
                ]}
              >
                <Text style={stepStyles.stepText}>{index + 1}</Text>
              </View>
              <Text
                style={[
                  stepStyles.stepLabel,
                  { color: index === currentStep ? CoffeeColors.DARK_BROWN : CoffeeColors.MEDIUM_BROWN }
                ]}
              >
                {step.title}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.stepContainer}>
          <CurrentStepComponent formData={formData} updateField={updateField} configOptions={configOptions} />
        </View>

        {isLoading && <ActivityIndicator size="large" color={CoffeeColors.MEDIUM_BROWN} />}

        <SuccessModal
          isVisible={showSuccessModal}
          message={successMessage}
          blockId={generatedBlockId}
          onClose={handleModalClose}
          onGoToSummary={handleGoToSummary}
        />

        {/* Navigation Buttons - Inside ScrollView */}
        <View style={styles.navigationContainer}>
          <View style={styles.stepNav}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.stepButton}
                onPress={handleBack}
                disabled={isLoading}
              >
                <Ionicons name="chevron-back" size={20} color={CoffeeColors.PRIMARY_BROWN} style={styles.prevButtonIcon} />
                <Text style={styles.stepButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            {!isLastStep && (
              <TouchableOpacity
                style={styles.stepButton}
                onPress={handleNext}
                disabled={isLoading}
              >
                <Text style={styles.stepButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color={CoffeeColors.PRIMARY_BROWN} style={styles.nextButtonIcon} />
              </TouchableOpacity>
            )}
            {isLastStep && (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color={'#fff'} /> : (
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? 'Update Block' : 'Submit Block'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Cancel Button - Available on all steps */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.navigate('BlockSummary')}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav activeScreen="Blocks" onNavigate={(screen) => navigation.navigate(screen)} />

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        buttons={alert.buttons}
      />
    </View>
  );
};

// === STYLES ===
const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Add padding to ensure content doesn't get hidden behind buttons
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: CoffeeColors.DARK_BROWN,
  },
  backToSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  backToSummaryIcon: {
    marginRight: 6,
  },
  backToSummaryText: {
    color: CoffeeColors.MEDIUM_BROWN,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Fonts.semiBold,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: '500',
    color: CoffeeColors.MEDIUM_BROWN,
    marginBottom: 15,
  },
  stepContainer: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stepContent: {
    gap: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: CoffeeColors.LIGHT_BROWN,
    paddingBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 5,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  // Radio/Checkbox Styles (Reusing some from your original)
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
  },
  radioCircleSelected: {
    borderColor: CoffeeColors.MEDIUM_BROWN,
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
  },
  radioText: {
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  checkboxText: {
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    marginLeft: 5,
  },

  // Button Group for Footer
  navigationContainer: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 5,
    gap: 12,
  },
  stepNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: CoffeeColors.PRIMARY_BROWN,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    backgroundColor: CoffeeColors.PRIMARY_BROWN,
    marginHorizontal: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    borderWidth: 1,
    borderColor: CoffeeColors.PRIMARY_BROWN,
  },
  cancelButtonText: {
    color: CoffeeColors.PRIMARY_BROWN,
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});

// === MODAL STYLES ===
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
    marginBottom: 15,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  modalTextSmall: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.GRAY_TEXT,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  button: {
    backgroundColor: CoffeeColors.DARK_BROWN,
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
    textAlign: 'center',
    fontSize: 14,
  },
});

// === STEP INDICATOR STYLES ===
const stepStyles = StyleSheet.create({
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingHorizontal: 5,
    position: 'relative',
  },
  stepConnectorLine: {
    position: 'absolute',
    top: 17,
    left: '16.67%',
    right: '16.67%',
    height: 2,
    backgroundColor: CoffeeColors.LIGHT_BROWN,
    zIndex: 0,
  },
  stepWrapper: {
    alignItems: 'center',
    width: '33.33%',
    zIndex: 1,
  },
  stepCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: CoffeeColors.CREAM,
  },
  stepText: {
    color: CoffeeColors.WHITE,
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
    fontSize: 18,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
    color: CoffeeColors.DARK_BROWN,
  },
});

export default BlockRegistrationStepper;








// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   Alert,
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';

// const FERTILIZER_OPTIONS = {
//   organic: [
//     { label: 'Bird Droppings', value: 'birdDroppings' },
//     { label: 'Rabbit Urine', value: 'rabbitUrine' },
//     { label: 'Other', value: 'other' },
//   ],
//   inorganic: [
//     { label: 'NPK', value: 'npk' },
//     { label: 'Other', value: 'other' },
//   ],
// };

// const BlockDetailsForm = () => {
//   const [formData, setFormData] = useState({
//     no_of_trees: '',
//     date_planted: '',
//     type_of_coffee: '',
//     source_of_seedling: '',
//     type_of_seedling: '',
//     age_of_seedling: '',
//     fertilizer_type: '', // organic or inorganic
//     fertilizer_list: '',
//     fertilizer_other: '', // for custom input
//     use_pesticides: '',
//     pesticides_list: '',
//     standard_practices: '',
//   });

//   const [selectedFertilizer, setSelectedFertilizer] = useState('');
//   const [showFertilizerOther, setShowFertilizerOther] = useState(false);

//   const handleInputChange = (field, value) => {
//     setFormData({ ...formData, [field]: value });
//   };

//   const handleFertilizerTypeChange = (type) => {
//     setFormData({ 
//       ...formData, 
//       fertilizer_type: type,
//       fertilizer_list: '' 
//     });
//     setSelectedFertilizer('');
//     setShowFertilizerOther(false);
//   };

//   const handleFertilizerSelection = (value) => {
//     setSelectedFertilizer(value);
//     if (value === 'other') {
//       setShowFertilizerOther(true);
//       setFormData({ ...formData, fertilizer_list: '' });
//     } else {
//       setShowFertilizerOther(false);
//       setFormData({ ...formData, fertilizer_list: value, fertilizer_other: '' });
//     }
//   };

//   const handleSubmit = async () => {
//     // Validation
//     if (!formData.no_of_trees || !formData.date_planted || !formData.type_of_coffee) {
//       Alert.alert('Error', 'Please fill in all required fields');
//       return;
//     }

//     // Prepare data for submission
//     const submitData = {
//       no_of_trees: parseInt(formData.no_of_trees),
//       date_planted: formData.date_planted,
//       type_of_coffee: formData.type_of_coffee,
//       source_of_seedling: formData.source_of_seedling,
//       type_of_seedling: formData.type_of_seedling,
//       age_of_seedling: parseInt(formData.age_of_seedling) || 0,
//       fertilizer_type: formData.fertilizer_type,
//       fertilizer_list: showFertilizerOther ? formData.fertilizer_other : formData.fertilizer_list,
//       use_pesticides: formData.use_pesticides,
//       pesticides_list: formData.pesticides_list,
//       standard_practices: formData.standard_practices,
//     };

//     try {
//       const response = await fetch('http://142.93.94.236:8000/api/blocks/', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           // Add your authorization header if needed
//           // 'Authorization': `Bearer ${yourToken}`,
//         },
//         body: JSON.stringify(submitData),
//       });

//       if (response.ok) {
//         const result = await response.json();
//         Alert.alert('Success', `Block created with ID: ${result.block_id}`);
//         // Reset form or navigate away
//         resetForm();
//       } else {
//         const error = await response.json();
//         Alert.alert('Error', error.message || 'Failed to create block');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Network error. Please try again.');
//       console.error(error);
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       no_of_trees: '',
//       date_planted: '',
//       type_of_coffee: '',
//       source_of_seedling: '',
//       type_of_seedling: '',
//       age_of_seedling: '',
//       fertilizer_type: '',
//       fertilizer_list: '',
//       fertilizer_other: '',
//       use_pesticides: '',
//       pesticides_list: '',
//       standard_practices: '',
//     });
//     setSelectedFertilizer('');
//     setShowFertilizerOther(false);
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.title}>Block Details Form</Text>

//       {/* Number of Trees */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Number of Trees *</Text>
//         <TextInput
//           style={styles.input}
//           keyboardType="numeric"
//           value={formData.no_of_trees}
//           onChangeText={(value) => handleInputChange('no_of_trees', value)}
//           placeholder="Enter number of trees"
//         />
//       </View>

//       {/* Date Planted */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Date Planted *</Text>
//         <TextInput
//           style={styles.input}
//           value={formData.date_planted}
//           onChangeText={(value) => handleInputChange('date_planted', value)}
//           placeholder="YYYY-MM-DD"
//         />
//       </View>

//       {/* Type of Coffee */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Type of Coffee *</Text>
//         <TextInput
//           style={styles.input}
//           value={formData.type_of_coffee}
//           onChangeText={(value) => handleInputChange('type_of_coffee', value)}
//           placeholder="e.g., Arabica, Robusta"
//         />
//       </View>

//       {/* Source of Seedling */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Source of Seedling</Text>
//         <TextInput
//           style={styles.input}
//           value={formData.source_of_seedling}
//           onChangeText={(value) => handleInputChange('source_of_seedling', value)}
//           placeholder="Enter source"
//         />
//       </View>

//       {/* Type of Seedling */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Type of Seedling</Text>
//         <TextInput
//           style={styles.input}
//           value={formData.type_of_seedling}
//           onChangeText={(value) => handleInputChange('type_of_seedling', value)}
//           placeholder="Enter type"
//         />
//       </View>

//       {/* Age of Seedling */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Age of Seedling (months)</Text>
//         <TextInput
//           style={styles.input}
//           keyboardType="numeric"
//           value={formData.age_of_seedling}
//           onChangeText={(value) => handleInputChange('age_of_seedling', value)}
//           placeholder="Enter age in months"
//         />
//       </View>

//       {/* Fertilizer Type */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Fertilizer Type</Text>
//         <View style={styles.radioGroup}>
//           <TouchableOpacity
//             style={styles.radioButton}
//             onPress={() => handleFertilizerTypeChange('organic')}
//           >
//             <View style={[
//               styles.radioCircle,
//               formData.fertilizer_type === 'organic' && styles.radioCircleSelected
//             ]} />
//             <Text style={styles.radioText}>Organic</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.radioButton}
//             onPress={() => handleFertilizerTypeChange('inorganic')}
//           >
//             <View style={[
//               styles.radioCircle,
//               formData.fertilizer_type === 'inorganic' && styles.radioCircleSelected
//             ]} />
//             <Text style={styles.radioText}>Inorganic</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Fertilizer List Picker */}
//       {formData.fertilizer_type && (
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Select Fertilizer</Text>
//           <Picker
//             selectedValue={selectedFertilizer}
//             onValueChange={handleFertilizerSelection}
//             style={styles.picker}
//           >
//             <Picker.Item label="Select fertilizer..." value="" />
//             {FERTILIZER_OPTIONS[formData.fertilizer_type].map((option) => (
//               <Picker.Item
//                 key={option.value}
//                 label={option.label}
//                 value={option.value}
//               />
//             ))}
//           </Picker>
//         </View>
//       )}

//       {/* Other Fertilizer Input */}
//       {showFertilizerOther && (
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Specify Other Fertilizer</Text>
//           <TextInput
//             style={styles.input}
//             value={formData.fertilizer_other}
//             onChangeText={(value) => handleInputChange('fertilizer_other', value)}
//             placeholder="Enter fertilizer name"
//           />
//         </View>
//       )}

//       {/* Use Pesticides */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Use Pesticides</Text>
//         <View style={styles.radioGroup}>
//           <TouchableOpacity
//             style={styles.radioButton}
//             onPress={() => handleInputChange('use_pesticides', 'yes')}
//           >
//             <View style={[
//               styles.radioCircle,
//               formData.use_pesticides === 'yes' && styles.radioCircleSelected
//             ]} />
//             <Text style={styles.radioText}>Yes</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.radioButton}
//             onPress={() => handleInputChange('use_pesticides', 'no')}
//           >
//             <View style={[
//               styles.radioCircle,
//               formData.use_pesticides === 'no' && styles.radioCircleSelected
//             ]} />
//             <Text style={styles.radioText}>No</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Pesticides List */}
//       {formData.use_pesticides === 'yes' && (
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Pesticides List</Text>
//           <TextInput
//             style={styles.input}
//             value={formData.pesticides_list}
//             onChangeText={(value) => handleInputChange('pesticides_list', value)}
//             placeholder="Enter pesticides used"
//             multiline
//           />
//         </View>
//       )}

//       {/* Standard Practices */}
//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Standard Practices</Text>
//         <TextInput
//           style={[styles.input, styles.textArea]}
//           value={formData.standard_practices}
//           onChangeText={(value) => handleInputChange('standard_practices', value)}
//           placeholder="Enter standard practices"
//           multiline
//           numberOfLines={4}
//         />
//       </View>

//       {/* Submit Button */}
//       <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
//         <Text style={styles.submitButtonText}>Submit Block Details</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#f5f5f5',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     marginBottom: 8,
//     color: '#333',
//     fontWeight: '500',
//   },
//   input: {
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//   },
//   textArea: {
//     height: 100,
//     textAlignVertical: 'top',
//   },
//   picker: {
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//   },
//   radioGroup: {
//     flexDirection: 'row',
//     gap: 20,
//   },
//   radioButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   radioCircle: {
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#666',
//   },
//   radioCircleSelected: {
//     borderColor: '#4CAF50',
//     backgroundColor: '#4CAF50',
//   },
//   radioText: {
//     fontSize: 16,
//     color: '#333',
//   },
//   submitButton: {
//     backgroundColor: '#4CAF50',
//     padding: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 20,
//     marginBottom: 40,
//   },
//   submitButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
// });

// export default BlockDetailsForm;










//Good before lunch


// // === IMPORTS ===
// import React, { useState, useCallback, useEffect } from 'react';
// import {
//   View, Text, TextInput, Button, StyleSheet, ScrollView,
//   Modal, TouchableOpacity, Alert
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo from '@react-native-community/netinfo';
// import CoffeeColors from '../../theme/colors';

// // === OPTIONS DATA ===
// const BLOCK_OPTIONS = Array.from({ length: 12 }, (_, i) => {
//   const letter = String.fromCharCode(65 + i);
//   return { label: `Block ${letter}`, value: letter, id: String(i + 1).padStart(3, '0') };
// });

// const COFFEE_VARIETIES = [
//   { label: 'Select Variety', value: '' },
//   { label: 'Robusta', value: 'robusta' },
//   { label: 'Arabica', value: 'arabica' },
//   { label: 'Liberica', value: 'liberica' },
// ];

// const ROBUSTA_SUBTYPES = [
//   { label: 'Select Subtype', value: '' },
//   ...Array.from({ length: 10 }, (_, i) => ({ label: `KR${i + 1}`, value: `KR${i + 1}` })),
//   ...Array.from({ length: 5 }, (_, i) => ({ label: `CWDR${i + 1}`, value: `CWDR${i + 1}` })),
// ];

// const SEEDLING_SOURCES = [
//   { label: 'Select Source', value: '' },
//   { label: 'Local Nursery', value: 'localNursery' },
//   { label: 'Private Farm', value: 'privateFarm' },
//   { label: 'Own Propagated', value: 'ownPropagated' },
//   { label: 'Research Institute', value: 'researchInstitute' },
//   { label: 'Other (Specify below)', value: 'other' },
// ];

// const PESTICIDE_OPTIONS = [
//   { label: 'Striker', value: 'striker' },
//   { label: 'Fungicide', value: 'fungicide' },
// ];

// const STANDARD_PRACTICES = [
//   { label: 'Stamping', value: 'stamping' },
//   { label: 'Pruning', value: 'pruning' },
//   { label: 'Other', value: 'other' },
// ];

// // === INITIAL STATE ===
// const initialFormState = {
//   blockLetter: '', blockId: '',
//   numTrees: '', ageTrees: '',
//   typeCoffee: '', robustaSubtype: '',
//   plantedMonth: '', plantedYear: '',
//   sourceSeedling: '', otherSourceSeedling: '',
//   usePesticides: 'no', pesticidesList: [],
//   standardPractices: [], otherStandardPractice: ''
// };

// // === STEP 1: BLOCK INFO ===
// const Step1_BlockInfo = ({ formData, updateField }) => (
//   <View>
//     <Text style={styles.label}>Block Name</Text>
//     <Picker
//       selectedValue={formData.blockLetter}
//       onValueChange={v => {
//         updateField('blockLetter', v);
//         const block = BLOCK_OPTIONS.find(b => b.value === v);
//         if (block) updateField('blockId', block.id);
//       }}>
//       <Picker.Item label="Select Block" value="" />
//       {BLOCK_OPTIONS.map(opt => (
//         <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//       ))}
//     </Picker>

//     {formData.blockId ? (
//       <Text style={{ marginTop: 5, color: CoffeeColors.GRAY_TEXT }}>
//         Auto-generated Block ID: {formData.blockId}
//       </Text>
//     ) : null}
//   </View>
// );

// import DateTimePicker from '@react-native-community/datetimepicker';

// // === STEP 2: TREE DETAILS ===
// const Step2_TreeDetails = ({ formData, updateField }) => {
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   const handleCoffeeTypeChange = (value) => {
//     updateField('typeCoffee', value);
//     // auto-fill type of seedling
//     if (value === 'robusta') {
//       updateField('typeOfSeedling', formData.robustaSubtype ? `Robusta (${formData.robustaSubtype})` : '');
//     } else if (value === 'arabica') updateField('typeOfSeedling', 'Arabica (AR-01)');
//     else if (value === 'liberica') updateField('typeOfSeedling', 'Liberica');
//   };

//   const handleRobustaSubtypeChange = (value) => {
//     updateField('robustaSubtype', value);
//     updateField('typeOfSeedling', value ? `Robusta (${value})` : '');
//   };

//   const onDateChange = (event, selectedDate) => {
//     setShowDatePicker(false);
//     if (selectedDate) updateField('datePlanted', selectedDate);
//   };

//   return (
//     <View>
//       <Text style={styles.label}>Number of Trees</Text>
//       <TextInput
//         style={styles.input}
//         keyboardType="numeric"
//         value={formData.numTrees}
//         onChangeText={v => updateField('numTrees', v)}
//       />

//       {/* <Text style={styles.label}>Age of Seedling</Text>
//       <TextInput
//         style={styles.input}
//         keyboardType="numeric"
//         value={formData.ageTrees}
//         onChangeText={v => updateField('ageTrees', v)}
//       /> */}

//       <Text style={styles.label}>Date Planted</Text>
//       <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
//         <Text>{formData.datePlanted ? formData.datePlanted.toDateString() : 'Select Date'}</Text>
//       </TouchableOpacity>
//       {showDatePicker && (
//         <DateTimePicker
//           value={formData.datePlanted || new Date()}
//           mode="date"
//           display="default"
//           onChange={onDateChange}
//         />
//       )}

//       <Text style={styles.label}>Coffee Type</Text>
//       <Picker selectedValue={formData.typeCoffee} onValueChange={handleCoffeeTypeChange}>
//         {COFFEE_VARIETIES.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
//       </Picker>

//       {formData.typeCoffee === 'robusta' && (
//         <>
//           <Text style={styles.label}>Robusta Subtype</Text>
//           <Picker selectedValue={formData.robustaSubtype} onValueChange={handleRobustaSubtypeChange}>
//             {ROBUSTA_SUBTYPES.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
//           </Picker>
//         </>
//       )}

//       <Text style={styles.label}>Type of Seedling</Text>
//       <TextInput
//         style={[styles.input, { backgroundColor: '#eee' }]}
//         value={formData.typeOfSeedling}
//         editable={false}
//       />

//       <Text style={styles.label}>Seedling Source</Text>
//       <Picker selectedValue={formData.sourceSeedling} onValueChange={v => updateField('sourceSeedling', v)}>
//         {SEEDLING_SOURCES.map(opt => <Picker.Item key={opt.value} label={opt.label} value={opt.value} />)}
//       </Picker>

//       {formData.sourceSeedling === 'other' && (
//         <>
//           <Text style={styles.label}>Specify Source</Text>
//           <TextInput
//             style={styles.input}
//             value={formData.otherSourceSeedling}
//             onChangeText={v => updateField('otherSourceSeedling', v)}
//           />
//         </>
//       )}
//     </View>
//   );
// };

// // === STEP 3: PESTICIDE & PRACTICES ===
// const Step3_StandardPractices = ({ formData, updateField }) => (
//   <View>
//     <Text style={styles.label}>Use Pesticides?</Text>
//     <Picker selectedValue={formData.usePesticides} onValueChange={v => updateField('usePesticides', v)}>
//       <Picker.Item label="No" value="no" />
//       <Picker.Item label="Yes" value="yes" />
//     </Picker>

//     {formData.usePesticides === 'yes' && (
//       <>
//         <Text style={styles.label}>Select Pesticides</Text>
//         {PESTICIDE_OPTIONS.map(p => (
//           <TouchableOpacity key={p.value} style={styles.checkboxContainer} onPress={() => {
//             updateField('pesticidesList', prev => {
//               if (prev.includes(p.value)) return prev.filter(i => i !== p.value);
//               else return [...prev, p.value];
//             });
//           }}>
//             <Text>{formData.pesticidesList.includes(p.value) ? '☑️' : '⬜'} {p.label}</Text>
//           </TouchableOpacity>
//         ))}
//       </>
//     )}

//     <Text style={styles.label}>Standard Practices</Text>
//     {STANDARD_PRACTICES.map(p => (
//       <TouchableOpacity key={p.value} style={styles.checkboxContainer} onPress={() => {
//         updateField('standardPractices', prev => {
//           if (prev.includes(p.value)) return prev.filter(i => i !== p.value);
//           else return [...prev, p.value];
//         });
//       }}>
//         <Text>{formData.standardPractices.includes(p.value) ? '☑️' : '⬜'} {p.label}</Text>
//       </TouchableOpacity>
//     ))}
//     {formData.standardPractices.includes('other') && (
//       <>
//         <Text style={styles.label}>Other Practice</Text>
//         <TextInput style={styles.input} value={formData.otherStandardPractice}
//           onChangeText={v => updateField('otherStandardPractice', v)} />
//       </>
//     )}
//   </View>
// );

// // === STEPS ===
// const STEPS = [
//   { title: 'Block Info', Component: Step1_BlockInfo, requiredFields: ['blockLetter'] },
//   { title: 'Tree Details', Component: Step2_TreeDetails, requiredFields: ['numTrees', 'ageTrees', 'typeCoffee', 'sourceSeedling'] },
//   { title: 'Practices & Pesticides', Component: Step3_StandardPractices, requiredFields: [] }
// ];

// // === MAIN COMPONENT ===
// const BlockRegistrationStepper = () => {
//   const [currentStep, setCurrentStep] = useState(0);
//   const [formData, setFormData] = useState(initialFormState);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showSuccessModal, setShowSuccessModal] = useState(false);
//   const [successMessage, setSuccessMessage] = useState('');

//   const updateField = useCallback((key, valueOrFn) => {
//     setFormData(prev => ({
//       ...prev,
//       [key]: typeof valueOrFn === 'function' ? valueOrFn(prev[key]) : valueOrFn
//     }));
//   }, []);

//   // === OFFLINE SYNC ===
//   const saveBlockOffline = async (block) => {
//     try {
//       const pending = await AsyncStorage.getItem('pendingBlocks');
//       const pendingBlocks = pending ? JSON.parse(pending) : [];
//       pendingBlocks.push(block);
//       await AsyncStorage.setItem('pendingBlocks', JSON.stringify(pendingBlocks));
//     } catch (err) { console.error(err); }
//   };

//   const syncPendingBlocks = async () => {
//     const state = await NetInfo.fetch();
//     if (!state.isConnected) return;
//     try {
//       const pending = await AsyncStorage.getItem('pendingBlocks');
//       const pendingBlocks = pending ? JSON.parse(pending) : [];
//       for (const block of pendingBlocks) {
//         await fetch('http://142.93.94.236:8000/api/blocks/blocks/', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(block)
//         });
//       }
//       await AsyncStorage.removeItem('pendingBlocks');
//     } catch (err) { console.error(err); }
//   };

//   useEffect(() => {
//     const unsubscribe = NetInfo.addEventListener(state => {
//       if (state.isConnected) syncPendingBlocks();
//     });
//     return () => unsubscribe();
//   }, []);

//   const handleSubmit = async () => {
//     setIsLoading(true);
//     try {
//       const payload = {
//   block_id: formData.blockId,
//   no_of_trees: Number(formData.numTrees),
//   date_planted: formData.datePlanted.toISOString().split('T')[0], // calendar format YYYY-MM-DD
//   type_of_coffee: formData.typeCoffee,
//   source_of_seedling: formData.sourceSeedling === 'other' ? formData.otherSourceSeedling : formData.sourceSeedling,
//   type_of_seedling: formData.typeOfSeedling,
//   age_of_seedling: Number(formData.ageTrees),
//   use_pesticides: formData.usePesticides,
//   pesticides_list: formData.pesticidesList.join(', '),
//   standard_practices: formData.standardPractices.join(', ') + (formData.otherStandardPractice ? ` ${formData.otherStandardPractice}` : '')
// };


//       const netState = await NetInfo.fetch();
//       if (netState.isConnected) {
//         await fetch('http://142.93.94.236:8000/api/blocks/blocks/', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(payload)
//         });
//       } else {
//         await saveBlockOffline(payload);
//       }

//       setSuccessMessage(`Block ${formData.blockLetter} successfully registered with ID ${formData.blockId}`);
//       setShowSuccessModal(true);
//       setFormData(initialFormState);
//       setCurrentStep(0);
//     } catch (err) {
//       console.error(err);
//       Alert.alert('Error', 'Failed to save block.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const CurrentStepComponent = STEPS[currentStep].Component;

//   return (
//     <ScrollView contentContainerStyle={styles.scrollContainer}>
//       <SuccessModal isVisible={showSuccessModal} message={successMessage} onClose={() => setShowSuccessModal(false)} />
//       <View style={styles.container}>
//         <Text style={styles.heading}>Register New Block: {STEPS[currentStep].title}</Text>
//         <CurrentStepComponent formData={formData} updateField={updateField} />
//         <View style={styles.navigationContainer}>
//           {currentStep > 0 && <Button title="Back" color={CoffeeColors.MEDIUM_BROWN} onPress={() => setCurrentStep(currentStep - 1)} />}
//           {currentStep < STEPS.length - 1
//             ? <Button title="Next" color={CoffeeColors.DARK_BROWN} onPress={() => setCurrentStep(currentStep + 1)} />
//             : <Button title={isLoading ? 'Saving...' : 'Save Block'} onPress={handleSubmit} color={CoffeeColors.SUCCESS_GREEN} disabled={isLoading} />}
//         </View>
//       </View>
//     </ScrollView>
//   );
// };

// // === STYLES ===
// const styles = StyleSheet.create({
//   scrollContainer: { padding: 16, backgroundColor: CoffeeColors.LIGHT_GRAY },
//   container: { backgroundColor: CoffeeColors.WHITE, borderRadius: 8, padding: 16 },
//   heading: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: CoffeeColors.DARK_BROWN },
//   label: { marginVertical: 6, color: CoffeeColors.DARK_BROWN, fontWeight: '600' },
//   input: { borderWidth: 1, borderColor: CoffeeColors.GRAY_TEXT, padding: 8, marginBottom: 10, borderRadius: 5 },
//   checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
//   navigationContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
// });

// const modalStyles = StyleSheet.create({
//   centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   modalView: { backgroundColor: CoffeeColors.WHITE, padding: 20, borderRadius: 10, elevation: 5 },
//   modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: CoffeeColors.DARK_BROWN },
//   modalText: { marginBottom: 15, color: CoffeeColors.GRAY_TEXT },
//   buttonClose: { backgroundColor: CoffeeColors.SUCCESS_GREEN, padding: 10, borderRadius: 5 },
//   textStyle: { color: CoffeeColors.WHITE, fontWeight: 'bold' },
// });

// const SuccessModal = ({ isVisible, message, onClose }) => (
//   <Modal transparent visible={isVisible} animationType="slide">
//     <View style={modalStyles.centeredView}>
//       <View style={modalStyles.modalView}>
//         <Text style={modalStyles.modalTitle}>Registration Successful!</Text>
//         <Text style={modalStyles.modalText}>{message}</Text>
//         <TouchableOpacity style={modalStyles.buttonClose} onPress={onClose}>
//           <Text style={modalStyles.textStyle}>Continue</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   </Modal>
// );

// export default BlockRegistrationStepper;






 





// import React, { useState, useCallback } from 'react';
// import { 
//   View, Text, TextInput, Switch, Button, 
//   StyleSheet, ScrollView, Modal, TouchableOpacity, 
//   Alert, ActivityIndicator 
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';

// const generateUniqueSuffix = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID().substring(0, 8).toUpperCase();
//   }
//   return String(Date.now()).slice(-6);
// };

// // === OPTIONS DATA ===
// const BLOCK_OPTIONS = Array.from({ length: 12 }, (_, i) => {
//   const letter = String.fromCharCode(65 + i);
//   return { label: `Block ${letter}`, value: letter, number: i + 1 };
// });

// const COFFEE_VARIETIES = [
//   { label: 'Select Variety', value: '' },
//   { label: 'Robusta', value: 'robusta' },
//   { label: 'Arabica', value: 'arabica' },
//   { label: 'Liberica', value: 'liberica' },
// ];

// const ROBUSTA_SUBTYPES = [
//   { label: 'Select Subtype', value: '' },
//   ...Array.from({ length: 10 }, (_, i) => ({ label: `KR${i + 1}`, value: `KR${i + 1}` })),
//   ...Array.from({ length: 5 }, (_, i) => ({ label: `CWDR${i + 1}`, value: `CWDR${i + 1}` })),
// ];

// const FERTILIZER_OPTIONS = {
//   organic: [
//     { label: 'Bird Droppings', value: 'birdDroppings' },
//     { label: 'Rabbit Urine', value: 'rabbitUrine' },
//   ],
//   inorganic: [{ label: 'NPK', value: 'npk' }],
// };

// const PESTICIDE_OPTIONS = [
//   { label: 'Striker', value: 'striker' },
//   { label: 'Fungicide', value: 'fungicide' },
// ];

// const SEEDLING_SOURCES = [
//   { label: 'Select Source', value: '' },
//   { label: 'Local Nursery', value: 'localNursery' },
//   { label: 'Private Farm', value: 'privateFarm' },
//   { label: 'Own Propagated', value: 'ownPropagated' },
//   { label: 'Research Institute', value: 'researchInstitute' },
//   { label: 'Other (Specify below)', value: 'other' },
// ];

// const MONTHS = [
//   { label: 'Select Month', value: '' },
//   { label: 'January', value: 'Jan' }, { label: 'February', value: 'Feb' },
//   { label: 'March', value: 'Mar' }, { label: 'April', value: 'Apr' },
//   { label: 'May', value: 'May' }, { label: 'June', value: 'Jun' },
//   { label: 'July', value: 'Jul' }, { label: 'August', value: 'Aug' },
//   { label: 'September', value: 'Sep' }, { label: 'October', value: 'Oct' },
//   { label: 'November', value: 'Nov' }, { label: 'December', value: 'Dec' },
// ];

// const currentYear = new Date().getFullYear();
// const YEARS = [
//   { label: 'Select Year', value: '' },
//   ...Array.from({ length: 30 }, (_, i) => ({
//     label: String(currentYear - i),
//     value: String(currentYear - i),
//   })),
// ];

// // === SUCCESS MODAL ===
// const SuccessModal = ({ isVisible, message, onClose }) => (
//   <Modal transparent visible={isVisible} animationType="slide">
//     <View style={modalStyles.centeredView}>
//       <View style={modalStyles.modalView}>
//         <Text style={modalStyles.modalTitle}>Registration Successful!</Text>
//         <Text style={modalStyles.modalText}>{message}</Text>
//         <TouchableOpacity style={modalStyles.buttonClose} onPress={onClose}>
//           <Text style={modalStyles.textStyle}>Continue</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   </Modal>
// );

// // === STEP 1: Block Info ===
// const Step1_BlockInfo = ({ formData, updateField }) => (
//   <View>
//     <Text>Block Letter</Text>
//     <Picker
//       selectedValue={formData.blockLetter}
//       onValueChange={value => updateField('blockLetter', value)}>
//       <Picker.Item label="Select Block" value="" />
//       {BLOCK_OPTIONS.map(opt => (
//         <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//       ))}
//     </Picker>
//   </View>
// );

// // === STEP 2: Tree Details ===
// const Step2_TreeDetails = ({ formData, updateField }) => (
//   <View>
//     <Text>Number of Trees</Text>
//     <TextInput
//       style={styles.input}
//       keyboardType="numeric"
//       value={formData.numTrees}
//       onChangeText={v => updateField('numTrees', v)}
//     />

//     <Text>Age of Trees (in years)</Text>
//     <TextInput
//       style={styles.input}
//       keyboardType="numeric"
//       value={formData.ageTrees}
//       onChangeText={v => updateField('ageTrees', v)}
//     />

//     <Text>Coffee Type</Text>
//     <Picker
//       selectedValue={formData.typeCoffee}
//       onValueChange={v => updateField('typeCoffee', v)}>
//       {COFFEE_VARIETIES.map(opt => (
//         <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//       ))}
//     </Picker>

//     {formData.typeCoffee === 'robusta' && (
//       <>
//         <Text>Robusta Subtype</Text>
//         <Picker
//           selectedValue={formData.robustaSubtype}
//           onValueChange={v => updateField('robustaSubtype', v)}>
//           {ROBUSTA_SUBTYPES.map(opt => (
//             <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//           ))}
//         </Picker>
//       </>
//     )}

//     <Text>Planted Month</Text>
//     <Picker
//       selectedValue={formData.plantedMonth}
//       onValueChange={v => updateField('plantedMonth', v)}>
//       {MONTHS.map(opt => (
//         <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//       ))}
//     </Picker>

//     <Text>Planted Year</Text>
//     <Picker
//       selectedValue={formData.plantedYear}
//       onValueChange={v => updateField('plantedYear', v)}>
//       {YEARS.map(opt => (
//         <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//       ))}
//     </Picker>

//     <Text>Seedling Source</Text>
//     <Picker
//       selectedValue={formData.sourceSeedling}
//       onValueChange={v => updateField('sourceSeedling', v)}>
//       {SEEDLING_SOURCES.map(opt => (
//         <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//       ))}
//     </Picker>

//     {formData.sourceSeedling === 'other' && (
//       <>
//         <Text>Other Source (Specify)</Text>
//         <TextInput
//           style={styles.input}
//           value={formData.otherSourceSeedling}
//           onChangeText={v => updateField('otherSourceSeedling', v)}
//         />
//       </>
//     )}
//   </View>
// );

// // === STEP 3: Nutrient Management ===
// const Step3_NutrientManagement = ({ formData, updateField }) => (
//   <View>
//     <Text>Fertilizer Type</Text>
//     <Picker
//       selectedValue={formData.fertilizerType}
//       onValueChange={v => updateField('fertilizerType', v)}>
//       <Picker.Item label="Select Fertilizer Type" value="" />
//       <Picker.Item label="Organic" value="organic" />
//       <Picker.Item label="Inorganic" value="inorganic" />
//     </Picker>

//     {formData.fertilizerType && (
//       <>
//         <Text>Select Fertilizer(s)</Text>
//         {FERTILIZER_OPTIONS[formData.fertilizerType].map(opt => (
//           <TouchableOpacity
//             key={opt.value}
//             style={styles.checkboxContainer}
//             onPress={() =>
//               updateField('fertilizerList', prev =>
//                 prev.includes(opt.value)
//                   ? prev.filter(item => item !== opt.value)
//                   : [...prev, opt.value]
//               )
//             }>
//             <Text>{formData.fertilizerList.includes(opt.value) ? '☑️' : '⬜'} {opt.label}</Text>
//           </TouchableOpacity>
//         ))}
//       </>
//     )}

//     <Text>Use Pesticides?</Text>
//     <Switch
//       value={formData.usePesticides}
//       onValueChange={v => updateField('usePesticides', v)}
//     />

//     {formData.usePesticides && (
//       <>
//         <Text>Select Pesticides</Text>
//         {PESTICIDE_OPTIONS.map(opt => (
//           <TouchableOpacity
//             key={opt.value}
//             style={styles.checkboxContainer}
//             onPress={() =>
//               updateField('pesticideList', prev =>
//                 prev.includes(opt.value)
//                   ? prev.filter(item => item !== opt.value)
//                   : [...prev, opt.value]
//               )
//             }>
//             <Text>{formData.pesticideList.includes(opt.value) ? '☑️' : '⬜'} {opt.label}</Text>
//           </TouchableOpacity>
//         ))}
//       </>
//     )}
//   </View>
// );

// // === MAIN STEPPER COMPONENT ===
// const initialFormState = {
//   blockLetter: '', numTrees: '', ageTrees: '', typeCoffee: '', robustaSubtype: '',
//   plantedMonth: '', plantedYear: '', sourceSeedling: '', otherSourceSeedling: '',
//   fertilizerType: '', fertilizerList: [], usePesticides: false, pesticideList: [],
// };

// const STEPS = [
//   { title: 'Block Info', Component: Step1_BlockInfo, requiredFields: ['blockLetter'] },
//   { title: 'Tree Details', Component: Step2_TreeDetails, requiredFields: ['numTrees', 'ageTrees', 'typeCoffee', 'plantedMonth', 'plantedYear', 'sourceSeedling'] },
//   { title: 'Nutrient Management', Component: Step3_NutrientManagement, requiredFields: [] },
// ];

// const BlockRegistrationStepper = () => {
//   const [currentStep, setCurrentStep] = useState(0);
//   const [formData, setFormData] = useState(initialFormState);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showSuccessModal, setShowSuccessModal] = useState(false);
//   const [successMessage, setSuccessMessage] = useState('');

//   const updateField = useCallback((key, valueOrFn) => {
//     setFormData(prev => ({
//       ...prev,
//       [key]: typeof valueOrFn === 'function' ? valueOrFn(prev[key]) : valueOrFn,
//     }));
//   }, []);

//   const validateStep = stepIndex => {
//     const step = STEPS[stepIndex];
//     for (const field of step.requiredFields) {
//       const value = formData[field];
//       if (!value || String(value).trim() === '') {
//         return `Please fill in all required fields in ${step.title}.`;
//       }
//     }
//     return null;
//   };

//   const handleSubmit = async () => {
//     const validationError = validateStep(currentStep);
//     if (validationError) {
//       Alert.alert('Validation Error', validationError);
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const block = BLOCK_OPTIONS.find(opt => opt.value === formData.blockLetter);
//       const blockId = `${formData.blockLetter}-${String(block?.number || 0).padStart(2, '0')}-${generateUniqueSuffix()}`;
//       const finalData = { blockId, registrationDate: new Date().toISOString(), ...formData };

//       // 🔹 Replace this section once backend is ready
//       // await fetch('https://yourbackend.com/api/blocks', {
//       //   method: 'POST',
//       //   headers: { 'Content-Type': 'application/json' },
//       //   body: JSON.stringify(finalData),
//       // });

//       console.log("Data ready for API:", finalData);

//       setSuccessMessage(`Block ${formData.blockLetter} registered successfully!`);
//       setShowSuccessModal(true);
//       setFormData(initialFormState);
//       setCurrentStep(0);
//     } catch (error) {
//       console.error(error);
//       Alert.alert('Error', 'Failed to save block details.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const CurrentStepComponent = STEPS[currentStep].Component;

//   return (
//     <ScrollView contentContainerStyle={styles.scrollContainer}>
//       <SuccessModal
//         isVisible={showSuccessModal}
//         message={successMessage}
//         onClose={() => setShowSuccessModal(false)}
//       />
//       <View style={styles.container}>
//         <Text style={styles.heading}>
//           Register New Block: {STEPS[currentStep].title}
//         </Text>

//         <CurrentStepComponent formData={formData} updateField={updateField} />

//         <View style={styles.navigationContainer}>
//           {currentStep > 0 && (
//             <Button title="Back" onPress={() => setCurrentStep(currentStep - 1)} />
//           )}
//           {currentStep < STEPS.length - 1 ? (
//             <Button title="Next" onPress={() => {
//               const err = validateStep(currentStep);
//               if (err) Alert.alert('Error', err);
//               else setCurrentStep(currentStep + 1);
//             }} />
//           ) : (
//             <Button
//               title={isLoading ? 'Saving...' : 'Save Block'}
//               onPress={handleSubmit}
//               disabled={isLoading}
//               color="#4CAF50"
//             />
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// };

// // === STYLES ===
// const styles = StyleSheet.create({
//   scrollContainer: { padding: 16 },
//   container: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
//   heading: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
//   input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10 },
//   checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
//   navigationContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
// });

// const modalStyles = StyleSheet.create({
//   centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   modalView: { backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 5 },
//   modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
//   modalText: { marginBottom: 15 },
//   buttonClose: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5 },
//   textStyle: { color: 'white', fontWeight: 'bold' },
// });

// export default BlockRegistrationStepper;






// import React, { useState } from 'react';
// import { View, Text, TextInput, Switch, Button, StyleSheet } from 'react-native';
// // import uuid from 'react-native-uuid'; // REMOVED: Using native crypto.randomUUID() instead
// import { Picker } from '@react-native-picker/picker'; // Use @react-native-picker/picker for Picker component

// // Helper to generate a UUID (crypto is globally available in React Native environments)
// const generateUUID = () => {
//   // Fallback for environments that might not have crypto.randomUUID (though RN usually does)
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   // Simple timestamp fallback (not a true UUID, but prevents crash)
//   return 'temp-' + Date.now();
// };

// const fertilizerOptions = [
//   { label: 'Organic', value: 'organic' },
//   { label: 'Inorganic', value: 'inorganic' },
// ];

// const pesticideOptions = [
//   { label: 'None', value: '' },
//   { label: 'Herbicide', value: 'herbicide' },
//   { label: 'Fungicide', value: 'fungicide' },
//   { label: 'Insecticide', value: 'insecticide' },
// ];

// const BlockDetailsForm = ({ onSubmit }) => {
//   // Use the new helper function for generating a unique ID
//   const [blockId] = useState(generateUUID()); 
//   const [name, setName] = useState('');
//   const [numTrees, setNumTrees] = useState('');
//   const [ageTrees, setAgeTrees] = useState('');
//   const [typeCoffee, setTypeCoffee] = useState('');
//   const [monthYearPlanted, setMonthYearPlanted] = useState('');
//   const [sourceSeedling, setSourceSeedling] = useState('');
//   const [ageSeedling, setAgeSeedling] = useState('');
//   const [fertilizer, setFertilizer] = useState('organic');
//   const [usePesticides, setUsePesticides] = useState(false);
//   // Filter out the 'None' option since it's just a placeholder and doesn't need to be saved
//   const [pesticideList, setPesticideList] = useState([]); 

//   const handleSubmit = () => {
//     // Basic validation check (optional, but good practice)
//     if (!name.trim() || !numTrees || !ageTrees) {
//       console.log("Please fill required fields.");
//       // In RN, you'd use Alert.alert here, but we'll use console.log for the example
//       return; 
//     }

//     const details = {
//       blockId,
//       name,
//       numTrees: Number(numTrees), // Convert to number for better data structure
//       ageTrees,
//       typeCoffee,
//       monthYearPlanted,
//       sourceSeedling,
//       ageSeedling,
//       fertilizer,
//       usePesticides,
//       // Only submit selected pesticides (excluding the empty '' value)
//       pesticideList: pesticideList.filter(p => p !== ''), 
//     };
//     if (onSubmit) onSubmit(details);
    
//     // Optional: Add form reset logic here after successful submission
//     console.log('Block details submitted:', details);
//   };

//   const handlePesticideToggle = (value, isSelected) => {
//     setPesticideList(list => {
//       if (isSelected) {
//         // Add the value if it's selected and not already in the list
//         if (!list.includes(value)) {
//             return [...list, value];
//         }
//       } else {
//         // Remove the value if it's deselected
//         return list.filter(item => item !== value);
//       }
//       return list; // Return list unchanged if no action taken
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.heading}>Block Details Form</Text>
      
//       {/* Block ID Display (for debug/info) */}
//       <Text style={[styles.label, {marginTop: 0}]}>Block ID</Text>
//       <Text style={styles.idText}>{blockId}</Text>

//       <Text style={styles.label}>Block Name</Text>
//       <TextInput 
//         value={name} 
//         onChangeText={setName} 
//         style={styles.input} 
//         placeholder="e.g. Block A" 
//       />

//       <Text style={styles.label}>Number of Trees</Text>
//       <TextInput 
//         value={numTrees} 
//         onChangeText={setNumTrees} 
//         style={styles.input} 
//         keyboardType="numeric" 
//         placeholder="e.g. 500"
//       />

//       <Text style={styles.label}>Age of Trees (Years)</Text>
//       <TextInput 
//         value={ageTrees} 
//         onChangeText={setAgeTrees} 
//         style={styles.input} 
//         keyboardType="numeric" // Assuming age is a number
//         placeholder="e.g. 3"
//       />

//       <Text style={styles.label}>Type of Coffee</Text>
//       <TextInput 
//         value={typeCoffee} 
//         onChangeText={setTypeCoffee} 
//         style={styles.input} 
//         placeholder="e.g. Robusta, Arabica"
//       />

//       <Text style={styles.label}>Month and Year Planted</Text>
//       <TextInput 
//         value={monthYearPlanted} 
//         onChangeText={setMonthYearPlanted} 
//         style={styles.input} 
//         placeholder="e.g. May 2023"
//       />

//       <Text style={styles.label}>Source of Seedling</Text>
//       <TextInput 
//         value={sourceSeedling} 
//         onChangeText={setSourceSeedling} 
//         style={styles.input} 
//         placeholder="e.g. Local Nursery, Private Farm"
//       />

//       <Text style={styles.label}>Age of Seedling (Months)</Text>
//       <TextInput 
//         value={ageSeedling} 
//         onChangeText={setAgeSeedling} 
//         style={styles.input} 
//         keyboardType="numeric" // Assuming age is a number
//         placeholder="e.g. 6"
//       />

//       <Text style={styles.label}>Fertilizer Type</Text>
//       <View style={styles.pickerWrap}>
//         <Picker
//           selectedValue={fertilizer}
//           onValueChange={setFertilizer}
//           style={styles.picker}
//         >
//           {fertilizerOptions.map(opt => (
//             <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
//           ))}
//         </Picker>
//       </View>

//       <View style={styles.switchRow}>
//         <Text style={styles.label}>Use Pesticides?</Text>
//         <Switch 
//           value={usePesticides} 
//           onValueChange={setUsePesticides} 
//           style={styles.switchControl}
//         />
//       </View>

//       {usePesticides && (
//         <View style={styles.pesticideGroup}>
//           <Text style={styles.label}>Select Pesticides Used</Text>
//           {pesticideOptions.filter(opt => opt.value !== '').map(opt => (
//             <View key={opt.value} style={styles.checkboxRow}>
//               <Text style={styles.checkboxLabel}>{opt.label}</Text>
//               <Switch
//                 // Only allow switching if usePesticides is true
//                 value={pesticideList.includes(opt.value)}
//                 onValueChange={val => handlePesticideToggle(opt.value, val)}
//               />
//             </View>
//           ))}
//         </View>
//       )}

//       <View style={styles.buttonContainer}>
//         <Button 
//           title="Save Block Details" 
//           onPress={handleSubmit} 
//           color="#4CAF50" // A nice green color
//         />
//       </View>
//       <View style={{ height: 40 }} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { 
//     padding: 20, 
//     backgroundColor: '#f8f8f8', // Light background
//     borderRadius: 10,
//     margin: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   heading: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   idText: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 8,
//   },
//   label: { 
//     fontWeight: '600', 
//     marginTop: 15, 
//     marginBottom: 5,
//     fontSize: 16,
//     color: '#444',
//   },
//   input: { 
//     borderWidth: 1, 
//     borderColor: '#ddd', 
//     backgroundColor: '#fff',
//     borderRadius: 8, 
//     padding: 10, 
//     fontSize: 16,
//   },
//   pickerWrap: {
//     borderWidth: 1, 
//     borderColor: '#ddd', 
//     backgroundColor: '#fff',
//     borderRadius: 8, 
//     overflow: 'hidden', // Ensures picker boundary is respected
//   },
//   picker: {
//     height: 50,
//     width: '100%',
//   },
//   switchRow: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     justifyContent: 'space-between',
//     marginTop: 15,
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },
//   switchControl: {
//     // Platform specific switch styling might be needed in a real app
//     transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }], // Make switch a bit larger
//   },
//   pesticideGroup: {
//     marginTop: 10,
//     padding: 10,
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   checkboxRow: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     justifyContent: 'space-between', 
//     marginTop: 8,
//     paddingVertical: 5,
//     borderBottomWidth: 0.5,
//     borderBottomColor: '#f0f0f0',
//   },
//   checkboxLabel: {
//     fontSize: 15,
//     color: '#333',
//   },
//   buttonContainer: {
//     marginTop: 25,
//     borderRadius: 8,
//     overflow: 'hidden', // Ensures button background color fills container
//   }
// });

// export default BlockDetailsForm;



// // // src/features/blocks/BlockDetailsForm.js
// // import React, { useState } from 'react';
// // import { View, Text, TextInput, Picker, Switch, Button, StyleSheet } from 'react-native';
// // import uuid from 'react-native-uuid';

// // const fertilizerOptions = [
// //   { label: 'Organic', value: 'organic' },
// //   { label: 'Inorganic', value: 'inorganic' },
// // ];

// // const pesticideOptions = [
// //   { label: 'None', value: '' },
// //   { label: 'Herbicide', value: 'herbicide' },
// //   { label: 'Fungicide', value: 'fungicide' },
// //   { label: 'Insecticide', value: 'insecticide' },
// // ];

// // const BlockDetailsForm = ({ onSubmit }) => {
// //   const [blockId] = useState(uuid.v4());
// //   const [name, setName] = useState('');
// //   const [numTrees, setNumTrees] = useState('');
// //   const [ageTrees, setAgeTrees] = useState('');
// //   const [typeCoffee, setTypeCoffee] = useState('');
// //   const [monthYearPlanted, setMonthYearPlanted] = useState('');
// //   const [sourceSeedling, setSourceSeedling] = useState('');
// //   const [ageSeedling, setAgeSeedling] = useState('');
// //   const [fertilizer, setFertilizer] = useState('organic');
// //   const [usePesticides, setUsePesticides] = useState(false);
// //   const [pesticideList, setPesticideList] = useState([]);

// //   const handleSubmit = () => {
// //     const details = {
// //       blockId,
// //       name,
// //       numTrees,
// //       ageTrees,
// //       typeCoffee,
// //       monthYearPlanted,
// //       sourceSeedling,
// //       ageSeedling,
// //       fertilizer,
// //       usePesticides,
// //       pesticideList,
// //     };
// //     if (onSubmit) onSubmit(details);
// //   };

// //   return (
// //     <View style={styles.container}>
// //       <Text style={styles.label}>Block Name</Text>
// //       <TextInput value={name} onChangeText={setName} style={styles.input} />

// //       <Text style={styles.label}>Number of Trees</Text>
// //       <TextInput value={numTrees} onChangeText={setNumTrees} style={styles.input} keyboardType="numeric" />

// //       <Text style={styles.label}>Age of Trees</Text>
// //       <TextInput value={ageTrees} onChangeText={setAgeTrees} style={styles.input} />

// //       <Text style={styles.label}>Type of Coffee</Text>
// //       <TextInput value={typeCoffee} onChangeText={setTypeCoffee} style={styles.input} />

// //       <Text style={styles.label}>Month and Year Planted</Text>
// //       <TextInput value={monthYearPlanted} onChangeText={setMonthYearPlanted} style={styles.input} />

// //       <Text style={styles.label}>Source of Seedling</Text>
// //       <TextInput value={sourceSeedling} onChangeText={setSourceSeedling} style={styles.input} />

// //       <Text style={styles.label}>Age of Seedling</Text>
// //       <TextInput value={ageSeedling} onChangeText={setAgeSeedling} style={styles.input} />

// //       <Text style={styles.label}>Fertilizer</Text>
// //       <Picker
// //         selectedValue={fertilizer}
// //         onValueChange={setFertilizer}
// //         style={styles.input}
// //       >
// //         {fertilizerOptions.map(opt => (
// //           <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
// //         ))}
// //       </Picker>

// //       <View style={styles.switchRow}>
// //         <Text style={styles.label}>Use Pesticides?</Text>
// //         <Switch value={usePesticides} onValueChange={setUsePesticides} />
// //       </View>

// //       {usePesticides && (
// //         <View>
// //           <Text style={styles.label}>Select Pesticides</Text>
// //           {pesticideOptions.map(opt => (
// //             <View key={opt.value} style={styles.checkboxRow}>
// //               <Text>{opt.label}</Text>
// //               <Switch
// //                 value={pesticideList.includes(opt.value)}
// //                 onValueChange={val => {
// //                   setPesticideList(list =>
// //                     val
// //                       ? [...list, opt.value]
// //                       : list.filter(item => item !== opt.value)
// //                   );
// //                 }}
// //               />
// //             </View>
// //           ))}
// //         </View>
// //       )}

// //       <Button title="Save Block" onPress={handleSubmit} />
// //     </View>
// //   );
// // };

// // const styles = StyleSheet.create({
// //   container: { padding: 16 },
// //   label: { fontWeight: 'bold', marginTop: 12 },
// //   input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 },
// //   switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
// //   checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
// // });

// // export default BlockDetailsForm;

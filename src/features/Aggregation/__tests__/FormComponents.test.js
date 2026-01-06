import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
    CustomInput,
    CustomPicker,
    CustomDatePicker,
    CustomMultiSelect,
    AutocompleteInput,
    StepIndicator
} from '../components/FormComponents';

// Mock styles object
const mockStyles = {
    inputLabel: { fontSize: 14, color: '#333' },
    textInput: { borderWidth: 1, padding: 10 },
    readOnlyInput: { backgroundColor: '#f0f0f0' },
    errorInput: { borderColor: 'red' },
    errorText: { color: 'red', fontSize: 12 },
    pickerContainer: { borderWidth: 1 },
    pickerButton: { padding: 10 },
    pickerButtonText: { fontSize: 14 },
    picker: { height: 50 },
    pickerModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalPickerContent: { backgroundColor: 'white', padding: 20 },
    modalPickerHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    modalPickerTitle: { fontSize: 18, fontWeight: 'bold' },
    modalPickerItem: { padding: 15 },
    modalPickerItemSelected: { backgroundColor: '#f0f0f0' },
    modalPickerItemText: { fontSize: 16 },
    modalPickerItemTextSelected: { fontWeight: 'bold' },
    multiSelectButton: { padding: 10, borderWidth: 1 },
    multiSelectText: { fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    multiSelectModal: { backgroundColor: 'white', padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    multiSelectScroll: { maxHeight: 300 },
    multiSelectItem: { padding: 10, flexDirection: 'row', justifyContent: 'space-between' },
    multiSelectItemText: { fontSize: 14 },
    checkbox: { width: 20, height: 20, borderWidth: 1 },
    modalCloseButton: { padding: 10, backgroundColor: '#333' },
    modalCloseText: { color: 'white', textAlign: 'center' },
    datePickerButton: { padding: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
    datePickerText: { fontSize: 14 },
    autocompleteDropdown: { backgroundColor: 'white', borderWidth: 1 },
    autocompleteScroll: { maxHeight: 200 },
    autocompleteSuggestion: { padding: 10, flexDirection: 'row', justifyContent: 'space-between' },
    autocompleteName: { fontSize: 14, fontWeight: 'bold' },
    autocompleteDetails: { fontSize: 12, color: '#666' },
    autocompleteClose: { padding: 10, backgroundColor: '#333' },
    autocompleteCloseText: { color: 'white', textAlign: 'center' },
    stepIndicatorContainer: { marginVertical: 20 },
    stepCirclesContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    stepItemWrapper: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    stepCircleCompleted: { backgroundColor: '#4CAF50' },
    stepCircleActive: { backgroundColor: '#2196F3' },
    stepCircleText: { fontSize: 12 },
    stepCircleTextActive: { color: 'white' },
    stepConnector: { width: 50, height: 2, backgroundColor: '#ccc' },
    stepConnectorTwoStep: { width: 100, height: 2, backgroundColor: '#ccc' },
    stepConnectorActive: { backgroundColor: '#4CAF50' },
    stepConnectorTwoStepActive: { backgroundColor: '#4CAF50' },
    stepLabelsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    stepLabelWrapper: { flex: 1, alignItems: 'center' },
    stepLabel: { fontSize: 12, color: '#666' },
    stepLabelActive: { fontWeight: 'bold', color: '#333' },
};

describe('FormComponents', () => {
    describe('CustomInput', () => {
        it('renders correctly with label and value', () => {
            const { getByText, getByDisplayValue } = render(
                <CustomInput
                    label="Test Label"
                    value="Test Value"
                    onChangeText={() => {}}
                    styles={mockStyles}
                />
            );

            expect(getByText('Test Label')).toBeTruthy();
            expect(getByDisplayValue('Test Value')).toBeTruthy();
        });

        it('calls onChangeText when text changes', () => {
            const mockOnChange = jest.fn();
            const { getByDisplayValue } = render(
                <CustomInput
                    label="Test Label"
                    value="Initial"
                    onChangeText={mockOnChange}
                    styles={mockStyles}
                />
            );

            const input = getByDisplayValue('Initial');
            fireEvent.changeText(input, 'New Value');

            expect(mockOnChange).toHaveBeenCalledWith('New Value');
        });

        it('displays error message when error prop is provided', () => {
            const { getByText } = render(
                <CustomInput
                    label="Test Label"
                    value=""
                    onChangeText={() => {}}
                    error="This field is required"
                    styles={mockStyles}
                />
            );

            expect(getByText('This field is required')).toBeTruthy();
        });

        it('is disabled when editable is false', () => {
            const { getByDisplayValue } = render(
                <CustomInput
                    label="Test Label"
                    value="Read Only"
                    onChangeText={() => {}}
                    editable={false}
                    styles={mockStyles}
                />
            );

            const input = getByDisplayValue('Read Only');
            expect(input.props.editable).toBe(false);
        });
    });

    describe('CustomPicker', () => {
        const items = ['Option 1', 'Option 2', 'Option 3'];

        it('renders with selected value', () => {
            const { getByText } = render(
                <CustomPicker
                    label="Select Option"
                    selectedValue="Option 1"
                    onValueChange={() => {}}
                    items={items}
                    styles={mockStyles}
                />
            );

            expect(getByText('Select Option')).toBeTruthy();
            expect(getByText('Option 1')).toBeTruthy();
        });

        it('opens modal when button is pressed', () => {
            const { getByText, queryByText } = render(
                <CustomPicker
                    label="Select Option"
                    selectedValue=""
                    onValueChange={() => {}}
                    items={items}
                    styles={mockStyles}
                />
            );

            const button = getByText('-- Select --');
            fireEvent.press(button);

            // Modal should now be visible with options
            expect(queryByText('Option 1')).toBeTruthy();
            expect(queryByText('Option 2')).toBeTruthy();
        });

        it('calls onValueChange when option is selected', () => {
            const mockOnChange = jest.fn();
            const { getByText } = render(
                <CustomPicker
                    label="Select Option"
                    selectedValue=""
                    onValueChange={mockOnChange}
                    items={items}
                    styles={mockStyles}
                />
            );

            const button = getByText('-- Select --');
            fireEvent.press(button);

            const option = getByText('Option 2');
            fireEvent.press(option);

            expect(mockOnChange).toHaveBeenCalledWith('Option 2');
        });
    });

    describe('CustomMultiSelect', () => {
        const items = ['Practice 1', 'Practice 2', 'Practice 3'];

        it('renders with no selections initially', () => {
            const { getByText } = render(
                <CustomMultiSelect
                    label="Select Practices"
                    selectedValues={[]}
                    onValueChange={() => {}}
                    items={items}
                    styles={mockStyles}
                />
            );

            expect(getByText('Select Practices')).toBeTruthy();
            expect(getByText('Select seedling line')).toBeTruthy();
        });

        it('displays selected values', () => {
            const { getByText } = render(
                <CustomMultiSelect
                    label="Select Practices"
                    selectedValues={['Practice 1', 'Practice 2']}
                    onValueChange={() => {}}
                    items={items}
                    styles={mockStyles}
                />
            );

            expect(getByText('Practice 1, Practice 2')).toBeTruthy();
        });

        it('toggles selection when item is pressed', () => {
            const mockOnChange = jest.fn();
            const { getByText } = render(
                <CustomMultiSelect
                    label="Select Practices"
                    selectedValues={['Practice 1']}
                    onValueChange={mockOnChange}
                    items={items}
                    styles={mockStyles}
                />
            );

            const button = getByText('Practice 1');
            fireEvent.press(button);

            const practice2 = getByText('Practice 2');
            fireEvent.press(practice2);

            expect(mockOnChange).toHaveBeenCalledWith(['Practice 1', 'Practice 2']);
        });
    });

    describe('AutocompleteInput', () => {
        const mockSuggestions = [
            { farmer_id: 'F001', first_name: 'John', last_name: 'Doe', contact: '0700123456' },
            { farmer_id: 'F002', first_name: 'Jane', last_name: 'Smith', contact: '0700654321' },
        ];

        it('renders input field', () => {
            const { getByPlaceholderText } = render(
                <AutocompleteInput
                    label="Farmer UID"
                    value=""
                    onChangeText={() => {}}
                    onSelect={() => {}}
                    suggestions={mockSuggestions}
                    placeholder="Search farmer..."
                    styles={mockStyles}
                />
            );

            expect(getByPlaceholderText('Search farmer...')).toBeTruthy();
        });

        it('shows suggestions when typing', async () => {
            const { getByPlaceholderText, getByText } = render(
                <AutocompleteInput
                    label="Farmer UID"
                    value="John"
                    onChangeText={() => {}}
                    onSelect={() => {}}
                    suggestions={mockSuggestions}
                    placeholder="Search farmer..."
                    styles={mockStyles}
                />
            );

            await waitFor(() => {
                expect(getByText('John Doe')).toBeTruthy();
            });
        });

        it('calls onSelect when suggestion is clicked', async () => {
            const mockOnSelect = jest.fn();
            const { getByText } = render(
                <AutocompleteInput
                    label="Farmer UID"
                    value="John"
                    onChangeText={() => {}}
                    onSelect={mockOnSelect}
                    suggestions={mockSuggestions}
                    placeholder="Search farmer..."
                    styles={mockStyles}
                />
            );

            await waitFor(() => {
                const suggestion = getByText('John Doe');
                fireEvent.press(suggestion);
            });

            expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0], 'F001');
        });
    });

    describe('StepIndicator', () => {
        const steps = [
            { title: 'Personal Info' },
            { title: 'Location' },
            { title: 'Farm Details' },
        ];

        it('renders all steps', () => {
            const { getByText } = render(
                <StepIndicator
                    currentStep={1}
                    totalSteps={3}
                    steps={steps}
                    styles={mockStyles}
                />
            );

            expect(getByText('Personal Info')).toBeTruthy();
            expect(getByText('Location')).toBeTruthy();
            expect(getByText('Farm Details')).toBeTruthy();
        });

        it('highlights current step', () => {
            const { getByText } = render(
                <StepIndicator
                    currentStep={2}
                    totalSteps={3}
                    steps={steps}
                    styles={mockStyles}
                />
            );

            const step1 = getByText('1');
            const step2 = getByText('2');

            expect(step1.parent.props.style).toContainEqual(mockStyles.stepCircleCompleted);
            expect(step2.parent.props.style).toContainEqual(mockStyles.stepCircleActive);
        });
    });
});

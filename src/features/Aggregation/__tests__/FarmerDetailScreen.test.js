import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FarmerDetailScreen from '../screens/FarmerDetailScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
    goBack: mockGoBack,
};

// Mock route with farmer data
const mockRoute = {
    params: {
        farmer: {
            farmer_id: 'FD123456',
            first_name: 'John',
            last_name: 'Doe',
            gender: 'Male',
            nin: '1234567890123',
            date_of_birth: '1980-01-15',
            contact: '0700123456',
            email: 'john.doe@example.com',
            in_cooperative: true,
            cooperative: 'Rugyeyo Coffee Cooperative',
            started_farming: '2015',
            district: 'Kisoro',
            sub_county: 'Nyakabande',
            parish: 'Nyarusiza',
            village: 'Kanaba',
            gps: '1.2345,-29.6789',
            nearest_landmark: 'Near the main road',
            uid: 'FD123456',
            coffee_variety: 'Arabica',
            no_of_trees: '500',
            all_your_trees: true,
            other_farms: '',
            planted_date: '2015-03-01',
            spacing: '2x2 meters',
            land_ownership: 'Owned',
            deforested: false,
            seedling_source: 'Government nursery',
            seedling_type: ['SL28', 'SL34'],
            age_of_seedlings: '3 months',
            practices: ['Mulching', 'Pruning'],
            irrigation: 'Rainfed',
            fertilizers: ['Organic compost'],
            uses_pesticides: false,
            pesticides: [],
        },
    },
};

describe('FarmerDetailScreen', () => {
    it('renders without crashing', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Farmer Details')).toBeTruthy();
    });

    it('displays farmer name', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('John Doe')).toBeTruthy();
    });

    it('displays farmer ID', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('FD123456')).toBeTruthy();
    });

    it('displays personal information', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Personal Information')).toBeTruthy();
        expect(getByText('Male')).toBeTruthy();
        expect(getByText('0700123456')).toBeTruthy();
        expect(getByText('john.doe@example.com')).toBeTruthy();
    });

    it('displays location information', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Location & Identification')).toBeTruthy();
        expect(getByText('Kisoro')).toBeTruthy();
        expect(getByText('Nyakabande')).toBeTruthy();
        expect(getByText('Nyarusiza')).toBeTruthy();
        expect(getByText('Kanaba')).toBeTruthy();
    });

    it('displays farm details', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Farm Details')).toBeTruthy();
        expect(getByText('Arabica')).toBeTruthy();
        expect(getByText('500')).toBeTruthy();
        expect(getByText('2x2 meters')).toBeTruthy();
    });

    it('displays farming practices', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Farming Practices')).toBeTruthy();
        expect(getByText('Mulching, Pruning')).toBeTruthy();
        expect(getByText('Rainfed')).toBeTruthy();
    });

    it('calls navigation.goBack when back button is pressed', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        const backButton = getByText('Back');
        fireEvent.press(backButton);

        expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles missing farmer data gracefully', () => {
        const emptyRoute = {
            params: {
                farmer: {},
            },
        };

        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={emptyRoute} />
        );

        // Should still render the screen without crashing
        expect(getByText('Farmer Details')).toBeTruthy();
    });

    it('displays boolean values correctly', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        // in_cooperative is true
        expect(getByText('Rugyeyo Coffee Cooperative')).toBeTruthy();

        // all_your_trees is true
        expect(getByText('Yes')).toBeTruthy();

        // uses_pesticides is false
        expect(getByText('No')).toBeTruthy();
    });

    it('displays array values as comma-separated strings', () => {
        const { getByText } = render(
            <FarmerDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('SL28, SL34')).toBeTruthy();
        expect(getByText('Mulching, Pruning')).toBeTruthy();
        expect(getByText('Organic compost')).toBeTruthy();
    });
});

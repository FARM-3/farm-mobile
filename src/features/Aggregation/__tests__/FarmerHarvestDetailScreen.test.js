import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FarmerHarvestDetailScreen from '../screens/FarmerHarvestDetailScreen';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
    goBack: mockGoBack,
};

// Mock farmers list
const mockFarmersList = [
    {
        farmer_id: 'FD001',
        first_name: 'John',
        last_name: 'Doe',
        uid: 'FD001',
    },
    {
        farmer_id: 'FD002',
        first_name: 'Jane',
        last_name: 'Smith',
        uid: 'FD002',
    },
];

// Mock route with harvest data
const mockRoute = {
    params: {
        harvest: {
            harvest_id: 'PA789012',
            farmer_uid: 'FD001',
            farmer_name: 'John Doe',
            weight_on_delivery: '50',
            location_of_delivery: 'Rugyeyo Station',
            custom_location: '',
            gps_coordinates_delivery: '1.2345,-29.6789',
            date_of_delivery: '2024-01-15',
            coffee_type: 'Cherry',
            price_per_kg: '4,600',
            amount_paid: '230,000',
            paid_by_option: 'John Staff',
            paid_by: 'staff123',
        },
        farmersList: mockFarmersList,
    },
};

// Mock getStaffById
jest.mock('../../../services/staffService', () => ({
    getStaffById: jest.fn((id) => {
        if (id === 'staff123') {
            return Promise.resolve({ id: 'staff123', name: 'John Staff', first_name: 'John', last_name: 'Staff' });
        }
        return Promise.resolve(null);
    }),
}));

describe('FarmerHarvestDetailScreen', () => {
    it('renders without crashing', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Harvest Details')).toBeTruthy();
    });

    it('displays harvest ID', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('PA789012')).toBeTruthy();
    });

    it('displays farmer name', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('John Doe')).toBeTruthy();
    });

    it('displays harvest details', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Harvest Information')).toBeTruthy();
        expect(getByText('50 kg')).toBeTruthy();
        expect(getByText('Cherry')).toBeTruthy();
        expect(getByText('2024-01-15')).toBeTruthy();
    });

    it('displays delivery location', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Delivery Information')).toBeTruthy();
        expect(getByText('Rugyeyo Station')).toBeTruthy();
        expect(getByText('1.2345,-29.6789')).toBeTruthy();
    });

    it('displays payment information', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('Payment Information')).toBeTruthy();
        expect(getByText('UGX 4,600')).toBeTruthy();
        expect(getByText('UGX 230,000')).toBeTruthy();
    });

    it('calls navigation.goBack when back button is pressed', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        const backButton = getByText('Back');
        fireEvent.press(backButton);

        expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles missing harvest data gracefully', () => {
        const emptyRoute = {
            params: {
                harvest: {},
                farmersList: [],
            },
        };

        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={emptyRoute} />
        );

        // Should still render the screen without crashing
        expect(getByText('Harvest Details')).toBeTruthy();
    });

    it('displays N/A for missing fields', () => {
        const minimalRoute = {
            params: {
                harvest: {
                    harvest_id: 'PA000000',
                },
                farmersList: [],
            },
        };

        const { getAllByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={minimalRoute} />
        );

        // Should display N/A for missing data
        const naElements = getAllByText('N/A');
        expect(naElements.length).toBeGreaterThan(0);
    });

    it('looks up farmer from farmersList when farmer_name is missing', () => {
        const routeWithoutName = {
            params: {
                harvest: {
                    harvest_id: 'PA789012',
                    farmer_uid: 'FD002',
                    weight_on_delivery: '50',
                },
                farmersList: mockFarmersList,
            },
        };

        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={routeWithoutName} />
        );

        // Should look up and display farmer name from farmersList
        expect(getByText('Jane Smith')).toBeTruthy();
    });

    it('formats weight with kg suffix', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('50 kg')).toBeTruthy();
    });

    it('formats currency with UGX prefix', () => {
        const { getByText } = render(
            <FarmerHarvestDetailScreen navigation={mockNavigation} route={mockRoute} />
        );

        expect(getByText('UGX 4,600')).toBeTruthy();
        expect(getByText('UGX 230,000')).toBeTruthy();
    });
});

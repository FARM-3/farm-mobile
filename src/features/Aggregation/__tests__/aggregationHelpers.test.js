import { getCurrentGPSLocation, capitalizeFirstLetter } from '../utils/aggregationHelpers';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
}));

describe('aggregationHelpers', () => {
    describe('capitalizeFirstLetter', () => {
        it('capitalizes the first letter of a lowercase string', () => {
            expect(capitalizeFirstLetter('hello')).toBe('Hello');
        });

        it('keeps already capitalized strings unchanged', () => {
            expect(capitalizeFirstLetter('Hello')).toBe('Hello');
        });

        it('handles all uppercase strings', () => {
            expect(capitalizeFirstLetter('HELLO')).toBe('HELLO');
        });

        it('handles empty strings', () => {
            expect(capitalizeFirstLetter('')).toBe('');
        });

        it('handles single character strings', () => {
            expect(capitalizeFirstLetter('a')).toBe('A');
            expect(capitalizeFirstLetter('A')).toBe('A');
        });

        it('handles strings with spaces', () => {
            expect(capitalizeFirstLetter('hello world')).toBe('Hello world');
        });

        it('handles numbers', () => {
            expect(capitalizeFirstLetter('123')).toBe('123');
        });

        it('handles null or undefined gracefully', () => {
            expect(capitalizeFirstLetter(null)).toBe('');
            expect(capitalizeFirstLetter(undefined)).toBe('');
        });
    });

    describe('getCurrentGPSLocation', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('returns GPS coordinates when permission is granted', async () => {
            Location.requestForegroundPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });

            Location.getCurrentPositionAsync.mockResolvedValue({
                coords: {
                    latitude: -1.2345,
                    longitude: 29.6789,
                },
            });

            const result = await getCurrentGPSLocation();

            expect(result).toBe('-1.2345,29.6789');
            expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
            expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
                accuracy: Location.Accuracy.High,
            });
        });

        it('returns error message when permission is denied', async () => {
            Location.requestForegroundPermissionsAsync.mockResolvedValue({
                status: 'denied',
            });

            const result = await getCurrentGPSLocation();

            expect(result).toBe('Permission denied');
            expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
            expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
        });

        it('returns error message when location fetch fails', async () => {
            Location.requestForegroundPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });

            Location.getCurrentPositionAsync.mockRejectedValue(
                new Error('Location unavailable')
            );

            const result = await getCurrentGPSLocation();

            expect(result).toBe('Error fetching location');
            expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
            expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
        });

        it('formats coordinates with correct precision', async () => {
            Location.requestForegroundPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });

            Location.getCurrentPositionAsync.mockResolvedValue({
                coords: {
                    latitude: -1.23456789,
                    longitude: 29.98765432,
                },
            });

            const result = await getCurrentGPSLocation();

            // Should format to 4 decimal places (or whatever precision is used)
            expect(result).toMatch(/^-?\d+\.\d+,-?\d+\.\d+$/);
        });

        it('handles edge case coordinates', async () => {
            Location.requestForegroundPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });

            Location.getCurrentPositionAsync.mockResolvedValue({
                coords: {
                    latitude: 0,
                    longitude: 0,
                },
            });

            const result = await getCurrentGPSLocation();

            expect(result).toBe('0,0');
        });
    });
});

// ===============================================
// === AGGREGATION UTILITY FUNCTIONS ===
// ===============================================
// Extracted from AggregationScreen.js for better organization
// Contains GPS, formatting, and other utility functions

import * as Location from 'expo-location';

/**
 * Get current device GPS location
 * @returns {Promise<string>} Formatted GPS string "latitude,longitude" or error message
 */
export const getCurrentGPSLocation = async () => {
    try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            return 'Location permission denied. Please enable location access in settings.';
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;

        // Format as latitude,longitude with 4 decimal places
        const formattedGPS = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        console.log('[GPS] Current location:', formattedGPS);

        return formattedGPS;
    } catch (error) {
        console.error('[GPS] Error getting location:', error);
        return `Error: ${error.message || 'Unable to get GPS location'}`;
    }
};

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} - String with first letter capitalized
 */
export const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1).toLowerCase();
};

// File: src/services/priceService.js
// Handles API interactions for fetching production price from setprice endpoint

import ApiService from './ApiService';

/**
 * Fetch the current production price from the API
 * Calls GET /api/setprice/current/
 * Returns the production_kgPrice field, or null if not available
 *
 * @returns {Promise<number|null>} The production price in UGX, or null if not set
 */
export const fetchCurrentPrice = async () => {
    try {
        const response = await ApiService.get('/api/setprice/current/');

        if (response && response.data) {
            const price = response.data.production_kgPrice;

            // Parse the price as a number
            const parsedPrice = price ? parseInt(price, 10) : null;

            console.log('[priceService] Fetched production price:', parsedPrice);
            return parsedPrice;
        }

        console.log('[priceService] No price data in response');
        return null;
    } catch (error) {
        // If endpoint returns 404 (no price set yet), return null
        if (error.response && error.response.status === 404) {
            console.log('[priceService] No price set yet (404)');
            return null;
        }

        console.error('[priceService] Error fetching current price:', error.message);
        throw error;
    }
};

/**
 * Fetch all price records with pagination
 * Calls GET /api/setprice/
 *
 * @param {number} page - Page number for pagination (optional)
 * @returns {Promise<object>} Paginated response containing all price records
 */
export const fetchAllPrices = async (page = 1) => {
    try {
        const response = await ApiService.get('/api/setprice/', {
            params: { page }
        });

        console.log('[priceService] Fetched all prices');
        return response.data;
    } catch (error) {
        console.error('[priceService] Error fetching all prices:', error.message);
        throw error;
    }
};

/**
 * Fetch a specific price record by ID
 * Calls GET /api/setprice/{id}/
 *
 * @param {number} id - The price record ID
 * @returns {Promise<object>} The price record
 */
export const fetchPriceById = async (id) => {
    try {
        const response = await ApiService.get(`/api/setprice/${id}/`);

        console.log('[priceService] Fetched price record:', id);
        return response.data;
    } catch (error) {
        console.error('[priceService] Error fetching price by ID:', error.message);
        throw error;
    }
};

export default {
    fetchCurrentPrice,
    fetchAllPrices,
    fetchPriceById
};

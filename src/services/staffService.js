/**
 * Staff Service - Handles all staff-related API interactions
 * Fetches staff members from the database and provides search/filtering utilities
 */

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STAFF_CACHE_KEY = 'staff_cache';
const STAFF_CACHE_EXPIRY_KEY = 'staff_cache_expiry';
const CACHE_DURATION_MS = 3600000; // 1 hour cache

/**
 * Formats staff name from API response
 * Handles various API response formats for staff names
 * @param {object} staff - Staff object from API
 * @returns {string} Formatted full name
 */
const formatStaffName = (staff) => {
    // Try different field names the API might use
    const firstName = staff.first_name || staff.firstName || '';
    const lastName = staff.last_name || staff.lastName || '';
    const fullName = staff.full_name || staff.fullName || staff.name || '';

    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    } else if (fullName) {
        return fullName;
    } else if (firstName) {
        return firstName;
    } else if (lastName) {
        return lastName;
    } else {
        return staff.username || staff.email || 'Unknown Staff';
    }
};

/**
 * Fetches all staff members from the API
 * Includes caching to reduce API calls
 *
 * @returns {Promise} { success: boolean, staff: Array, cachedAt?: timestamp }
 */
export const fetchAllStaff = async (useCache = true) => {
    try {
        // Check cache first if enabled
        if (useCache) {
            const cached = await getStaffCache();
            if (cached) {
                console.log('[staffService] Using cached staff data');
                return { success: true, staff: cached, fromCache: true };
            }
        }

        console.log('[staffService] Fetching staff from API...');
        const endpoint = 'users/'; // Endpoint to fetch all users/staff

        const response = await ApiService.get(endpoint);

        let staffList = [];

        // Handle different response formats
        if (Array.isArray(response.data)) {
            // Direct array response
            staffList = response.data;
        } else if (response.data && Array.isArray(response.data.results)) {
            // Paginated response { results: [...] }
            staffList = response.data.results;
        } else if (response.data && Array.isArray(response.data.data)) {
            // Alternative nested format { data: [...] }
            staffList = response.data.data;
        } else {
            console.warn('[staffService] Unexpected API response format:', response.data);
            staffList = [];
        }

        // Transform API staff data to internal format
        const formattedStaff = staffList.map((staff, index) => ({
            id: staff.id || staff.pk || staff._id || `staff_${index}`,
            displayName: formatStaffName(staff),
            firstName: staff.first_name || staff.firstName || '',
            lastName: staff.last_name || staff.lastName || '',
            email: staff.email || '',
            role: staff.role || staff.position || '',
            username: staff.username || '',
            // Keep original data for reference
            __raw: staff,
        }));

        console.log(`[staffService] Fetched ${formattedStaff.length} staff members`);

        // Cache the results
        if (useCache) {
            await cacheStaffData(formattedStaff);
        }

        return { success: true, staff: formattedStaff, fromCache: false };
    } catch (error) {
        console.error('[staffService] Error fetching staff:', {
            status: error.response?.status,
            message: error.message,
            endpoint: 'users/'
        });

        // Fallback to cache if API fails
        const cached = await getStaffCache();
        if (cached) {
            console.log('[staffService] API failed, using cached staff data');
            return { success: true, staff: cached, fromCache: true, error: error.message };
        }

        return { success: false, staff: [], error: error.message };
    }
};

/**
 * Search staff by name, email, or username
 * @param {Array} staffList - List of staff to search in
 * @param {string} searchTerm - Search query
 * @returns {Array} Filtered staff list
 */
export const searchStaff = (staffList, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return staffList;
    }

    const lowerSearch = searchTerm.toLowerCase().trim();

    return staffList.filter(staff =>
        staff.displayName.toLowerCase().includes(lowerSearch) ||
        staff.firstName.toLowerCase().includes(lowerSearch) ||
        staff.lastName.toLowerCase().includes(lowerSearch) ||
        staff.email.toLowerCase().includes(lowerSearch) ||
        staff.username.toLowerCase().includes(lowerSearch)
    );
};

/**
 * Cache staff data to AsyncStorage
 * @param {Array} staffData - Staff list to cache
 */
const cacheStaffData = async (staffData) => {
    try {
        await AsyncStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(staffData));
        await AsyncStorage.setItem(STAFF_CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION_MS));
        console.log('[staffService] Staff data cached');
    } catch (error) {
        console.warn('[staffService] Failed to cache staff data:', error);
    }
};

/**
 * Get cached staff data if still valid
 * @returns {Promise} Staff array or null if cache expired/missing
 */
const getStaffCache = async () => {
    try {
        const expiryTime = await AsyncStorage.getItem(STAFF_CACHE_EXPIRY_KEY);

        if (!expiryTime || Date.now() > parseInt(expiryTime)) {
            console.log('[staffService] Staff cache expired or missing');
            return null;
        }

        const cached = await AsyncStorage.getItem(STAFF_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.warn('[staffService] Error reading cache:', error);
        return null;
    }
};

/**
 * Clear cached staff data
 */
export const clearStaffCache = async () => {
    try {
        await AsyncStorage.removeItem(STAFF_CACHE_KEY);
        await AsyncStorage.removeItem(STAFF_CACHE_EXPIRY_KEY);
        console.log('[staffService] Staff cache cleared');
    } catch (error) {
        console.warn('[staffService] Failed to clear cache:', error);
    }
};

/**
 * Get a single staff member by ID
 * Useful for displaying staff details
 * @param {string|number} staffId - Staff ID to find
 * @param {Array} staffList - List to search in (uses API if not provided)
 */
export const getStaffById = async (staffId, staffList = null) => {
    try {
        const list = staffList || (await fetchAllStaff()).staff;
        const staff = list.find(s => String(s.id) === String(staffId));
        return staff || null;
    } catch (error) {
        console.error('[staffService] Error getting staff by ID:', error);
        return null;
    }
};

/**
 * Get multiple staff members by IDs
 * @param {Array<string|number>} staffIds - Array of staff IDs
 * @param {Array} staffList - List to search in
 */
export const getStaffByIds = async (staffIds, staffList = null) => {
    try {
        const list = staffList || (await fetchAllStaff()).staff;
        return list.filter(s => staffIds.includes(String(s.id)));
    } catch (error) {
        console.error('[staffService] Error getting staff by IDs:', error);
        return [];
    }
};

/**
 * Get staff grouped by role/department
 * @param {Array} staffList - Staff list to group
 * @returns {Object} Staff grouped by role
 */
export const groupStaffByRole = (staffList) => {
    return staffList.reduce((groups, staff) => {
        const role = staff.role || 'Unassigned';
        if (!groups[role]) {
            groups[role] = [];
        }
        groups[role].push(staff);
        return groups;
    }, {});
};

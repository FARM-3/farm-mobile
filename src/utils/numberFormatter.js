// File: src/utils/numberFormatter.js - Utility functions for formatting numbers with commas

/**
 * Format a number with commas for display (e.g., 200000 -> "200,000")
 * @param {string|number} value - The number to format
 * @returns {string} Formatted number with commas
 */
export const formatNumberWithCommas = (value) => {
    if (!value && value !== 0) return '';

    // Convert to string and remove any existing commas
    const stringValue = String(value).replace(/,/g, '');

    // Check if it's a valid number
    if (isNaN(stringValue) || stringValue === '') return '';

    // Handle decimal numbers
    const parts = stringValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Return with decimal part if it exists
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

/**
 * Remove commas from a formatted number string (e.g., "200,000" -> "200000")
 * @param {string} value - The formatted number string
 * @returns {string} Number string without commas
 */
export const removeCommas = (value) => {
    if (!value) return '';
    return String(value).replace(/,/g, '');
};

/**
 * Parse a formatted number string to a number (e.g., "200,000" -> 200000)
 * @param {string} value - The formatted number string
 * @returns {number} Parsed number
 */
export const parseFormattedNumber = (value) => {
    if (!value && value !== 0) return 0;
    const cleanValue = removeCommas(value);
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Handle input change for money fields with comma formatting
 * This function should be used in onChangeText handlers for money input fields
 * @param {string} text - The input text
 * @param {Function} setter - State setter function
 * @returns {void}
 */
export const handleMoneyInput = (text, setter) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        return; // Don't update if there are multiple decimal points
    }

    // Format and set the value
    const formatted = formatNumberWithCommas(cleaned);
    setter(formatted);
};

/**
 * Format currency for display in tables or detail views
 * @param {string|number} value - The amount
 * @param {string} currency - Currency symbol (default: 'UGX')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'UGX') => {
    if (!value && value !== 0) return 'Not provided';
    const number = typeof value === 'string' ? parseFormattedNumber(value) : value;
    return `${currency} ${formatNumberWithCommas(number)}`;
};

export default {
    formatNumberWithCommas,
    removeCommas,
    parseFormattedNumber,
    handleMoneyInput,
    formatCurrency,
};

// File: src/services/WeatherService.js - Real-time weather service using OpenWeatherMap API
import * as Location from 'expo-location';

/**
 * WeatherService - Fetches real-time weather data based on device location
 * Uses OpenWeatherMap API (free tier)
 *
 * IMPORTANT: You need to get a free API key from https://openweathermap.org/api
 * and replace the WEATHER_API_KEY below with your actual key.
 */

// TODO: Replace with your OpenWeatherMap API key
// Get your free API key from: https://openweathermap.org/api
const WEATHER_API_KEY = 'YOUR_API_KEY_HERE'; // Replace this with your actual API key
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Get current device location
 * @returns {Promise<Object>} Location coordinates {latitude, longitude} or null
 */
const getCurrentLocation = async () => {
    try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            console.warn('[WeatherService] Location permission denied');
            return null;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        console.error('[WeatherService] Error getting location:', error);
        return null;
    }
};

/**
 * Get weather icon name based on OpenWeatherMap weather condition code
 * @param {string} weatherCode - Weather condition code from API
 * @param {boolean} isDay - Whether it's daytime
 * @returns {string} Ionicons icon name
 */
const getWeatherIcon = (weatherCode, isDay = true) => {
    const code = String(weatherCode);

    // Thunderstorm
    if (code.startsWith('2')) return 'thunderstorm';

    // Drizzle
    if (code.startsWith('3')) return 'rainy';

    // Rain
    if (code.startsWith('5')) {
        if (code === '500' || code === '501') return 'rainy';
        return 'rainy';
    }

    // Snow
    if (code.startsWith('6')) return 'snow';

    // Atmosphere (mist, fog, etc.)
    if (code.startsWith('7')) return 'cloudy';

    // Clear
    if (code === '800') return isDay ? 'sunny' : 'moon';

    // Clouds
    if (code === '801') return isDay ? 'partly-sunny' : 'cloudy-night';
    if (code === '802') return 'cloudy';
    if (code === '803' || code === '804') return 'cloudy';

    // Default
    return isDay ? 'partly-sunny' : 'cloudy-night';
};

/**
 * Fetch current weather data
 * @param {Object} coords - Location coordinates {latitude, longitude}
 * @returns {Promise<Object>} Weather data object
 */
const fetchWeatherByCoords = async (coords) => {
    try {
        if (!coords || !coords.latitude || !coords.longitude) {
            throw new Error('Invalid coordinates provided');
        }

        // Check if API key is configured
        if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
            console.warn('[WeatherService] API key not configured. Using fallback weather data.');
            return getFallbackWeather();
        }

        const url = `${WEATHER_API_BASE_URL}/weather?lat=${coords.latitude}&lon=${coords.longitude}&units=metric&appid=${WEATHER_API_KEY}`;

        console.log('[WeatherService] Fetching weather data...');
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract relevant weather information
        const weatherData = {
            location: data.name,
            country: data.sys.country,
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            condition: data.weather[0].main,
            description: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
            pressure: data.main.pressure,
            weatherCode: data.weather[0].id,
            icon: getWeatherIcon(data.weather[0].id, isDay(data.sys.sunrise, data.sys.sunset)),
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset,
            timestamp: Date.now(),
        };

        console.log('[WeatherService] Weather data fetched successfully:', weatherData.location);
        return weatherData;
    } catch (error) {
        console.error('[WeatherService] Error fetching weather:', error.message);
        return getFallbackWeather();
    }
};

/**
 * Check if it's currently daytime based on sunrise/sunset times
 * @param {number} sunrise - Sunrise timestamp
 * @param {number} sunset - Sunset timestamp
 * @returns {boolean} True if daytime
 */
const isDay = (sunrise, sunset) => {
    const now = Date.now() / 1000; // Convert to seconds
    return now >= sunrise && now <= sunset;
};

/**
 * Get fallback weather data when API is unavailable
 * @returns {Object} Default weather data
 */
const getFallbackWeather = () => {
    return {
        location: 'Kampala',
        country: 'UG',
        temperature: 24,
        feelsLike: 25,
        condition: 'Partly Cloudy',
        description: 'partly cloudy',
        humidity: 76,
        windSpeed: 10,
        pressure: 1013,
        weatherCode: '802',
        icon: 'partly-sunny',
        sunrise: null,
        sunset: null,
        timestamp: Date.now(),
        isFallback: true,
    };
};

/**
 * Get current weather based on device location
 * @returns {Promise<Object>} Weather data object
 */
export const getCurrentWeather = async () => {
    try {
        console.log('[WeatherService] Getting current weather...');

        // Get device location
        const location = await getCurrentLocation();

        if (!location) {
            console.warn('[WeatherService] Location not available, using fallback');
            return getFallbackWeather();
        }

        // Fetch weather data
        const weatherData = await fetchWeatherByCoords(location);
        return weatherData;
    } catch (error) {
        console.error('[WeatherService] Error in getCurrentWeather:', error);
        return getFallbackWeather();
    }
};

/**
 * Check if weather data is stale and needs refresh
 * @param {number} timestamp - Last update timestamp
 * @param {number} maxAge - Maximum age in milliseconds (default: 30 minutes)
 * @returns {boolean} True if data is stale
 */
export const isWeatherDataStale = (timestamp, maxAge = 30 * 60 * 1000) => {
    if (!timestamp) return true;
    return Date.now() - timestamp > maxAge;
};

export default {
    getCurrentWeather,
    isWeatherDataStale,
};

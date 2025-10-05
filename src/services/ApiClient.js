/**
 * src/services/ApiClient.js
 * * Centralized API client placeholder. This is needed to resolve the import
 * in LoginScreen.js. It simulates a network call for the login flow.
 */

const MOCK_SUCCESS_PIN = '1234';
const MOCK_RESPONSE_DELAY = 500; // ms

const ApiClient = {
    /**
     * Simulates a POST request to an API endpoint.
     * @param {string} endpoint - The API endpoint (e.g., "login/").
     * @param {object} data - The data payload (e.g., { pin: "1234" }).
     * @returns {Promise<object>} A promise resolving to a mock response object.
     */
    post: async (endpoint, data) => {
        return new Promise((resolve, reject) => {
            // Simulate network delay
            setTimeout(() => {
                if (endpoint === "login/") {
                    const pin = data.pin;
                    if (pin === MOCK_SUCCESS_PIN) {
                        // Successful login simulation
                        resolve({
                            status: 200,
                            data: {
                                success: true,
                                message: "Authentication successful.",
                                token: "mock_jwt_token_123"
                            }
                        });
                    } else {
                        // Failed login simulation
                        reject({
                            response: {
                                status: 401,
                                data: {
                                    detail: "Invalid PIN provided."
                                }
                            }
                        });
                    }
                } else {
                    // Default for other endpoints
                    resolve({ status: 200, data: { message: "Mock response for " + endpoint } });
                }
            }, MOCK_RESPONSE_DELAY);
        });
    },
};

export default ApiClient;

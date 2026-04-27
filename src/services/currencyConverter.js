/**
 * Currency Conversion Utility
 * Converts between INR (Indian Rupees) and POL (Polygon)
 */

// Exchange rates (update these periodically)
// 1 POL ≈ $0.80 USD
// 1 USD ≈ 83 INR
// Therefore: 1 POL ≈ 66.4 INR (approximately)

const EXCHANGE_RATES = {
    POL_TO_USD: 0.80,  // 1 POL = $0.80 USD
    USD_TO_INR: 83,    // 1 USD = 83 INR
};

/**
 * Convert INR (Rupees) to POL
 * @param {number} amountINR - Amount in Indian Rupees
 * @returns {number} Amount in POL
 */
export const convertINRtoPOL = (amountINR) => {
    if (!amountINR || amountINR <= 0) return 0;
    
    const amountUSD = amountINR / EXCHANGE_RATES.USD_TO_INR;
    const amountPOL = amountUSD / EXCHANGE_RATES.POL_TO_USD;
    
    // Return with 4 decimal places precision
    return parseFloat(amountPOL.toFixed(4));
};

/**
 * Convert POL to INR (Rupees)
 * @param {number} amountPOL - Amount in POL
 * @returns {number} Amount in Indian Rupees
 */
export const convertPOLtoINR = (amountPOL) => {
    if (!amountPOL || amountPOL <= 0) return 0;
    
    const amountUSD = amountPOL * EXCHANGE_RATES.POL_TO_USD;
    const amountINR = amountUSD * EXCHANGE_RATES.USD_TO_INR;
    
    // Return as integer (no decimal for rupees)
    return Math.round(amountINR);
};

/**
 * Get exchange rate information
 * @returns {object} Current exchange rates and conversion info
 */
export const getExchangeRateInfo = () => {
    const polToInr = EXCHANGE_RATES.POL_TO_USD * EXCHANGE_RATES.USD_TO_INR;
    
    return {
        POL_TO_USD: EXCHANGE_RATES.POL_TO_USD,
        USD_TO_INR: EXCHANGE_RATES.USD_TO_INR,
        POL_TO_INR: polToInr.toFixed(2),
        lastUpdated: new Date().toISOString()
    };
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (POL, INR, USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "POL") => {
    switch(currency) {
        case "INR":
            return `₹${amount.toLocaleString("en-IN")}`;
        case "USD":
            return `$${amount.toFixed(2)}`;
        case "POL":
        default:
            return `${amount.toFixed(4)} POL`;
    }
};

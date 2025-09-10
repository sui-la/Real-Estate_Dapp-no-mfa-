/**
 * Utility functions for safe number operations
 */

/**
 * Safely converts a value to a number, returning 0 if conversion fails
 * @param {any} value - The value to convert
 * @returns {number} - The converted number or 0
 */
export const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

/**
 * Safely formats a number with locale string, handling NaN and undefined
 * @param {any} value - The value to format
 * @param {number} fallback - The fallback value if conversion fails
 * @returns {string} - The formatted number string
 */
export const safeFormatNumber = (value, fallback = 0) => {
  const num = safeNumber(value)
  return num.toLocaleString()
}

/**
 * Safely formats a number as currency, handling NaN and undefined
 * @param {any} value - The value to format
 * @param {string} currency - The currency symbol (default: '$')
 * @param {number} fallback - The fallback value if conversion fails
 * @returns {string} - The formatted currency string
 */
export const safeFormatCurrency = (value, currency = '$', fallback = 0) => {
  const num = safeNumber(value)
  return `${currency}${num.toLocaleString()}`
}

/**
 * Safely formats a number as percentage, handling NaN and undefined
 * @param {any} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {number} fallback - The fallback value if conversion fails
 * @returns {string} - The formatted percentage string
 */
export const safeFormatPercentage = (value, decimals = 2, fallback = 0) => {
  const num = safeNumber(value)
  return `${num.toFixed(decimals)}%`
}

/**
 * Safely performs division, returning 0 if denominator is 0
 * @param {any} numerator - The numerator
 * @param {any} denominator - The denominator
 * @param {number} fallback - The fallback value if division fails
 * @returns {number} - The result of division or fallback
 */
export const safeDivide = (numerator, denominator, fallback = 0) => {
  const num = safeNumber(numerator)
  const den = safeNumber(denominator)
  return den === 0 ? fallback : num / den
}

/**
 * Safely calculates share price, handling division by zero
 * @param {any} totalValue - The total property value
 * @param {any} totalShares - The total number of shares
 * @returns {number} - The share price or 0
 */
export const calculateSharePrice = (totalValue, totalShares) => {
  return safeDivide(totalValue, totalShares, 0)
}

/**
 * Safely calculates percentage sold, handling division by zero
 * @param {any} sharesSold - The number of shares sold
 * @param {any} totalShares - The total number of shares
 * @returns {number} - The percentage sold or 0
 */
export const calculatePercentageSold = (sharesSold, totalShares) => {
  return safeDivide(sharesSold, totalShares, 0) * 100
}

/**
 * Safely calculates available shares
 * @param {any} totalShares - The total number of shares
 * @param {any} sharesSold - The number of shares sold
 * @returns {number} - The available shares or 0
 */
export const calculateAvailableShares = (totalShares, sharesSold) => {
  const total = safeNumber(totalShares)
  const sold = safeNumber(sharesSold)
  return Math.max(0, total - sold)
}

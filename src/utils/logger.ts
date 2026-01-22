/**
 * Secure Logger Utility
 * 
 * Provides environment-aware logging that:
 * - Shows detailed logs in development for debugging
 * - Suppresses debug/info logs in production to prevent data exposure
 * - Always shows errors and warnings for monitoring
 * 
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.log('Debug info');     // Dev only
 *   logger.info('Info message');  // Dev only
 *   logger.warn('Warning');       // Always
 *   logger.error('Error');        // Always
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log debug-level information (development only)
   * Use for detailed debugging information that should not appear in production
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      try {
        console.log(...args);
      } catch (e) {
        // Fail silently - logging should never crash the app
      }
    }
  },

  /**
   * Log informational messages (development only)
   * Use for general information that helps understand application flow
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      try {
        console.info(...args);
      } catch (e) {
        // Fail silently - logging should never crash the app
      }
    }
  },

  /**
   * Log warning messages (always shown)
   * Use for non-critical issues that should be monitored
   */
  warn: (...args: any[]): void => {
    try {
      console.warn(...args);
    } catch (e) {
      // Fail silently - logging should never crash the app
    }
  },

  /**
   * Log error messages (always shown)
   * Use for errors that need immediate attention
   */
  error: (...args: any[]): void => {
    try {
      console.error(...args);
    } catch (e) {
      // Fail silently - logging should never crash the app
    }
  }
};

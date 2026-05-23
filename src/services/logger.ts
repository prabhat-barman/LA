// Safely require crashlytics to prevent crashing if Firebase is not linked or initialized
let crashlyticsInstance: any = null;

try {
  const crashlytics = require('@react-native-firebase/crashlytics').default;
  crashlyticsInstance = crashlytics;
} catch (e) {
  console.warn('Crashlytics module not found or failed to load:', e);
}

export const logger = {
  log: (...args: any[]) => {
    console.log('[AppLog]', ...args);
  },

  info: (...args: any[]) => {
    console.info('[AppInfo]', ...args);
  },

  warn: (...args: any[]) => {
    console.warn('[AppWarn]', ...args);
  },

  error: (error: Error | string, context?: string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    console.error(`[AppError] ${context ? `[${context}] ` : ''}`, errorObj);

    if (crashlyticsInstance) {
      try {
        const crashInstance = crashlyticsInstance();
        if (context) {
          crashInstance.setAttribute('error_context', context);
        }
        crashInstance.recordError(errorObj);
      } catch (e) {
        console.warn('Failed to record error to Crashlytics:', e);
      }
    }
  },

  setUserId: (userId: string) => {
    console.log(`[AppLog] User ID set to: ${userId}`);
    if (crashlyticsInstance) {
      try {
        crashlyticsInstance().setUserId(userId);
      } catch (e) {
        console.warn('Failed to set user ID in Crashlytics:', e);
      }
    }
  },

  logEvent: (name: string, params?: Record<string, any>) => {
    console.log(`[AppLog] Event logged: ${name}`, params);
    if (crashlyticsInstance) {
      try {
        crashlyticsInstance().log(`Event: ${name} - ${JSON.stringify(params || {})}`);
      } catch (e) {
        console.warn('Failed to log event in Crashlytics:', e);
      }
    }
  }
};

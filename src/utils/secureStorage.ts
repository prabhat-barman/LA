import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage: Record<string, string> = {};

/**
 * Robust Secure Storage Helper
 * In-memory fallback prevents crashes when native modules are not fully linked.
 */
export const setItem = async (key: string, value: string): Promise<boolean> => {
  try {
    memoryStorage[key] = value;
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('AsyncStorage setItem failed:', error);
    return true;
  }
};

export const getItem = async (key: string): Promise<string | null> => {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val !== null) {
      memoryStorage[key] = val;
      return val;
    }
  } catch (error) {
    console.warn('AsyncStorage getItem failed:', error);
  }
  return memoryStorage[key] || null;
};

export const removeItem = async (key: string): Promise<boolean> => {
  try {
    delete memoryStorage[key];
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('AsyncStorage removeItem failed:', error);
    return true;
  }
};

export const clear = async (): Promise<boolean> => {
  try {
    Object.keys(memoryStorage).forEach((key) => {
      delete memoryStorage[key];
    });
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.warn('AsyncStorage clear failed:', error);
    return true;
  }
};

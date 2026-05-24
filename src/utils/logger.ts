const isDebugMode = __DEV__;

export const logger = {
  log: (...args: any[]) => isDebugMode && console.log("[LOG]:", ...args),
  warn: (...args: any[]) => isDebugMode && console.warn("[WARN]:", ...args),
  error: (...args: any[]) => isDebugMode && console.error("[ERROR]:", ...args),
};

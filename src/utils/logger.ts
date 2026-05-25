// Back-compat re-export. The canonical logger lives in
// src/services/logger.ts (Crashlytics-aware, __DEV__-gated). Both
// import paths existed historically, so this shim keeps older callsites
// working without forcing a churn-only edit.
//
// New code should prefer `import { logger } from '../services/logger'`.
export { logger } from '../services/logger';
export type { Logger } from '../services/logger';

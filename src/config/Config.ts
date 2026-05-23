/**
 * Application Environment Configuration
 *
 * Set ENVIRONMENT value:
 * 1 = Production
 * 2 = UAT
 * 3 = Staging
 */

const ENVIRONMENT = 3;

interface EnvConfig {
  name: string;
  BASE_URL: string;
  PDF_PATH: string;
  PTE_CORE_BASE_URL: string;
  PDF_PTE_CORE_PATH: string;
}

/**
 * Environment URLs
 */
const ENV_CONFIG: Record<number, EnvConfig> = {
  1: {
    name: "PRODUCTION",
    BASE_URL: "https://backend22.languageacademy.com.au/api/v1",
    PDF_PATH: "https://backend22.languageacademy.com.au/",
    PTE_CORE_BASE_URL: "https://pte-core-backend.languageacademy.com.au/api/v1",
    PDF_PTE_CORE_PATH: "https://pte-core-backend.languageacademy.com.au/",
  },

  2: {
    name: "UAT",
    BASE_URL: "https://la-uatbe.languageacademy.com.au/api/v1",
    PDF_PATH: "https://la-uatbe.languageacademy.com.au/",
    PTE_CORE_BASE_URL: "https://lacore-uatbe.languageacademy.com.au/api/v1",
    PDF_PTE_CORE_PATH: "https://lacore-uatbe.languageacademy.com.au/",
  },

  3: {
    name: "STAGING",
    BASE_URL: "https://la-stagingbe.languageacademy.com.au/api/v1",
    PDF_PATH: "https://la-stagingbe.languageacademy.com.au/",
    PTE_CORE_BASE_URL: "https://lacore-stagingbe.languageacademy.com.au/api/v1",
    PDF_PTE_CORE_PATH: "https://lacore-stagingbe.languageacademy.com.au/",
  },
};

/**
 * Selected Environment Configuration
 */
const CURRENT_ENV = ENV_CONFIG[ENVIRONMENT];

/**
 * Global Assets (Usually same across environments)
 */
const GLOBAL_ASSETS = {
  MEDIA_URL: "https://s3.ap-southeast-2.amazonaws.com/lamedia21",
  AUDIO_PATH:
    "https://s3.ap-southeast-2.amazonaws.com/lamedia21/ptedata/ptemedia/",
};

/**
 * Application Configuration
 */
const Config = {
  ENVIRONMENT,
  ENVIRONMENT_NAME: CURRENT_ENV.name,

  BASE_URL: CURRENT_ENV.BASE_URL,
  PTE_CORE_BASE_URL: CURRENT_ENV.PTE_CORE_BASE_URL,

  pdfPath: CURRENT_ENV.PDF_PATH,
  pdfPteCorePath: CURRENT_ENV.PDF_PTE_CORE_PATH,

  mediaUrl: GLOBAL_ASSETS.MEDIA_URL,
  audioPath: GLOBAL_ASSETS.AUDIO_PATH,

  // Maintenance Mode (Set true for manual testing)
  MAINTENANCE_MODE: false,

  // Unified endpoints
  BASE_URL1: CURRENT_ENV.BASE_URL,
  PTE_CORE_BASE_URL_V2: CURRENT_ENV.PTE_CORE_BASE_URL,

  /**
   * Google Sign-In Client IDs
   */
  GOOGLE_WEB_CLIENT_ID:
    "1094086250404-i2rbtfeodnc6r24kavas4jvhr85eekel.apps.googleusercontent.com",

  GOOGLE_IOS_CLIENT_ID:
    "1094086250404-ergm9b8faarqrcfdk2m88r4lff4cpj0h.apps.googleusercontent.com",
};

export const BASE_URL = Config.BASE_URL;
export const PTE_CORE_BASE_URL = Config.PTE_CORE_BASE_URL;
export const pdfPath = Config.pdfPath;
export const pdfPteCorePath = Config.pdfPteCorePath;
export const mediaUrl = Config.mediaUrl;
export const audioPath = Config.audioPath;
export const BASE_URL1 = Config.BASE_URL1;
export const PTE_CORE_BASE_URL_V2 = Config.PTE_CORE_BASE_URL_V2;

export default Config;

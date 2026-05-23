import Config from "./Config";
import { buildUrl } from "../services/apiBuilder";
import { getPdfPath } from "./appVariantConfig";

// Re-exporting for backward compatibility with components that import them directly
export const BASE_URL = Config.BASE_URL;
export const pdfPath = Config.pdfPath;
export const PTE_CORE_BASE_URL = Config.PTE_CORE_BASE_URL;
export const pdfPteCorePath = Config.pdfPteCorePath;
export const audioPath2 = Config.mediaUrl;
export const mediaUrl = Config.mediaUrl;

/**
 * Dynamic API_ENDPOINTS object using a Proxy.
 * This intercepts property access and automatically calls buildUrl with the property name.
 */
export const API_ENDPOINTS = new Proxy(
  {} as Record<string, string>,
  {
    get: (target: Record<string, string>, prop: string) => {
      // Special cases that don't follow the buildUrl(key) pattern
      if (prop === "image_and_PDF_URL") return getPdfPath();
      if (prop === "mediaUrl") return mediaUrl;
      if (prop === "audioPath")
        return "https://s3.ap-southeast-2.amazonaws.com/lamedia21/ptedata/ptemedia/";

      // Default: Resolve via apiBuilder
      return buildUrl(prop);
    },
  },
);

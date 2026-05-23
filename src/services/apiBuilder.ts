import { getBaseUrl, isPteCore } from "../config/appVariantConfig";
import URLS from "../config/URLS";

export const resolvePath = (key: string): string => {
  const isPte = isPteCore();
  if (isPte) {
    const pteKey = `pte_core_${key}`;
    if (URLS[pteKey]) {
      return URLS[pteKey];
    }
    const upperPteKey = `PTE_CORE_${key}`;
    if (URLS[upperPteKey]) {
      return URLS[upperPteKey];
    }
  }
  return URLS[key] || key;
};

export const buildUrl = (key: string): string => {
  const base = getBaseUrl();
  const path = resolvePath(key);
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${base}/${path}`;
};

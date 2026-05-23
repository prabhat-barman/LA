import Config from "./Config";

let store: any;

export const injectStore = (_store: any) => {
  store = _store;
};

export const getCurrentVariant = (): string => {
  const state = store?.getState();
  return state?.variant?.current || "ACADEMY";
};

export const isDarkMode = (): boolean => {
  const state = store?.getState();
  return state?.test_slice?.isDarkMode || false;
};

export const isPteCore = (): boolean => getCurrentVariant() === "PTE_CORE";

export const getBaseUrl = (): string => {
  return isPteCore() ? Config.PTE_CORE_BASE_URL : Config.BASE_URL;
};

export const getPdfPath = (): string => {
  return isPteCore() ? Config.pdfPteCorePath : Config.pdfPath;
};

export const getV2BaseUrl = (): string => {
  return Config.BASE_URL1;
};

export const getAudioPath = (): string => {
  return Config.audioPath;
};

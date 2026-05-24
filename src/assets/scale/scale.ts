import { Dimensions } from "react-native";

// Null-safe Dimensions helper — Dimensions.get() can return {} very early in native bridge boot,
// causing screenHeight/screenWidth to be undefined. Always provide numeric fallbacks.
const _getWindowDims = () => {
  const win = Dimensions.get("window") || {};
  return {
    h: typeof win.height === "number" && win.height > 0 ? win.height : 800,
    w: typeof win.width  === "number" && win.width  > 0 ? win.width  : 360,
  };
};
const _getScreenDims = () => {
  const scr = Dimensions.get("screen") || {};
  const win = _getWindowDims();
  return {
    h: typeof scr.height === "number" && scr.height > 0 ? scr.height : win.h,
    w: typeof scr.width  === "number" && scr.width  > 0 ? scr.width  : win.w,
  };
};

const { h: height, w: width } = _getWindowDims();
const { h: screenHeight, w: screenWidth } = _getScreenDims();

/**
 * Function to scale a value based on the size of the screen size and the original
 * size used on the design.
 */
export default function scale(units: number = 1): number {
  return (width / 375) * units;
}

const verticalScale = (size: number): number => (height / 667) * size;

const horizontalScale = (size: number): number => (width / 375) * size;

const formFieldMarginBottom = screenHeight * 0.015;

const IOS_KEYBOARD_OFFSET = 40;

export {
  verticalScale,
  horizontalScale,
  height,
  width,
  screenHeight,
  screenWidth,
  formFieldMarginBottom,
  IOS_KEYBOARD_OFFSET,
};

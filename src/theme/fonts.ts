import { Platform } from 'react-native';

export const fonts = {
  extraLight: 'BricolageGrotesque-ExtraLight',
  light: 'BricolageGrotesque-Light',
  regular: 'BricolageGrotesque-Regular',
  medium: 'BricolageGrotesque-Medium',
  semiBold: 'BricolageGrotesque-SemiBold',
  bold: 'BricolageGrotesque-Bold',
  extraBold: 'BricolageGrotesque-ExtraBold',
};

export const typography = {
  extraLight: {
    fontFamily: fonts.extraLight,
    ...Platform.select({
      ios: { fontWeight: '200' as const },
      android: {},
    }),
  },
  light: {
    fontFamily: fonts.light,
    ...Platform.select({
      ios: { fontWeight: '300' as const },
      android: {},
    }),
  },
  regular: {
    fontFamily: fonts.regular,
    ...Platform.select({
      ios: { fontWeight: '400' as const },
      android: {},
    }),
  },
  medium: {
    fontFamily: fonts.medium,
    ...Platform.select({
      ios: { fontWeight: '500' as const },
      android: {},
    }),
  },
  semiBold: {
    fontFamily: fonts.semiBold,
    ...Platform.select({
      ios: { fontWeight: '600' as const },
      android: {},
    }),
  },
  bold: {
    fontFamily: fonts.bold,
    ...Platform.select({
      ios: { fontWeight: '700' as const },
      android: {},
    }),
  },
  extraBold: {
    fontFamily: fonts.extraBold,
    ...Platform.select({
      ios: { fontWeight: '800' as const },
      android: {},
    }),
  },
};

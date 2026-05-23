import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Global navigation ref so non-React modules (e.g. axios interceptors) can
 * trigger navigation without being inside a component tree.
 * Typed loosely with `any` to avoid a circular type-import with `AppNavigator`.
 */
export const navigationRef = createNavigationContainerRef<any>();

/**
 * Resets the stack to the SignIn screen. Used when the session expires and
 * the user must re-authenticate.
 */
export const resetToSignIn = (): void => {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name: 'SignIn' }],
  });
};

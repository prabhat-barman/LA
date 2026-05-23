/**
 * subscriptionHelpers.tsx
 * HOC, Gate component, and useSubscription hook
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  hasAccessTo,
  getActiveTier,
  validateAndPromptSubscription,
  type ContentType,
  CONTENT_TYPES,
} from './subscriptionValidator';
import type { PlanTier } from '../hooks/useIap';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// ── useSubscription Hook ──────────────────────────────────────────────────────

interface SubscriptionState {
  isActive: boolean;
  tier: PlanTier | null;
  hasSilver: boolean;
  hasGold: boolean;
  /** Check access for a content type without alert */
  checkAccess: (contentType: ContentType) => Promise<boolean>;
  /** Check access + show alert + navigate if denied */
  validateAccess: (contentType: ContentType) => Promise<boolean>;
  reload: () => void;
}

export function useSubscription(): SubscriptionState {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [tier, setTier] = useState<PlanTier | null>(null);
  // `loading` value isn't surfaced through the returned SubscriptionState yet,
  // but we still need to drive the setter to gate the initial fetch.
  const [, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;
    getActiveTier().then((t) => {
      if (mounted) {
        setTier(t);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [reloadTrigger]);

  const checkAccess = useCallback(
    (contentType: ContentType) => hasAccessTo(contentType),
    [],
  );

  const validateAccess = useCallback(
    (contentType: ContentType) => validateAndPromptSubscription(contentType, navigation),
    [navigation],
  );

  const reload = useCallback(() => setReloadTrigger((n) => n + 1), []);

  return {
    isActive: tier !== null,
    tier,
    hasSilver: tier === 'Silver' || tier === 'Gold',
    hasGold: tier === 'Gold',
    checkAccess,
    validateAccess,
    reload,
  };
}

// ── SubscriptionGate Component ────────────────────────────────────────────────
/**
 * Wrap any content with SubscriptionGate.
 * If user doesn't have access, renders a lock UI instead.
 *
 * Usage:
 * <SubscriptionGate contentType={CONTENT_TYPES.VIP_VIDEO}>
 *   <MyContent />
 * </SubscriptionGate>
 */

interface SubscriptionGateProps {
  contentType: ContentType;
  children: React.ReactNode;
  /** Custom fallback UI — defaults to lock card */
  fallback?: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  contentType,
  children,
  fallback,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    hasAccessTo(contentType).then((access) => {
      if (mounted) setHasAccess(access);
    });
    return () => { mounted = false; };
  }, [contentType]);

  // Still checking
  if (hasAccess === null) return null;

  // Has access
  if (hasAccess) return <>{children}</>;

  // No access — show fallback or default lock UI
  if (fallback) return <>{fallback}</>;

  return (
    <View style={gateStyles.container}>
      <Text style={gateStyles.lockEmoji}>🔒</Text>
      <Text style={gateStyles.title}>
        {contentType === CONTENT_TYPES.VIP_VIDEO ? 'Gold Plan Required' : 'Subscription Required'}
      </Text>
      <Text style={gateStyles.subtitle}>
        {contentType === CONTENT_TYPES.VIP_VIDEO
          ? 'Upgrade to Gold to access VIP Videos'
          : 'Subscribe to access this content'}
      </Text>
      <TouchableOpacity
        style={gateStyles.button}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.8}
      >
        <Text style={gateStyles.buttonText}>View Plans</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── withSubscription HOC ──────────────────────────────────────────────────────
/**
 * Higher-order component that checks subscription before rendering.
 *
 * Usage:
 * const ProtectedScreen = withSubscription(MyScreen, CONTENT_TYPES.VIP_VIDEO);
 */

export function withSubscription<P extends object>(
  Component: React.ComponentType<P>,
  contentType: ContentType,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    useEffect(() => {
      let mounted = true;
      validateAndPromptSubscription(contentType, navigation).then((access) => {
        if (mounted) setHasAccess(access);
      });
      return () => { mounted = false; };
    }, [navigation]);

    if (hasAccess === null) return null;
    if (!hasAccess) return null; // Alert already shown
    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withSubscription(${Component.displayName ?? Component.name})`;
  return WrappedComponent;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const gateStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
    paddingHorizontal: scale(24),
    backgroundColor: '#F8F9FC',
    borderRadius: scale(16),
    margin: scale(16),
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderStyle: 'dashed',
  },
  lockEmoji: {
    fontSize: scale(36),
    marginBottom: scale(12),
  },
  title: {
    fontSize: scale(16),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: scale(18),
  },
  button: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(10),
    paddingHorizontal: scale(28),
  },
  buttonText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

// Re-export CONTENT_TYPES for convenience
export { CONTENT_TYPES };

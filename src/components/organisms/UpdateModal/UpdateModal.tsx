import React, { useEffect } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UpdateModalProps {
  visible: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  message: string;
  onUpdate: () => void;
  onLater: () => void;
}

// Full-screen overlay surfaced by `useVersionCheck` when the
// installed app falls behind the published store version.
//
// Three render modes:
//   - Optional update     → "Later" + "Update now" buttons
//   - Force update        → only "Update now" + a note explaining
//                           the modal can't be dismissed
//   - Hidden              → renders the underlying `Modal` with
//                           `visible={false}` so reopening doesn't
//                           pay the mount cost
//
// On Android we additionally intercept the hardware back button
// during a force-update so the user can't bypass the prompt by
// backing out of it.
export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  forceUpdate,
  latestVersion,
  message,
  onUpdate,
  onLater,
}) => {
  useEffect(() => {
    if (!visible || !forceUpdate || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible, forceUpdate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!forceUpdate) onLater();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconGlyph} accessibilityRole="text">
              {'\u2191'}
            </Text>
          </View>

          <Text style={styles.title}>Update Available</Text>

          {latestVersion.length > 0 && (
            <Text style={styles.version}>Version {latestVersion}</Text>
          )}

          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {!forceUpdate && (
              <TouchableOpacity
                style={[styles.btn, styles.laterBtn]}
                onPress={onLater}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Update later"
              >
                <Text style={styles.laterBtnLabel}>Later</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.updateBtn]}
              onPress={onUpdate}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open store to update"
            >
              <Text style={styles.updateBtnLabel}>Update Now</Text>
            </TouchableOpacity>
          </View>

          {forceUpdate && (
            <Text style={styles.forceNote}>
              This update is required to continue using the app.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default UpdateModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconGlyph: {
    fontSize: 32,
    color: '#007AFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1F2A',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 14,
  },
  message: {
    fontSize: 14,
    color: '#48484A',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtn: {
    backgroundColor: '#007AFF',
  },
  updateBtnLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  laterBtn: {
    backgroundColor: '#F2F3F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  laterBtnLabel: {
    color: '#48484A',
    fontSize: 15,
    fontWeight: '600',
  },
  forceNote: {
    marginTop: 14,
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

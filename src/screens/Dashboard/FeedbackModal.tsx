import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StarIcon,
  CloseIcon,
  SparkleIcon,
  ArrowRightLineIcon,
} from '../../components/atoms/Icon';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const RATING_LABELS = [
  'Tap a star to rate',
  '😕  Not great',
  '😐  Could be better',
  '🙂  Good',
  '😄  Really good!',
  '🤩  Loving it!',
];
const RATING_COLORS = [
  '#94A3B8',
  '#EF4444',
  '#F97316',
  '#3B82F6',
  '#10B981',
  '#94C23C',
];

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  onSuccess,
  showToast,
}) => {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const reset = useCallback(() => {
    setRating(0);
    setMessage('');
    setSubmitting(false);
    setFocused(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
    setTimeout(reset, 300);
  }, [onClose, reset, submitting]);

  const tapStar = useCallback((n: number) => {
    setRating(n);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      showToast('Please tap a star to rate first', 'info');
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      showToast('Please write a few words for us', 'info');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(API_ENDPOINTS.SUBMIT_FEEDBACK, {
        rating,
        rate: rating,
        message: trimmed,
        feedback: trimmed,
        comment: trimmed,
        source: 'app',
      });
      showToast('Thanks for the feedback!', 'success');
      onSuccess?.();
      onClose();
      setTimeout(reset, 300);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not send feedback';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [rating, message, showToast, onSuccess, onClose, reset]);

  const canSubmit = rating > 0 && message.trim().length >= 5 && !submitting;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.kavWrap}
            >
              <View style={styles.sheet}>
                {/* Drag handle */}
                <View style={styles.dragHandleWrap}>
                  <View style={styles.dragHandle} />
                </View>

                <ScrollView
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  contentContainerStyle={[
                    styles.scrollContent,
                    {
                      paddingBottom: Math.max(insets.bottom + scale(24), scale(36)),
                    },
                  ]}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerLeft}>
                      <View style={styles.headerIconWrap}>
                        <SparkleIcon />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={styles.title}>Send Feedback</Text>
                        <Text style={styles.subtitle}>
                          Your words shape what we build next
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleClose}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.closeBtn}
                    >
                      <CloseIcon size={scale(16)} color="#475569" />
                    </TouchableOpacity>
                  </View>

                  {/* Rating panel */}
                  <View style={styles.ratingPanel}>
                    <Text style={styles.sectionLabel}>
                      How's your experience?
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity
                          key={n}
                          onPress={() => tapStar(n)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <StarIcon filled={n <= rating} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.ratingLabel,
                        { color: RATING_COLORS[rating] },
                      ]}
                    >
                      {RATING_LABELS[rating]}
                    </Text>
                  </View>

                  {/* Message */}
                  <Text style={styles.sectionLabel}>Tell us more</Text>
                  <View
                    style={[
                      styles.textAreaWrap,
                      focused && styles.textAreaWrapFocused,
                    ]}
                  >
                    <TextInput
                      value={message}
                      onChangeText={setMessage}
                      placeholder="What did you like? What can we improve?"
                      placeholderTextColor="#94A3B8"
                      multiline
                      style={styles.textArea}
                      textAlignVertical="top"
                      maxLength={500}
                      editable={!submitting}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                    <Text style={styles.counter}>{message.length}/500</Text>
                  </View>

                  {/* Submit */}
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    activeOpacity={0.85}
                    style={styles.submitBtnWrap}
                  >
                    <LinearGradient
                      colors={
                        canSubmit
                          ? ['#1A2151', '#2D3672']
                          : ['#CBD5E1', '#94A3B8']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.submitBtn}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.submitBtnText}>Send Feedback</Text>
                          <View style={styles.submitArrow}>
                            <ArrowRightLineIcon size={scale(16)} />
                          </View>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 43, 0.55)',
    justifyContent: 'flex-end',
  },
  kavWrap: {
    width: '100%',
    flexShrink: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingTop: scale(8),
    maxHeight: screenHeight * 0.9,
    flexShrink: 1,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: scale(4),
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  dragHandle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(8),
    marginBottom: scale(20),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'BricolageGrotesque-Bold',
    marginBottom: scale(2),
  },
  subtitle: {
    fontSize: scale(11),
    color: '#64748B',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: scale(13),
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'BricolageGrotesque-SemiBold',
    marginBottom: scale(12),
  },
  ratingPanel: {
    backgroundColor: '#FAFBFD',
    borderRadius: scale(16),
    paddingVertical: scale(18),
    paddingHorizontal: scale(8),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: scale(20),
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: scale(12),
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: scale(12),
    fontWeight: '600',
    fontFamily: 'BricolageGrotesque-SemiBold',
  },
  textAreaWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: scale(14),
    paddingTop: scale(12),
    paddingBottom: scale(10),
    minHeight: scale(110),
  },
  textAreaWrapFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1A2151',
  },
  textArea: {
    fontSize: scale(13),
    color: '#0F172A',
    fontFamily: 'BricolageGrotesque-Regular',
    minHeight: scale(80),
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: scale(10),
    color: '#94A3B8',
    fontFamily: 'BricolageGrotesque-Regular',
    marginTop: scale(4),
  },
  submitBtnWrap: {
    width: '100%',
    height: scale(50),
    marginTop: scale(20),
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#1A2151',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtn: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: scale(14),
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.3,
  },
  submitArrow: {
    marginLeft: scale(8),
  },
});

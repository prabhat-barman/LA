import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SubHeader } from '../../components/molecules/SubHeader';
import { API_ENDPOINTS } from '../../config/apiConfig';
import Data from '../../config/practiceData';
import { useToast } from '../../context/ToastContext';
import { useUser } from '../../context/UserContext';
import apiClient from '../../services/apiClient';
import { logger } from '../../services/logger';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

type PreferredMode = 'Online' | 'Offline';

// Validation helpers — kept inline because they're cheap and only
// used here. If form-validation becomes a cross-cutting concern,
// promote these into `src/utils/validation`.
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

interface FormState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  preferredMode: PreferredMode;
  // Centre is required when `preferredMode === 'Offline'`. Stored as
  // the human-readable label because that's what the backend expects
  // (it doesn't have a separate centre-id catalogue) — see the old
  // project's BookTrialScreen which submits the label verbatim.
  centre: string;
  // Desired score sent as the numeric overall (e.g. "47"). The chip
  // labels show "47+ (6.0 Bands)" but the backend only cares about
  // the leading number.
  desiredScore: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  countryCode: '+91',
  preferredMode: 'Online',
  centre: '',
  desiredScore: '',
};

// Friendly score options pulled from the same source-of-truth the
// Profile / Goal screens use, so a change to the supported scores
// list propagates everywhere at once.
const SCORE_OPTIONS = Data.selectDesiredScoreWhole;

// Branch list excludes "Please Select Branch" / "Not a student with
// LA" — for trial-class enquiries we want a real branch or "Online
// Student". This mirrors the legacy `selectBranchFreeTrial` array.
const BRANCH_OPTIONS = Data.selectBranchFreeTrial.filter(
  b => b.trim().length > 0,
);

export const BookTrialClassScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const { user } = useUser();

  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULT_FORM,
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    email: user?.email ?? '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [scoreMenuOpen, setScoreMenuOpen] = useState(false);

  // Hydrate the prefilled fields when the user context resolves
  // after first render (login flow can settle a tick after this
  // screen mounts). We only seed empty fields so user edits aren't
  // clobbered.
  useEffect(() => {
    if (!user) return;
    const composed = [user.first_name, user.last_name].filter(Boolean).join(' ');
    setForm(prev => ({
      ...prev,
      name: prev.name || composed,
      email: prev.email || (user.email ?? ''),
    }));
  }, [user]);

  const set = useCallback(<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const errors = useMemo(() => {
    const out: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) out.name = 'Please enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) out.email = 'Enter a valid email.';
    if (!PHONE_RE.test(form.phone.trim())) out.phone = 'Enter a valid phone.';
    if (form.preferredMode === 'Offline' && !form.centre) {
      out.centre = 'Pick a branch for offline classes.';
    }
    if (!form.desiredScore) out.desiredScore = 'Select your desired score.';
    return out;
  }, [form]);

  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      showToast('Please fix the highlighted fields first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const phoneClean = form.phone.replace(/[\s-]/g, '');
      const code = form.countryCode.startsWith('+')
        ? form.countryCode
        : `+${form.countryCode}`;
      const fullPhone = phoneClean.startsWith('+')
        ? phoneClean
        : `${code}${phoneClean}`;

      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('email', form.email.trim());
      fd.append('phone', fullPhone);
      // `center` (sic) is the backend field name in the legacy
      // contract — keep the misspelling here so the server receives
      // what it expects.
      fd.append('center', form.preferredMode === 'Offline' ? form.centre : '');
      fd.append('preferred_mode', form.preferredMode);
      fd.append('desired_score', form.desiredScore);
      // `query_type` distinguishes trial-class enquiries from other
      // contact-form posts that share the endpoint.
      fd.append('query_type', 'trial_class');

      const res = await apiClient.post(API_ENDPOINTS.BOOK_TRAIL_CLASSES, fd, {
        timeout: 30000,
      });
      const msg =
        (res.data?.response?.message as string | undefined) ||
        (res.data?.message as string | undefined) ||
        'Your trial class request has been submitted!';
      showToast(msg, 'success');
      navigation.goBack();
    } catch (err: unknown) {
      logger.warn('[BookTrialClass] submit failed', err);
      const fallback = 'Could not submit your request. Please try again.';
      const e = err as { response?: { data?: { message?: string; response?: { message?: string } } } };
      const apiMsg =
        e?.response?.data?.response?.message ||
        e?.response?.data?.message ||
        fallback;
      showToast(apiMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, form, navigation, showToast]);

  return (
    <View style={styles.container}>
      <SubHeader
        title="Book Free Trial Class"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Tell us a bit about you and we&apos;ll reach out to schedule your
          complimentary trial session.
        </Text>

        <FormField
          label="Full Name"
          value={form.name}
          onChange={v => set('name', v)}
          error={errors.name}
          placeholder="e.g. Prabhat Sharma"
          autoComplete="name"
        />

        <FormField
          label="Email"
          value={form.email}
          onChange={v => set('email', v)}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.phoneRow}>
          <View style={styles.codeWrap}>
            <Text style={styles.label}>Code</Text>
            <TextInput
              style={styles.codeInput}
              value={form.countryCode}
              onChangeText={v => set('countryCode', v)}
              keyboardType="phone-pad"
              maxLength={5}
            />
          </View>
          <View style={styles.phoneWrap}>
            <FormField
              label="Phone Number"
              value={form.phone}
              onChange={v => set('phone', v)}
              error={errors.phone}
              placeholder="98765 43210"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.modeRow}>
          {(['Online', 'Offline'] as PreferredMode[]).map(mode => {
            const active = form.preferredMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeChip, active && styles.modeChipActive]}
                onPress={() => set('preferredMode', mode)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.modeChipLabel, active && styles.modeChipLabelActive]}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {form.preferredMode === 'Offline' && (
          <DropdownField
            label="Preferred Branch"
            value={form.centre}
            placeholder="Select a branch"
            open={branchMenuOpen}
            onToggle={() => setBranchMenuOpen(o => !o)}
            onSelect={(v: string) => {
              set('centre', v);
              setBranchMenuOpen(false);
            }}
            options={BRANCH_OPTIONS}
            error={errors.centre}
          />
        )}

        <DropdownField
          label="Desired Score"
          value={
            SCORE_OPTIONS.find(s => s.value === form.desiredScore)?.label ?? ''
          }
          placeholder="Pick your target band"
          open={scoreMenuOpen}
          onToggle={() => setScoreMenuOpen(o => !o)}
          onSelect={(label: string) => {
            const found = SCORE_OPTIONS.find(s => s.label === label);
            if (found) set('desiredScore', found.value);
            setScoreMenuOpen(false);
          }}
          options={SCORE_OPTIONS.map(s => s.label)}
          error={errors.desiredScore}
        />

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitLabel}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default BookTrialClassScreen;

// ─── Tiny inline form atoms ───────────────────────────────────────────
//
// Kept local because they only exist for this screen — promoting them
// to `components/atoms` would create a 1-consumer abstraction. If a
// second form ever uses the same controls, lift them then.

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'name' | 'email' | 'tel' | 'off';
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoComplete,
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

interface DropdownFieldProps {
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
  options: string[];
  error?: string;
}

const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  value,
  placeholder,
  open,
  onToggle,
  onSelect,
  options,
  error,
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity
      style={[styles.dropdownTrigger, error && styles.inputError]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.dropdownText,
          !value && styles.dropdownPlaceholder,
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Text style={styles.dropdownChevron}>{open ? '\u25B2' : '\u25BC'}</Text>
    </TouchableOpacity>
    {open && (
      <View style={styles.dropdownMenu}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={styles.dropdownItem}
            onPress={() => onSelect(opt)}
          >
            <Text style={styles.dropdownItemText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(40),
  },
  lead: {
    fontSize: scale(13),
    color: '#48484A',
    marginBottom: scale(16),
    lineHeight: scale(19),
  },
  field: { marginBottom: scale(14) },
  label: {
    fontSize: scale(12),
    color: '#1C1F2A',
    fontWeight: '600',
    marginBottom: scale(6),
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: Platform.OS === 'ios' ? scale(12) : scale(8),
    fontSize: scale(14),
    color: '#1C1F2A',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: scale(11),
    marginTop: scale(4),
  },
  phoneRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  codeWrap: {
    width: scale(80),
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: Platform.OS === 'ios' ? scale(12) : scale(8),
    fontSize: scale(14),
    color: '#1C1F2A',
    textAlign: 'center',
  },
  phoneWrap: { flex: 1 },
  modeRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(14),
  },
  modeChip: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: '#F2F3F5',
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: '#007AFF',
  },
  modeChipLabel: {
    fontSize: scale(13),
    color: '#48484A',
    fontWeight: '600',
  },
  modeChipLabelActive: {
    color: '#FFFFFF',
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: scale(14),
    color: '#1C1F2A',
    flex: 1,
    marginRight: scale(8),
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  dropdownChevron: {
    fontSize: scale(10),
    color: '#48484A',
  },
  dropdownMenu: {
    marginTop: scale(6),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(10),
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F3F5',
  },
  dropdownItemText: {
    fontSize: scale(13),
    color: '#1C1F2A',
  },
  submitBtn: {
    marginTop: scale(8),
    backgroundColor: '#007AFF',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#A0BFE9',
  },
  submitLabel: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontWeight: '600',
  },
});

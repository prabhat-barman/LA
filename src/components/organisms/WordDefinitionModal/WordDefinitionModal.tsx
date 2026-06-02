import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import apiClient from '../../../services/apiClient';
import { logger } from '../../../services/logger';

const { width } = Dimensions.get('window');

// Minimal language picker — mirrors the legacy WordSelectionModal's
// default trio. Tutors can extend this list later via a backend-
// supplied `scriptLanguages` array (not wired in the new app yet).
const LANGUAGES = ['English', 'Vietnamese', 'Urdu'] as const;
type Language = (typeof LANGUAGES)[number];

interface ApiDefinition {
  definition?: string | null;
}

interface ApiPayload {
  word?: string;
  translation?: string | null;
  word_definitions?: ApiDefinition[];
}

interface ApiResponse {
  data?: ApiPayload;
  word?: string;
  translation?: string | null;
  word_definitions?: ApiDefinition[];
}

interface Props {
  visible: boolean;
  word: string;
  onClose: () => void;
}

// Backend returns definition + example glued together with a
// double-newline separator and the literal "Example sentence:"
// marker. Split them out so the UI can present them as separate
// blocks; falls back to a friendly "not available" message when
// no definition arrives.
const parseDefinitionAndExample = (
  raw: string | null | undefined,
  displayWord: string,
): { definition: string; example: string | null } => {
  if (!raw) {
    return {
      definition: `"${displayWord}" definition not available.`,
      example: null,
    };
  }
  const parts = raw.split('\n\n');
  const definition = parts[0] ?? raw;
  let example: string | null = null;
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i] ?? '';
    if (seg.includes('Example sentence:')) {
      example = seg.replace('Example sentence:', '').trim();
      break;
    }
  }
  return { definition, example };
};

export const WordDefinitionModal: React.FC<Props> = ({
  visible,
  word,
  onClose,
}) => {
  const [language, setLanguage] = useState<Language>('English');
  const [showDropdown, setShowDropdown] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state when the modal closes — otherwise a
  // re-open for a new word briefly shows the previous result before
  // the next request resolves.
  useEffect(() => {
    if (!visible) {
      setData(null);
      setError(null);
      setShowDropdown(false);
      setLanguage('English');
    }
  }, [visible]);

  // Fetch whenever the modal opens for a new word OR the user picks
  // a different translation language. Aborts in-flight requests on
  // unmount / close so the wrong language doesn't paint last.
  useEffect(() => {
    if (!visible || !word) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiClient
      .post<ApiResponse>(
        API_ENDPOINTS.WORD_DEFINITION,
        { word, lang: language },
        { timeout: 10000, signal: controller.signal },
      )
      .then(res => {
        if (controller.signal.aborted) return;
        setData(res.data ?? null);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        logger.warn('[WordDefinition] fetch failed', err);
        const msg =
          (err?.response?.data?.message as string | undefined) ||
          (err?.message as string | undefined) ||
          'Failed to fetch definition';
        setError(msg);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [visible, word, language]);

  const displayWord = useMemo(() => {
    return data?.data?.word ?? data?.word ?? word;
  }, [data, word]);

  const { definition, example } = useMemo(() => {
    const rawDef =
      data?.data?.word_definitions?.[0]?.definition ??
      data?.word_definitions?.[0]?.definition ??
      null;
    return parseDefinitionAndExample(rawDef, displayWord);
  }, [data, displayWord]);

  const translation = data?.data?.translation ?? data?.translation ?? null;

  const handleSelectLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setShowDropdown(false);
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Text style={styles.closeLabel}>{'\u2715'}</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.wordBox}>
              <Text style={styles.wordText} numberOfLines={2}>
                {displayWord}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Translate:</Text>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setShowDropdown(o => !o)}
              disabled={loading}
            >
              <Text style={styles.langText}>{language}</Text>
              <Text style={styles.chevron}>{showDropdown ? '\u25B2' : '\u25BC'}</Text>
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.langMenu}>
                {LANGUAGES.map(l => (
                  <TouchableOpacity
                    key={l}
                    style={styles.langOption}
                    onPress={() => handleSelectLanguage(l)}
                  >
                    <Text style={styles.langOptionText}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#007AFF" />
                <Text style={styles.loadingText}>Loading definition\u2026</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <>
                <View style={styles.block}>
                  <Text style={styles.definitionText}>{definition}</Text>
                </View>

                {example ? (
                  <View style={styles.block}>
                    <Text style={styles.exampleLabel}>Example sentence:</Text>
                    <Text style={styles.exampleText}>{example}</Text>
                  </View>
                ) : null}

                {translation ? (
                  <View style={styles.translationBlock}>
                    <Text style={styles.exampleLabel}>
                      Translation ({language}):
                    </Text>
                    <Text style={styles.translationText}>{translation}</Text>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default WordDefinitionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: width * 0.9,
    maxWidth: 450,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    paddingTop: 28,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 1,
  },
  closeLabel: {
    fontSize: 18,
    color: '#48484A',
    fontWeight: '600',
  },
  wordBox: {
    backgroundColor: '#F2F3F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  wordText: {
    fontSize: 17,
    color: '#1C1F2A',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    color: '#48484A',
    fontWeight: '600',
    marginBottom: 6,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  langText: { fontSize: 13, color: '#1C1F2A', fontWeight: '500' },
  chevron: { fontSize: 10, color: '#48484A' },
  langMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 12,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F3F5',
  },
  langOptionText: { fontSize: 13, color: '#1C1F2A' },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#48484A',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  block: { marginBottom: 14 },
  definitionText: { fontSize: 14, color: '#1C1F2A', lineHeight: 20 },
  exampleLabel: {
    fontSize: 12,
    color: '#48484A',
    fontWeight: '600',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 13,
    color: '#1C1F2A',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  translationBlock: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  translationText: {
    fontSize: 13,
    color: '#1C1F2A',
    lineHeight: 19,
  },
});

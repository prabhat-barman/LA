import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { CaretDownIcon } from '../../../../components/atoms/Icon';
import { LANGUAGE_CODES, LANGUAGE_LABELS } from '../constants';
import { formatTime } from '../helpers';
import { PlayGlyph, StopGlyph } from '../icons';
import { scale } from '../scale';
import { styles } from '../styles';
import type { QuestionDetails } from '../types';

interface TranscriptPanelProps {
  visible: boolean;
  hasAudio: boolean;
  questionDetails: QuestionDetails | null;
  questionText: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  visible,
  hasAudio,
  questionDetails,
  questionText,
}) => {
  if (!visible || !hasAudio) return null;
  const transcriptText = (
    questionDetails?.transcript ||
    questionDetails?.q_transcript ||
    questionDetails?.audio_transcript ||
    questionDetails?.audio_script ||
    questionText ||
    'No transcript available.'
  ).trim();

  return (
    <View style={styles.inlineExpandPanel}>
      <Text style={styles.expandPanelTitle}>Transcript</Text>
      <Text style={styles.expandPanelText}>{transcriptText}</Text>
    </View>
  );
};

interface TranslationPanelProps {
  visible: boolean;
  selectedLang: string;
  langDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSelectLang: (lang: string) => void;
  translating: boolean;
  translationText: string | null;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  visible,
  selectedLang,
  langDropdownOpen,
  onToggleDropdown,
  onSelectLang,
  translating,
  translationText,
}) => {
  if (!visible) return null;
  return (
    <View style={styles.inlineExpandPanel}>
      <View style={styles.langSelectorRowInline}>
        <Text style={styles.langLabelInline}>Translate to:</Text>
        <View style={styles.langPickerContainerInline}>
          <TouchableOpacity
            style={styles.langPickerBtnInline}
            onPress={onToggleDropdown}
          >
            <Text style={styles.langPickerTextInline}>
              {LANGUAGE_LABELS[selectedLang] ?? 'Hindi'}
            </Text>
            <CaretDownIcon size={scale(10)} color="#1C1C1E" expanded={langDropdownOpen} />
          </TouchableOpacity>

          {langDropdownOpen && (
            <View style={styles.langDropdownInline}>
              {LANGUAGE_CODES.map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={styles.langItemInline}
                  onPress={() => onSelectLang(lang)}
                >
                  <Text style={styles.langItemTextInline}>
                    {LANGUAGE_LABELS[lang] ?? lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {translating ? (
        <ActivityIndicator
          size="small"
          color="#007AFF"
          style={{ marginVertical: scale(10) }}
        />
      ) : (
        <Text style={styles.expandPanelText}>
          {translationText ?? 'Translation text will appear here.'}
        </Text>
      )}
    </View>
  );
};

interface SamplePanelProps {
  visible: boolean;
  questionDetails: QuestionDetails | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  onTogglePlay: () => void;
}

export const SamplePanel: React.FC<SamplePanelProps> = ({
  visible,
  questionDetails,
  isPlaying,
  positionMs,
  durationMs,
  onTogglePlay,
}) => {
  if (!visible) return null;
  const sampleAudio =
    questionDetails?.sample_audio ??
    questionDetails?.sample_audio_file ??
    questionDetails?.answer_audio;
  return (
    <View style={styles.inlineExpandPanel}>
      <Text style={styles.expandPanelTitle}>Sample Answer</Text>
      <Text style={styles.expandPanelText}>
        {questionDetails?.sample_response ??
          questionDetails?.answer ??
          questionDetails?.model_answer ??
          'No sample answer text available.'}
      </Text>

      {!!sampleAudio && (
        <View style={styles.sampleAudioContainerInline}>
          <TouchableOpacity style={styles.samplePlayBtnInline} onPress={onTogglePlay}>
            {isPlaying ? <StopGlyph size={scale(10)} /> : <PlayGlyph size={scale(10)} />}
            <Text style={styles.samplePlayBtnTextInline}>
              {isPlaying ? 'Stop' : 'Play Sample Audio'}
            </Text>
          </TouchableOpacity>

          {isPlaying && (
            <Text style={styles.sampleTimerTextInline}>
              {formatTime(positionMs / 1000)} / {formatTime(durationMs / 1000)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

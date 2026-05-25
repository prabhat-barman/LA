import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { TagIcon } from '../../../components/atoms/Icon';
import { SubHeader } from '../../../components/molecules/SubHeader';
import { LocalErrorBoundary } from '../../../components/organisms/LocalErrorBoundary';
import { MediaConsole, MediaConsoleRef } from '../../../components/practiceMedia';
import apiClient from '../../../services/apiClient';
import { logger } from '../../../services/logger';
import { API_ENDPOINTS } from '../../../config/apiConfig';
import { isPteCore } from '../../../config/appVariantConfig';
import Config from '../../../config/Config';
import { Data, QUESTION_METADATA } from '../../../config/practiceData';
import { useToast } from '../../../context/ToastContext';
import { useRecorder } from '../../../context/RecorderContext';
import { useAudioPlayer } from '../../../hooks/practiceMedia';
import { tagColorStore } from '../../../utils/tagColorStore';
import { TAG_COLOR_HEX } from './constants';
import { normalizeDifficulty, sortAttemptsBy } from './helpers';
import { scale } from './scale';
import { styles } from './styles';
import type {
  AttemptLog,
  HistoryTab,
  PracticeMode,
  QuestionDetails,
  ScoreResult,
  SortFilter,
  TagColor,
} from './types';
import { useAttemptAudioPlayer } from './hooks/useAttemptAudioPlayer';
import { usePhasedRender } from './hooks/usePhasedRender';
import { useScoreBreakdown } from './hooks/useScoreBreakdown';
import { AttemptsHistorySection } from './components/AttemptsHistorySection';
import { CardActionsRow } from './components/CardActionsRow';
import { CardFooter } from './components/CardFooter';
import {
  SamplePanel,
  TranscriptPanel,
  TranslationPanel,
} from './components/ExpandPanels';
import { HiddenAttemptAudioWebView } from './components/HiddenAttemptAudioWebView';
import { InstructionBanner } from './components/InstructionBanner';
import { ModeSwitcher } from './components/ModeSwitcher';
import { NavigationFooter } from './components/NavigationFooter';
import { QuestionContent } from './components/QuestionContent';
import { QuestionMetaBlock } from './components/QuestionMetaBlock';
import { ReportIssueModal } from './components/ReportIssueModal';
import { ScoreResultModal } from './components/ScoreResultModal';
import { TagPickerDropdown } from './components/TagPickerDropdown';

type PracticeQuestionDetailRouteProp = RouteProp<
  RootStackParamList,
  'PracticeQuestionDetail'
>;

export const PracticeQuestionDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PracticeQuestionDetailRouteProp>();
  const { showToast } = useToast();

  const {
    questionId: initialQuestionId,
    categoryId,
    categoryName,
    questionsList,
    initialIndex,
  } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Memoised so its identity is stable across renders that don't change the
  // index — this keeps downstream useMemos (displayTitle/displayDifficulty/
  // displayIsNew) from invalidating on unrelated state changes.
  const activeQuestionItem = useMemo(
    () => questionsList[currentIndex] || { id: initialQuestionId },
    [currentIndex, initialQuestionId, questionsList],
  );
  const currentQuestionId = activeQuestionItem.id;

  const [loading, setLoading] = useState(true);
  const [questionDetails, setQuestionDetails] = useState<QuestionDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The voice currently selected by the user for the question audio.
  // Resolved against `questionDetails.question_audios[*].label`. `null`
  // means "use the first available voice or fall back to legacy fields".
  // We reset this whenever the question changes so each question opens
  // with its own default voice rather than carrying a stale selection.
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState<string | null>(null);

  const renderPhase = usePhasedRender(currentIndex);
  const mediaConsoleRef = useRef<MediaConsoleRef | null>(null);
  const mediaFlow = useRecorder();

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordingDurationSec, setRecordingDurationSec] = useState<number>(0);

  const handleRecordedUriChange = useCallback(
    (uri: string | null, durationSec: number) => {
      setRecordedUri(uri);
      setRecordingDurationSec(durationSec);
    },
    [],
  );

  // Bookmarking / coloured tagging. The store is the source of truth so the
  // list screen reflects the latest value the moment we navigate back.
  const [tagColor, setTagColor] = useState<TagColor>(() => {
    const stored = tagColorStore.get(activeQuestionItem.id);
    return stored !== 'none' ? stored : 'none';
  });
  const [taggingInProgress, setTaggingInProgress] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = tagColorStore.subscribe(() => {
      const next = tagColorStore.get(currentQuestionId);
      setTagColor(prev => (prev === next ? prev : next));
    });
    return unsubscribe;
  }, [currentQuestionId]);

  // Translation panel state
  const [translationText, setTranslationText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [selectedLang, setSelectedLang] = useState('hi');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Attempts
  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [othersAttempts, setOthersAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Score Result Modal
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);

  // Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // UI state
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('Normal');
  const [activeHistoryTab, setActiveHistoryTab] = useState<HistoryTab>('me');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SortFilter>('Latest');
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSampleResponse, setShowSampleResponse] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const isCore = isPteCore();

  const metadata = useMemo(
    () =>
      QUESTION_METADATA.find(m => m.id === categoryId) || {
        id: categoryId,
        type: categoryName,
        waitTimeBeforeAudio: 0,
        hasAudio: false,
        waitTimeBeforeRecording: 35,
        recordingDuration: 35,
        nextButtonBehavior: 'enable',
      },
    [categoryId, categoryName],
  );

  const instructionObj = useMemo(
    () =>
      Data.InstructionText.find(item => item.id === categoryId) || {
        text: `Practice speaking for ${categoryName}`,
        maxRecordingSeconds: metadata.recordingDuration,
      },
    [categoryId, categoryName, metadata],
  );

  const instructionText = useMemo(() => {
    const obj = instructionObj as { text: string; pteCore?: string };
    return isCore && obj.pteCore ? obj.pteCore : obj.text;
  }, [isCore, instructionObj]);

  // Question metadata for the chips above the card. Prefer the value from
  // `questionsList` (passed by the list screen) and fall back to fields on
  // the fetched question details payload.
  const displayTitle = useMemo(() => {
    const fromList = (activeQuestionItem as any).title as string | undefined;
    const fromDetails =
      questionDetails?.title ??
      questionDetails?.q_title ??
      questionDetails?.question_title ??
      questionDetails?.name;
    const value = (fromList ?? fromDetails ?? '').toString().trim();
    return value && value !== categoryName ? value : '';
  }, [activeQuestionItem, questionDetails, categoryName]);

  const displayDifficulty = useMemo(
    () =>
      normalizeDifficulty(
        (activeQuestionItem as any).difficulty ??
          (questionDetails as any)?.difficulty ??
          (questionDetails as any)?.level ??
          (questionDetails as any)?.difficulty_level,
      ),
    [activeQuestionItem, questionDetails],
  );

  const displayIsNew = useMemo(() => {
    if ((activeQuestionItem as any).isNew === true) return true;
    const v = (questionDetails as any)?.is_new;
    return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
  }, [activeQuestionItem, questionDetails]);

  // Audio resolving helper - memoized so callers can pass it as a dep
  // without retriggering effects on every render.
  const resolveAudioUrl = useCallback((audio: string | undefined) => {
    if (!audio) return '';
    if (audio.startsWith('http://') || audio.startsWith('https://')) return audio;
    const cleaned = audio.startsWith('/') ? audio.substring(1) : audio;
    if (
      cleaned.startsWith('question_audio_tests/') ||
      cleaned.startsWith('audio_tests/')
    ) {
      return `${Config.mediaUrl}/${cleaned}`;
    }
    return `${Config.audioPath}${cleaned}`;
  }, []);

  const resolveImageUrl = useCallback(
    (img: string | undefined) => {
      if (!img) return '';
      // Already absolute (http(s) URL) or a data URI — pass through.
      if (img.startsWith('http://') || img.startsWith('https://')) return img;
      if (img.startsWith('data:')) return img;
      const cleaned = img.startsWith('/') ? img.substring(1) : img;
      // Media assets (Describe Image PNG/JPGs, audio takes, etc.) live on
      // the shared S3 bucket. The legacy `pdfPath` host only serves a few
      // older endpoints, so paths that start with the well-known media
      // prefixes must be routed through `mediaUrl` to actually resolve.
      if (
        cleaned.startsWith('ptedata/') ||
        cleaned.startsWith('question_audio_tests/') ||
        cleaned.startsWith('audio_tests/')
      ) {
        return `${Config.mediaUrl}/${cleaned}`;
      }
      const basePath = isCore ? Config.pdfPteCorePath : Config.pdfPath;
      return `${basePath}${cleaned}`;
    },
    [isCore],
  );

  const questionText = useMemo(() => {
    if (!questionDetails) return '';
    return (
      questionDetails.paragraph ??
      questionDetails.question ??
      questionDetails.text ??
      questionDetails.q_text ??
      ''
    );
  }, [questionDetails]);

  // Voice variants attached to this question (e.g. Lily / Clara / William
  // mp3 takes). The dropdown only ever shows entries from this list because
  // the global `voices` catalogue may include voices that haven't been
  // recorded for the current item. `value` is the storage path; `label`
  // is the display name shown in the dropdown.
  const availableVoices = useMemo(() => {
    const list = questionDetails?.question_audios;
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (v): v is { label: string; value: string } =>
          !!v && typeof v.label === 'string' && typeof v.value === 'string' && v.value.length > 0,
      )
      .map(v => ({ label: v.label, value: v.value }));
  }, [questionDetails]);

  // Default the voice picker once the variants for the new question land.
  // We don't preserve the previous selection across questions because the
  // available voices vary per item — a voice that worked for question A
  // might not exist for question B.
  useEffect(() => {
    if (selectedVoiceLabel) return;
    if (availableVoices.length === 0) return;
    setSelectedVoiceLabel(availableVoices[0].label);
  }, [availableVoices, selectedVoiceLabel]);

  // Resolved question audio URL (for the media flow hook). Prefers the
  // voice variant matching `selectedVoiceLabel` and falls back through the
  // legacy single-audio fields for question types that don't yet emit a
  // `question_audios` array. Only valid once questionDetails has loaded.
  const questionAudioUrl = useMemo(() => {
    if (!questionDetails) return undefined;
    if (selectedVoiceLabel && availableVoices.length > 0) {
      const match = availableVoices.find(v => v.label === selectedVoiceLabel);
      if (match?.value) return resolveAudioUrl(match.value);
    }
    if (availableVoices.length > 0) {
      return resolveAudioUrl(availableVoices[0].value);
    }
    const audioFile =
      questionDetails.audio ??
      questionDetails.audio_file ??
      questionDetails.question_audio ??
      questionDetails.q_audio ??
      questionDetails.media_link;
    return audioFile ? resolveAudioUrl(audioFile) : undefined;
  }, [questionDetails, selectedVoiceLabel, availableVoices, resolveAudioUrl]);

  const handleSelectVoice = useCallback((label: string) => {
    setSelectedVoiceLabel(label);
  }, []);

  // Mic permission helper. Prompts the user with a Settings shortcut when
  // the OS reports that mic access is permanently denied.
  const handleMediaError = useCallback(
    (msg: string) => {
      const looksLikePermissionDenial =
        /permission/i.test(msg) || /microphone/i.test(msg);
      if (looksLikePermissionDenial) {
        Alert.alert(
          'Microphone Access Needed',
          'Language Academy needs microphone access to record your answers. Open Settings to grant permission.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings().catch(() => {
                  showToast(
                    'Could not open Settings. Please grant mic access manually.',
                    'error',
                  );
                });
              },
            },
          ],
        );
        return;
      }
      showToast(msg, 'error');
    },
    [showToast],
  );

  // Dedicated sample-answer audio player. Shares the global Sound coordinator
  // with the media-flow hook, so starting playback here pauses any other
  // active player automatically.
  const samplePlayer = useAudioPlayer();

  // Attempt audio playback uses react-native-webview rather than nitro-sound
  // because AVAudioPlayer fails to sniff the format for many user-uploaded
  // mp3s served from S3 with non-audio Content-Type.
  const attemptAudio = useAttemptAudioPlayer({
    resolveAudioUrl,
    onError: msg => showToast(msg, 'error'),
    beforePlay: async () => {
      // Free up the audio session from any other player and stop the mic
      // recorder if it's still capturing in the background.
      await samplePlayer.stop().catch(() => {});
      await mediaConsoleRef.current?.stopRecordingIfActive().catch(() => {});
    },
  });

  // Fetch Question Detail & Attempts
  const fetchQuestionDetail = useCallback(
    async (qId: string | number) => {
      setLoading(true);
      setQuestionDetails(null);
      setTranslationText(null);
      setScoreResult(null);
      setIsSubmitting(false);
      setAttempts([]);
      setOthersAttempts([]);
      // Drop any voice selection from the previous question — the
      // `availableVoices` effect will pick the new question's default once
      // the response lands.
      setSelectedVoiceLabel(null);
      attemptAudio.stop();
      await mediaConsoleRef.current?.reset();
      await samplePlayer.stop();

      try {
        // Uses the v1 list endpoint in "open question" mode: it returns the
        // same shape as the practice list (including `tag` relations and the
        // current user's `attempted[]` history) for a single question
        // identified by `qid`.
        //
        // `open_ques` must be the 1-based POSITION of the question in the
        // currently displayed list. The backend uses this value to anchor
        // the response, so a wrong/static value can cause it to ignore the
        // open-question mode and return the paginated list instead.
        const listIndex = questionsList.findIndex(
          item => String(item?.id) === String(qId),
        );
        const openQuesPos = listIndex >= 0 ? listIndex + 1 : currentIndex + 1;
        const qs =
          `prediction=0&type=1&mark=all&attempted=all&complexity=all` +
          `&orderby=desc&practice=true` +
          `&open_ques=${openQuesPos}` +
          `&qid=${encodeURIComponent(String(qId))}` +
          `&search=&filterByVid=all`;
        const fullUrl = `${API_ENDPOINTS.LIST_QUESTION}/${categoryId}?${qs}`;
        logger.log(
          '[QuestionDetail] fetch',
          { qId, currentIndex, listIndex, openQuesPos, listLen: questionsList.length },
          fullUrl,
        );
        const res = await apiClient.get(fullUrl);
        const arr: any[] = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const data = arr.find(q => String(q?.id) === String(qId)) ?? arr[0] ?? {};
        setQuestionDetails(data);

        // Resolve the saved tag colour from any of the shapes the backend
        // uses: canonical relations array, flat string, or legacy boolean.
        const VALID = ['grey', 'red', 'green', 'yellow'];
        const pickStr = (v: unknown): TagColor | null => {
          if (typeof v !== 'string') return null;
          const lower = v.trim().toLowerCase();
          return VALID.includes(lower) ? (lower as TagColor) : null;
        };
        let resolved: TagColor = 'none';
        if (Array.isArray(data.tag) && data.tag.length > 0) {
          const last = data.tag[data.tag.length - 1];
          resolved = pickStr(last?.tag) || pickStr(last?.color) || 'none';
        }
        if (resolved === 'none') {
          resolved =
            pickStr(data.tag_color) ||
            pickStr(data.tagColor) ||
            pickStr(typeof data.tag === 'string' ? data.tag : null) ||
            'none';
        }
        if (resolved === 'none' && data.is_tagged !== undefined) {
          resolved = data.is_tagged ? 'green' : 'none';
        }
        setTagColor(resolved);
        tagColorStore.set(qId, resolved);
      } catch (err: any) {
        showToast(err?.message || 'Failed to load question details.', 'error');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryId, questionsList, currentIndex],
  );

  const fetchHistoryAttempts = useCallback(
    async (qId: string | number, tab: HistoryTab) => {
      setLoadingAttempts(true);
      try {
        const formData = new FormData();
        formData.append('question_id', String(qId));
        formData.append('skip', '0');
        if (tab === 'others') formData.append('all', '1');

        const res = await apiClient.post(API_ENDPOINTS.SHOW_HISTORY, formData);
        const data = res.data?.data ?? res.data ?? [];
        // if (Array.isArray(data) && data.length > 0) {
        //   logger.log(
        //     `[QuestionDetail] history (${tab}) sample item:`,
        //     JSON.stringify(data[0], null, 2),
        //   );
        // }
        const list = Array.isArray(data) ? data : [];
        if (tab === 'me') setAttempts(list);
        else setOthersAttempts(list);
      } catch (err) {
        logger.warn('Failed to load attempts log', err);
        if (tab === 'me') setAttempts([]);
        else setOthersAttempts([]);
      } finally {
        setLoadingAttempts(false);
      }
    },
    [],
  );

  // Auto-fetch attempts when question/tab changes. We fetch "me" history at
  // renderPhase >= 4 (when the attempts panel mounts) and "others" lazily at
  // renderPhase >= 5.
  useEffect(() => {
    if (!currentQuestionId || loading) return;
    if (activeHistoryTab === 'me' && renderPhase >= 4) {
      fetchHistoryAttempts(currentQuestionId, 'me');
    } else if (activeHistoryTab === 'others' && renderPhase >= 5) {
      fetchHistoryAttempts(currentQuestionId, 'others');
    }
  }, [currentQuestionId, activeHistoryTab, fetchHistoryAttempts, renderPhase, loading]);

  useEffect(() => {
    fetchQuestionDetail(currentQuestionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestionId]);

  const mediaFlowRef = useRef(mediaFlow);
  mediaFlowRef.current = mediaFlow;
  const samplePlayerRef = useRef(samplePlayer);
  samplePlayerRef.current = samplePlayer;
  const attemptAudioRef = useRef(attemptAudio);
  attemptAudioRef.current = attemptAudio;

  // Tear down all audio when navigating away or when the screen unmounts.
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      mediaFlowRef.current.reset().catch(() => {});
      samplePlayerRef.current.stop().catch(() => {});
      attemptAudioRef.current.stop();
    });
    return () => {
      unsubscribe();
      mediaFlowRef.current.reset().catch(() => {});
      samplePlayerRef.current.stop().catch(() => {});
      attemptAudioRef.current.stop();
    };
  }, [navigation]);


  const submitReport = useCallback(async () => {
    if (!selectedReason) {
      showToast('Please select a reason for reporting.', 'error');
      return;
    }
    setSubmittingReport(true);
    try {
      const formData = new FormData();
      const feedbackText =
        additionalDetails.trim() || selectedReason || 'No details provided';
      formData.append('question_id', String(currentQuestionId));
      formData.append('reason', selectedReason);
      formData.append('feedback', feedbackText);
      formData.append('message', feedbackText);
      formData.append('comment', feedbackText);
      formData.append('details', feedbackText);
      formData.append('text', feedbackText);

      await apiClient.post(API_ENDPOINTS.REPORT, formData);

      showToast('Report submitted successfully. Thank you!', 'success');
      setSelectedReason(null);
      setAdditionalDetails('');
      setReportModalVisible(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  }, [additionalDetails, currentQuestionId, selectedReason, showToast]);

  const submitAnswer = useCallback(async () => {
    if (!recordedUri) {
      showToast('Please record your voice first.', 'error');
      return;
    }
    await samplePlayer.stop();
    attemptAudio.stop();
    setIsSubmitting(true);

    try {
      const endpoint = isCore
        ? API_ENDPOINTS.PTE_CORE_SUBMIT_ANSWER
        : API_ENDPOINTS.SUBMIT_ANSWER;

      const formData = new FormData();
      formData.append('id', String(currentQuestionId));
      formData.append('question_id', String(currentQuestionId));
      formData.append('type', String(categoryId));
      formData.append('category_id', String(categoryId));
      formData.append('practice', '1');
      formData.append('device', 'mobile');
      formData.append('isPlatform', Platform.OS);

      const recordDuration = recordingDurationSec;
      const m = Math.floor(recordDuration / 60);
      const s = Math.floor(recordDuration % 60);
      const durationStr = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      formData.append('duration', durationStr);

      const strategyVal =
        categoryId === 1 ? (selectedMode === 'Normal' ? '1' : '2') : '1';
      formData.append('strategy', strategyVal);
      formData.append('answer', '');

      let submitText = '';
      let submitScript = '';
      if (categoryId === 1) {
        submitText = questionText;
        submitScript =
          questionDetails?.script ?? questionDetails?.audio_script ?? '';
      } else if (categoryId === 3) {
        submitText = '';
        submitScript = '';
      } else {
        const scriptText =
          questionDetails?.transcript ??
          questionDetails?.q_transcript ??
          questionDetails?.audio_transcript ??
          questionDetails?.audio_script ??
          '';
        submitText = scriptText;
        submitScript = scriptText;
      }
      formData.append('text', submitText);
      formData.append('script', submitScript);

      const correctSampleAnswer =
        questionDetails?.answer ??
        questionDetails?.model_answer ??
        questionDetails?.sample_answer ??
        '';
      formData.append('q_ans', correctSampleAnswer);

      let fileUri = recordedUri;
      if (Platform.OS === 'android') {
        const cleanPath = fileUri.replace(/^file:\/\//, '').replace(/^\/+/, '');
        fileUri = `file:///${cleanPath}`;
      }

      const fileObj = {
        uri: fileUri,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        name:
          Platform.OS === 'ios'
            ? `sound-${currentQuestionId}.m4a`
            : `sound-${currentQuestionId}.mp4`,
      };
      formData.append('file', fileObj as any);

      const res = await apiClient.post(endpoint, formData);
      const data = res.data?.data ?? res.data ?? {};

      setScoreResult(data);
      setScoreModalVisible(true);

      fetchHistoryAttempts(currentQuestionId, activeHistoryTab);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Submission failed. Please try again.';
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeHistoryTab,
    attemptAudio,
    categoryId,
    currentQuestionId,
    fetchHistoryAttempts,
    isCore,
    questionDetails,
    questionText,
    recordedUri,
    recordingDurationSec,
    samplePlayer,
    selectedMode,
    showToast,
  ]);

  // Coloured Tagging. Maps a picker color to its visible hex value used on
  // the icon and chips.
  const headerTagIconColor =
    tagColor === 'none' ? '#8E8E93' : TAG_COLOR_HEX[tagColor];

  // Persist a colour change. We optimistically update local + shared store
  // and roll back on failure.
  const persistTagColor = useCallback(
    async (next: TagColor) => {
      if (taggingInProgress) return;
      const previous = tagColor;
      setTagColor(next);
      tagColorStore.set(currentQuestionId, next);
      setTagPickerOpen(false);
      setTaggingInProgress(true);
      try {
        const formData = new FormData();
        formData.append('question_id', String(currentQuestionId));
        // Backend stores the colour name directly in the `tag` column. For
        // "untag" we send "0" to mirror the legacy flag.
        formData.append('tag', next === 'none' ? '0' : next);
        formData.append('tag_color', next);
        await apiClient.post(API_ENDPOINTS.SET_TAG, formData);
        showToast(next === 'none' ? 'Tag removed' : `Tagged as ${next}`, 'info');
      } catch (err: any) {
        setTagColor(previous);
        tagColorStore.set(currentQuestionId, previous);
        showToast(
          err?.response?.data?.message || 'Failed to update tag',
          'error',
        );
      } finally {
        setTaggingInProgress(false);
      }
    },
    [currentQuestionId, showToast, tagColor, taggingInProgress],
  );

  const handleTranslate = useCallback(async () => {
    if (!questionText) return;
    setTranslating(true);
    setTranslationText(null);
    try {
      const formData = new FormData();
      formData.append('sentence', questionText);
      formData.append('lang', selectedLang);

      const res = await apiClient.post(API_ENDPOINTS.TEXT_TRANSLATION, formData);
      const translated =
        res.data?.data ?? res.data?.translatedText ?? res.data ?? '';
      setTranslationText(
        typeof translated === 'string' ? translated : JSON.stringify(translated),
      );
    } catch (err: any) {
      showToast(err?.message || 'Translation failed.', 'error');
    } finally {
      setTranslating(false);
    }
  }, [questionText, selectedLang, showToast]);

  // Trigger translation when language changes & Translate is expanded.
  useEffect(() => {
    if (showTranslation) handleTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, showTranslation, questionText]);

  const handlePrevQuestion = useCallback(() => {
    setCurrentIndex(idx => (idx > 0 ? idx - 1 : idx));
  }, []);

  const handleNextQuestion = useCallback(() => {
    setCurrentIndex(idx => (idx < questionsList.length - 1 ? idx + 1 : idx));
  }, [questionsList.length]);

  // Score-modal derived state
  const { wordsListToShow, overallRawAndMax, overallPercentage, resolvedSubscores } =
    useScoreBreakdown(scoreResult, questionText);

  // Sorted attempts for whichever history tab is active. Latest preserves
  // the backend order; the other two filters operate on a copy.
  const visibleAttempts = useMemo(() => {
    const source = activeHistoryTab === 'me' ? attempts : othersAttempts;
    return sortAttemptsBy(source, selectedFilter);
  }, [activeHistoryTab, attempts, othersAttempts, selectedFilter]);

  // Stable callbacks for child handlers
  const handleHistoryTabChange = useCallback(
    (tab: HistoryTab) => {
      if (activeHistoryTab === tab) return;
      attemptAudio.stop();
      setActiveHistoryTab(tab);
    },
    [activeHistoryTab, attemptAudio],
  );

  const handleSelectFilter = useCallback((filter: SortFilter) => {
    setSelectedFilter(filter);
    setFilterDropdownOpen(false);
  }, []);

  const handleToggleSampleAudio = useCallback(() => {
    if (samplePlayer.isPlaying) {
      samplePlayer.stop();
      return;
    }
    attemptAudio.stop();
    const url = resolveAudioUrl(
      questionDetails?.sample_audio ??
        questionDetails?.sample_audio_file ??
        questionDetails?.answer_audio,
    );
    if (url) samplePlayer.play(url);
  }, [attemptAudio, questionDetails, resolveAudioUrl, samplePlayer]);

  const handleSelectLang = useCallback((lang: string) => {
    setSelectedLang(lang);
    setLangDropdownOpen(false);
  }, []);

  const handleScoreModalClose = useCallback(() => {
    setScoreModalVisible(false);
  }, []);

  const handleReportModalClose = useCallback(() => {
    setSelectedReason(null);
    setAdditionalDetails('');
    setReportModalVisible(false);
  }, []);

  return (
    <View style={styles.container}>
      <SubHeader
        title={categoryName}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            onPress={() => setTagPickerOpen(o => !o)}
            disabled={taggingInProgress}
            style={styles.headerRightBtn}
          >
            <TagIcon
              color={headerTagIconColor}
              tagged={tagColor !== 'none'}
              size={scale(22)}
            />
          </TouchableOpacity>
        }
      />

      <TagPickerDropdown
        open={tagPickerOpen}
        tagColor={tagColor}
        taggingInProgress={taggingInProgress}
        onSelect={persistTagColor}
        onDismiss={() => setTagPickerOpen(false)}
      />

      {loading || renderPhase < 2 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Fetching question details...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <QuestionMetaBlock
            title={displayTitle}
            questionId={currentQuestionId}
            difficulty={displayDifficulty}
            isNew={displayIsNew}
            attemptedCount={attempts.length}
          />

          <InstructionBanner text={instructionText} />

          {categoryId === 1 && (
            <ModeSwitcher selectedMode={selectedMode} onChange={setSelectedMode} />
          )}

          <View style={styles.questionPanelCard}>
            <QuestionContent
              categoryId={categoryId}
              questionDetails={questionDetails}
              questionText={questionText}
              resolveImageUrl={resolveImageUrl}
            />

            {renderPhase >= 3 ? (
              <LocalErrorBoundary errorMessage="Failed to initialize audio console.">
                <MediaConsole
                  ref={mediaConsoleRef}
                  metadata={metadata}
                  isCore={isCore}
                  questionAudioUrl={questionAudioUrl}
                  questionDetailsLoaded={!!questionDetails}
                  selectedMode={selectedMode}
                  categoryId={categoryId}
                  isSubmitting={isSubmitting}
                  availableVoices={availableVoices}
                  selectedVoiceLabel={selectedVoiceLabel}
                  onSelectVoice={handleSelectVoice}
                  onRecordedUriChange={handleRecordedUriChange}
                  onError={handleMediaError}
                />
              </LocalErrorBoundary>
            ) : (
              <View style={styles.consolePlaceholder}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.placeholderText}>Preparing audio controls...</Text>
              </View>
            )}

            {renderPhase >= 4 ? (
              <>
                <CardActionsRow
                  hasAudio={metadata.hasAudio}
                  showTranscript={showTranscript}
                  showTranslation={showTranslation}
                  showSampleResponse={showSampleResponse}
                  onToggleTranscript={() => setShowTranscript(v => !v)}
                  onToggleTranslation={() => setShowTranslation(v => !v)}
                  onToggleSample={() => setShowSampleResponse(v => !v)}
                />

                <TranscriptPanel
                  visible={showTranscript}
                  hasAudio={metadata.hasAudio}
                  questionDetails={questionDetails}
                  questionText={questionText}
                />

                <TranslationPanel
                  visible={showTranslation}
                  selectedLang={selectedLang}
                  langDropdownOpen={langDropdownOpen}
                  onToggleDropdown={() => setLangDropdownOpen(o => !o)}
                  onSelectLang={handleSelectLang}
                  translating={translating}
                  translationText={translationText}
                />

                <SamplePanel
                  visible={showSampleResponse}
                  questionDetails={questionDetails}
                  isPlaying={samplePlayer.isPlaying}
                  positionMs={samplePlayer.positionMs}
                  durationMs={samplePlayer.durationMs}
                  onTogglePlay={handleToggleSampleAudio}
                />

                <CardFooter
                  attemptCount={attempts.length}
                  onReport={() => setReportModalVisible(true)}
                />
              </>
            ) : (
              <View style={styles.consolePlaceholder}>
                <Text style={styles.placeholderText}>Loading collateral tools...</Text>
              </View>
            )}
          </View>

          {renderPhase >= 4 && (
            <AttemptsHistorySection
              activeHistoryTab={activeHistoryTab}
              onChangeHistoryTab={handleHistoryTabChange}
              filterDropdownOpen={filterDropdownOpen}
              onToggleFilter={() => setFilterDropdownOpen(o => !o)}
              selectedFilter={selectedFilter}
              onSelectFilter={handleSelectFilter}
              loadingAttempts={loadingAttempts}
              attempts={visibleAttempts}
              playingAttemptId={attemptAudio.playingId}
              isAttemptPlaying={attemptAudio.isPlaying}
              onToggleAttemptAudio={attemptAudio.toggle}
            />
          )}
        </ScrollView>
      )}

      <HiddenAttemptAudioWebView
        source={attemptAudio.source}
        onEnded={attemptAudio.stop}
        onError={msg => {
          showToast(msg, 'error');
          attemptAudio.stop();
        }}
      />

      <NavigationFooter
        isFirst={currentIndex === 0}
        isLast={currentIndex === questionsList.length - 1}
        hasRecording={!!recordedUri}
        isSubmitting={isSubmitting}
        hasSubmitted={!!scoreResult}
        onPrev={handlePrevQuestion}
        onNext={handleNextQuestion}
        onSubmit={submitAnswer}
        onShowScore={() => setScoreModalVisible(true)}
      />

      <ScoreResultModal
        visible={scoreModalVisible}
        onClose={handleScoreModalClose}
        scoreResult={scoreResult}
        overallRawAndMax={overallRawAndMax}
        overallPercentage={overallPercentage}
        resolvedSubscores={resolvedSubscores}
        wordsListToShow={wordsListToShow}
      />

      <ReportIssueModal
        visible={reportModalVisible}
        onClose={handleReportModalClose}
        onSubmit={submitReport}
        submitting={submittingReport}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        additionalDetails={additionalDetails}
        setAdditionalDetails={setAdditionalDetails}
      />
    </View>
  );
};

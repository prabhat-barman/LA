import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { SubHeader } from '../../components/molecules/SubHeader';
import apiClient from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/apiConfig';
import { isPteCore } from '../../config/appVariantConfig';
import { useToast } from '../../context/ToastContext';
import { tagColorStore } from '../../utils/tagColorStore';
import { QUESTION_METADATA, Data } from '../../config/practiceData';
import { CircularProgressBar } from '../../components/atoms/CircularProgressBar';
import Config from '../../config/Config';
import {
  PlayIcon,
  TagIcon,
  SparklesIcon,
  OpenBookIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CaretDownIcon,
} from '../../components/atoms/Icon';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAudioPlayer } from '../../hooks/practiceMedia';
import { MediaConsole, MediaConsoleRef } from '../../components/practiceMedia';
import { LocalErrorBoundary } from '../../components/organisms/LocalErrorBoundary';
import { InteractionManager } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

// Helper function for formatting seconds to MM:SS
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Format an attempt timestamp into a friendly local string:
//   today      -> "Today, 12:37 PM"
//   yesterday  -> "Yesterday, 12:37 PM"
//   this year  -> "23 Apr, 12:37 PM"
//   older/newer-> "23 Apr 2026, 12:37 PM"
// Returns 'Unknown date' if the input isn't parseable.
const formatAttemptDate = (input?: string | number | Date | null): string => {
  if (!input) return 'Unknown date';
  const d = new Date(input);
  if (isNaN(d.getTime())) return 'Unknown date';

  const now = new Date();
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateLabel = d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateLabel}, ${time}`;
};

// Custom SVG Icons for the Redesign
const InfoOutlineIcon: React.FC<{ size?: number; color?: string }> = ({ size = scale(16), color = '#5C527F' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 8V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="15" r="1" fill={color} />
  </Svg>
);

const TranslateIcon: React.FC<{ size?: number; color?: string }> = ({ size = scale(16), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 8h14M12 4v4M9 12a5 5 0 018-4M17 12c-1.5 2.5-4 4.5-8 5.5M11 16c1-2 2-5 2-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MessageBubbleIcon: React.FC<{ size?: number; color?: string }> = ({ size = scale(16), color = '#7C3AED' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ReportFlagIcon: React.FC<{ size?: number; color?: string }> = ({ size = scale(16), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

type PracticeQuestionDetailRouteProp = RouteProp<RootStackParamList, 'PracticeQuestionDetail'>;

interface QuestionDetails {
  id: string | number;
  title?: string;
  q_title?: string;
  question_title?: string;
  name?: string;
  question?: string;
  text?: string;
  q_text?: string;
  paragraph?: string;
  audio?: string;
  audio_file?: string;
  question_audio?: string;
  q_audio?: string;
  image?: string;
  q_image?: string;
  question_image?: string;
  image_file?: string;
  sample_response?: string;
  answer?: string;
  model_answer?: string;
  sample_answer?: string;
  sample_audio?: string;
  sample_audio_file?: string;
  answer_audio?: string;
  transcript?: string;
  q_transcript?: string;
  audio_transcript?: string;
  translation?: string;
  q_translation?: string;
  audio_script?: string;
  script?: string;
}

interface AttemptLog {
  id: number | string;
  score?: any;
  overall_score?: any;
  total_score?: any;
  percentage?: any;
  score_percent?: any;
  created_at?: string;
  date?: string;
  fluency?: any;
  pronunciation?: any;
  content?: any;
}

interface ScoreResult {
  score?: number;
  overall_score?: number;
  total_score?: number;
  score_percent?: number;
  percentage?: number;
  content_score?: number;
  fluency_score?: number;
  pronunciation_score?: number;
  grammar_score?: number;
  spelling_score?: number;
  content?: number;
  fluency?: number;
  pronunciation?: number;
  tutor_summary?: any;
  summary?: any;
  feedback?: any;
  words?: any[];
  word_details?: any[];
}

const extractFeedbackText = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.remarks ?? val.remark ?? val.feedback ?? val.comment ?? JSON.stringify(val);
  }
  return String(val);
};

const resolveSubscore = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'object') {
    return val.score ?? 0;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// Pull a sub-score from the backend's `score[]` array by `type`
// (0 = Content, 1 = Fluency, 2 = Pronunciation). Returns 0 if not present.
const getSubscoreByType = (scoreArr: any, type: number): number => {
  if (!Array.isArray(scoreArr)) return 0;
  const item = scoreArr.find((s: any) => Number(s?.type) === type);
  if (!item) return 0;
  const n = Number(item.score);
  return isNaN(n) ? 0 : n;
};

// Compute overall percentage from `score[]` using each entry's own `from`
// (falls back to 90, the PTE default).
const computeOverallPercent = (scoreArr: any): number => {
  if (!Array.isArray(scoreArr) || scoreArr.length === 0) return 0;
  let total = 0;
  let max = 0;
  for (const s of scoreArr) {
    const n = Number(s?.score);
    const from = Number(s?.from ?? 90);
    if (!isNaN(n) && from > 0) {
      total += n;
      max += from;
    }
  }
  return max === 0 ? 0 : Math.round((total / max) * 100);
};

// The backend sometimes returns `user` as an array (single-entry) and
// sometimes as an object. Resolve to a display name in either case.
const getAttemptUserName = (user: any): string => {
  if (!user) return 'Anonymous';
  const u = Array.isArray(user) ? user[0] : user;
  if (!u) return 'Anonymous';
  const first = (u.first_name ?? '').toString().trim();
  const last = (u.last_name ?? '').toString().trim();
  const composed = `${first} ${last}`.trim();
  return composed || u.name || u.user_name || 'Anonymous';
};

// Score-badge color thresholds:
//   0           -> grey   (no attempt / no score yet)
//   1..49       -> red    (poor)
//   50..69      -> yellow (needs improvement)
//   70+         -> green  (good)
const getOverlayScoreColor = (val: number) => {
  if (!val || val <= 0) return '#8E8E93';
  if (val >= 70) return '#34C759';
  if (val >= 50) return '#FFCC00';
  return '#FF3B30';
};

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
  const activeQuestionItem = questionsList[currentIndex] || { id: initialQuestionId };
  const currentQuestionId = activeQuestionItem.id;

  const [loading, setLoading] = useState(true);
  const [questionDetails, setQuestionDetails] = useState<QuestionDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phased rendering states
  const [renderPhase, setRenderPhase] = useState<1 | 2 | 3 | 4 | 5>(1);
  const mediaConsoleRef = useRef<MediaConsoleRef | null>(null);

  // Local state for recording URI and duration (populated by MediaConsole)
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordingDurationSec, setRecordingDurationSec] = useState<number>(0);

  const handleRecordedUriChange = useCallback((uri: string | null, durationSec: number) => {
    setRecordedUri(uri);
    setRecordingDurationSec(durationSec);
  }, []);

  // Set up phased rendering on mount and when question changes
  useEffect(() => {
    setRenderPhase(1);
    const interaction = InteractionManager.runAfterInteractions(() => {
      setRenderPhase(2);
      requestAnimationFrame(() => {
        setRenderPhase(3);
        setTimeout(() => {
          setRenderPhase(4);
          setTimeout(() => {
            setRenderPhase(5);
          }, 150);
        }, 150);
      });
    });
    return () => interaction.cancel();
  }, [currentIndex]);


  // Bookmarking / coloured tagging.
  // `tagColor` controls the colour of the header tag icon. 'none' = untagged.
  // Initial value comes from the shared store (so coming back to a question
  // we've already loaded is instant), with a sensible fallback otherwise.
  type TagColor = 'none' | 'grey' | 'red' | 'green' | 'yellow';
  const [tagColor, setTagColor] = useState<TagColor>(() => {
    const stored = tagColorStore.get(activeQuestionItem.id);
    if (stored !== 'none') return stored;
    return 'none';
  });
  const [taggingInProgress, setTaggingInProgress] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // Keep this screen in sync with any changes made elsewhere (e.g. via the
  // list screen). The store is the source of truth for the current question.
  useEffect(() => {
    const unsubscribe = tagColorStore.subscribe(() => {
      const next = tagColorStore.get(currentQuestionId);
      setTagColor(prev => (prev === next ? prev : next));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  // Collapsible Tabs
  const [activeTab, setActiveTab] = useState<'transcript' | 'translate' | 'sample'>('transcript');
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

  // New redesign states
  const [selectedMode, setSelectedMode] = useState<'Normal' | 'One Line Strategy'>('Normal');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'me' | 'others'>('me');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'Latest' | 'Highest Score' | 'Lowest Score'>('Latest');
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSampleResponse, setShowSampleResponse] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const isCore = isPteCore();

  // Find metadata for timing rules
  const metadata = useMemo(() => {
    return QUESTION_METADATA.find(m => m.id === categoryId) || {
      id: categoryId,
      type: categoryName,
      waitTimeBeforeAudio: 0,
      hasAudio: false,
      waitTimeBeforeRecording: 35,
      recordingDuration: 35,
      nextButtonBehavior: "enable"
    };
  }, [categoryId, categoryName]);

  // (PTE Core override for `waitTimeBeforeRecording` is now resolved inside
  // `useQuestionMediaFlow` — see `mediaFlow.resolvedPrepTimeSec`.)

  // Instruction Banner text
  const instructionObj = useMemo(() => {
    return Data.InstructionText.find(item => item.id === categoryId) || {
      text: `Practice speaking for ${categoryName}`,
      maxRecordingSeconds: metadata.recordingDuration,
    };
  }, [categoryId, categoryName, metadata]);

  const instructionText = useMemo(() => {
    const obj = instructionObj as { text: string; pteCore?: string };
    return isCore && obj.pteCore ? obj.pteCore : obj.text;
  }, [isCore, instructionObj]);

  // ── Question metadata (shown as chips above the card) ──────────────────
  // Prefer the value from `questionsList` (passed by the list screen) and
  // fall back to fields on the fetched question details payload.
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

  const displayDifficulty = useMemo(() => {
    const raw = String(
      (activeQuestionItem as any).difficulty ??
      (questionDetails as any)?.difficulty ??
      (questionDetails as any)?.level ??
      (questionDetails as any)?.difficulty_level ??
      '',
    ).toUpperCase();
    if (raw.includes('ADV') || raw.includes('HIGH') || raw === '3') return 'ADVANCED';
    if (raw.includes('INT') || raw.includes('MED') || raw === '2') return 'INTERMEDIATE';
    if (raw.includes('BEG') || raw.includes('LOW') || raw === '1') return 'BEGINNER';
    return '';
  }, [activeQuestionItem, questionDetails]);

  const displayIsNew = useMemo(() => {
    if ((activeQuestionItem as any).isNew === true) return true;
    const v = (questionDetails as any)?.is_new;
    return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
  }, [activeQuestionItem, questionDetails]);

  const getDifficultyChipStyle = (diff: string) => {
    switch (diff) {
      case 'ADVANCED':
        return { bg: '#EFEBFF', text: '#7F56D9' };
      case 'INTERMEDIATE':
        return { bg: '#E5F1FF', text: '#007AFF' };
      case 'BEGINNER':
        return { bg: '#E2FBE9', text: '#34C759' };
      default:
        return { bg: '#F2F2F7', text: '#48484A' };
    }
  };

  // Audio resolving helper — memoized so callers can pass it as a dep
  // without retriggering effects on every render.
  const resolveAudioUrl = useCallback((audio: string | undefined) => {
    if (!audio) return '';
    if (audio.startsWith('http://') || audio.startsWith('https://')) {
      return audio;
    }
    const cleaned = audio.startsWith('/') ? audio.substring(1) : audio;
    return `${Config.audioPath}${cleaned}`;
  }, []);

  // Image resolving helper
  const resolveImageUrl = useCallback(
    (img: string | undefined) => {
      if (!img) return '';
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      }
      const cleaned = img.startsWith('/') ? img.substring(1) : img;
      const basePath = isCore ? Config.pdfPteCorePath : Config.pdfPath;
      return `${basePath}${cleaned}`;
    },
    [isCore],
  );

  // Main question content texts
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

  // Resolved question audio URL (for the media flow hook) — only valid once
  // `questionDetails` has loaded.
  const questionAudioUrl = useMemo(() => {
    if (!questionDetails) return undefined;
    const audioFile =
      questionDetails.audio ??
      questionDetails.audio_file ??
      questionDetails.question_audio ??
      questionDetails.q_audio;
    return audioFile ? resolveAudioUrl(audioFile) : undefined;
  }, [questionDetails, resolveAudioUrl]);

  // ── Mic permission helper ──────────────────────────────────────────────
  // Prompts the user with a Settings shortcut when the OS reports that mic
  // access is permanently denied (Android "Don't ask again" / iOS denial).
  // Falls back to a plain toast for transient errors.
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
  // with the media-flow hook, so starting playback here automatically pauses
  // any other active player (question audio, recorded review, etc.).
  const samplePlayer = useAudioPlayer();

  // ── Fetch Question Detail & Attempts ─────────────────────────────────────
  // ── Fetch Question Detail & Attempts ─────────────────────────────────────
  const fetchQuestionDetail = useCallback(async (qId: string | number) => {
    setLoading(true);
    setQuestionDetails(null);
    setTranslationText(null);
    setScoreResult(null);
    setIsSubmitting(false);
    await mediaConsoleRef.current?.reset();
    await samplePlayer.stop();

    try {
      // Uses the v1 list endpoint in "open question" mode: it returns the same
      // shape as the practice list (including the `tag` relations array and the
      // current user's `attempted[]` history) for a single question identified
      // by `qid`. This lets us load the question + Me-history in one call.
      //
      // `open_ques` must be the 1-based POSITION of the question in the
      // currently displayed list (this is what the web client sends — e.g. if
      // you open the 10th item, `open_ques=10`). The backend uses this value
      // to anchor the response, so a wrong/static value can cause it to
      // ignore the open-question mode and return the paginated list instead.
      const listIndex = questionsList.findIndex(
        (item) => String(item?.id) === String(qId),
      );
      const openQuesPos = listIndex >= 0 ? listIndex + 1 : currentIndex + 1;
      const qs =
        `prediction=0&type=1&mark=all&attempted=all&complexity=all` +
        `&orderby=desc&practice=true` +
        `&open_ques=${openQuesPos}` +
        `&qid=${encodeURIComponent(String(qId))}` +
        `&search=&filterByVid=all`;
      const fullUrl = `${API_ENDPOINTS.LIST_QUESTION}/${categoryId}?${qs}`;
      if (__DEV__) {
        // Debug aid — verify the request URL & resolved list position in the
        // Metro/Flipper console while testing.
        // eslint-disable-next-line no-console
        console.log(
          '[QuestionDetail] fetch',
          { qId, currentIndex, listIndex, openQuesPos, listLen: questionsList.length },
          fullUrl,
        );
      }
      const res = await apiClient.get(fullUrl);
      // v1/question wraps the question inside `data` as an array. Resolve the
      // entry whose `id` matches the requested `qid` — this guards against the
      // case where the backend returns the paginated list instead of a single
      // question (e.g. if `open_ques` is ignored for any reason).
      const arr: any[] = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      const data =
        arr.find((q) => String(q?.id) === String(qId)) ?? arr[0] ?? {};
      setQuestionDetails(data);

      // Seed the "Me" attempts history directly from the response so we don't
      // have to make a second SHOW_HISTORY call for this tab.
      if (Array.isArray(data?.attempted)) {
        setAttempts(data.attempted);
      } else {
        setAttempts([]);
      }
      // Resolve the saved tag colour from any of the shapes the backend uses:
      //   1. Canonical: `tag` is an array of relations like
      //      [{ id, question_id, user_id, tag: "green", ... }] (latest wins).
      //   2. Flat string field: `tag_color` / `tag` carrying the colour name.
      //   3. Legacy boolean `is_tagged` → map to green.
      const VALID = ['grey', 'red', 'green', 'yellow'];
      const pickStr = (v: unknown) => {
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
      // Mirror into the shared store so the list screen reflects the latest
      // value the moment the user navigates back.
      tagColorStore.set(qId, resolved);

      // `mediaFlow` auto-starts once `questionDetails` becomes truthy (its
      // `autoStart` is gated on that), so we don't need to kick it off here.
    } catch (err: any) {
      showToast(err?.message || 'Failed to load question details.', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, questionsList, currentIndex]);

  const fetchHistoryAttempts = useCallback(async (qId: string | number, tab: 'me' | 'others') => {
    setLoadingAttempts(true);
    try {
      const formData = new FormData();
      formData.append('question_id', String(qId));
      formData.append('skip', '0');
      if (tab === 'others') {
        formData.append('all', '1');
      }

      const res = await apiClient.post(API_ENDPOINTS.SHOW_HISTORY, formData);
      const data = res.data?.data ?? res.data ?? [];
      if (Array.isArray(data)) {
        if (tab === 'me') {
          setAttempts(data);
        } else {
          setOthersAttempts(data);
        }
      } else {
        if (tab === 'me') {
          setAttempts([]);
        } else {
          setOthersAttempts([]);
        }
      }
    } catch (err) {
      console.warn('Failed to load attempts log', err);
      if (tab === 'me') {
        setAttempts([]);
      } else {
        setOthersAttempts([]);
      }
    } finally {
      setLoadingAttempts(false);
    }
  }, []);

  // Auto-fetch attempts when currentQuestionId or activeHistoryTab changes.
  // The "Me" tab is already populated by `fetchQuestionDetail` from the
  // single v1/question response, so we only need to fetch when the user
  // switches to the "Others" tab.
  // We gate the fetch with renderPhase >= 5 to defer third-party requests.
  useEffect(() => {
    if (currentQuestionId && activeHistoryTab === 'others' && renderPhase >= 5) {
      fetchHistoryAttempts(currentQuestionId, activeHistoryTab);
    }
  }, [currentQuestionId, activeHistoryTab, fetchHistoryAttempts, renderPhase]);


  // Load question on current index change. Cleanup is owned by the hooks
  // themselves (recorder + audio players auto-tear-down on unmount).
  useEffect(() => {
    fetchQuestionDetail(currentQuestionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestionId]);

  // Tear down all audio when the user navigates away (pushes another screen
  // on top, or backgrounds the tab). Without this, sample audio / question
  // audio can keep playing in the background while the user is on a
  // different screen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        mediaConsoleRef.current?.reset().catch(() => {});
        samplePlayer.stop().catch(() => {});
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // ── Submit Answer & Parse Scores ────────────────────────────────────────
  const submitAnswer = async () => {
    if (!recordedUri) {
      showToast('Please record your voice first.', 'error');
      return;
    }
    // Make sure no playback is still occupying the native audio slot.
    await samplePlayer.stop();
    setIsSubmitting(true);

    try {
      const endpoint = isCore ? API_ENDPOINTS.PTE_CORE_SUBMIT_ANSWER : API_ENDPOINTS.SUBMIT_ANSWER;

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

      const strategyVal = categoryId === 1 ? (selectedMode === 'Normal' ? '1' : '2') : '1';
      formData.append('strategy', strategyVal);
      formData.append('answer', '');

      let submitText = '';
      let submitScript = '';
      if (categoryId === 1) {
        submitText = questionText;
        submitScript = questionDetails?.script ?? questionDetails?.audio_script ?? '';
      } else if (categoryId === 3) {
        submitText = '';
        submitScript = '';
      } else {
        const scriptText = questionDetails?.transcript ?? questionDetails?.q_transcript ?? questionDetails?.audio_transcript ?? questionDetails?.audio_script ?? '';
        submitText = scriptText;
        submitScript = scriptText;
      }
      formData.append('text', submitText);
      formData.append('script', submitScript);

      const correctSampleAnswer = questionDetails?.answer ?? questionDetails?.model_answer ?? questionDetails?.sample_answer ?? '';
      formData.append('q_ans', correctSampleAnswer);

      // Normalize file path on Android
      let fileUri = recordedUri;
      if (Platform.OS === 'android') {
        const cleanPath = fileUri.replace(/^file:\/\//, '').replace(/^\/+/, '');
        fileUri = `file:///${cleanPath}`;
      }

      // Construct file object
      const fileObj = {
        uri: fileUri,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        name: Platform.OS === 'ios' ? `sound-${currentQuestionId}.m4a` : `sound-${currentQuestionId}.mp4`,
      };
      formData.append('file', fileObj as any);

      const res = await apiClient.post(endpoint, formData);
      const data = res.data?.data ?? res.data ?? {};

      // Parse Score
      setScoreResult(data);
      setScoreModalVisible(true);

      // Refresh attempts
      fetchHistoryAttempts(currentQuestionId, activeHistoryTab);

    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Submission failed. Please try again.';
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Coloured Tagging ────────────────────────────────────────────────────
  // Maps a picker color to its visible hex value used on the icon and chips.
  const TAG_COLOR_HEX: Record<Exclude<TagColor, 'none'>, string> = {
    grey: '#8E8E93',
    red: '#FF3B30',
    green: '#94C23C',
    yellow: '#FFCC00',
  };

  // Resolves the tint to show on the header tag icon for the current state.
  const headerTagIconColor = tagColor === 'none' ? '#8E8E93' : TAG_COLOR_HEX[tagColor];

  // Persist a colour change to the backend. Sending an extra `tag_color`
  // field allows servers that support coloured tags to store it, while the
  // legacy `tag` (0/1) keeps the old endpoint behaviour intact.
  const persistTagColor = async (next: TagColor) => {
    if (taggingInProgress) return;
    const previous = tagColor;
    setTagColor(next);
    // Push the change to the shared store so the list screen reflects it
    // immediately when the user navigates back.
    tagColorStore.set(currentQuestionId, next);
    setTagPickerOpen(false);
    setTaggingInProgress(true);
    try {
      const formData = new FormData();
      formData.append('question_id', String(currentQuestionId));
      // Backend stores the colour name directly in the `tag` column, so send it
      // as the colour string. For "untag", send "0" to mirror the legacy flag.
      formData.append('tag', next === 'none' ? '0' : next);
      // Extra field for endpoints that read a dedicated `tag_color`.
      formData.append('tag_color', next);
      await apiClient.post(API_ENDPOINTS.SET_TAG, formData);
      showToast(
        next === 'none' ? 'Tag removed' : `Tagged as ${next}`,
        'info',
      );
    } catch (err: any) {
      setTagColor(previous);
      tagColorStore.set(currentQuestionId, previous);
      showToast(err?.response?.data?.message || 'Failed to update tag', 'error');
    } finally {
      setTaggingInProgress(false);
    }
  };

  // ── Translation ──────────────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!questionText) return;
    setTranslating(true);
    setTranslationText(null);
    try {
      const formData = new FormData();
      formData.append('sentence', questionText);
      formData.append('lang', selectedLang);

      const res = await apiClient.post(API_ENDPOINTS.TEXT_TRANSLATION, formData);
      const translated = res.data?.data ?? res.data?.translatedText ?? res.data ?? '';
      setTranslationText(typeof translated === 'string' ? translated : JSON.stringify(translated));
    } catch (err: any) {
      showToast(err?.message || 'Translation failed.', 'error');
    } finally {
      setTranslating(false);
    }
  };

  // Trigger translation when language changes & Translate is expanded
  useEffect(() => {
    if (showTranslation) {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, showTranslation, questionText]);

  // ── Next/Previous Navigation ────────────────────────────────────────────
  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questionsList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Removed local formatTime helper in favor of the global one

  // Word color logic for highlighting modal
  const getWordColor = (word: any) => {
    if (typeof word === 'string') return '#1C1F2A';
    const score = word?.score ?? word?.percentage ?? word?.val ?? word?.score_percent;
    const status = String(word?.status ?? word?.color ?? word?.state ?? '').toLowerCase();

    if (score !== undefined) {
      if (score >= 70) return '#34C759'; // good
      if (score >= 40) return '#FF9500'; // average
      return '#FF3B30'; // bad
    }

    if (status) {
      if (status.includes('good') || status.includes('green') || status.includes('correct') || status === '1') {
        return '#34C759';
      }
      if (status.includes('average') || status.includes('orange') || status.includes('yellow') || status === '2') {
        return '#FF9500';
      }
      if (status.includes('bad') || status.includes('red') || status.includes('incorrect') || status === '3') {
        return '#FF3B30';
      }
    }
    return '#1C1F2A';
  };

  const wordsListToShow = useMemo(() => {
    if (scoreResult?.words && Array.isArray(scoreResult.words)) {
      return scoreResult.words;
    }
    if (scoreResult?.word_details && Array.isArray(scoreResult.word_details)) {
      return scoreResult.word_details;
    }
    // Fallback: split paragraph
    const textToSplit = questionText || '';
    return textToSplit.split(/\s+/).map(w => ({ word: w }));
  }, [scoreResult, questionText]);

  // Overall circular progress value
  const overallPercentage = useMemo(() => {
    if (!scoreResult) return 0;
    const rawVal = scoreResult.score_percent ?? scoreResult.percentage ?? scoreResult.overall_score ?? scoreResult.score ?? 0;
    const n = Number(rawVal);
    if (!isNaN(n)) {
      if (n > 0 && n <= 1) return Math.round(n * 100);
      if (n > 90) return Math.min(100, Math.round(n));
      if (n >= 0 && n <= 90) return Math.round((n / 90) * 100);
      return Math.round(n);
    }
    return 0;
  }, [scoreResult]);

  // Breakdown values. The backend sometimes returns these as a plain
  // number and sometimes as `{ score, out_of }` (newer shape) — pipe
  // through `resolveSubscore` which handles both safely. Without this,
  // rendering `{contentValue}%` for the object shape crashes React with
  // "Objects are not valid as a React child".
  const fluencyValue = resolveSubscore(
    scoreResult?.fluency_score ?? scoreResult?.fluency,
  );
  const pronValue = resolveSubscore(
    scoreResult?.pronunciation_score ?? scoreResult?.pronunciation,
  );
  const contentValue = resolveSubscore(
    scoreResult?.content_score ?? scoreResult?.content,
  );

  const sortedAttempts = useMemo(() => {
    const list = [...attempts];
    if (selectedFilter === 'Latest') {
      return list;
    }
    if (selectedFilter === 'Highest Score') {
      return list.sort((a, b) => {
        const sA = a.score_percent ?? a.percentage ?? a.overall_score ?? a.score ?? 0;
        const sB = b.score_percent ?? b.percentage ?? b.overall_score ?? b.score ?? 0;
        return sB - sA;
      });
    }
    if (selectedFilter === 'Lowest Score') {
      return list.sort((a, b) => {
        const sA = a.score_percent ?? a.percentage ?? a.overall_score ?? a.score ?? 0;
        const sB = b.score_percent ?? b.percentage ?? b.overall_score ?? b.score ?? 0;
        return sA - sB;
      });
    }
    return list;
  }, [attempts, selectedFilter]);

  const sortedOthersAttempts = useMemo(() => {
    const list = [...othersAttempts];
    if (selectedFilter === 'Latest') {
      return list;
    }
    if (selectedFilter === 'Highest Score') {
      return list.sort((a, b) => {
        const sA = a.score_percent ?? a.percentage ?? a.overall_score ?? a.score ?? 0;
        const sB = b.score_percent ?? b.percentage ?? b.overall_score ?? b.score ?? 0;
        return sB - sA;
      });
    }
    if (selectedFilter === 'Lowest Score') {
      return list.sort((a, b) => {
        const sA = a.score_percent ?? a.percentage ?? a.overall_score ?? a.score ?? 0;
        const sB = b.score_percent ?? b.percentage ?? b.overall_score ?? b.score ?? 0;
        return sA - sB;
      });
    }
    return list;
  }, [othersAttempts, selectedFilter]);

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

      {/* ── Tag colour picker dropdown (anchored under header) ── */}
      {tagPickerOpen && (
        <>
          <TouchableOpacity
            style={styles.tagPickerBackdrop}
            activeOpacity={1}
            onPress={() => setTagPickerOpen(false)}
          />
          <View style={styles.tagPickerDropdown}>
            {(
              [
                { key: 'grey', label: 'Grey' },
                { key: 'red', label: 'Red' },
                { key: 'yellow', label: 'Yellow' },
                { key: 'green', label: 'Green' },
              ] as const
            ).map((opt, idx, arr) => {
              const selected = tagColor === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.tagPickerItem,
                    idx === arr.length - 1 && styles.tagPickerItemLast,
                    selected && styles.tagPickerItemActive,
                  ]}
                  onPress={() => persistTagColor(opt.key)}
                  disabled={taggingInProgress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.tagPickerDot,
                      { backgroundColor: TAG_COLOR_HEX[opt.key] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.tagPickerItemText,
                      selected && styles.tagPickerItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selected && <Text style={styles.tagPickerCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            {tagColor !== 'none' && (
              <TouchableOpacity
                style={styles.tagPickerRemoveItem}
                onPress={() => persistTagColor('none')}
                disabled={taggingInProgress}
                activeOpacity={0.7}
              >
                <Text style={styles.tagPickerRemoveText}>Remove tag</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {loading || renderPhase < 2 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Fetching question details...</Text>
        </View>
      ) : (
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>


          {/* ── Metadata block: title + chips (id, difficulty, new, attempts) ── */}
          <View style={styles.metaBlock}>
            {!!displayTitle && (
              <Text style={styles.metaTitle} numberOfLines={2}>
                {displayTitle}
              </Text>
            )}
            <View style={styles.metaChipsRow}>
              <View style={styles.metaIdChip}>
                <Text style={styles.metaIdChipText}>#{currentQuestionId}</Text>
              </View>

              {!!displayDifficulty && (
                <View
                  style={[
                    styles.metaDiffChip,
                    { backgroundColor: getDifficultyChipStyle(displayDifficulty).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.metaDiffChipText,
                      { color: getDifficultyChipStyle(displayDifficulty).text },
                    ]}
                  >
                    {displayDifficulty}
                  </Text>
                </View>
              )}

              {displayIsNew && (
                <View style={styles.metaNewChip}>
                  <Text style={styles.metaNewChipText}>New</Text>
                </View>
              )}

              {attempts.length > 0 && (
                <View style={styles.metaAttemptChip}>
                  <Text style={styles.metaAttemptChipText}>
                    Attempted
                  </Text>
                </View>
              )}
            </View>
          </View>
          {/* ── Lavender Instruction Banner ── */}
          <View style={styles.lavenderInstructionBanner}>
            <InfoOutlineIcon size={scale(16)} color="#5C527F" />
            <Text style={styles.lavenderInstructionText}>{instructionText}</Text>
          </View>
          {/* ── Mode Selection Tab Bar (Read Aloud, ID 1) ── */}
          {categoryId === 1 && (
            <View style={styles.modeSwitcherContainer}>
              <TouchableOpacity
                style={[styles.modeSwitcherTab, selectedMode === 'Normal' && styles.modeSwitcherTabActive]}
                onPress={() => setSelectedMode('Normal')}
              >
                <Text style={[styles.modeSwitcherText, selectedMode === 'Normal' && styles.modeSwitcherTextActive]}>Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeSwitcherTab, selectedMode === 'One Line Strategy' && styles.modeSwitcherTabActive]}
                onPress={() => setSelectedMode('One Line Strategy')}
              >
                <Text style={[styles.modeSwitcherText, selectedMode === 'One Line Strategy' && styles.modeSwitcherTextActive]}>One Line Strategy</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Consolidated Question Card ── */}
          <View style={styles.questionPanelCard}>
            {/* Image (Describe Image ID 3) */}
            {categoryId === 3 && questionDetails?.image && (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: resolveImageUrl(questionDetails.image ?? questionDetails.question_image ?? questionDetails.image_file) }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Situation / Description Text (Respond to a situation ID 21) */}
            {categoryId === 21 && questionText.length > 0 && (
              <View style={styles.situationContainer}>
                <Text style={styles.situationHeader}>Situation Description:</Text>
                <Text style={styles.situationText}>{questionText}</Text>
              </View>
            )}

            {/* Read Aloud Text (ID 1) or general paragraphs */}
            {categoryId === 1 && questionText.length > 0 && (
              <Text style={styles.paragraphText}>{questionText}</Text>
            )}

            {/* Phase 3: Interactive Controls & Media Console */}
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

            {/* Phase 4: Action Buttons, Collapsible Panels, and Additional Details */}
            {renderPhase >= 4 ? (
              <>
                {/* Action Buttons for Translate / Sample Response / Transcript */}
                <View style={styles.cardActionsRow}>
                  {metadata.hasAudio && (
                    <TouchableOpacity
                      style={[styles.outlineBtn, showTranscript && styles.outlineBtnActive]}
                      onPress={() => setShowTranscript(!showTranscript)}
                    >
                      <Text style={[styles.outlineBtnText, showTranscript && styles.outlineBtnTextActive]}>Transcript</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.outlineBtn, styles.outlineBtnBlue, showTranslation && styles.outlineBtnBlueActive]}
                    onPress={() => setShowTranslation(!showTranslation)}
                  >
                    <TranslateIcon size={scale(14)} color={showTranslation ? '#FFFFFF' : '#007AFF'} />
                    <Text style={[styles.outlineBtnText, styles.outlineBtnTextBlue, showTranslation && styles.outlineBtnTextActive]}>Translate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.outlineBtn, styles.outlineBtnPurple, showSampleResponse && styles.outlineBtnPurpleActive]}
                    onPress={() => setShowSampleResponse(!showSampleResponse)}
                  >
                    <MessageBubbleIcon size={scale(14)} color={showSampleResponse ? '#FFFFFF' : '#7C3AED'} />
                    <Text style={[styles.outlineBtnText, styles.outlineBtnTextPurple, showSampleResponse && styles.outlineBtnTextActive]}>Sample Response</Text>
                  </TouchableOpacity>
                </View>

                {/* Collapsible Panels */}
                {/* Transcript Panel */}
                {showTranscript && metadata.hasAudio && (
                  <View style={styles.inlineExpandPanel}>
                    <Text style={styles.expandPanelTitle}>Transcript</Text>
                    <Text style={styles.expandPanelText}>
                      {questionDetails?.transcript ?? questionDetails?.q_transcript ?? questionText ?? 'No transcript available.'}
                    </Text>
                  </View>
                )}

                {/* Translation Panel */}
                {showTranslation && (
                  <View style={styles.inlineExpandPanel}>
                    <View style={styles.langSelectorRowInline}>
                      <Text style={styles.langLabelInline}>Translate to:</Text>
                      <View style={styles.langPickerContainerInline}>
                        <TouchableOpacity
                          style={styles.langPickerBtnInline}
                          onPress={() => setLangDropdownOpen(!langDropdownOpen)}
                        >
                          <Text style={styles.langPickerTextInline}>
                            {selectedLang === 'hi' ? 'Hindi' : selectedLang === 'es' ? 'Spanish' : selectedLang === 'zh' ? 'Chinese' : selectedLang === 'pa' ? 'Punjabi' : selectedLang === 'ne' ? 'Nepali' : 'Arabic'}
                          </Text>
                          <CaretDownIcon size={scale(10)} color="#1C1C1E" expanded={langDropdownOpen} />
                        </TouchableOpacity>

                        {langDropdownOpen && (
                          <View style={styles.langDropdownInline}>
                            {['hi', 'es', 'zh', 'pa', 'ne', 'ar'].map(lang => (
                              <TouchableOpacity
                                key={lang}
                                style={styles.langItemInline}
                                onPress={() => {
                                  setSelectedLang(lang);
                                  setLangDropdownOpen(false);
                                }}
                              >
                                <Text style={styles.langItemTextInline}>
                                  {lang === 'hi' ? 'Hindi' : lang === 'es' ? 'Spanish' : lang === 'zh' ? 'Chinese' : lang === 'pa' ? 'Punjabi' : lang === 'ne' ? 'Nepali' : 'Arabic'}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>

                    {translating ? (
                      <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: scale(10) }} />
                    ) : (
                      <Text style={styles.expandPanelText}>
                        {translationText ?? 'Translation text will appear here.'}
                      </Text>
                    )}
                  </View>
                )}

                {/* Sample Response Panel */}
                {showSampleResponse && (
                  <View style={styles.inlineExpandPanel}>
                    <Text style={styles.expandPanelTitle}>Sample Answer</Text>
                    <Text style={styles.expandPanelText}>
                      {questionDetails?.sample_response ?? questionDetails?.answer ?? questionDetails?.model_answer ?? 'No sample answer text available.'}
                    </Text>

                    {(questionDetails?.sample_audio ?? questionDetails?.sample_audio_file ?? questionDetails?.answer_audio) && (
                      <View style={styles.sampleAudioContainerInline}>
                        <TouchableOpacity
                          style={styles.samplePlayBtnInline}
                          onPress={() => {
                            if (samplePlayer.isPlaying) {
                              samplePlayer.stop();
                              return;
                            }
                            const url = resolveAudioUrl(
                              questionDetails.sample_audio ??
                                questionDetails.sample_audio_file ??
                                questionDetails.answer_audio,
                            );
                            if (url) samplePlayer.play(url);
                          }}
                        >
                          {samplePlayer.isPlaying ? (
                            <Svg width={scale(10)} height={scale(10)} viewBox="0 0 24 24" fill="none">
                              <Rect x="6" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
                              <Rect x="14" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
                            </Svg>
                          ) : (
                            <Svg width={scale(10)} height={scale(10)} viewBox="0 0 24 24" fill="#FFFFFF">
                              <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
                            </Svg>
                          )}
                          <Text style={styles.samplePlayBtnTextInline}>
                            {samplePlayer.isPlaying ? 'Stop' : 'Play Sample Audio'}
                          </Text>
                        </TouchableOpacity>

                        {samplePlayer.isPlaying && (
                          <Text style={styles.sampleTimerTextInline}>
                            {formatTime(samplePlayer.positionMs / 1000)} /{' '}
                            {formatTime(samplePlayer.durationMs / 1000)}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Card Footer Divider */}
                <View style={styles.cardFooterDivider} />

                {/* Card Footer Row */}
                <View style={styles.cardFooterRow}>
                  <Text style={styles.attemptCountText}>{attempts.length} X ATTEMPTED</Text>
                  <TouchableOpacity style={styles.reportBtn}>
                    <ReportFlagIcon size={scale(14)} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.consolePlaceholder}>
                <Text style={styles.placeholderText}>Loading collateral tools...</Text>
              </View>
            )}
          </View>

          {/* ── Tab Logs Section ── */}
          {renderPhase >= 4 && (
            <View style={styles.logsSection}>
              {/* Me vs Others Switch */}
              <View style={styles.logsTabSwitcher}>
                <TouchableOpacity
                  style={[styles.logsTabBtn, activeHistoryTab === 'me' && styles.logsTabBtnActive]}
                  onPress={() => setActiveHistoryTab('me')}
                >
                  <Text style={[styles.logsTabText, activeHistoryTab === 'me' && styles.logsTabTextActive]}>Me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logsTabBtn, activeHistoryTab === 'others' && styles.logsTabBtnActive]}
                  onPress={() => setActiveHistoryTab('others')}
                >
                  <Text style={[styles.logsTabText, activeHistoryTab === 'others' && styles.logsTabTextActive]}>Others</Text>
                </TouchableOpacity>
              </View>

              {/* Sort / Filter Dropdown */}
              <View style={styles.filterWrapper}>
                <TouchableOpacity
                  style={styles.filterDropdownHeader}
                  onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  <Text style={styles.filterDropdownLabel}>Sort / Filter: <Text style={styles.filterDropdownValue}>{selectedFilter}</Text></Text>
                  <CaretDownIcon size={scale(12)} color="#1C1C1E" expanded={filterDropdownOpen} />
                </TouchableOpacity>

                {filterDropdownOpen && (
                  <View style={styles.filterDropdownList}>
                    {['Latest', 'Highest Score', 'Lowest Score'].map(filterItem => (
                      <TouchableOpacity
                        key={filterItem}
                        style={[styles.filterDropdownItem, selectedFilter === filterItem && styles.filterDropdownItemActive]}
                        onPress={() => {
                          setSelectedFilter(filterItem as any);
                          setFilterDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.filterDropdownItemText, selectedFilter === filterItem && styles.filterDropdownItemTextActive]}>
                          {filterItem}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Attempt Logs list — items are memoized above so a recorder
                  tick (which re-renders the whole screen every second) does
                  NOT pay the cost of diffing 100+ attempt rows. */}
              {loadingAttempts ? (
                <ActivityIndicator
                  size="small"
                  color="#007AFF"
                  style={{ marginVertical: scale(20) }}
                />
              ) : (
                <MemoizedAttemptsList
                  attempts={activeHistoryTab === 'me' ? sortedAttempts : sortedOthersAttempts}
                  isOthers={activeHistoryTab === 'others'}
                />
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Navigation Footer ── */}
      <View style={styles.navigationFooter}>
        <TouchableOpacity
          style={[styles.navFooterOutlineBtn, currentIndex === 0 && styles.navFooterOutlineBtnDisabled]}
          onPress={handlePrevQuestion}
          disabled={currentIndex === 0}
        >
          <ChevronLeftIcon size={scale(14)} color={currentIndex === 0 ? '#C8C7CC' : '#48484A'} strokeWidth={3} />
          <Text style={[styles.navFooterOutlineText, currentIndex === 0 && styles.navFooterOutlineTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navFooterSubmitBtn,
            (!recordedUri || isSubmitting) && styles.navFooterSubmitBtnDisabled
          ]}
          onPress={submitAnswer}
          disabled={!recordedUri || isSubmitting}
        >
          <Text style={styles.navFooterSubmitText}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navFooterOutlineBtn, currentIndex === questionsList.length - 1 && styles.navFooterOutlineBtnDisabled]}
          onPress={handleNextQuestion}
          disabled={currentIndex === questionsList.length - 1}
        >
          <Text style={[styles.navFooterOutlineText, currentIndex === questionsList.length - 1 && styles.navFooterOutlineTextDisabled]}>Next</Text>
          <ChevronRightIcon size={scale(14)} color={currentIndex === questionsList.length - 1 ? '#C8C7CC' : '#48484A'} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* ── Score Result overlay Modal ── */}
      <Modal
        visible={scoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Practice Score Result</Text>
              <TouchableOpacity onPress={() => setScoreModalVisible(false)}>
                <CloseIcon size={scale(18)} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Circular Overall Score Card */}
              <View style={styles.overallScoreCard}>
                <CircularProgressBar
                  size={scale(110)}
                  strokeWidth={scale(10)}
                  progress={overallPercentage}
                  max={100}
                  color={getOverlayScoreColor(overallPercentage)}
                />
                <Text style={styles.overallScoreText}>Overall Speaking Score</Text>
              </View>

              {/* Score Breakdown Progress Bars */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownHeader}>Speaking Category Breakdown</Text>

                {/* Content */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Text style={styles.breakdownLabel}>Content</Text>
                    <Text style={[styles.breakdownValueText, { color: getOverlayScoreColor(contentValue) }]}>
                      {contentValue}%
                    </Text>
                  </View>
                  <View style={styles.breakdownBarBg}>
                    <View style={[styles.breakdownBarFill, { width: `${contentValue}%`, backgroundColor: getOverlayScoreColor(contentValue) }]} />
                  </View>
                </View>

                {/* Fluency */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Text style={styles.breakdownLabel}>Fluency</Text>
                    <Text style={[styles.breakdownValueText, { color: getOverlayScoreColor(fluencyValue) }]}>
                      {fluencyValue}%
                    </Text>
                  </View>
                  <View style={styles.breakdownBarBg}>
                    <View style={[styles.breakdownBarFill, { width: `${fluencyValue}%`, backgroundColor: getOverlayScoreColor(fluencyValue) }]} />
                  </View>
                </View>

                {/* Pronunciation */}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Text style={styles.breakdownLabel}>Pronunciation</Text>
                    <Text style={[styles.breakdownValueText, { color: getOverlayScoreColor(pronValue) }]}>
                      {pronValue}%
                    </Text>
                  </View>
                  <View style={styles.breakdownBarBg}>
                    <View style={[styles.breakdownBarFill, { width: `${pronValue}%`, backgroundColor: getOverlayScoreColor(pronValue) }]} />
                  </View>
                </View>
              </View>

              {/* Word-by-word Highlight Transcript */}
              <View style={styles.wordHighlightCard}>
                <Text style={styles.wordHighlightHeader}>AI Transcription & Highlights</Text>
                <View style={styles.wordsListWrap}>
                  {wordsListToShow.map((w, idx) => {
                    // `w` can be a plain string OR an object like
                    // `{ word, score, ... }`. Falling back to `w` itself
                    // would render an object → React crash.
                    const wordText =
                      typeof w === 'string'
                        ? w
                        : typeof w?.word === 'string'
                          ? w.word
                          : String(w?.word ?? '');
                    return (
                      <Text
                        key={idx}
                        style={[styles.wordText, { color: getWordColor(w) }]}
                      >
                        {wordText}
                      </Text>
                    );
                  })}
                </View>
                <View style={styles.colorGuideRow}>
                  <View style={styles.guideItem}>
                    <View style={[styles.guideDot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.guideText}>Good</Text>
                  </View>
                  <View style={styles.guideItem}>
                    <View style={[styles.guideDot, { backgroundColor: '#FF9500' }]} />
                    <Text style={styles.guideText}>Average</Text>
                  </View>
                  <View style={styles.guideItem}>
                    <View style={[styles.guideDot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.guideText}>Needs practice</Text>
                  </View>
                </View>
              </View>

              {/* Tutor feedback summary */}
              {!!extractFeedbackText(scoreResult?.tutor_summary ?? scoreResult?.summary ?? scoreResult?.feedback) && (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackHeader}>AI Tutor Remarks</Text>
                  <Text style={styles.feedbackBody}>
                    {extractFeedbackText(scoreResult?.tutor_summary ?? scoreResult?.summary ?? scoreResult?.feedback)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeOverlayBtn} onPress={() => setScoreModalVisible(false)}>
              <Text style={styles.closeOverlayBtnText}>Close Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Memoized Attempts List Components ──
interface MemoizedAttemptsListProps {
  attempts: any[];
  isOthers?: boolean;
}

const AttemptItem = React.memo(({ attempt, isOthers }: { attempt: any; isOthers?: boolean }) => {
  const flatOverall =
    attempt.score_percent ?? attempt.percentage ?? attempt.overall_score;
  const aScore =
    typeof flatOverall === 'number' && !isNaN(flatOverall)
      ? Math.round(flatOverall)
      : computeOverallPercent(attempt.score);
  const contentScore =
    getSubscoreByType(attempt.score, 0) || resolveSubscore(attempt.content);
  const fluencyScore =
    getSubscoreByType(attempt.score, 1) || resolveSubscore(attempt.fluency);
  const pronScore =
    getSubscoreByType(attempt.score, 2) ||
    resolveSubscore(attempt.pronunciation);
  const aDate = formatAttemptDate(attempt.created_at ?? attempt.date);

  if (isOthers) {
    const attemptName = getAttemptUserName(attempt.user);
    return (
      <View style={styles.attemptLogItem}>
        <View style={{ flex: 1, paddingRight: scale(8) }}>
          <Text style={styles.attemptDate}>
            {attemptName} — {aDate}
          </Text>
          <Text style={styles.attemptSubscores}>
            C: {contentScore} | F: {fluencyScore} | P: {pronScore}
          </Text>
        </View>
        <View
          style={[
            styles.attemptScoreBadge,
            { backgroundColor: getOverlayScoreColor(aScore) },
          ]}
        >
          <Text style={styles.attemptScoreBadgeText}>{aScore}%</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.attemptLogItem}>
      <View>
        <Text style={styles.attemptDate}>{aDate}</Text>
        <Text style={styles.attemptSubscores}>
          C: {contentScore} | F: {fluencyScore} | P: {pronScore}
        </Text>
      </View>
      <View
        style={[
          styles.attemptScoreBadge,
          { backgroundColor: getOverlayScoreColor(aScore) },
        ]}
      >
        <Text style={styles.attemptScoreBadgeText}>{aScore}%</Text>
      </View>
    </View>
  );
});

const MemoizedAttemptsList = React.memo(({ attempts, isOthers }: MemoizedAttemptsListProps) => {
  const [limit, setLimit] = useState(10);

  // Reset limit when attempts change (e.g., switching questions or tabs)
  useEffect(() => {
    setLimit(10);
  }, [attempts]);

  if (attempts.length === 0) {
    return (
      <Text style={styles.noAttemptsText}>
        {isOthers ? 'No attempts from other students.' : 'No previous attempts recorded.'}
      </Text>
    );
  }

  const visibleAttempts = attempts.slice(0, limit);

  return (
    <>
      {visibleAttempts.map((attempt, index) => (
        <AttemptItem
          key={attempt.id ?? index}
          attempt={attempt}
          isOthers={isOthers}
        />
      ))}
      {attempts.length > limit && (
        <TouchableOpacity
          style={styles.loadMoreAttemptsBtn}
          onPress={() => setLimit(prev => prev + 20)}
        >
          <Text style={styles.loadMoreAttemptsText}>
            Show More Attempts ({attempts.length - limit} remaining)
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
    marginTop: scale(12),
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: scale(16),
    paddingBottom: scale(100), // padding for navigation footer
  },
  headerRightBtn: {
    padding: scale(8),
    marginRight: scale(4),
  },
  // ── Tag colour picker dropdown ──
  tagPickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 49,
  },
  tagPickerDropdown: {
    position: 'absolute',
    top: scale(56),
    right: scale(12),
    backgroundColor: colors.white,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50,
    minWidth: scale(160),
    overflow: 'hidden',
  },
  tagPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: scale(10),
  },
  tagPickerItemLast: {
    borderBottomWidth: 0,
  },
  tagPickerItemActive: {
    backgroundColor: '#F8F9FA',
  },
  tagPickerDot: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tagPickerItemText: {
    flex: 1,
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
  },
  tagPickerItemTextActive: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tagPickerCheck: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tagPickerRemoveItem: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  tagPickerRemoveText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  // ── Lavender Instruction Banner ──
  lavenderInstructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(16),
    gap: scale(8),
  },
  lavenderInstructionText: {
    flex: 1,
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#5C527F',
    lineHeight: scale(16),
  },
  // ── Question metadata block (title + chips) ──
  metaBlock: {
    marginBottom: scale(16),
  },
  metaTitle: {
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(8),
    lineHeight: scale(20),
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: scale(6),
  },
  metaIdChip: {
    backgroundColor: '#F2F2F7',
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  metaIdChipText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#48484A',
  },
  metaDiffChip: {
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  metaDiffChipText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  metaNewChip: {
    backgroundColor: '#FFF1E5',
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  metaNewChipText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#FF9500',
  },
  metaAttemptChip: {
    backgroundColor: '#E5F1FF',
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  metaAttemptChipText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  // ── Mode Switcher (Read Aloud Capsule Switch) ──
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: scale(20),
    padding: scale(2),
    marginBottom: scale(16),
  },
  modeSwitcherTab: {
    flex: 1,
    paddingVertical: scale(8),
    alignItems: 'center',
    borderRadius: scale(18),
  },
  modeSwitcherTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeSwitcherText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  modeSwitcherTextActive: {
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  // ── Question Panel Card ──
  questionPanelCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(16),
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: scale(180),
    backgroundColor: '#F8F9FA',
    borderRadius: scale(10),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  questionImage: {
    width: '100%',
    height: '100%',
  },
  situationContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  situationHeader: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(4),
  },
  situationText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#48484A',
    lineHeight: scale(20),
  },
  paragraphText: {
    fontSize: scale(15),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1F2A',
    lineHeight: scale(24),
  },
  // ── Question Audio Display ──
  audioDisplayContainer: {
    alignItems: 'center',
    paddingVertical: scale(12),
    width: '100%',
  },
  audioIconBadge: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  audioLabel: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-SemiBold',
    color: '#1C1F2A',
    marginBottom: scale(12),
  },
  playbackProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: scale(8),
    marginBottom: scale(16),
  },
  progressTimeText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
    width: scale(32),
    textAlign: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: scale(6),
    backgroundColor: '#E5E5EA',
    borderRadius: scale(3),
    marginHorizontal: scale(8),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: scale(3),
  },
  questionAudioPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F1FF',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    gap: scale(6),
    marginBottom: scale(12),
  },
  questionAudioPlayText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  speedControlsWrapper: {
    zIndex: 10,
    alignItems: 'center',
  },
  speedSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    gap: scale(4),
  },
  speedSelectorText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1C1E',
  },
  speedDropdown: {
    position: 'absolute',
    bottom: scale(32),
    backgroundColor: colors.white,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    width: scale(100),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  speedItem: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    alignItems: 'center',
  },
  speedItemActive: {
    backgroundColor: '#F2F2F7',
  },
  speedItemText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1C1C1E',
  },
  speedItemTextActive: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  // ── State UI Controls inside card ──
  statusSectionDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: scale(16),
    width: '100%',
  },
  // The inline media-status UI (prep timer, recording panel, review playback,
  // etc.) now lives in `components/practiceMedia/*` and ships its own
  // StyleSheet, so the screen no longer needs to keep those style buckets.
  // ── Outline buttons for translation/transcript/sample ──
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: scale(8),
    marginTop: scale(12),
    zIndex: 1,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8E8E93',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    gap: scale(4),
  },
  outlineBtnActive: {
    backgroundColor: '#8E8E93',
  },
  outlineBtnText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  outlineBtnTextActive: {
    color: colors.white,
  },
  outlineBtnBlue: {
    borderColor: '#007AFF',
  },
  outlineBtnBlueActive: {
    backgroundColor: '#007AFF',
  },
  outlineBtnTextBlue: {
    color: '#007AFF',
  },
  outlineBtnPurple: {
    borderColor: '#7C3AED',
  },
  outlineBtnPurpleActive: {
    backgroundColor: '#7C3AED',
  },
  outlineBtnTextPurple: {
    color: '#7C3AED',
  },
  // ── Expandable Panels ──
  inlineExpandPanel: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(12),
    marginTop: scale(12),
  },
  expandPanelTitle: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(6),
  },
  expandPanelText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#48484A',
    lineHeight: scale(18),
  },
  langSelectorRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
    zIndex: 15,
  },
  langLabelInline: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginRight: scale(6),
  },
  langPickerContainerInline: {
    zIndex: 15,
  },
  langPickerBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(6),
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    gap: scale(4),
  },
  langPickerTextInline: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1C1C1E',
  },
  langDropdownInline: {
    position: 'absolute',
    top: scale(24),
    left: 0,
    backgroundColor: colors.white,
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    width: scale(90),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 20,
  },
  langItemInline: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
  },
  langItemTextInline: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#1C1C1E',
  },
  sampleAudioContainerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(12),
    gap: scale(8),
  },
  samplePlayBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: scale(6),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    gap: scale(4),
  },
  samplePlayBtnTextInline: {
    color: colors.white,
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  sampleTimerTextInline: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  // ── Card Footer ──
  cardFooterDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: scale(12),
    width: '100%',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  attemptCountText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  reportBtn: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: scale(6),
    padding: scale(6),
  },
  // ── Logs / History Section ──
  logsSection: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(16),
    marginBottom: scale(16),
  },
  logsTabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: scale(10),
    padding: scale(2),
    marginBottom: scale(12),
  },
  logsTabBtn: {
    flex: 1,
    paddingVertical: scale(6),
    alignItems: 'center',
    borderRadius: scale(8),
  },
  logsTabBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logsTabText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  logsTabTextActive: {
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  filterWrapper: {
    marginBottom: scale(12),
    zIndex: 10,
  },
  filterDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    backgroundColor: '#F8F9FA',
  },
  filterDropdownLabel: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  filterDropdownValue: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
  },
  filterDropdownList: {
    position: 'absolute',
    top: scale(36),
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 15,
  },
  filterDropdownItem: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  filterDropdownItemActive: {
    backgroundColor: '#F2F2F7',
  },
  filterDropdownItemText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#48484A',
  },
  filterDropdownItemTextActive: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  attemptLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  attemptDate: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
    marginBottom: scale(2),
  },
  attemptSubscores: {
    fontSize: scale(9),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#8E8E93',
  },
  attemptScoreBadge: {
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  attemptScoreBadgeText: {
    color: colors.white,
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  noAttemptsText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: scale(12),
  },
  // ── Navigation Footer ──
  navigationFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(64),
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
  },
  navFooterOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: scale(20),
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    gap: scale(4),
    backgroundColor: colors.white,
  },
  navFooterOutlineBtnDisabled: {
    opacity: 0.3,
  },
  navFooterOutlineText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#48484A',
  },
  navFooterOutlineTextDisabled: {
    color: '#8E8E93',
  },
  navFooterSubmitBtn: {
    backgroundColor: '#94C23C',
    borderRadius: scale(20),
    paddingVertical: scale(8),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#94C23C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  navFooterSubmitBtnDisabled: {
    backgroundColor: '#C5C5C7',
    shadowOpacity: 0,
    elevation: 0,
  },
  navFooterSubmitText: {
    color: colors.white,
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  // ── Modal overlay ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    height: '85%',
    padding: scale(16),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingBottom: scale(12),
    marginBottom: scale(16),
  },
  modalTitleText: {
    fontSize: scale(16),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
  },
  modalScrollContent: {
    flex: 1,
  },
  overallScoreCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: scale(12),
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  overallScoreText: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1A2151',
    marginTop: scale(12),
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(16),
    marginBottom: scale(16),
  },
  breakdownHeader: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(16),
  },
  breakdownRow: {
    marginBottom: scale(12),
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(4),
  },
  breakdownLabel: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
  },
  breakdownValueText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  breakdownBarBg: {
    height: scale(8),
    backgroundColor: '#F2F2F7',
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: scale(4),
  },
  wordHighlightCard: {
    backgroundColor: colors.white,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: scale(16),
    marginBottom: scale(16),
  },
  wordHighlightHeader: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#1C1F2A',
    marginBottom: scale(12),
  },
  wordsListWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: scale(16),
  },
  wordText: {
    fontSize: scale(14),
    fontFamily: 'BricolageGrotesque-Medium',
    lineHeight: scale(20),
  },
  colorGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: scale(12),
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  guideDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  guideText: {
    fontSize: scale(10),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
  },
  feedbackCard: {
    backgroundColor: '#FDF8E2',
    borderWidth: 1,
    borderColor: '#FBE8B3',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(24),
  },
  feedbackHeader: {
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#B78103',
    marginBottom: scale(6),
  },
  feedbackBody: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#654C02',
    lineHeight: scale(18),
  },
  closeOverlayBtn: {
    backgroundColor: '#1C1F2A',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(12),
  },
  closeOverlayBtnText: {
    color: colors.white,
    fontSize: scale(13),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
  },
  consolePlaceholder: {
    padding: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: scale(12),
    width: '100%',
  },
  placeholderText: {
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#8E8E93',
    marginTop: scale(6),
  },
  loadMoreAttemptsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: scale(8),
    marginTop: scale(10),
    marginBottom: scale(20),
  },
  loadMoreAttemptsText: {
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Bold',
    fontWeight: 'bold',
    color: '#007AFF',
  },
});


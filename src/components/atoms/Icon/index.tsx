import React from 'react';
import { Dimensions, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface IconProps {
  size?: number;
  color?: string;
}

// Many places want the same chevron with a heavier stroke or different tint
// (e.g. SignUp's dropdown arrow uses strokeWidth=3). Icons that accept this
// prop pass it through to the underlying path without changing geometry.
interface IconStrokeProps extends IconProps {
  strokeWidth?: number;
}

export const MicIcon: React.FC<IconProps> = ({ size = scale(24), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      fill={color}
    />
    <Path
      d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PenIcon: React.FC<IconProps> = ({ size = scale(24), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BookIcon: React.FC<IconProps> = ({ size = scale(24), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const HeadphonesIcon: React.FC<IconProps> = ({ size = scale(24), color = '#AF52DE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconStrokeProps> = ({
  size = scale(16),
  color = '#8E8E93',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 5l7 7-7 7"
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ArrowUpIcon: React.FC<IconProps> = ({ size = scale(12), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 19V5M5 12l7-7 7 7"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 5v14l11-7z" fill={color} />
  </Svg>
);

export const HomeIcon: React.FC<IconProps> = ({ size = scale(24), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
      fill={color}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PracticeIcon: React.FC<IconProps> = ({ size = scale(24), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MockIcon: React.FC<IconProps> = ({ size = scale(24), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const VideoIcon: React.FC<IconProps> = ({ size = scale(24), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 7l-7 5 7 5V7z"
      fill={color}
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <Path
      d="M1 5h14v14H1z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MenuIcon: React.FC<IconProps> = ({ size = scale(24), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 6h16M4 12h16M4 18h16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ size = scale(14), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 2c0 4.418-3.582 8-8 8 4.418 0 8 3.582 8 8 0-4.418 3.582-8 8-8-4.418 0-8-3.582-8-8z"
      fill={color}
    />
    <Path
      d="M18 14c0 2.209-1.791 4-4 4 2.209 0 4 1.791 4 4 0-2.209 1.791-4 4-4-2.209 0-4-1.791-4-4z"
      fill={color}
    />
  </Svg>
);

export const HeaderBookIcon: React.FC<IconProps> = ({ size = scale(22), color = '#1A2151' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ReadAloudIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M19 10v1a7 7 0 0 1-14 0v-1"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M12 18v3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const RepeatSentenceIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 1l4 4-4 4M21 5H9a5 5 0 0 0-5 5v2M7 23l-4-4 4-4M3 19h12a5 5 0 0 0 5-5v-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DescribeImageIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3h18v18H3V3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
    <Path
      d="M21 15l-5-5L5 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const RetellLectureIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 5h14v10H3V5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="19.5" cy="11.5" r="1.5" stroke={color} strokeWidth="2" />
    <Path
      d="M18 16v3M20 18l-5-3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M6 15v4M14 15v4"
      stroke={color}
      strokeWidth="2"
    />
  </Svg>
);

export const AnswerShortQuestionIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 7h.01M12 10v3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const RespondSituationIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.206.714 4.246 1.923 5.9L3 21l3.2-.8c1.554.764 3.327 1.2 5.8 1.2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 8v5M12 16h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const SummarizeWrittenTextIcon: React.FC<IconProps> = ({ size = scale(20), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const ReadingIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ListeningIcon: React.FC<IconProps> = ({ size = scale(20), color = '#AF52DE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 4H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const HeartDocIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 17s-2.5-2-2.5-3.5a1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 1 3 0c0 1.5-2.5 3.5-2.5 3.5z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Svg>
);

export const QuestionDocIcon: React.FC<IconProps> = ({ size = scale(20), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 13a2 2 0 0 1 4 0c0 1-1 1.5-1.5 2m0 3h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const TargetIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FFCC00' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

export const LaptopIcon: React.FC<IconProps> = ({ size = scale(20), color = '#A0522D' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM2 18h20v2H2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Daily Feedback & Modal Icons ────────────────────────────────────────────
// Promoted out of individual screen files so every screen renders the same
// glyph with the same stroke weight and tinting rules.

export const ChartIcon: React.FC<IconProps> = ({ size = scale(18), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3v18h18M7 14l4-4 4 4 6-6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = scale(18), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2" />
    <Path
      d="M8 12l3 3 5-6"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const OpenBookIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2V4zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const StackIcon: React.FC<IconProps> = ({ size = scale(18), color = '#AF52DE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TutorIcon: React.FC<IconProps> = ({ size = scale(16), color = '#1A2151' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 14l9-5-9-5-9 5 9 5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 14l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 0 12 20.055a11.952 11.952 0 0 0-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TipIcon: React.FC<IconProps> = ({ size = scale(16), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21h6M10 17h4M12 3a7 7 0 0 0-4 12.745V17h8v-1.255A7 7 0 0 0 12 3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CloseIcon: React.FC<IconStrokeProps> = ({
  size = scale(20),
  color = '#1A2151',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
    />
  </Svg>
);

export const ChevronLeftIcon: React.FC<IconStrokeProps> = ({
  size = scale(18),
  color = '#1A2151',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Direction-aware caret used to expand / collapse a year picker (and
// elsewhere as a dropdown affordance). `expanded` flips the chevron.
export const CaretDownIcon: React.FC<IconStrokeProps & { expanded?: boolean }> = ({
  size = scale(12),
  color = '#1A2151',
  expanded = false,
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d={expanded ? 'M18 15L12 9L6 15' : 'M6 9L12 15L18 9'}
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Generic single-Path icon for cases like SectionIcon in the Daily Feedback
// detail screen, where the caller knows the SVG path data per question type.
// Use this sparingly — prefer adding a named icon above when the glyph is
// reused in more than one place.
export const PathIcon: React.FC<IconProps & { d: string; strokeWidth?: number }> = ({
  size = scale(16),
  color = '#1A2151',
  d,
  strokeWidth = 2.2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d={d}
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Header / Notifications ─────────────────────────────────────────────────

export const BellIcon: React.FC<IconProps> = ({ size = scale(22), color = '#1A2151' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DoubleCheckIcon: React.FC<IconProps> = ({ size = scale(20), color = '#94C23C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 6L8.5 14.5L5 11M22 6l-8.5 8.5M17 14.5L13.5 11"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Auth (SignIn / SignUp) ─────────────────────────────────────────────────

export const AppleIcon: React.FC<IconProps> = ({ size = scale(20), color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.51-.62.73-1.16 1.87-1.02 2.98 1.12.09 2.27-.6 2.97-1.43z"
      fill={color}
    />
  </Svg>
);

export const UserInputIcon: React.FC<IconProps> = ({ size = scale(20), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PhoneInputIcon: React.FC<IconProps> = ({ size = scale(20), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4741 21.8325 20.7291C21.721 20.9841 21.5571 21.2132 21.3508 21.4024C21.1445 21.5916 20.9001 21.7369 20.6323 21.8294C20.3645 21.922 20.0792 21.9598 19.79 21.94C16.837 21.6186 13.9982 20.6074 11.49 19.01C9.13024 17.5348 7.11182 15.5164 5.63662 13.1566C4.03263 10.6366 3.01916 7.7853 2.705 4.81498C2.68532 4.52627 2.72314 4.24124 2.816 3.97371C2.90886 3.70617 3.0548 3.46175 3.2443 3.25555C3.4338 3.04935 3.66275 2.88569 3.91745 2.77441C4.17215 2.66314 4.4471 2.60662 4.725 2.60798H7.725C8.21634 2.60333 8.69466 2.77884 9.07111 3.10202C9.44755 3.4252 9.69741 3.87413 9.775 4.36498C9.92138 5.35824 10.1654 6.3338 10.505 7.27498C10.643 7.65863 10.6661 8.0754 10.5714 8.47278C10.4767 8.87016 10.2681 9.23126 9.975 9.50498L8.705 10.775C10.0817 13.1953 12.0817 15.1953 14.502 16.572L15.772 15.302C16.0457 15.0089 16.4068 14.8003 16.8042 14.7056C17.2016 14.6109 17.6183 14.634 18.002 14.772C18.9431 15.1116 19.9187 15.3556 20.912 15.502C21.4081 15.5801 21.8614 15.8339 22.1856 16.2165C22.5098 16.5991 22.6826 17.0863 22.67 17.587L22.00 16.92Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Contact Support ────────────────────────────────────────────────────────

export const EnvelopeIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="2" />
  </Svg>
);

export const PhoneCallIcon: React.FC<IconProps> = ({ size = scale(20), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Maintenance ────────────────────────────────────────────────────────────

export const WrenchInCircleIcon: React.FC<IconProps> = ({ size = scale(120), color = '#94C23C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l4-4a1 1 0 0 0-1.4-1.4l-3.3 3.3-1-1a1 1 0 0 0-1.3-.1zM11 6a4.99 4.99 0 0 1 3.5 1.5l-2.6 2.6a1.003 1.003 0 0 0 0 1.4c.39.39 1.02.39 1.4 0l2.6-2.6A4.99 4.99 0 0 1 18 13c0 2.76-2.24 5-5 5H9v-2.2a2.003 2.003 0 0 0-1.17-1.83l-3-1.33A2.02 2.02 0 0 0 4 11V9c0-2.76 2.24-5 5-5h2zm-2 9h2v2H9v-2zm-3-4.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z"
      fill={color}
    />
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
      fill="#EAECEF"
    />
  </Svg>
);

// ── Notifications empty state ──────────────────────────────────────────────

export const EmptyBellIllustration: React.FC<IconProps> = ({ size = scale(100) }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#F2F2F7" />
    <Path
      d="M12 6a3 3 0 0 0-3 3v3H7a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-2V9a3 3 0 0 0-3-3z"
      fill="#AEAEB2"
    />
    <Path d="M10 17a2 2 0 0 0 4 0h-4z" fill="#8E8E93" />
  </Svg>
);

// ── Feedback Modal ─────────────────────────────────────────────────────────

export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = scale(38),
  filled = false,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? '#FBBF24' : '#FFFFFF'}
      stroke={filled ? '#F59E0B' : '#E2E8F0'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SparkleIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FBBF24' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3l1.9 5.7L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.8L12 3z"
      fill={color}
    />
  </Svg>
);

export const ArrowRightLineIcon: React.FC<IconStrokeProps> = ({
  size = scale(16),
  color = '#FFFFFF',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12h14M13 5l7 7-7 7"
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ArrowLeftLineIcon: React.FC<IconStrokeProps> = ({
  size = scale(22),
  color = '#FFFFFF',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19l-7-7 7-7"
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── PDF / Empty File ───────────────────────────────────────────────────────

export const PdfFileIcon: React.FC<IconProps> = ({ size = scale(22), color = '#E53935' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 13h2.5a1.5 1.5 0 0 1 0 3H8v-3zM15 13v5M13 15h4"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

export const EmptyFileIcon: React.FC<IconProps> = ({ size = scale(48), color = '#C7C7CC' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// ── Practice / Search / Filter ─────────────────────────────────────────────

export const SearchIcon: React.FC<IconProps> = ({ size = scale(18), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
    <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const FilterIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TagIcon: React.FC<IconProps & { tagged?: boolean }> = ({
  size = scale(14),
  color = '#8E8E93',
  tagged = false,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={tagged ? color : 'none'}>
    <Path
      d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Checkmark only (no surrounding circle). For a check-in-circle use
// `CheckCircleIcon` above.
export const CheckIcon: React.FC<IconStrokeProps> = ({
  size = scale(14),
  color = '#34C759',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={String(strokeWidth)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Live Sessions (filled style) ───────────────────────────────────────────

export const CalendarFilledIcon: React.FC<IconProps> = ({ size = scale(16), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 4H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"
      fill={color}
    />
  </Svg>
);

export const SearchFilledIcon: React.FC<IconProps> = ({ size = scale(16), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill={color}
    />
  </Svg>
);

export const ClockFilledIcon: React.FC<IconProps> = ({ size = scale(14), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
      fill={color}
    />
  </Svg>
);

export const PersonFilledIcon: React.FC<IconProps> = ({ size = scale(14), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      fill={color}
    />
  </Svg>
);

export const EmptyLiveIllustration: React.FC<IconProps> = ({ size = scale(100) }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#F2F2F7" />
    <Path
      d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
      fill="#AEAEB2"
    />
  </Svg>
);

// ── Menu Screen (outline help / star with stroke) ──────────────────────────

export const HelpCircleIcon: React.FC<IconProps> = ({ size = scale(20), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path
      d="M9 9a3 3 0 1 1 4 2.83C12.5 12.28 12 13 12 14M12 17h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const StarOutlineIcon: React.FC<IconProps> = ({ size = scale(20), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Profile Screen ─────────────────────────────────────────────────────────

export const UserProfileIcon: React.FC<IconProps> = ({ size = scale(20), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="11"
      width="18"
      height="11"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CardIcon: React.FC<IconProps> = ({ size = scale(20), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="5"
      width="20"
      height="14"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M2 10h20" stroke={color} strokeWidth="2" />
  </Svg>
);

// File-with-lines glyph (privacy policy, terms, etc.).
export const FileTextIcon: React.FC<IconProps> = ({ size = scale(20), color = '#AF52DE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="2" />
  </Svg>
);

// Speech-bubble used for the "Help & support" row in ProfileScreen.
// Outline only — distinct from AnswerShortQuestionIcon which has a dot.
export const ChatBubbleIcon: React.FC<IconProps> = ({ size = scale(20), color = '#00C7BE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Mic without the "M12 19v4 / M8 23h8" base bar — matches ProfileScreen MicIcon.
export const MicSolidIcon: React.FC<IconProps> = ({ size = scale(20), color = '#94C23C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      fill={color}
    />
    <Path
      d="M19 10v2a7 7 0 0 1-14 0v-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 19v4M8 23h8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const LogOutIcon: React.FC<IconProps> = ({ size = scale(20), color = '#FF3B30' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = scale(24), color = '#FF3B30' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Dashboard ──────────────────────────────────────────────────────────────

export const SmallCalendarIcon: React.FC<IconProps> = ({ size = scale(12), color = '#1A2151' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ClockCircleIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const TrianglePeakIcon: React.FC<IconProps> = ({ size = scale(18), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 22h20L12 2z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </Svg>
);

export const InfoCircleFilledIcon: React.FC<IconProps> = ({ size = scale(16), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10h-2V7h2zm0 4h-2v-2h2z"
      fill={color}
    />
  </Svg>
);

export const ShareNodesIcon: React.FC<IconProps> = ({ size = scale(20), color = '#0284C7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
      fill={color}
    />
  </Svg>
);

export const ChatBubbleDotsIcon: React.FC<IconProps> = ({ size = scale(20), color = '#D97706' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M8 10h.01M12 10h.01M16 10h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const InfoOutlineIcon: React.FC<IconProps> = ({ size = scale(24), color = '#85B82B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
      stroke={color}
      strokeWidth="2.5"
    />
    <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

// ── Microphone test buttons ────────────────────────────────────────────────

// Play arrow inside an outlined circle — used as a "Start Mic Test" CTA glyph.
export const PlayInCircleIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M10 8l6 4-6 4V8z" fill={color} />
  </Svg>
);

// Outlined circle with a centered filled square — used as a "Stop Mic Test" CTA glyph.
export const StopInCircleIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Rect x="9" y="9" width="6" height="6" fill={color} />
  </Svg>
);

// Plain filled square — used for the inline "Stop Playback" button.
export const StopSquareIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="6" width="12" height="12" fill={color} />
  </Svg>
);

// Outlined info circle (i in a circle) — distinct from `InfoOutlineIcon` which
// renders the dot above the bar; this one has the dot below.
export const InfoCircleOutlineIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
      stroke={color}
      strokeWidth="2"
    />
    <Path d="M12 8v4M12 16h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// ── Parametric shapes ──────────────────────────────────────────────────────
//
// These aren't static glyphs — they compute their geometry from props. They
// still live here so the rule "all <Svg> rendering belongs in Icon/index.tsx"
// holds across the codebase. Composition (text labels, touchables, etc.) stays
// in the consuming atom.

export interface CircularProgressIconProps {
  size?: number;
  strokeWidth?: number;
  progress?: number;
  max?: number;
  color?: string;
  trackColor?: string;
}

// Ring-shaped progress indicator. Renders a track circle and an overlay arc
// whose length is proportional to `progress / max`. Rotated -90° so the arc
// starts at 12 o'clock instead of 3 o'clock.
export const CircularProgressIcon: React.FC<CircularProgressIconProps> = ({
  size = scale(90),
  strokeWidth = scale(8),
  progress = 0,
  max = 100,
  color = '#85B82B',
  trackColor = '#E5E5EA',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(progress, max));
  const strokeDashoffset = circumference - (clamped / max) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        stroke={trackColor}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke={color}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

export interface AuthCurveShapeProps {
  width: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// Full-bleed bottom arch used as the chrome for the auth CTA button. The
// curve's control points are derived from `width`, so it always spans the
// device's screen edge-to-edge.
export const AuthCurveShape: React.FC<AuthCurveShapeProps> = ({
  width,
  height = 120,
  color = '#85B82B',
  style,
}) => (
  <Svg
    height={height}
    width={width}
    viewBox={`0 0 ${width} 120`}
    style={style}
  >
    <Path
      d={`M0,120 L${width},120 L${width},80 C${
        width * 0.65
      },80 ${width * 0.55},0 ${width * 0.5},0 C${
        width * 0.45
      },0 ${width * 0.35},80 0,80 Z`}
      fill={color}
    />
  </Svg>
);


import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { scale } from './scale';

type IconProps = { size?: number; color?: string };

export const InfoOutlineIcon: React.FC<IconProps> = ({ size = scale(16), color = '#5C527F' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 8V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="15" r="1" fill={color} />
  </Svg>
);

export const TranslateIcon: React.FC<IconProps> = ({ size = scale(16), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 8h14M12 4v4M9 12a5 5 0 018-4M17 12c-1.5 2.5-4 4.5-8 5.5M11 16c1-2 2-5 2-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MessageBubbleIcon: React.FC<IconProps> = ({ size = scale(16), color = '#7C3AED' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ReportFlagIcon: React.FC<IconProps> = ({ size = scale(16), color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SubscoreWarningIcon: React.FC<IconProps> = ({ size = scale(16), color = '#FFCC00' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SubscoreChecklistIcon: React.FC<IconProps> = ({ size = scale(16), color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SubscoreGrammarIcon: React.FC<IconProps> = ({ size = scale(16), color = '#AF52DE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19h16M4 15h16M4 11h12M4 7h8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SubscoreBookIcon: React.FC<IconProps> = ({ size = scale(16), color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SubscoreRangeIcon: React.FC<IconProps> = ({ size = scale(16), color = '#FF3B30' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const SubscoreOrgIcon: React.FC<IconProps> = ({ size = scale(16), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4v4m0 8v4m-8-8h16m-12 0v4m8-4v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Rect x="10" y="2" width="4" height="4" rx="1" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="2" y="10" width="4" height="4" rx="1" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="10" y="10" width="4" height="4" rx="1" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="18" y="10" width="4" height="4" rx="1" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="2" y="18" width="4" height="4" rx="1" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="18" y="18" width="4" height="4" rx="1" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

export const SubscoreFluencyIcon: React.FC<IconProps> = ({ size = scale(16), color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const SubscorePronIcon: React.FC<IconProps> = ({ size = scale(16), color = '#AF52DE' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke={color} strokeWidth="2" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export const HeaderGraphIcon: React.FC<IconProps> = ({ size = scale(16), color = '#7C3AED' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="12" width="4" height="8" rx="1" fill={color} opacity="0.4" />
    <Rect x="10" y="7" width="4" height="13" rx="1" fill={color} opacity="0.7" />
    <Rect x="17" y="3" width="4" height="17" rx="1" fill={color} />
  </Svg>
);

export const RedWarningIcon: React.FC<IconProps> = ({ size = scale(18), color = '#FF3B30' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Inline play / stop SVGs for buttons. Pulled out so callers don't have to
// repeat the same Svg/Path/Rect tree at each play-button site.
export const PlayGlyph: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
    <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
  </Svg>
);

export const StopGlyph: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
    <Rect x="14" y="4" width="4" height="16" rx="1" fill="#FFFFFF" />
  </Svg>
);

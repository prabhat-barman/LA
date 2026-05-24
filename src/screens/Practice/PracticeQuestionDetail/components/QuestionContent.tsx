import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import ImageView from 'react-native-image-viewing';
import Svg, { Path } from 'react-native-svg';
import { styles } from '../styles';
import { scale } from '../scale';
import type { QuestionDetails } from '../types';

interface Props {
  categoryId: number;
  questionDetails: QuestionDetails | null;
  questionText: string;
  resolveImageUrl: (img: string | undefined) => string;
}

// Detect the legacy `image` payload that occasionally arrives as a
// base64-encoded JPEG (the API embeds raw binary instead of a path).
// JPEG base64 always starts with `/9j/` because the magic bytes 0xFFD8
// encode to those characters. Length guards against false positives on
// short paths that happen to start with `/9`.
const isBase64Jpeg = (s: string) =>
  typeof s === 'string' && s.length > 200 && s.startsWith('/9j/');

const resolveQuestionImage = (
  q: QuestionDetails,
  resolveImageUrl: (img: string | undefined) => string,
): string | null => {
  // Prefer explicit URL / path fields over the legacy `image` field.
  // `image` is unreliable: it's null on most modern questions and a giant
  // base64 JPEG on others. The path fields below are stable.
  const path =
    q.image_link ||
    q.media_link ||
    q.question_image ||
    q.image_file ||
    q.q_image;
  if (path) return resolveImageUrl(path);

  // Last resort: handle the base64 case as a data URI so the screen still
  // renders an image even when the backend gave us nothing else.
  if (q.image && isBase64Jpeg(q.image)) {
    return `data:image/jpeg;base64,${q.image}`;
  }

  // A short non-base64 `image` value almost certainly is a path.
  if (q.image && !isBase64Jpeg(q.image)) {
    return resolveImageUrl(q.image);
  }

  return null;
};

// Magnifier-with-plus-sign icon shown over the corner of the question
// image to hint that it's tappable for fullscreen / zoom.
const ZoomHintIcon: React.FC = () => (
  <Svg width={scale(14)} height={scale(14)} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4a7 7 0 100 14 7 7 0 000-14zm0 0v0M16 16l4 4M8 11h6M11 8v6"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Custom close (×) button used inside the fullscreen viewer header.
// `react-native-image-viewing` ships a default close button, but its
// hit-target is small and it sits flush against the status bar. Wrapping
// it ourselves lets us widen the tap target and add a subtle backdrop
// for visibility against bright photos.
const ViewerCloseButton: React.FC<{ onRequestClose: () => void }> = ({
  onRequestClose,
}) => (
  <TouchableOpacity
    onPress={onRequestClose}
    activeOpacity={0.7}
    style={viewerStyles.closeBtn}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  >
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  </TouchableOpacity>
);

// Image-broken icon shown when the question image fails to load.
// Pictogram of a torn picture frame — communicates "the image is
// missing" without relying on copy.
const BrokenImageIcon: React.FC = () => (
  <Svg width={scale(28)} height={scale(28)} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
      stroke="#8E8E93"
      strokeWidth={1.5}
    />
    <Path
      d="M3 17l5-5 4 4 3-3 6 6"
      stroke="#8E8E93"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Path
      d="M4 4l16 16"
      stroke="#FF3B30"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

interface QuestionImageProps {
  uri: string;
  onTap: () => void;
}

/**
 * Wraps the question image with explicit loading + error states so the
 * user always has feedback. Three states:
 *   1. Loading — spinner centred over the placeholder
 *   2. Error   — broken-image icon + "Tap to retry" affordance
 *   3. Loaded  — image fades in over 200ms
 *
 * The `reloadKey` trick (incrementing a number) is how we force RN's
 * Image component to re-fetch a URL — without changing the source uri
 * the cache layer will short-circuit the retry.
 */
const QuestionImage: React.FC<QuestionImageProps> = ({ uri, onTap }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  );
  const [reloadKey, setReloadKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reset state every time the underlying uri changes (e.g. user
  // switched questions or selected a different voice variant). Without
  // this, the previous question's "loaded" state would leak into the
  // new one and the spinner would never appear.
  useEffect(() => {
    setStatus('loading');
    setReloadKey(0);
    fadeAnim.setValue(0);
  }, [uri, fadeAnim]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, []);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    fadeAnim.setValue(0);
    setReloadKey(k => k + 1);
  }, [fadeAnim]);

  const renderOverlay = () => {
    if (status === 'loading') {
      return (
        <View style={viewerStyles.statusOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#94C23C" />
        </View>
      );
    }
    if (status === 'error') {
      return (
        <TouchableOpacity
          style={viewerStyles.statusOverlay}
          activeOpacity={0.8}
          onPress={handleRetry}
        >
          <BrokenImageIcon />
          <Text style={viewerStyles.errorText}>Couldn't load image</Text>
          <Text style={viewerStyles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <TouchableWithoutFeedback
      onPress={status === 'loaded' ? onTap : undefined}
      accessibilityRole="imagebutton"
    >
      <View style={styles.imageWrapper}>
        <Animated.Image
          // Cache-busting via reloadKey — re-mounts the Image so the
          // bridge re-issues a fresh network request on retry.
          key={reloadKey}
          source={{ uri }}
          style={[styles.questionImage, { opacity: fadeAnim }]}
          resizeMode="contain"
          onLoad={handleLoad}
          onError={handleError}
        />
        {renderOverlay()}
        {status === 'loaded' && (
          <View style={viewerStyles.zoomHint} pointerEvents="none">
            <ZoomHintIcon />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

// Per-category prompt block: image (Describe Image, id 3) /
// situation (Respond to a situation, id 21) / paragraph (Read Aloud, id 1).
export const QuestionContent: React.FC<Props> = ({
  categoryId,
  questionDetails,
  questionText,
  resolveImageUrl,
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);

  const uri = useMemo(() => {
    if (categoryId !== 3 || !questionDetails) return null;
    return resolveQuestionImage(questionDetails, resolveImageUrl);
  }, [categoryId, questionDetails, resolveImageUrl]);

  // `react-native-image-viewing` expects an `images` array. We only ever
  // show one Describe-Image asset at a time, so wrap the single uri.
  // useMemo prevents the modal from re-mounting on unrelated re-renders.
  const viewerImages = useMemo(
    () => (uri ? [{ uri }] : []),
    [uri],
  );

  const openViewer = useCallback(() => {
    if (uri) setViewerOpen(true);
  }, [uri]);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  if (categoryId === 3 && questionDetails) {
    if (!uri) return null;
    return (
      <>
        <QuestionImage uri={uri} onTap={openViewer} />

        <ImageView
          images={viewerImages}
          imageIndex={0}
          visible={viewerOpen}
          onRequestClose={closeViewer}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
          backgroundColor="#000000"
          // eslint-disable-next-line react/no-unstable-nested-components
          HeaderComponent={() => (
            <ViewerCloseButton onRequestClose={closeViewer} />
          )}
          presentationStyle="overFullScreen"
          animationType="fade"
        />
      </>
    );
  }

  if (categoryId === 21 && questionText.length > 0) {
    return (
      <View style={styles.situationContainer}>
        <Text style={styles.situationHeader}>Situation Description:</Text>
        <Text style={styles.situationText}>{questionText}</Text>
      </View>
    );
  }

  if (categoryId === 1 && questionText.length > 0) {
    return <Text style={styles.paragraphText}>{questionText}</Text>;
  }

  return null;
};

// Local viewer-only styles. Kept here (rather than in the screen-wide
// styles file) because they're an implementation detail of the image
// viewer and not reused elsewhere.
const viewerStyles = StyleSheet.create({
  zoomHint: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Centred container for the loading spinner / error placeholder.
  // `position: absolute` lets it sit on top of the (possibly faded-in)
  // Image so we don't need to swap layout while transitioning state.
  statusOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    marginTop: scale(6),
    fontSize: scale(12),
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#48484A',
  },
  retryText: {
    marginTop: scale(2),
    fontSize: scale(11),
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#007AFF',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

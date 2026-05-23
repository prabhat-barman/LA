import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video, { OnLoadData } from 'react-native-video';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { colors } from '../../theme/colors';
import { PlayIcon } from '../../components/atoms/Icon';

// Recognises:
//   https://www.youtube.com/watch?v=ID&...
//   https://youtu.be/ID
//   https://www.youtube.com/embed/ID
//   https://www.youtube.com/shorts/ID
const extractYoutubeId = (url?: string): string | null => {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
};

// Recognises common Vimeo URL formats and pulls out the numeric ID plus an
// optional unlisted-video hash (Vimeo writes it either as `/HASH` after the
// id, or as `?h=HASH` on the player URL).
//   https://vimeo.com/123456789
//   https://vimeo.com/123456789/abcdef               (unlisted hash)
//   https://player.vimeo.com/video/123456789?h=abcd
//   https://player.vimeo.com/video/123456789
//   https://vimeo.com/video/123456789
interface VimeoRef {
  id: string;
  hash?: string;
}

const extractVimeoRef = (url?: string): VimeoRef | null => {
  if (!url) return null;
  const patterns = [
    /player\.vimeo\.com\/video\/(\d+)(?:\/([a-zA-Z0-9]+))?/,
    /vimeo\.com\/video\/(\d+)(?:\/([a-zA-Z0-9]+))?/,
    /vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      let hash = m[2];
      if (!hash) {
        // Fallback to the ?h= query param if present.
        const hQuery = url.match(/[?&]h=([a-zA-Z0-9]+)/);
        if (hQuery) hash = hQuery[1];
      }
      return { id, hash };
    }
  }
  return null;
};

const isDirectVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  return /\.(mp4|m3u8|mov|m4v|webm)(\?.*)?$/i.test(url);
};

type PlayerKind = 'youtube' | 'vimeo' | 'direct' | 'external' | 'none';

interface ResolvedSource {
  kind: PlayerKind;
  youtubeId?: string;
  vimeoId?: string;
  vimeoHash?: string;
  directUrl?: string;
  externalUrl?: string;
}

const resolveSource = (url?: string): ResolvedSource => {
  if (!url) return { kind: 'none' };
  const ytId = extractYoutubeId(url);
  if (ytId) return { kind: 'youtube', youtubeId: ytId };
  const vimeo = extractVimeoRef(url);
  if (vimeo) return { kind: 'vimeo', vimeoId: vimeo.id, vimeoHash: vimeo.hash };
  if (isDirectVideoUrl(url)) return { kind: 'direct', directUrl: url };
  return { kind: 'external', externalUrl: url };
};


interface SmartVideoPlayerProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  height: number;
  onPlaybackStart?: () => void;
  onError?: (msg: string) => void;
}

export const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  height,
  onPlaybackStart,
  onError,
}) => {
  const source = useMemo(() => resolveSource(videoUrl), [videoUrl]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const markStarted = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      onPlaybackStart?.();
    }
  }, [hasStarted, onPlaybackStart]);

  const handleError = useCallback(
    (msg: string) => {
      setErrorMsg(msg);
      onError?.(msg);
    },
    [onError],
  );

  const onYoutubeStateChange = useCallback(
    (state: string) => {
      if (state === 'playing') markStarted();
      if (state === 'ended') setPlaying(false);
    },
    [markStarted],
  );

  const onYoutubeReady = useCallback(() => setLoading(false), []);

  const onYoutubeError = useCallback(
    (err: string) => handleError(`YouTube error: ${err}`),
    [handleError],
  );

  const onDirectLoadStart = useCallback(() => setLoading(true), []);
  const onDirectLoad = useCallback((_data: OnLoadData) => {
    setLoading(false);
    markStarted();
  }, [markStarted]);
  const onDirectError = useCallback(
    () => handleError('Could not load video'),
    [handleError],
  );

  const openExternal = useCallback(async () => {
    if (!source.externalUrl) return;
    try {
      await Linking.openURL(source.externalUrl);
      markStarted();
    } catch {
      handleError('Could not open video');
    }
  }, [source.externalUrl, markStarted, handleError]);

  if (source.kind === 'youtube' && source.youtubeId) {
    return (
      <View style={[styles.frame, { height }]}>
        <YoutubePlayer
          height={height}
          play={playing}
          videoId={source.youtubeId}
          onChangeState={onYoutubeStateChange}
          onReady={onYoutubeReady}
          onError={onYoutubeError}
          webViewProps={{ allowsInlineMediaPlayback: true }}
        />
        {!playing && (
          <TouchableOpacity
            style={styles.tapToPlay}
            activeOpacity={0.85}
            onPress={() => setPlaying(true)}
          >
            <View style={styles.bigPlayBadge}>
              <PlayIcon size={32} />
            </View>
            <Text style={styles.tapHint}>Tap to play</Text>
          </TouchableOpacity>
        )}
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
        {errorMsg && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </View>
    );
  }

  if (source.kind === 'vimeo' && source.vimeoId) {
    // Load Vimeo's player URL directly in the WebView (no iframe wrapper).
    // Embed-domain restrictions only apply when the player is iframed from a
    // third-party origin — when we visit player.vimeo.com itself, the video
    // plays as long as we have the unlisted hash (if any).
    //
    // The hash (`?h=`) is required for unlisted videos and is preserved by
    // `extractVimeoRef` whether the source URL used `/HASH` or `?h=HASH`.
    const params: string[] = [];
    if (source.vimeoHash) params.push(`h=${source.vimeoHash}`);
    params.push('autoplay=1', 'playsinline=1', 'title=0', 'byline=0', 'portrait=0', 'dnt=1');
    const playerUrl = `https://player.vimeo.com/video/${source.vimeoId}?${params.join('&')}`;

    return (
      <View style={[styles.frame, { height }]}>
        {playing ? (
          <>
            <WebView
              source={{ uri: playerUrl }}
              style={StyleSheet.absoluteFill}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              allowsFullscreenVideo
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => {
                setLoading(false);
                markStarted();
              }}
              onError={() => handleError('Could not load Vimeo video')}
            />
            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            )}
          </>
        ) : (
          <>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]} />
            )}
            <TouchableOpacity
              style={styles.tapToPlay}
              activeOpacity={0.85}
              onPress={() => setPlaying(true)}
            >
              <View style={styles.bigPlayBadge}>
                <PlayIcon size={32} />
              </View>
              <Text style={styles.tapHint}>Tap to play</Text>
            </TouchableOpacity>
          </>
        )}
        {errorMsg && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </View>
    );
  }

  if (source.kind === 'direct' && source.directUrl) {
    return (
      <View style={[styles.frame, { height }]}>
        <Video
          source={{ uri: source.directUrl }}
          style={StyleSheet.absoluteFill}
          controls
          resizeMode="contain"
          paused={false}
          onLoadStart={onDirectLoadStart}
          onLoad={onDirectLoad}
          onError={onDirectError}
          ignoreSilentSwitch="ignore"
          poster={thumbnailUrl}
        />
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
        {errorMsg && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </View>
    );
  }

  // External link or no URL: thumbnail + actionable overlay
  return (
    <View style={[styles.frame, { height }]}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <View style={styles.externalOverlay}>
        {source.kind === 'external' ? (
          <TouchableOpacity
            style={styles.externalBtn}
            onPress={openExternal}
            activeOpacity={0.85}
          >
            <PlayIcon size={20} />
            <Text style={styles.externalBtnText}>Open Video</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.unavailableText}>
            Video link not available yet
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: colors.black,
    position: 'relative',
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  thumbFallback: {
    backgroundColor: '#222',
  },
  tapToPlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bigPlayBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tapHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'BricolageGrotesque-Regular',
  },
  externalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  externalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'BricolageGrotesque-Bold',
  },
  unavailableText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

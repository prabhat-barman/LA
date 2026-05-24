import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { styles } from '../styles';

interface Props {
  source: string | null;
  onEnded: () => void;
  onError: (msg: string) => void;
}

// Hidden WebView running an HTML5 <audio> element. We use this instead of a
// native audio player because the iOS native libraries (nitro-sound /
// AVAudioPlayer) fail to play S3-hosted mp3s when S3 serves them with a
// non-audio Content-Type. Mobile Safari's media stack is far more forgiving
// and matches the behaviour users see in a desktop browser. The wrapping
// View pushes the WebView completely off-screen and prevents it from
// intercepting any taps.
export const HiddenAttemptAudioWebView: React.FC<Props> = ({ source, onEnded, onError }) => {
  if (!source) return null;
  return (
    <View pointerEvents="none" style={styles.hiddenAttemptVideoContainer}>
      <WebView
        key={source}
        source={{
          html: `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;background:transparent;">
<audio id="a" src="${source}" autoplay playsinline preload="auto"></audio>
<script>
  (function(){
    var a = document.getElementById('a');
    function post(o){ try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch(e){} }
    a.addEventListener('ended', function(){ post({ type: 'ended' }); });
    a.addEventListener('error', function(e){
      post({ type: 'error', code: a.error ? a.error.code : 0, message: a.error ? a.error.message : 'unknown' });
    });
    a.addEventListener('playing', function(){ post({ type: 'playing' }); });
    a.addEventListener('pause', function(){ post({ type: 'pause' }); });
    a.play().catch(function(err){ post({ type: 'error', message: String(err) }); });
  })();
</script>
</body>
</html>`,
        }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={event => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === 'ended') {
              onEnded();
            } else if (data?.type === 'error') {
              onError('Could not play attempt audio.');
            }
          } catch {
            // ignore unparseable messages
          }
        }}
        onError={e => {
          if (__DEV__) {
            console.warn('[QuestionDetail] webview load error:', e.nativeEvent);
          }
        }}
        style={styles.hiddenAttemptVideo}
      />
    </View>
  );
};

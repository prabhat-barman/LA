import React, { useMemo } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';

interface Props {
  // The full paragraph as a single string. We split on whitespace
  // and wrap each word in a `<Text>` so an `onPress` can fire per
  // token. Punctuation is stripped only for the lookup callback —
  // the rendered token keeps its punctuation so the paragraph reads
  // naturally.
  text: string;
  // Combined style applied to the wrapping `<Text>` block. Each
  // token inherits it.
  style?: TextStyle | TextStyle[];
  onWordPress?: (word: string) => void;
}

// Strip leading / trailing punctuation so "World," looks up "World".
// Apostrophes and hyphens are preserved so "don't" / "well-being"
// stay intact.
const cleanWord = (raw: string): string => {
  return raw.replace(/^[^A-Za-z0-9'-]+|[^A-Za-z0-9'-]+$/g, '');
};

export const TappableParagraph: React.FC<Props> = ({
  text,
  style,
  onWordPress,
}) => {
  const tokens = useMemo(() => {
    // Preserve whitespace runs as their own tokens so we don't
    // collapse multi-space formatting.
    return text.split(/(\s+)/);
  }, [text]);

  if (!onWordPress) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <Text style={style}>
      {tokens.map((tok, idx) => {
        if (/^\s+$/.test(tok) || tok.length === 0) {
          return <Text key={`s-${idx}`}>{tok}</Text>;
        }
        const cleaned = cleanWord(tok);
        if (!cleaned) {
          return <Text key={`p-${idx}`}>{tok}</Text>;
        }
        return (
          <Text
            key={`w-${idx}-${cleaned}`}
            style={localStyles.tappable}
            onPress={() => onWordPress(cleaned)}
            suppressHighlighting
          >
            {tok}
          </Text>
        );
      })}
    </Text>
  );
};

export default TappableParagraph;

const localStyles = StyleSheet.create({
  // No visual change by default — taps are silent. Adding underline
  // /color here would clutter long passages. The behaviour matches
  // the legacy app where words are "secretly" tappable and the user
  // discovers the feature on first tap.
  tappable: {},
});

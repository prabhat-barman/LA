import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, type TextStyle } from 'react-native';
import RenderHTML, {
  type MixedStyleDeclaration,
  type MixedStyleRecord,
} from 'react-native-render-html';

interface Props {
  // The raw string from the backend. May be plain text OR HTML — the
  // component decides at render time which path to use. Empty / null
  // values render nothing so callers can drop the surrounding ternary.
  content: string | null | undefined;
  // RN text style applied as the base styling for BOTH the plain-text
  // fallback and the HTML body (rendered via `baseStyle` on
  // RenderHTML). Pass the same `styles.questionPrompt` you'd give a
  // <Text> and the typography stays identical regardless of which
  // path is taken.
  style?: TextStyle | TextStyle[];
  // Per-tag overrides. Optional escape hatch when a specific tag
  // (e.g. <b>, <em>) needs to deviate from the base style.
  tagsStyles?: Readonly<MixedStyleRecord>;
}

// Heuristic to decide whether the input looks like HTML or just text.
// Cheap on purpose — a single regex against any opening tag. False
// positives (`x < 3 && y > 4`) fall through to the HTML renderer
// safely because the renderer treats unparseable content as text.
//
// We tolerate self-closing tags (`<br/>`) and tags with attributes
// (`<span class="foo">`) — anything starting with `<` followed by a
// letter, ending with `>` somewhere, qualifies.
const HTML_PATTERN = /<[a-zA-Z][^>]*>/;
const looksLikeHtml = (s: string): boolean => HTML_PATTERN.test(s);

// Stable singleton so RenderHTML's `tagsStyles` reference doesn't
// change across renders and trigger its internal recomputation. The
// shape mirrors `<Text>` defaults that match the rest of the runner.
const DEFAULT_TAGS_STYLES: Readonly<MixedStyleRecord> = {
  p: { marginTop: 0, marginBottom: 8 },
  b: { fontFamily: 'BricolageGrotesque-Bold', fontWeight: 'bold' },
  strong: { fontFamily: 'BricolageGrotesque-Bold', fontWeight: 'bold' },
  i: { fontStyle: 'italic' },
  em: { fontStyle: 'italic' },
  u: { textDecorationLine: 'underline' },
  sup: { fontSize: 10, lineHeight: 14 },
  sub: { fontSize: 10, lineHeight: 14 },
  br: { marginBottom: 4 },
  a: { color: '#1D4ED8', textDecorationLine: 'underline' },
  li: { marginBottom: 4 },
  ul: { marginTop: 4, marginBottom: 4 },
  ol: { marginTop: 4, marginBottom: 4 },
};

// Render a backend-supplied string that may contain HTML markup
// (e.g. <b>, <i>, <p>, <sup>) without paying the renderer cost for
// the plain-text case. The plain-text fallback is identical to a
// regular <Text> — same fonts, same layout — so existing screens can
// swap `<Text>{prompt}</Text>` for `<HtmlText content={prompt} />`
// with zero visual regression.
//
// Used for question prompts, paragraphs, and any other backend field
// that may sometimes ship as HTML. The `looksLikeHtml` gate keeps
// 95 % of practice questions on the cheap path while letting the
// occasional Highlight Correct Summary / Reading passage render its
// inline markup correctly.
export const HtmlText: React.FC<Props> = ({ content, style, tagsStyles }) => {
  const text = (content ?? '').trim();

  const baseStyle = useMemo<MixedStyleDeclaration>(() => {
    const flat = StyleSheet.flatten(style) ?? {};
    // RenderHTML's `baseStyle` accepts a subset of RN text styles.
    // Cast through `as MixedStyleDeclaration` rather than enumerating
    // because flatten() already produces a plain object we can hand
    // straight in.
    return flat as MixedStyleDeclaration;
  }, [style]);

  const mergedTagsStyles = useMemo<Readonly<MixedStyleRecord>>(() => {
    if (!tagsStyles) return DEFAULT_TAGS_STYLES;
    return { ...DEFAULT_TAGS_STYLES, ...tagsStyles };
  }, [tagsStyles]);

  // `react-native-render-html` requires a numeric `contentWidth` so it
  // can size things like images / tables. We use the window width as
  // a sensible default — most question content sits inside the runner
  // body padding so this is an upper bound, not a constraint.
  const contentWidth = useMemo(() => Dimensions.get('window').width, []);

  if (text.length === 0) return null;

  if (!looksLikeHtml(text)) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html: text }}
      baseStyle={baseStyle}
      tagsStyles={mergedTagsStyles}
      enableExperimentalMarginCollapsing
      // The default behaviour of injecting a wrapper <View> with
      // flex: 1 inflates content height awkwardly inside a ScrollView.
      // Letting the renderer size to its intrinsic content keeps the
      // layout matching the plain-text fallback.
      defaultViewProps={{ style: undefined }}
      defaultTextProps={{ selectable: false }}
    />
  );
};

export default HtmlText;

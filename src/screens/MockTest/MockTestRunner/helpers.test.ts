import {
  buildFinalMockClosePayload,
  buildQueueItemId,
  buildRemainingQuesPayload,
  buildSelectedString,
  buildSubmitPayload,
  buildInterleavedFibSelected,
  buildSectionRanges,
  countWords,
  findSectionIndexForQuestion,
  normalizePendingMock,
  parseFibQuestion,
  tokenizeHighlightAnswer,
  formatDurationMMSS,
  formatRemainingTime,
  getAnswerKind,
  getRetryDelayMs,
  getSection,
  isAnswerComplete,
  isLastInSection,
  normalizeMockTestDetail,
  normalizeQuestion,
  OPTIONAL_LISTENING_BREAK_SEC,
  resolveSectionDuration,
  resolveTotalDurationSec,
  shouldOfferOptionalBreak,
} from './helpers';
import type { AnswerDraft, AnswerSubmission, Question, SubmitContext } from './types';

describe('MockTestRunner helpers', () => {
  describe('getAnswerKind', () => {
    it('maps speaking subcategories (1..5 + 21, 22)', () => {
      expect(getAnswerKind(1)).toBe('speaking');
      expect(getAnswerKind(2)).toBe('speaking');
      expect(getAnswerKind(3)).toBe('speaking');
      expect(getAnswerKind(4)).toBe('speaking');
      expect(getAnswerKind(5)).toBe('speaking');
      expect(getAnswerKind(21)).toBe('speaking');
      expect(getAnswerKind(22)).toBe('speaking');
    });

    it('maps writing subcategories (incl. listening writing-style 13/20)', () => {
      expect(getAnswerKind(6)).toBe('writing');
      expect(getAnswerKind(7)).toBe('writing');
      expect(getAnswerKind(13)).toBe('writing');
      expect(getAnswerKind(20)).toBe('writing');
    });

    it('maps MCQ-single (8, 14) plus single-pick UX (17 summary, 18 missing word)', () => {
      expect(getAnswerKind(8)).toBe('mcq-single');
      expect(getAnswerKind(14)).toBe('mcq-single');
      expect(getAnswerKind(17)).toBe('mcq-single');
      expect(getAnswerKind(18)).toBe('mcq-single');
    });

    it('maps MCQ-multi (9, 15)', () => {
      expect(getAnswerKind(9)).toBe('mcq-multi');
      expect(getAnswerKind(15)).toBe('mcq-multi');
    });

    it('maps remaining specialized kinds', () => {
      expect(getAnswerKind(10)).toBe('reorder');
      // 11 (Reading FIB) and 12 (Reading-Writing FIB) are both dropdown.
      expect(getAnswerKind(11)).toBe('fib-bank');
      expect(getAnswerKind(12)).toBe('fib-dropdown');
      // 16 (Listening FIB) is type-the-word text input.
      expect(getAnswerKind(16)).toBe('fib-input');
      // 19 is the only true word-highlight answer kind.
      expect(getAnswerKind(19)).toBe('highlight');
    });
  });

  describe('getSection', () => {
    it('groups subcategories into PTE sections', () => {
      expect(getSection(1)).toBe('Speaking');
      expect(getSection(21)).toBe('Speaking');
      expect(getSection(22)).toBe('Speaking');
      expect(getSection(6)).toBe('Writing');
      expect(getSection(10)).toBe('Reading');
      expect(getSection(12)).toBe('Reading');
      expect(getSection(13)).toBe('Listening');
      expect(getSection(20)).toBe('Listening');
    });
  });

  describe('resolveSectionDuration', () => {
    it('uses the backend value when finite and positive', () => {
      expect(resolveSectionDuration('Speaking', 1800)).toEqual({
        durationSec: 1800,
        usedFallback: false,
      });
    });

    it('falls back to PTE defaults for missing / zero / negative input', () => {
      expect(resolveSectionDuration('Reading', 0)).toEqual({
        durationSec: 30 * 60,
        usedFallback: true,
      });
      expect(resolveSectionDuration('Listening', null)).toEqual({
        durationSec: 38 * 60,
        usedFallback: true,
      });
      expect(resolveSectionDuration('Writing', undefined)).toEqual({
        durationSec: 35 * 60,
        usedFallback: true,
      });
      expect(resolveSectionDuration('Speaking', -120)).toEqual({
        durationSec: 35 * 60,
        usedFallback: true,
      });
    });
  });

  describe('buildSectionRanges', () => {
    it('produces one contiguous range per section in question order', () => {
      // 2 speaking + 1 writing + 2 reading + 1 listening — covers the
      // full PTE Full Mock section sweep.
      const qs = [
        { subcategory_id: 1 as const },
        { subcategory_id: 2 as const },
        { subcategory_id: 6 as const },
        { subcategory_id: 8 as const },
        { subcategory_id: 11 as const },
        { subcategory_id: 14 as const },
      ];
      const ranges = buildSectionRanges(qs, {
        Speaking: 120,
        Writing: 60,
        Reading: 90,
        Listening: 180,
      });
      expect(ranges).toEqual([
        { section: 'Speaking', startIndex: 0, endIndex: 1, durationSec: 120 },
        { section: 'Writing', startIndex: 2, endIndex: 2, durationSec: 60 },
        { section: 'Reading', startIndex: 3, endIndex: 4, durationSec: 90 },
        { section: 'Listening', startIndex: 5, endIndex: 5, durationSec: 180 },
      ]);
    });

    it('falls back to the PTE default duration when a section is missing from the backend', () => {
      const qs = [{ subcategory_id: 1 as const }];
      const ranges = buildSectionRanges(qs, {}); // no per-section times
      // Default speaking duration (see DEFAULT_SECTION_DURATION_SEC).
      expect(ranges[0].durationSec).toBe(35 * 60);
    });

    it('returns one range for a sectional mock (single section)', () => {
      const qs = [
        { subcategory_id: 6 as const },
        { subcategory_id: 7 as const },
      ];
      const ranges = buildSectionRanges(qs, { Writing: 600 });
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({
        section: 'Writing',
        startIndex: 0,
        endIndex: 1,
        durationSec: 600,
      });
    });

    it('returns an empty array for no questions', () => {
      expect(buildSectionRanges([], {})).toEqual([]);
    });

    it('handles questions that are out of canonical section order (defensive)', () => {
      // Speaking → Reading → Speaking again would be three ranges, NOT
      // two — we don't try to merge non-contiguous same-section runs.
      // Backends shouldn't ship this, but if they do, we want each
      // run to get its own timer rather than silently fusing them.
      const qs = [
        { subcategory_id: 1 as const },
        { subcategory_id: 8 as const },
        { subcategory_id: 2 as const },
      ];
      const ranges = buildSectionRanges(qs, {
        Speaking: 60,
        Reading: 30,
      });
      expect(ranges.map(r => r.section)).toEqual([
        'Speaking',
        'Reading',
        'Speaking',
      ]);
    });
  });

  describe('findSectionIndexForQuestion', () => {
    const ranges = [
      { startIndex: 0, endIndex: 1 },
      { startIndex: 2, endIndex: 2 },
      { startIndex: 3, endIndex: 5 },
    ];

    it('returns the section index that contains the question', () => {
      expect(findSectionIndexForQuestion(ranges, 0)).toBe(0);
      expect(findSectionIndexForQuestion(ranges, 1)).toBe(0);
      expect(findSectionIndexForQuestion(ranges, 2)).toBe(1);
      expect(findSectionIndexForQuestion(ranges, 5)).toBe(2);
    });

    it('clamps to the first range when the index is below the range', () => {
      expect(findSectionIndexForQuestion(ranges, -1)).toBe(0);
    });

    it('clamps to the last range when the index is past the range', () => {
      expect(findSectionIndexForQuestion(ranges, 99)).toBe(2);
    });

    it('returns 0 for an empty ranges array (defensive)', () => {
      expect(findSectionIndexForQuestion([], 0)).toBe(0);
    });
  });

  describe('isLastInSection', () => {
    const qs: Pick<Question, 'subcategory_id'>[] = [
      { subcategory_id: 1 },
      { subcategory_id: 2 },
      { subcategory_id: 6 },
      { subcategory_id: 7 },
      { subcategory_id: 10 },
    ];

    it('returns true at a section boundary', () => {
      expect(isLastInSection(qs, 1)).toBe(true);
      expect(isLastInSection(qs, 3)).toBe(true);
    });

    it('returns false within a section', () => {
      expect(isLastInSection(qs, 0)).toBe(false);
      expect(isLastInSection(qs, 2)).toBe(false);
    });

    it('returns true for the final question', () => {
      expect(isLastInSection(qs, 4)).toBe(true);
    });

    it('treats out-of-range indices as terminal', () => {
      expect(isLastInSection(qs, -1)).toBe(true);
      expect(isLastInSection(qs, 99)).toBe(true);
    });
  });

  describe('isAnswerComplete', () => {
    const cases: { name: string; draft: AnswerDraft; expected: boolean }[] = [
      { name: 'speaking with recording', draft: { kind: 'speaking', audioFilePath: '/tmp/a.m4a', durationSec: 12 }, expected: true },
      { name: 'speaking without file', draft: { kind: 'speaking', audioFilePath: '', durationSec: 12 }, expected: false },
      { name: 'speaking with zero duration', draft: { kind: 'speaking', audioFilePath: '/tmp/a.m4a', durationSec: 0 }, expected: false },
      { name: 'writing with text', draft: { kind: 'writing', text: 'hello' }, expected: true },
      { name: 'writing with only whitespace', draft: { kind: 'writing', text: '   \n' }, expected: false },
      { name: 'mcq-single selected', draft: { kind: 'mcq-single', selectedId: '42' }, expected: true },
      { name: 'mcq-single not selected', draft: { kind: 'mcq-single', selectedId: null }, expected: false },
      { name: 'mcq-multi with selection', draft: { kind: 'mcq-multi', selectedIds: ['a'] }, expected: true },
      { name: 'mcq-multi empty', draft: { kind: 'mcq-multi', selectedIds: [] }, expected: false },
      { name: 'reorder with order', draft: { kind: 'reorder', orderedIds: ['p1', 'p2'] }, expected: true },
      { name: 'reorder empty', draft: { kind: 'reorder', orderedIds: [] }, expected: false },
      // fib-dropdown / fib-bank are lenient — at least one filled blank enables Next.
      { name: 'fib-dropdown all filled', draft: { kind: 'fib-dropdown', values: ['one', 'two'] }, expected: true },
      { name: 'fib-dropdown partial filled', draft: { kind: 'fib-dropdown', values: ['one', null] }, expected: true },
      { name: 'fib-dropdown all null', draft: { kind: 'fib-dropdown', values: [null, null] }, expected: false },
      { name: 'fib-dropdown empty', draft: { kind: 'fib-dropdown', values: [] }, expected: false },
      { name: 'fib-bank partial filled', draft: { kind: 'fib-bank', values: ['cat', null, 'dog'] }, expected: true },
      { name: 'fib-bank all null', draft: { kind: 'fib-bank', values: [null, null, null] }, expected: false },
      { name: 'fib-bank empty', draft: { kind: 'fib-bank', values: [] }, expected: false },
      // fib-input is strict — every blank must be typed (matches sub 16 PTE rules).
      { name: 'fib-input all filled', draft: { kind: 'fib-input', values: ['x', 'y'] }, expected: true },
      { name: 'fib-input one empty', draft: { kind: 'fib-input', values: ['x', ''] }, expected: false },
      { name: 'fib-input empty array', draft: { kind: 'fib-input', values: [] }, expected: false },
      { name: 'highlight with selection', draft: { kind: 'highlight', selectedIndices: [3, 7], selectedWords: ['cat', 'dog'] }, expected: true },
      { name: 'highlight no selection', draft: { kind: 'highlight', selectedIndices: [], selectedWords: [] }, expected: false },
      { name: 'empty draft', draft: { kind: 'empty' }, expected: false },
    ];

    cases.forEach(({ name, draft, expected }) => {
      it(`${expected ? 'enables' : 'blocks'} Next for ${name}`, () => {
        expect(isAnswerComplete(draft)).toBe(expected);
      });
    });
  });

  describe('getRetryDelayMs', () => {
    it('returns exponential backoff for attempts 1..3', () => {
      expect(getRetryDelayMs(1)).toBe(1000);
      expect(getRetryDelayMs(2)).toBe(2000);
      expect(getRetryDelayMs(3)).toBe(4000);
    });

    it('returns null beyond the retry cap', () => {
      expect(getRetryDelayMs(4)).toBeNull();
      expect(getRetryDelayMs(0)).toBeNull();
      expect(getRetryDelayMs(-1)).toBeNull();
      expect(getRetryDelayMs(Number.NaN)).toBeNull();
    });
  });

  describe('formatRemainingTime', () => {
    it('renders MM:SS under one hour', () => {
      expect(formatRemainingTime(0)).toBe('0:00');
      expect(formatRemainingTime(7)).toBe('0:07');
      expect(formatRemainingTime(65)).toBe('1:05');
      expect(formatRemainingTime(3599)).toBe('59:59');
    });

    it('renders HH:MM:SS at or beyond one hour', () => {
      expect(formatRemainingTime(3600)).toBe('1:00:00');
      expect(formatRemainingTime(3725)).toBe('1:02:05');
      expect(formatRemainingTime(7384)).toBe('2:03:04');
    });

    it('coerces negative / non-finite input to 0:00', () => {
      expect(formatRemainingTime(-5)).toBe('0:00');
      expect(formatRemainingTime(Number.NaN)).toBe('0:00');
      expect(formatRemainingTime(Number.POSITIVE_INFINITY)).toBe('0:00');
    });
  });

  describe('buildQueueItemId', () => {
    it('joins mock id and question id with a hyphen', () => {
      expect(buildQueueItemId(101, 5)).toBe('101-5');
      expect(buildQueueItemId('m1', 'q2')).toBe('m1-q2');
    });
  });

  describe('formatDurationMMSS', () => {
    it('zero-pads minutes and seconds', () => {
      expect(formatDurationMMSS(0)).toBe('00:00');
      expect(formatDurationMMSS(7)).toBe('00:07');
      expect(formatDurationMMSS(30)).toBe('00:30');
      expect(formatDurationMMSS(75)).toBe('01:15');
      expect(formatDurationMMSS(3725)).toBe('62:05');
    });

    it('coerces invalid input to 00:00', () => {
      expect(formatDurationMMSS(-1)).toBe('00:00');
      expect(formatDurationMMSS(Number.NaN)).toBe('00:00');
      expect(formatDurationMMSS(Number.POSITIVE_INFINITY)).toBe('00:00');
    });
  });

  describe('parseFibQuestion', () => {
    it('dropdown mode: per-blank choices, no bank', () => {
      const parsed = parseFibQuestion(
        "The <span id='cAns'>quick</span>__add_blank__ brown fox <span id='cAns'>jumps</span>__add_blank__ over the lazy dog.",
        [
          { id: 101, options: 'quick, slow, lazy' },
          { id: 102, options: 'jumps, walks, runs' },
        ],
        'dropdown',
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.parts).toEqual([
        'The ',
        ' brown fox ',
        ' over the lazy dog.',
      ]);
      expect(parsed?.blanks).toEqual([
        { id: '101', choices: ['quick', 'slow', 'lazy'] },
        { id: '102', choices: ['jumps', 'walks', 'runs'] },
      ]);
      expect(parsed?.bank).toBeUndefined();
    });

    it('bank mode: flattens every entry into one shared word bank', () => {
      const parsed = parseFibQuestion(
        "Words go here __add_blank__ and here <span id='cAns'>second</span>__add_blank__ done.",
        [
          { id: 'a', options: 'first, alternate, decoy' },
          { id: 'b', options: 'second, runner-up, also-ran' },
        ],
        'bank',
      );
      expect(parsed?.blanks).toEqual([{ id: 'a' }, { id: 'b' }]);
      // Choices intentionally NOT promoted to per-blank — bank mode
      // lets any word land in any slot.
      expect(parsed?.blanks[0].choices).toBeUndefined();
      expect(parsed?.bank).toEqual([
        'first',
        'alternate',
        'decoy',
        'second',
        'runner-up',
        'also-ran',
      ]);
    });

    it('bank mode preserves duplicate words across entries', () => {
      // PTE will sometimes legitimately ship the same word in
      // multiple entries (extra distractors); dedup would hide that.
      const parsed = parseFibQuestion(
        '__add_blank__ __add_blank__',
        [
          { id: 'a', options: 'cat, dog' },
          { id: 'b', options: 'dog, bird' },
        ],
        'bank',
      );
      expect(parsed?.bank).toEqual(['cat', 'dog', 'dog', 'bird']);
    });

    it('input mode: no per-blank choices, no bank', () => {
      const parsed = parseFibQuestion(
        'Type the missing __add_blank__ here.',
        [{ id: 'b1' }],
        'input',
      );
      expect(parsed?.blanks).toEqual([{ id: 'b1' }]);
      expect(parsed?.bank).toBeUndefined();
    });

    it('falls back to a synthetic blank id when the option entry has none', () => {
      const parsed = parseFibQuestion(
        'A __add_blank__ B __add_blank__ C',
        [{}, {}],
        'dropdown',
      );
      expect(parsed?.blanks.map(b => b.id)).toEqual(['blank-0', 'blank-1']);
    });

    it('returns null when the text has no blank markers', () => {
      expect(
        parseFibQuestion('Just a regular sentence.', [{ options: 'a, b' }], 'dropdown'),
      ).toBeNull();
    });

    it('returns null for empty / missing text', () => {
      expect(parseFibQuestion(undefined, [], 'dropdown')).toBeNull();
      expect(parseFibQuestion('', [], 'bank')).toBeNull();
    });

    it('handles a blank at the very start or end of the text', () => {
      const parsed = parseFibQuestion(
        '__add_blank__ rules everything around me __add_blank__',
        [{ id: 'a', options: 'cash' }, { id: 'b', options: 'me' }],
        'dropdown',
      );
      expect(parsed?.parts).toEqual([
        '',
        ' rules everything around me ',
        '',
      ]);
      expect(parsed?.blanks).toHaveLength(2);
    });
  });

  describe('buildInterleavedFibSelected', () => {
    it('prepends a comma to every value before joining', () => {
      expect(buildInterleavedFibSelected(['a', 'b', 'c'])).toBe(',a,,b,,c');
      expect(buildInterleavedFibSelected(['only'])).toBe(',only');
    });

    it('preserves null / empty slots as empty positions', () => {
      expect(buildInterleavedFibSelected(['first', null, 'third'])).toBe(
        ',first,,,,third',
      );
    });

    it('returns an empty string for an empty array', () => {
      expect(buildInterleavedFibSelected([])).toBe('');
    });
  });

  describe('tokenizeHighlightAnswer', () => {
    it('strips HTML tags and splits on whitespace', () => {
      expect(
        tokenizeHighlightAnswer(
          "The quick brown <span id='cAns'>fox</span> jumps",
        ),
      ).toEqual(['The', 'quick', 'brown', 'fox', 'jumps']);
    });

    it('decodes &nbsp; before splitting so words stay separate', () => {
      expect(tokenizeHighlightAnswer('one&nbsp;two&nbsp;three')).toEqual([
        'one',
        'two',
        'three',
      ]);
    });

    it('collapses runs of whitespace into single separators', () => {
      expect(tokenizeHighlightAnswer('  hello   world\n\tagain  ')).toEqual([
        'hello',
        'world',
        'again',
      ]);
    });

    it('returns an empty array for null / empty input', () => {
      expect(tokenizeHighlightAnswer(undefined)).toEqual([]);
      expect(tokenizeHighlightAnswer('')).toEqual([]);
      expect(tokenizeHighlightAnswer('   ')).toEqual([]);
    });
  });

  describe('countWords', () => {
    it('counts runs of non-whitespace', () => {
      expect(countWords('hello world')).toBe(2);
      expect(countWords('  one  two   three ')).toBe(3);
      expect(countWords('a')).toBe(1);
    });

    it('returns 0 for empty or whitespace-only input', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   \n\t ')).toBe(0);
    });
  });

  describe('buildSelectedString', () => {
    it('returns the single selection unchanged for mcq-single', () => {
      expect(buildSelectedString({ kind: 'mcq-single', selectedId: '42' })).toBe('42');
      expect(buildSelectedString({ kind: 'mcq-single', selectedId: null })).toBeNull();
    });

    it('comma-joins mcq-multi / reorder / highlight', () => {
      expect(buildSelectedString({ kind: 'mcq-multi', selectedIds: ['a', 'b'] })).toBe('a,b');
      expect(buildSelectedString({ kind: 'reorder', orderedIds: ['p2', 'p1', 'p3'] })).toBe('p2,p1,p3');
      // Highlight emits WORDS (not indices) — backend cross-references
      // them against the cAns spans in the original answer markup.
      expect(
        buildSelectedString({
          kind: 'highlight',
          selectedIndices: [3, 7, 12],
          selectedWords: ['stability', 'sustain', 'thrive'],
        }),
      ).toBe('stability,sustain,thrive');
      expect(
        buildSelectedString({
          kind: 'highlight',
          selectedIndices: [],
          selectedWords: [],
        }),
      ).toBeNull();
    });

    it('preserves empty slots in fill-in-the-blanks join', () => {
      expect(
        buildSelectedString({
          kind: 'fib-dropdown',
          values: ['first', null, 'third'],
        }),
      ).toBe('first,,third');
      expect(
        buildSelectedString({
          kind: 'fib-bank',
          values: ['cat', null, 'dog'],
        }),
      ).toBe('cat,,dog');
      expect(
        buildSelectedString({
          kind: 'fib-input',
          values: ['hello', '', 'world'],
        }),
      ).toBe('hello,,world');
    });

    it('returns null when the fib values array is empty', () => {
      expect(
        buildSelectedString({ kind: 'fib-dropdown', values: [] }),
      ).toBeNull();
      expect(buildSelectedString({ kind: 'fib-bank', values: [] })).toBeNull();
      expect(buildSelectedString({ kind: 'fib-input', values: [] })).toBeNull();
    });

    it('returns null for writing / speaking / empty drafts', () => {
      expect(buildSelectedString({ kind: 'writing', text: 'hello' })).toBeNull();
      expect(
        buildSelectedString({
          kind: 'speaking',
          audioFilePath: '/tmp/a.m4a',
          durationSec: 10,
        }),
      ).toBeNull();
      expect(buildSelectedString({ kind: 'empty' })).toBeNull();
    });
  });

  describe('normalizePendingMock', () => {
    it('reads canonical fields (mock_id, curr_q, time, mock_name, category code)', () => {
      const p = normalizePendingMock(
        {
          mock_id: 7,
          mock_name: 'Mock Test #7',
          curr_q: 5,
          time: 1800,
          category: 5,
          q_count: 30,
        },
        { variant: 'full' },
      );
      expect(p).toEqual({
        mockId: 7,
        variant: 'full',
        category: 'Full Mock',
        title: 'Mock Test #7',
        startQuestionIndex: 5,
        remainingSecondsTotal: 1800,
        totalQuestions: 30,
        raw: expect.any(Object),
      });
    });

    it('falls back to legacy aliases (id / current_question / remaining_time / title)', () => {
      const p = normalizePendingMock(
        {
          id: 'abc-123',
          title: 'Speaking Practice',
          current_question: 4, // 1-based → collapse to 3
          remaining_time: 600,
          category: 'Speaking',
        },
        { variant: 'extensive' },
      );
      expect(p?.mockId).toBe('abc-123');
      expect(p?.title).toBe('Speaking Practice');
      // 1-based 4 → 0-based 3
      expect(p?.startQuestionIndex).toBe(3);
      expect(p?.remainingSecondsTotal).toBe(600);
      expect(p?.category).toBe('Speaking');
      expect(p?.variant).toBe('extensive');
    });

    it('defaults to category=Full Mock when missing or unrecognized', () => {
      expect(
        normalizePendingMock({ mock_id: 1 }, { variant: 'full' })?.category,
      ).toBe('Full Mock');
      expect(
        normalizePendingMock(
          { mock_id: 1, category: 'Nonsense' },
          { variant: 'full' },
        )?.category,
      ).toBe('Full Mock');
      expect(
        normalizePendingMock(
          { mock_id: 1, category: 99 },
          { variant: 'full' },
        )?.category,
      ).toBe('Full Mock');
    });

    it('defaults remainingSecondsTotal to 0 when no time field is present', () => {
      // Returning 0 lets the runner fall back to session.totalDurationSec
      // instead of starting from an explicit 0 (which would auto-expire).
      const p = normalizePendingMock({ mock_id: 5 }, { variant: 'full' });
      expect(p?.remainingSecondsTotal).toBe(0);
    });

    it('returns null when mock id is missing or unusable', () => {
      // Missing entirely
      expect(normalizePendingMock({}, { variant: 'full' })).toBeNull();
      // Null / undefined / empty string / whitespace
      expect(
        normalizePendingMock({ mock_id: null }, { variant: 'full' }),
      ).toBeNull();
      expect(
        normalizePendingMock({ mock_id: '' }, { variant: 'full' }),
      ).toBeNull();
      expect(
        normalizePendingMock({ mock_id: '   ' }, { variant: 'full' }),
      ).toBeNull();
      // Non-finite numbers
      expect(
        normalizePendingMock({ mock_id: NaN }, { variant: 'full' }),
      ).toBeNull();
      // Non-object root
      expect(normalizePendingMock(null, { variant: 'full' })).toBeNull();
      expect(
        normalizePendingMock('garbage', { variant: 'full' }),
      ).toBeNull();
    });

    it('accepts non-numeric string mock ids (route params allow string)', () => {
      // Backend can ship UUID-style or slugged ids — they're still
      // valid because the runner's route param type is `number | string`.
      const p = normalizePendingMock(
        { mock_id: 'abc-123' },
        { variant: 'full' },
      );
      expect(p?.mockId).toBe('abc-123');
    });

    it('synthesizes a title when none is provided', () => {
      const p = normalizePendingMock({ mock_id: 42 }, { variant: 'full' });
      expect(p?.title).toBe('Mock #42');
    });

    it('maps each numeric category code to the correct section', () => {
      const codeToLabel: Array<[number, string]> = [
        [1, 'Speaking'],
        [2, 'Writing'],
        [3, 'Reading'],
        [4, 'Listening'],
        [5, 'Full Mock'],
      ];
      for (const [code, label] of codeToLabel) {
        const p = normalizePendingMock(
          { mock_id: 1, category: code },
          { variant: 'full' },
        );
        expect(p?.category).toBe(label);
      }
    });
  });

  describe('buildSubmitPayload', () => {
    // RN's FormData has no public iteration, so we spy on `append` and
    // collect the args. Multi-value keys (PHP `[]` arrays) need their
    // full history, so we expose both `last(key)` and `all(key)`.
    const captureFormDataAppends = () => {
      const calls: { key: string; value: unknown }[] = [];
      const spy = jest
        .spyOn(FormData.prototype, 'append')
        .mockImplementation((key: string, value: unknown) => {
          calls.push({ key, value });
        });
      const all = (key: string) =>
        calls.filter(c => c.key === key).map(c => c.value);
      const last = (key: string) => all(key).slice(-1)[0];
      return { spy, calls, last, all };
    };

    const makeContext = (
      overrides: Partial<SubmitContext> & {
        draft: AnswerDraft;
        subcategoryId: AnswerSubmission['subcategoryId'];
      },
    ): SubmitContext => {
      const { draft, subcategoryId, ...rest } = overrides;
      return {
        answer: {
          mockId: 9,
          questionId: 42,
          subcategoryId,
          draft,
          submittedAt: 1717200000000,
        },
        questionNumber: 3,
        totalQuestions: 20,
        secondsSpentOnQuestion: 45,
        remainingTotalSeconds: 1800,
        audioScript: null,
        questionText: null,
        correctAnswer: null,
        htmlAnswer: null,
        isPending: false,
        isComplete: false,
        platform: 'android',
        ...rest,
      };
    };

    it('writes the test-state scalars on every submission', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 6,
          draft: { kind: 'writing', text: 'hi' },
        }),
      );
      expect(last('mock_id')).toBe('9');
      expect(last('q_count')).toBe('20');
      expect(last('q_time')).toBe('45');
      expect(last('time')).toBe('1800');
      expect(last('pending')).toBe('0');
      expect(last('complete')).toBe('0');
      expect(last('skip')).toBe('0');
      expect(last('device')).toBe('mobile');
      expect(last('isPlatform')).toBe('android');
      expect(last('question_number')).toBe('3');
      expect(last('curr_q')).toBe('3');
      expect(last('audio_text')).toBe('');
      spy.mockRestore();
    });

    it('always populates the PHP-array identifier keys', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 8,
          draft: { kind: 'mcq-single', selectedId: '7' },
          audioScript: 'The script.',
          correctAnswer: '7',
        }),
      );
      expect(last('id[]')).toBe('42');
      expect(last('type[]')).toBe('8');
      expect(last('response[]')).toBe('true');
      expect(last('script[]')).toBe('The script.');
      expect(last('lang[]')).toBe('');
      // Backend echoes the correct answer into four legacy fields.
      expect(last('answer[]')).toBe('7');
      expect(last('ans[]')).toBe('7');
      expect(last('q_ans[]')).toBe('7');
      expect(last('correct[]')).toBe('7');
      spy.mockRestore();
    });

    it('flips pending/complete flags and zeros curr_q on final submit', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 7,
          draft: { kind: 'writing', text: 'done' },
          isComplete: true,
        }),
      );
      expect(last('pending')).toBe('0');
      expect(last('complete')).toBe('1');
      expect(last('curr_q')).toBe('0');
      spy.mockRestore();
    });

    it('marks a save-and-exit with pending=1', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 6,
          draft: { kind: 'writing', text: 'partial' },
          isPending: true,
        }),
      );
      expect(last('pending')).toBe('1');
      expect(last('complete')).toBe('0');
      spy.mockRestore();
    });

    it('writes writing answers into text_answer[] and length[]', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 7,
          draft: { kind: 'writing', text: 'Today the world is changing fast.' },
        }),
      );
      expect(last('text_answer[]')).toBe('Today the world is changing fast.');
      expect(last('length[]')).toBe('6');
      // Selection-shaped fields stay empty for writing.
      expect(last('selected[]')).toBe('');
      expect(last('duration[]')).toBe('');
      expect(last('html[]')).toBe('');
      spy.mockRestore();
    });

    it('comma-joins mcq-multi into selected[]', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 9,
          draft: { kind: 'mcq-multi', selectedIds: ['a', 'b', 'c'] },
        }),
      );
      expect(last('selected[]')).toBe('a,b,c');
      expect(last('text_answer[]')).toBe('');
      expect(last('length[]')).toBe('');
      spy.mockRestore();
    });

    it('uses the leading-comma interleaved selected[] format for sub 11 (bank)', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 11,
          draft: {
            kind: 'fib-bank',
            values: ['first', null, 'third'],
          },
        }),
      );
      // Backend PHP parser reads odd-indexed positions of the CSV —
      // `,first,,,,third` puts our values at indices 1, 3, 5.
      expect(last('selected[]')).toBe(',first,,,,third');
      // text_answer[] mirrors the same interleaved string.
      expect(last('text_answer[]')).toBe(',first,,,,third');
      spy.mockRestore();
    });

    it('uses the interleaved format for sub 12 (dropdown) too', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 12,
          draft: {
            kind: 'fib-dropdown',
            values: ['alpha', 'beta'],
          },
        }),
      );
      expect(last('selected[]')).toBe(',alpha,,beta');
      expect(last('text_answer[]')).toBe(',alpha,,beta');
      spy.mockRestore();
    });

    it('uses the plain comma-join for sub 16 text-input FIB', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 16,
          draft: {
            kind: 'fib-input',
            values: ['cat', 'dog', 'fish'],
          },
        }),
      );
      expect(last('selected[]')).toBe('cat,dog,fish');
      expect(last('text_answer[]')).toBe('cat,dog,fish');
      spy.mockRestore();
    });

    it('appends file[] and duration[] for speaking answers', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 3,
          draft: {
            kind: 'speaking',
            audioFilePath: '/tmp/answer-42.m4a',
            durationSec: 28,
          },
        }),
      );
      expect(last('duration[]')).toBe('00:28');
      const file = last('file[]') as { uri: string; name: string; type: string };
      expect(file.uri).toBe('/tmp/answer-42.m4a');
      expect(file.name).toBe('answer-42.m4a');
      expect(file.type).toBe('audio/m4a');
      // Non-speaking answer slots stay empty for speaking.
      expect(last('selected[]')).toBe('');
      expect(last('text_answer[]')).toBe('');
      spy.mockRestore();
    });

    it('always appends file[] and text[] even when no recording / no prompt', () => {
      // Regression for backend 500 (`foreach() ... null given`) seen
      // when the user advances a Speaking question before the
      // recording was captured. The PHP controller iterates these
      // keys unconditionally; missing them blew up the request.
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 8,
          draft: { kind: 'mcq-single', selectedId: 'a' },
        }),
      );
      expect(last('file[]')).toBe('');
      expect(last('duration[]')).toBe('');
      expect(last('text[]')).toBe('');
      spy.mockRestore();
    });

    it('appends empty file[] for speaking when no recording was captured', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 2,
          // User advanced before the recorder produced a file —
          // draft.audioFilePath is empty / durationSec is 0.
          draft: {
            kind: 'speaking',
            audioFilePath: '',
            durationSec: 0,
          },
        }),
      );
      expect(last('file[]')).toBe('');
      expect(last('duration[]')).toBe('');
      spy.mockRestore();
    });

    it('echoes questionText into text[] when provided', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 1,
          draft: {
            kind: 'speaking',
            audioFilePath: '/tmp/a.m4a',
            durationSec: 12,
          },
          questionText: 'Read the passage aloud.',
        }),
      );
      expect(last('text[]')).toBe('Read the passage aloud.');
      spy.mockRestore();
    });

    it('writes html[] only when explicitly provided', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 19,
          draft: {
            kind: 'highlight',
            selectedIndices: [3, 5, 7],
            selectedWords: ['stability', 'sustain', 'thrive'],
          },
          htmlAnswer: '<p>foo <mark>bar</mark> baz</p>',
        }),
      );
      expect(last('html[]')).toBe('<p>foo <mark>bar</mark> baz</p>');
      expect(last('selected[]')).toBe('stability,sustain,thrive');
      spy.mockRestore();
    });

    it('writes empty values for the empty draft so the parser never 400s', () => {
      const { spy, last } = captureFormDataAppends();
      buildSubmitPayload(
        makeContext({
          subcategoryId: 1,
          draft: { kind: 'empty' },
        }),
      );
      expect(last('selected[]')).toBe('');
      expect(last('text_answer[]')).toBe('');
      expect(last('length[]')).toBe('');
      expect(last('duration[]')).toBe('');
      expect(last('html[]')).toBe('');
      expect(last('answer[]')).toBe('');
      spy.mockRestore();
    });
  });

  describe('normalizeQuestion', () => {
    it('normalizes a typical describe-image question', () => {
      const result = normalizeQuestion({
        id: 'q1',
        subcategory_id: 3,
        question: 'Describe the image below in detail.',
        media_link: 'https://example.com/img.png',
        title: 'Describe Image',
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('q1');
      expect(result?.subcategory_id).toBe(3);
      expect(result?.kind).toBe('speaking');
      expect(result?.title).toBe('Describe Image');
      expect(result?.prompt).toBe('Describe the image below in detail.');
      // media_link maps into audioUrl in our normalizer; components
      // reach into `raw` for the image when kind is speaking.
      expect(result?.audioUrl).toBe('https://example.com/img.png');
    });

    it('falls back to pivot.question_id when top-level id is missing', () => {
      const result = normalizeQuestion({
        pivot: { question_id: '99', mock_id: '12' },
        subcategory_id: 1,
        question: 'Read aloud the text below.',
      });
      expect(result?.id).toBe('99');
      expect(result?.kind).toBe('speaking');
    });

    it('drops records without an id', () => {
      expect(
        normalizeQuestion({ subcategory_id: 1, question: 'no id here' }),
      ).toBeNull();
    });

    it('drops records with an unknown subcategory_id', () => {
      expect(
        normalizeQuestion({ id: 'q1', subcategory_id: 999, question: 'hi' }),
      ).toBeNull();
    });

    it('drops records with no subcategory at all', () => {
      expect(normalizeQuestion({ id: 'q1', question: 'no sub' })).toBeNull();
    });

    it('coerces string subcategory_ids', () => {
      const result = normalizeQuestion({
        id: 1,
        subcategory_id: '6',
        question: 'Summarize the text in 5-75 words.',
      });
      expect(result?.subcategory_id).toBe(6);
      expect(result?.kind).toBe('writing');
    });

    it('normalizes MCQ options, dropping malformed entries', () => {
      const result = normalizeQuestion({
        id: 'q1',
        subcategory_id: 8,
        question: 'Which is correct?',
        option: [
          { id: 'a', options: 'Option A' },
          { id: 'b', options: 'Option B' },
          { id: 'c' }, // missing text — dropped
          { options: 'Option D' }, // missing id — dropped
          null, // dropped
        ],
      });
      expect(result?.options).toEqual([
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
      ]);
    });

    it('returns null for non-object input', () => {
      expect(normalizeQuestion(null)).toBeNull();
      expect(normalizeQuestion(undefined)).toBeNull();
      expect(normalizeQuestion('not an object')).toBeNull();
    });

    it('preserves the raw payload for downstream debugging', () => {
      const raw = {
        id: 'q1',
        subcategory_id: 1,
        question: 'hi',
        weird_legacy_field: 'still here',
      };
      const result = normalizeQuestion(raw);
      expect(result?.raw).toBe(raw);
    });
  });

  describe('resolveTotalDurationSec', () => {
    it('treats values <= 1000 as minutes', () => {
      expect(resolveTotalDurationSec(30)).toBe(30 * 60);
      expect(resolveTotalDurationSec(180)).toBe(180 * 60);
      expect(resolveTotalDurationSec(1)).toBe(60);
    });

    it('treats values > 1000 as seconds', () => {
      expect(resolveTotalDurationSec(1200)).toBe(1200);
      expect(resolveTotalDurationSec(10800)).toBe(10800); // 3h in seconds
    });

    it('coerces string inputs', () => {
      expect(resolveTotalDurationSec('45')).toBe(45 * 60);
    });

    it('returns 0 for invalid / non-positive inputs', () => {
      expect(resolveTotalDurationSec(0)).toBe(0);
      expect(resolveTotalDurationSec(-5)).toBe(0);
      expect(resolveTotalDurationSec(null)).toBe(0);
      expect(resolveTotalDurationSec('not a number')).toBe(0);
      expect(resolveTotalDurationSec(undefined)).toBe(0);
    });
  });

  describe('normalizeMockTestDetail', () => {
    const ctx = {
      mockId: 'test-1' as const,
      variant: 'extensive' as const,
      category: 'Speaking' as const,
    };

    it('normalizes a typical extensive-mock detail response', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              id: 'test-1',
              title: 'PTE Speaking Extensive',
              question: [
                { id: 'q1', subcategory_id: 1, question: 'Read aloud 1' },
                { id: 'q2', subcategory_id: 2, question: 'Repeat sentence' },
              ],
            },
            total_question: 2,
            curr_q: 0,
            time: 30,
          },
        },
        ctx,
      );
      expect(session).not.toBeNull();
      expect(session?.mockId).toBe('test-1');
      expect(session?.variant).toBe('extensive');
      expect(session?.questions).toHaveLength(2);
      expect(session?.startIndex).toBe(0);
      expect(session?.totalDurationSec).toBe(30 * 60);
    });

    it('honors curr_q for resume scenarios', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                { id: 1, subcategory_id: 1, question: 'A' },
                { id: 2, subcategory_id: 1, question: 'B' },
                { id: 3, subcategory_id: 1, question: 'C' },
              ],
            },
            curr_q: 2,
            time: 30,
          },
        },
        ctx,
      );
      expect(session?.startIndex).toBe(2);
    });

    it('clamps curr_q to the last question index', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                { id: 1, subcategory_id: 1, question: 'A' },
                { id: 2, subcategory_id: 1, question: 'B' },
              ],
            },
            curr_q: 99,
            time: 30,
          },
        },
        ctx,
      );
      expect(session?.startIndex).toBe(1);
    });

    it('accepts the flat shape without data/mock wrappers', () => {
      const session = normalizeMockTestDetail(
        {
          question: [{ id: 'q1', subcategory_id: 1, question: 'Read aloud' }],
          time: 30,
        },
        ctx,
      );
      expect(session?.questions).toHaveLength(1);
    });

    it('drops malformed questions but keeps the session if at least one survives', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                { id: 'q1', subcategory_id: 1, question: 'ok' },
                { subcategory_id: 1, question: 'no id' }, // dropped
                { id: 'q2', subcategory_id: 999, question: 'unknown sub' }, // dropped
                null, // dropped
              ],
            },
            time: 30,
          },
        },
        ctx,
      );
      expect(session?.questions).toHaveLength(1);
      expect(session?.questions[0].id).toBe('q1');
    });

    it('returns null when no questions survive normalization', () => {
      expect(
        normalizeMockTestDetail(
          { data: { mock: { question: [{ subcategory_id: 1 }] } } },
          ctx,
        ),
      ).toBeNull();
    });

    it('returns null for non-object responses', () => {
      expect(normalizeMockTestDetail(null, ctx)).toBeNull();
      expect(normalizeMockTestDetail(undefined, ctx)).toBeNull();
      expect(normalizeMockTestDetail('not an object', ctx)).toBeNull();
    });

    it('returns null when the question array is missing entirely', () => {
      expect(
        normalizeMockTestDetail({ data: { mock: {} } }, ctx),
      ).toBeNull();
    });

    it('captures per-section durations from the mock node', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                { id: 1, subcategory_id: 1, question: 'speaking' },
                { id: 2, subcategory_id: 6, question: 'writing' },
                { id: 3, subcategory_id: 8, question: 'reading' },
                { id: 4, subcategory_id: 13, question: 'listening' },
              ],
              speaking_time: 35,
              writting_time: 25, // legacy spelling
              reading_time: 30,
              listening_time: 38,
            },
            time: 128,
          },
        },
        ctx,
      );
      expect(session?.sectionDurationsSec).toEqual({
        Speaking: 35 * 60,
        Writing: 25 * 60,
        Reading: 30 * 60,
        Listening: 38 * 60,
      });
    });

    it('falls back to the modern writing_time spelling when writting_time is absent', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [{ id: 1, subcategory_id: 6, question: 'w' }],
              writing_time: 20,
            },
            time: 20,
          },
        },
        ctx,
      );
      expect(session?.sectionDurationsSec).toEqual({ Writing: 20 * 60 });
    });

    it('pre-parses fib structure for sub 11 (bank mode, flattened pool)', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                {
                  id: 'q11',
                  subcategory_id: 11,
                  question:
                    'Climate change is a __add_blank__ issue requiring __add_blank__ action.',
                  option: [
                    { id: 'b1', options: 'serious, minor, fake' },
                    { id: 'b2', options: 'immediate, delayed, no' },
                  ],
                },
              ],
            },
            time: 30,
          },
        },
        ctx,
      );
      const q = session?.questions[0];
      expect(q?.kind).toBe('fib-bank');
      expect(q?.fib?.parts).toEqual([
        'Climate change is a ',
        ' issue requiring ',
        ' action.',
      ]);
      // Bank mode: blanks carry only ids, choices live in the
      // shared bank instead.
      expect(q?.fib?.blanks).toEqual([{ id: 'b1' }, { id: 'b2' }]);
      expect(q?.fib?.bank).toEqual([
        'serious',
        'minor',
        'fake',
        'immediate',
        'delayed',
        'no',
      ]);
    });

    it('pre-parses fib structure for sub 12 (dropdown mode, per-blank choices)', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                {
                  id: 'q12',
                  subcategory_id: 12,
                  question: 'The __add_blank__ runs __add_blank__.',
                  option: [
                    { id: 'b1', options: 'cat, dog' },
                    { id: 'b2', options: 'fast, slow' },
                  ],
                },
              ],
            },
            time: 30,
          },
        },
        ctx,
      );
      const q = session?.questions[0];
      expect(q?.kind).toBe('fib-dropdown');
      expect(q?.fib?.blanks).toEqual([
        { id: 'b1', choices: ['cat', 'dog'] },
        { id: 'b2', choices: ['fast', 'slow'] },
      ]);
      expect(q?.fib?.bank).toBeUndefined();
    });

    it('pre-parses fib structure for sub 16 input FIB without choices', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                {
                  id: 'q16',
                  subcategory_id: 16,
                  question: 'The cat sat on the __add_blank__ mat.',
                  option: [{ id: 'b1' }],
                },
              ],
            },
            time: 30,
          },
        },
        ctx,
      );
      const q = session?.questions[0];
      expect(q?.fib?.parts).toEqual(['The cat sat on the ', ' mat.']);
      expect(q?.fib?.blanks).toEqual([{ id: 'b1' }]);
      expect(q?.fib?.blanks[0].choices).toBeUndefined();
    });

    it('leaves fib undefined for non-FIB subcategories', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                { id: 'q1', subcategory_id: 1, question: 'Read aloud the text.' },
              ],
            },
            time: 30,
          },
        },
        ctx,
      );
      expect(session?.questions[0].fib).toBeUndefined();
    });

    it('captures the raw answer markup for highlight questions', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [
                {
                  id: 'q19',
                  subcategory_id: 19,
                  question: 'Listen and identify the wrong words.',
                  answer:
                    "The stability,<span id='cAns'>sustainability</span> of...",
                },
              ],
            },
            time: 30,
          },
        },
        ctx,
      );
      expect(session?.questions[0].answerMarkup).toBe(
        "The stability,<span id='cAns'>sustainability</span> of...",
      );
    });

    it('omits sections whose duration is zero or missing', () => {
      const session = normalizeMockTestDetail(
        {
          data: {
            mock: {
              question: [{ id: 1, subcategory_id: 1, question: 'a' }],
              speaking_time: 35,
              writting_time: 0,
            },
            time: 35,
          },
        },
        ctx,
      );
      expect(session?.sectionDurationsSec).toEqual({ Speaking: 35 * 60 });
    });
  });

  describe('shouldOfferOptionalBreak', () => {
    it('exposes the PTE-standard 10-minute (600s) break duration', () => {
      expect(OPTIONAL_LISTENING_BREAK_SEC).toBe(600);
    });

    it('returns true only for Reading → Listening in a Full Mock', () => {
      expect(shouldOfferOptionalBreak('Reading', 'Listening', 'full')).toBe(true);
    });

    it('returns false for every other Full Mock section transition', () => {
      expect(shouldOfferOptionalBreak('Speaking', 'Writing', 'full')).toBe(false);
      expect(shouldOfferOptionalBreak('Writing', 'Reading', 'full')).toBe(false);
      // Defensive: an unexpected reverse-direction transition shouldn't
      // accidentally surface the break overlay either.
      expect(shouldOfferOptionalBreak('Listening', 'Reading', 'full')).toBe(false);
    });

    it('never offers the break in an Extensive mock variant', () => {
      // Sectional mocks ("extensive" in this codebase) shouldn't see
      // the listening break because they only ever contain one
      // section — the section-break overlay itself never renders.
      // Belt-and-suspenders here in case a future extensive variant
      // happens to chain Reading + Listening.
      expect(shouldOfferOptionalBreak('Reading', 'Listening', 'extensive')).toBe(
        false,
      );
    });
  });

  // FormData has no public iteration so we spy on `append` and collect
  // the args — same pattern as the buildSubmitPayload suite above.
  const captureBulkAppends = () => {
    const calls: { key: string; value: unknown }[] = [];
    const spy = jest
      .spyOn(FormData.prototype, 'append')
      .mockImplementation((key: string, value: unknown) => {
        calls.push({ key, value });
      });
    const all = (key: string): string[] =>
      calls.filter(c => c.key === key).map(c => String(c.value));
    const last = (key: string): string | undefined => all(key).at(-1);
    return { spy, all, last };
  };

  describe('buildRemainingQuesPayload', () => {
    it('builds the expected scalar fields for a single skipped question', () => {
      const { spy, last } = captureBulkAppends();
      buildRemainingQuesPayload({
        mockId: 42,
        questionIds: [101],
        remainingTotalSeconds: 90,
      });
      expect(last('mock_id')).toBe('42');
      expect(last('skip')).toBe('1');
      expect(last('time')).toBe('90');
      expect(last('id[]')).toBe('101');
      spy.mockRestore();
    });

    it('emits one id[] entry per skipped question in input order', () => {
      const { spy, all, last } = captureBulkAppends();
      buildRemainingQuesPayload({
        mockId: 'mock-7',
        questionIds: [3, '4b', 5],
        remainingTotalSeconds: 0,
      });
      expect(all('id[]')).toEqual(['3', '4b', '5']);
      expect(last('mock_id')).toBe('mock-7');
      spy.mockRestore();
    });

    it('coerces non-integer / negative seconds to a non-negative integer', () => {
      const { spy: spy1, last: last1 } = captureBulkAppends();
      buildRemainingQuesPayload({
        mockId: 1,
        questionIds: [1],
        remainingTotalSeconds: -12.7,
      });
      expect(last1('time')).toBe('0');
      spy1.mockRestore();

      const { spy: spy2, last: last2 } = captureBulkAppends();
      buildRemainingQuesPayload({
        mockId: 1,
        questionIds: [1],
        remainingTotalSeconds: 30.9,
      });
      expect(last2('time')).toBe('30');
      spy2.mockRestore();
    });

    it('accepts an empty id list (caller decides whether to send)', () => {
      const { spy, all, last } = captureBulkAppends();
      buildRemainingQuesPayload({
        mockId: 1,
        questionIds: [],
        remainingTotalSeconds: 0,
      });
      expect(all('id[]')).toEqual([]);
      expect(last('mock_id')).toBe('1');
      spy.mockRestore();
    });
  });

  describe('buildFinalMockClosePayload', () => {
    it('contains only mock_id with a numeric mockId', () => {
      const { spy, all, last } = captureBulkAppends();
      buildFinalMockClosePayload(99);
      expect(last('mock_id')).toBe('99');
      // No other keys are emitted — the close signal is intentionally
      // minimal. The legacy backend pulls everything else from the
      // previously-submitted answers.
      expect(all('mock_id')).toHaveLength(1);
      spy.mockRestore();
    });

    it('stringifies string mock ids unchanged', () => {
      const { spy, last } = captureBulkAppends();
      buildFinalMockClosePayload('m-abc');
      expect(last('mock_id')).toBe('m-abc');
      spy.mockRestore();
    });
  });
});

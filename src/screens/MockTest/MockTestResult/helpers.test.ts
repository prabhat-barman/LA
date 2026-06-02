import {
  coerceScore,
  describeScoreBand,
  normalizeMockResult,
  normalizePastMock,
} from './helpers';

describe('coerceScore', () => {
  it('passes finite numbers through', () => {
    expect(coerceScore(65)).toBe(65);
    expect(coerceScore(0)).toBe(0);
    expect(coerceScore(-3)).toBe(-3);
  });

  it('parses numeric strings and trims whitespace', () => {
    expect(coerceScore('65')).toBe(65);
    expect(coerceScore('  65.5  ')).toBe(65.5);
  });

  it('handles "n/d" style strings by taking the numerator', () => {
    expect(coerceScore('65/90')).toBe(65);
  });

  it('returns null for unparseable strings, empty strings, and bad shapes', () => {
    expect(coerceScore('')).toBeNull();
    expect(coerceScore('   ')).toBeNull();
    expect(coerceScore('expert')).toBeNull();
    expect(coerceScore(NaN)).toBeNull();
    expect(coerceScore(Infinity)).toBeNull();
    expect(coerceScore(null)).toBeNull();
    expect(coerceScore(undefined)).toBeNull();
    expect(coerceScore({})).toBeNull();
    expect(coerceScore([])).toBeNull();
  });

  it('unwraps common score wrapper objects', () => {
    expect(coerceScore({ score: 65, out_of: 90 })).toBe(65);
    expect(coerceScore({ value: 72 })).toBe(72);
    expect(coerceScore({ total: 80 })).toBe(80);
    expect(coerceScore({ band: 65 })).toBe(65);
  });

  it('returns null for self-referential or empty wrapper objects', () => {
    // Defensive — avoid infinite recursion if a backend ever ships
    // `{ score: { score: { score: ... } } }`. The inline depth
    // handler caps at one level of unwrap.
    expect(coerceScore({ score: 'not a number' })).toBeNull();
    expect(coerceScore({ unrelated: 5 })).toBeNull();
  });
});

describe('describeScoreBand', () => {
  it('returns Pending for null', () => {
    expect(describeScoreBand(null)).toBe('Pending');
  });

  it('maps PTE band thresholds correctly', () => {
    expect(describeScoreBand(85)).toBe('Expert');
    expect(describeScoreBand(79)).toBe('Expert');
    expect(describeScoreBand(78)).toBe('Very Good');
    expect(describeScoreBand(65)).toBe('Very Good');
    expect(describeScoreBand(64)).toBe('Good');
    expect(describeScoreBand(50)).toBe('Good');
    expect(describeScoreBand(49)).toBe('Modest');
    expect(describeScoreBand(36)).toBe('Modest');
    expect(describeScoreBand(35)).toBe('Limited');
    expect(describeScoreBand(10)).toBe('Limited');
  });
});

describe('normalizeMockResult', () => {
  const ctx = {
    mockId: 123,
    variant: 'full' as const,
    category: 'Full Mock' as const,
  };

  it('extracts overall + section + enabling skill scores from canonical fields', () => {
    const result = normalizeMockResult(
      {
        overall_score: 65,
        speaking_score: 70,
        writing_score: 60,
        reading_score: 75,
        listening_score: 55,
        grammar: 80,
        oral_fluency: 72,
        pronunciation: 68,
        spelling: 85,
        vocabulary: 77,
        written_discourse: 65,
        total_questions: 30,
        attempted: 28,
        title: 'My Mock Test',
      },
      ctx,
    );

    expect(result.overall).toBe(65);
    expect(result.sections).toEqual([
      { section: 'Speaking', score: 70, rawPercentage: undefined },
      { section: 'Writing', score: 60, rawPercentage: undefined },
      { section: 'Reading', score: 75, rawPercentage: undefined },
      { section: 'Listening', score: 55, rawPercentage: undefined },
    ]);
    expect(result.enablingSkills).toEqual([
      { name: 'Grammar', score: 80 },
      { name: 'Oral Fluency', score: 72 },
      { name: 'Pronunciation', score: 68 },
      { name: 'Spelling', score: 85 },
      { name: 'Vocabulary', score: 77 },
      { name: 'Written Discourse', score: 65 },
    ]);
    expect(result.totalQuestions).toBe(30);
    expect(result.attemptedQuestions).toBe(28);
    expect(result.title).toBe('My Mock Test');
  });

  it('unwraps a common { result: { ... } } envelope', () => {
    const result = normalizeMockResult(
      {
        status: 'ok',
        result: { overall_score: 72, speaking_score: 75 },
      },
      ctx,
    );
    expect(result.overall).toBe(72);
    expect(result.sections.find(s => s.section === 'Speaking')?.score).toBe(75);
  });

  it('unwraps a { data: [ { ... } ] } envelope', () => {
    const result = normalizeMockResult(
      { data: [{ overall_score: 60 }] },
      ctx,
    );
    expect(result.overall).toBe(60);
  });

  it('rescales 0-1 percentage style scores into the PTE 10-90 band', () => {
    // A score of 0.72 means 72% which should map to 10 + 0.72*(90-10) = ~68.
    const result = normalizeMockResult({ overall_score: 0.72 }, ctx);
    expect(result.overall).toBe(68);
  });

  it('clamps scores that overshoot the PTE band', () => {
    const result = normalizeMockResult(
      { overall_score: 95, speaking_score: 105, writing_score: 5 },
      ctx,
    );
    expect(result.overall).toBe(90);
    expect(result.sections.find(s => s.section === 'Speaking')?.score).toBe(90);
    // 5 sits in the 1..10 ambiguous range — we clamp UP to the PTE
    // floor (10), matching the "PTE doesn't go below 10" contract.
    expect(result.sections.find(s => s.section === 'Writing')?.score).toBe(10);
  });

  it('returns the pending shell when payload is null/empty/junk', () => {
    expect(normalizeMockResult(null, ctx).overall).toBeNull();
    expect(normalizeMockResult(undefined, ctx).overall).toBeNull();
    expect(normalizeMockResult({}, ctx).overall).toBeNull();
    expect(normalizeMockResult('garbage', ctx).overall).toBeNull();
    // Pending shell still has the right shape for Full Mock — 4
    // section entries with `score: null` so the UI renders cards.
    const shell = normalizeMockResult({}, ctx);
    expect(shell.sections).toHaveLength(4);
    expect(shell.sections.every(s => s.score === null)).toBe(true);
    expect(shell.enablingSkills).toEqual([]);
  });

  it('returns a 1-entry sections array for a sectional mock', () => {
    const result = normalizeMockResult(
      { overall_score: 70, speaking_score: 75 },
      { mockId: 9, variant: 'extensive', category: 'Speaking' },
    );
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]).toEqual({
      section: 'Speaking',
      score: 75,
      rawPercentage: undefined,
    });
  });

  it('falls back to fallbackTitle, then to a composed default', () => {
    const fromBackend = normalizeMockResult({ title: 'Backend Title' }, ctx);
    expect(fromBackend.title).toBe('Backend Title');

    const fromFallback = normalizeMockResult(
      {},
      { ...ctx, fallbackTitle: 'Route Title' },
    );
    expect(fromFallback.title).toBe('Route Title');

    const composed = normalizeMockResult({}, ctx);
    expect(composed.title).toBe('Full Mock #123');

    const composedSectional = normalizeMockResult(
      {},
      { mockId: 7, variant: 'extensive', category: 'Reading' },
    );
    expect(composedSectional.title).toBe('Reading Mock #7');
  });

  it('parses common timestamp shapes into ISO', () => {
    const isoIn = normalizeMockResult(
      { submitted_at: '2025-06-01T10:30:00Z' },
      ctx,
    );
    expect(isoIn.submittedAtIso).toBe('2025-06-01T10:30:00.000Z');

    const msIn = normalizeMockResult({ completed_at: 1717238400000 }, ctx);
    expect(msIn.submittedAtIso).toBe(new Date(1717238400000).toISOString());

    const secIn = normalizeMockResult({ created_at: 1717238400 }, ctx);
    expect(secIn.submittedAtIso).toBe(new Date(1717238400000).toISOString());

    const bad = normalizeMockResult({ date: 'not a date' }, ctx);
    expect(bad.submittedAtIso).toBeNull();
  });

  it('preserves the original payload in `raw` for debug inspection', () => {
    const input = { overall_score: 65, custom_field: 'xyz' };
    const result = normalizeMockResult(input, ctx);
    expect(result.raw).toBe(input);
  });

  it('accepts alternate field-name spellings for the same score', () => {
    // Camel-case variant
    const camel = normalizeMockResult({ speakingScore: 70 }, ctx);
    expect(camel.sections.find(s => s.section === 'Speaking')?.score).toBe(70);

    // "communicative_*" variant used by some PTE backends
    const comm = normalizeMockResult(
      { communicative_reading: 80, communicative_listening: 60 },
      ctx,
    );
    expect(comm.sections.find(s => s.section === 'Reading')?.score).toBe(80);
    expect(comm.sections.find(s => s.section === 'Listening')?.score).toBe(60);

    // "fluency" alias maps to "Oral Fluency" enabling skill
    const fluency = normalizeMockResult({ fluency: 75 }, ctx);
    expect(
      fluency.enablingSkills.find(s => s.name === 'Oral Fluency')?.score,
    ).toBe(75);
  });

  it('only includes enabling skills the backend actually surfaced', () => {
    const result = normalizeMockResult({ grammar: 80, vocabulary: 70 }, ctx);
    expect(result.enablingSkills).toEqual([
      { name: 'Grammar', score: 80 },
      { name: 'Vocabulary', score: 70 },
    ]);
    // No null-padded rows for the other 4 skills.
    expect(result.enablingSkills).toHaveLength(2);
  });
});

describe('normalizePastMock', () => {
  const fullCtx = { variant: 'full' as const };
  const extensiveCtx = { variant: 'extensive' as const };

  it('returns null when the entry is not a plain object', () => {
    expect(normalizePastMock(null, fullCtx)).toBeNull();
    expect(normalizePastMock(undefined, fullCtx)).toBeNull();
    expect(normalizePastMock('garbage', fullCtx)).toBeNull();
    expect(normalizePastMock(42, fullCtx)).toBeNull();
    expect(normalizePastMock(['array'], fullCtx)).toBeNull();
  });

  it('returns null when no mockId can be salvaged', () => {
    expect(normalizePastMock({}, fullCtx)).toBeNull();
    expect(normalizePastMock({ title: 'No id here' }, fullCtx)).toBeNull();
    expect(normalizePastMock({ mock_id: '' }, fullCtx)).toBeNull();
    expect(normalizePastMock({ mock_id: '   ' }, fullCtx)).toBeNull();
    expect(normalizePastMock({ mock_id: null }, fullCtx)).toBeNull();
    expect(normalizePastMock({ mock_id: NaN }, fullCtx)).toBeNull();
  });

  it('accepts numeric and non-numeric string mock ids', () => {
    const numeric = normalizePastMock({ mock_id: 42 }, fullCtx);
    expect(numeric?.mockId).toBe(42);

    const numericString = normalizePastMock({ mock_id: '7' }, fullCtx);
    expect(numericString?.mockId).toBe('7');

    const slugId = normalizePastMock({ mock_id: 'abc-9' }, fullCtx);
    expect(slugId?.mockId).toBe('abc-9');
  });

  it('walks the mock-id field aliases in order', () => {
    expect(normalizePastMock({ id: 5 }, fullCtx)?.mockId).toBe(5);
    expect(normalizePastMock({ mockId: 6 }, fullCtx)?.mockId).toBe(6);
    expect(normalizePastMock({ test_id: 8 }, fullCtx)?.mockId).toBe(8);
    expect(normalizePastMock({ mock: 9 }, fullCtx)?.mockId).toBe(9);
  });

  it('maps numeric category codes to labels', () => {
    expect(
      normalizePastMock({ mock_id: 1, category: 1 }, fullCtx)?.category,
    ).toBe('Speaking');
    expect(
      normalizePastMock({ mock_id: 1, category: 2 }, fullCtx)?.category,
    ).toBe('Writing');
    expect(
      normalizePastMock({ mock_id: 1, category: 3 }, fullCtx)?.category,
    ).toBe('Reading');
    expect(
      normalizePastMock({ mock_id: 1, category: 4 }, fullCtx)?.category,
    ).toBe('Listening');
    expect(
      normalizePastMock({ mock_id: 1, category: 5 }, fullCtx)?.category,
    ).toBe('Full Mock');
  });

  it('accepts label strings for category', () => {
    expect(
      normalizePastMock({ mock_id: 1, category: 'Speaking' }, fullCtx)
        ?.category,
    ).toBe('Speaking');
    expect(
      normalizePastMock({ mock_id: 1, category: '  Listening  ' }, fullCtx)
        ?.category,
    ).toBe('Listening');
  });

  it('falls back to Full Mock for unknown/missing categories', () => {
    expect(
      normalizePastMock({ mock_id: 1, category: 99 }, fullCtx)?.category,
    ).toBe('Full Mock');
    expect(
      normalizePastMock({ mock_id: 1, category: 'Bogus' }, fullCtx)?.category,
    ).toBe('Full Mock');
    expect(
      normalizePastMock({ mock_id: 1 }, fullCtx)?.category,
    ).toBe('Full Mock');
  });

  it('walks alternate category field names (cat / section / type)', () => {
    expect(
      normalizePastMock({ mock_id: 1, cat: 2 }, fullCtx)?.category,
    ).toBe('Writing');
    expect(
      normalizePastMock({ mock_id: 1, section: 'Reading' }, fullCtx)?.category,
    ).toBe('Reading');
  });

  it('extracts and PTE-bands the overall score', () => {
    expect(normalizePastMock({ mock_id: 1, overall_score: 65 }, fullCtx)?.overall)
      .toBe(65);
    // Percentage in 0-1 range gets rescaled into the PTE band.
    expect(normalizePastMock({ mock_id: 1, score_percent: 0.72 }, fullCtx)?.overall)
      .toBe(68);
    // Overshoots clamp to 90.
    expect(normalizePastMock({ mock_id: 1, score: 99 }, fullCtx)?.overall).toBe(90);
  });

  it('returns null overall when no score field is present', () => {
    expect(normalizePastMock({ mock_id: 1 }, fullCtx)?.overall).toBeNull();
    expect(normalizePastMock({ mock_id: 1, title: 'just a title' }, fullCtx)?.overall)
      .toBeNull();
  });

  it('parses common timestamp shapes into ISO', () => {
    const iso = normalizePastMock(
      { mock_id: 1, submitted_at: '2025-06-01T10:30:00Z' },
      fullCtx,
    );
    expect(iso?.submittedAtIso).toBe('2025-06-01T10:30:00.000Z');

    const ms = normalizePastMock(
      { mock_id: 1, completed_at: 1717238400000 },
      fullCtx,
    );
    expect(ms?.submittedAtIso).toBe(new Date(1717238400000).toISOString());

    const sec = normalizePastMock(
      { mock_id: 1, created_at: 1717238400 },
      fullCtx,
    );
    expect(sec?.submittedAtIso).toBe(new Date(1717238400000).toISOString());

    expect(
      normalizePastMock({ mock_id: 1, date: 'rubbish' }, fullCtx)
        ?.submittedAtIso,
    ).toBeNull();
  });

  it('uses backend-provided title when available', () => {
    expect(
      normalizePastMock({ mock_id: 1, title: 'My Title' }, fullCtx)?.title,
    ).toBe('My Title');
  });

  it('composes a default title from variant + category for Full Mock', () => {
    expect(
      normalizePastMock({ mock_id: 7, category: 5 }, fullCtx)?.title,
    ).toBe('Full Mock #7');
    expect(
      normalizePastMock({ mock_id: 7, category: 5 }, extensiveCtx)?.title,
    ).toBe('Extensive Mock #7');
  });

  it('composes a default title from category for sectional mocks', () => {
    expect(
      normalizePastMock({ mock_id: 12, category: 1 }, fullCtx)?.title,
    ).toBe('Speaking Mock #12');
    expect(
      normalizePastMock({ mock_id: 12, category: 4 }, extensiveCtx)?.title,
    ).toBe('Listening Mock #12');
  });

  it('carries the variant verbatim from the context onto the output', () => {
    expect(normalizePastMock({ mock_id: 1 }, fullCtx)?.variant).toBe('full');
    expect(normalizePastMock({ mock_id: 1 }, extensiveCtx)?.variant).toBe(
      'extensive',
    );
  });

  it('preserves the original raw entry for downstream debugging', () => {
    const raw = { mock_id: 1, custom_field: 'xyz' };
    const result = normalizePastMock(raw, fullCtx);
    expect(result?.raw).toBe(raw);
  });

  describe('sectionScores (Phase 6.1)', () => {
    it('extracts every section score from a Full Mock list entry', () => {
      const result = normalizePastMock(
        {
          mock_id: 1,
          category: 5,
          overall_score: 70,
          speaking_score: 75,
          writing_score: 65,
          reading_score: 80,
          listening_score: 60,
        },
        fullCtx,
      );
      expect(result?.sectionScores).toEqual({
        Speaking: 75,
        Writing: 65,
        Reading: 80,
        Listening: 60,
      });
    });

    it('omits sections whose backend field is missing on a Full Mock', () => {
      // Realistic — older API versions ship only some sections.
      const result = normalizePastMock(
        {
          mock_id: 1,
          category: 5,
          overall_score: 70,
          speaking_score: 75,
          // no writing / reading / listening
        },
        fullCtx,
      );
      expect(result?.sectionScores).toEqual({ Speaking: 75 });
    });

    it('mirrors overall into the matching section for a sectional mock', () => {
      // Extensive Speaking mock — overall IS the speaking score.
      // Other sections should stay omitted so they don't pollute
      // section averages elsewhere.
      const result = normalizePastMock(
        { mock_id: 1, category: 1, overall_score: 72 },
        extensiveCtx,
      );
      expect(result?.sectionScores).toEqual({ Speaking: 72 });
    });

    it('omits sectional section when overall is null (pending grading)', () => {
      const result = normalizePastMock(
        { mock_id: 1, category: 1 /* no overall_score */ },
        extensiveCtx,
      );
      expect(result?.sectionScores).toEqual({});
    });

    it('returns an empty sectionScores map when no section fields are present', () => {
      const result = normalizePastMock(
        { mock_id: 1, category: 5, overall_score: 70 },
        fullCtx,
      );
      expect(result?.sectionScores).toEqual({});
    });

    it('clamps section scores into the PTE band (10..90)', () => {
      const result = normalizePastMock(
        {
          mock_id: 1,
          category: 5,
          overall_score: 70,
          speaking_score: 105, // out of band — should clamp to 90
          writing_score: 2,    // out of band — should clamp to 10
        },
        fullCtx,
      );
      expect(result?.sectionScores.Speaking).toBe(90);
      expect(result?.sectionScores.Writing).toBe(10);
    });

    it('accepts camelCase aliases for section fields', () => {
      const result = normalizePastMock(
        {
          mock_id: 1,
          category: 5,
          overall_score: 70,
          speakingScore: 75,
          writingScore: 65,
        },
        fullCtx,
      );
      expect(result?.sectionScores.Speaking).toBe(75);
      expect(result?.sectionScores.Writing).toBe(65);
    });
  });
});

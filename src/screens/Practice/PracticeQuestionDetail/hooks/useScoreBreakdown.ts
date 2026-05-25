import { useMemo } from 'react';
import { logger } from '../../../../services/logger';
import { ensureArray, getCategoryDetails, resolveSubscore } from '../helpers';
import type { ScoreResult } from '../types';
import type { CategoryDetail } from '../constants';

export interface ResolvedSubscore {
  name: string;
  score: any;
  max: number;
  description: string;
  icon: CategoryDetail['icon'];
  color: string;
  remarks: string[];
}

export interface OverallRawAndMax {
  score: number;
  max: number;
}

export interface ScoreBreakdown {
  wordsListToShow: any[];
  overallRawAndMax: OverallRawAndMax;
  overallPercentage: number;
  resolvedSubscores: ResolvedSubscore[];
}

// Bundles all score-modal derived state into one hook so the parent screen
// doesn't need to thread 4 useMemos through props.
export const useScoreBreakdown = (
  scoreResult: ScoreResult | null,
  questionText: string,
): ScoreBreakdown => {
  const wordsListToShow = useMemo<any[]>(() => {
    if (scoreResult?.new_html && typeof scoreResult.new_html === 'string') {
      try {
        const parsed = JSON.parse(scoreResult.new_html);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        logger.warn('Failed to parse new_html', e);
      }
    }
    if (scoreResult?.words && Array.isArray(scoreResult.words)) {
      return scoreResult.words;
    }
    if (scoreResult?.word_details && Array.isArray(scoreResult.word_details)) {
      return scoreResult.word_details;
    }
    const textToSplit = questionText || '';
    return textToSplit.split(/\s+/).map(w => ({ word: w }));
  }, [scoreResult, questionText]);

  const overallRawAndMax = useMemo<OverallRawAndMax>(() => {
    if (!scoreResult) return { score: 0, max: 90 };

    const overallObj = scoreResult.overall;
    let score = 0;
    let max = 90;

    if (overallObj && typeof overallObj === 'object') {
      score = Number(overallObj.score ?? overallObj.score_percent ?? 0);
      max = Number(overallObj.out_of ?? overallObj.from ?? overallObj.max ?? 90);
    } else {
      const rawScore =
        scoreResult.score_percent ??
        scoreResult.percentage ??
        scoreResult.overall_score ??
        scoreResult.score ??
        0;
      score = Number(rawScore);
      max = Number(scoreResult.total_score ?? 90);
    }

    if (score > 0 && score <= 1) {
      score = Math.round(score * 90);
    }

    return { score: Math.round(score), max: Math.round(max) };
  }, [scoreResult]);

  const overallPercentage = useMemo(() => {
    const { score, max } = overallRawAndMax;
    if (max <= 0) return 0;
    return Math.round((score / max) * 100);
  }, [overallRawAndMax]);

  const resolvedSubscores = useMemo<ResolvedSubscore[]>(() => {
    if (!scoreResult) return [];

    const buildCategory = (
      name: string,
      scoreVal: any,
      maxVal?: number,
    ): ResolvedSubscore => {
      const details = getCategoryDetails(name);
      const score = resolveSubscore(scoreVal);
      const max =
        maxVal ??
        (name.toLowerCase().includes('content')
          ? 6
          : name.toLowerCase().includes('fluency') ||
            name.toLowerCase().includes('pronunciation')
          ? 90
          : 2);

      const norm = name.toLowerCase().trim();
      let customRemarks: string[] | undefined;

      const possibleRemarksKeys = [
        `${norm}_remarks`,
        `${norm}_feedback`,
        `${norm}_bullets`,
        `${norm}_points`,
        `${norm}`,
      ];

      for (const k of possibleRemarksKeys) {
        const val = (scoreResult as any)[k];
        if (val && k !== norm) {
          const arr = ensureArray(val);
          if (arr.length > 0) {
            customRemarks = arr;
            break;
          }
        }
      }

      return {
        name,
        score,
        max,
        description: details.description,
        icon: details.icon,
        color: details.color,
        remarks:
          customRemarks && customRemarks.length > 0
            ? customRemarks
            : details.defaultRemarks,
      };
    };

    if (scoreResult.new_format && Array.isArray(scoreResult.new_format)) {
      return scoreResult.new_format.map((item: any) => {
        const name = item.name ?? item.title ?? 'Subscore';
        const score = item.score ?? 0;
        const max = item.out_of ?? item.max ?? item.from ?? 2;
        const details = getCategoryDetails(name);
        const remarks = Array.isArray(item.remarks)
          ? item.remarks
          : item.remarks
          ? [item.remarks]
          : details.defaultRemarks;
        return {
          name,
          score,
          max,
          description: item.description ?? details.description,
          icon: details.icon,
          color: details.color,
          remarks,
        };
      });
    }

    if (scoreResult.new_format && typeof scoreResult.new_format === 'object') {
      return Object.entries(scoreResult.new_format).map(
        ([key, val]: [string, any]) => {
          const name = key.charAt(0).toUpperCase() + key.slice(1);
          const score = typeof val === 'object' ? val.score ?? 0 : Number(val);
          const max =
            typeof val === 'object' ? val.out_of ?? val.max ?? val.from ?? 2 : 2;
          const details = getCategoryDetails(name);
          const remarks =
            typeof val === 'object' && Array.isArray(val.remarks)
              ? val.remarks
              : typeof val === 'object' && val.remarks
              ? [val.remarks]
              : details.defaultRemarks;
          return {
            name,
            score,
            max,
            description:
              typeof val === 'object' ? val.description ?? details.description : details.description,
            icon: details.icon,
            color: details.color,
            remarks,
          };
        },
      );
    }

    if (scoreResult.score && Array.isArray(scoreResult.score)) {
      return scoreResult.score.map((item: any) => {
        const name =
          item.name ??
          item.title ??
          (item.type === 0
            ? 'Content'
            : item.type === 1
            ? 'Fluency'
            : item.type === 2
            ? 'Pronunciation'
            : 'Subscore');
        const score = item.score ?? 0;
        const max = item.from ?? item.out_of ?? item.max ?? 90;
        const details = getCategoryDetails(name);
        const remarks = Array.isArray(item.remarks)
          ? item.remarks
          : item.remarks
          ? [item.remarks]
          : details.defaultRemarks;
        return {
          name,
          score,
          max,
          description: item.description ?? details.description,
          icon: details.icon,
          color: details.color,
          remarks,
        };
      });
    }

    const list: ResolvedSubscore[] = [];
    const fields = [
      { key: 'content', label: 'Content', max: 6 },
      { key: 'fluency', label: 'Fluency', max: 90 },
      { key: 'pronunciation', label: 'Pronunciation', max: 90 },
      { key: 'grammar', label: 'Grammar', max: 2 },
      { key: 'form', label: 'Form', max: 2 },
      { key: 'vocabulary', label: 'Vocabulary', max: 2 },
      { key: 'linguistic_range', label: 'Linguistic Range', max: 6 },
      { key: 'spelling', label: 'Spelling', max: 2 },
      { key: 'structure', label: 'Structure', max: 6 },
    ];

    for (const f of fields) {
      const scoreVal =
        (scoreResult as any)[`${f.key}_score`] ?? (scoreResult as any)[f.key];
      if (scoreVal !== undefined && scoreVal !== null) {
        list.push(buildCategory(f.label, scoreVal, f.max));
      }
    }

    if (list.length === 0) {
      const overallVal =
        scoreResult.overall_score ??
        scoreResult.score_percent ??
        scoreResult.score ??
        0;
      list.push(buildCategory('Content', overallVal, 90));
    }

    return list;
  }, [scoreResult]);

  return { wordsListToShow, overallRawAndMax, overallPercentage, resolvedSubscores };
};

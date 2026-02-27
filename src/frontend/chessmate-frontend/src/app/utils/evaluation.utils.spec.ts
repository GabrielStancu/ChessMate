import {
  clampCentipawn,
  toWhiteRelativeCp,
  buildEvaluationTimeline,
  formatEvalDisplay,
  evalToBarPercent,
  EVAL_CLAMP_CP
} from './evaluation.utils';
import { ClassifiedMove } from '../models/classification.models';

describe('evaluation.utils', () => {
  describe('clampCentipawn', () => {
    it('should return 0 for 0', () => {
      expect(clampCentipawn(0)).toBe(0);
    });

    it('should clamp positive values to EVAL_CLAMP_CP', () => {
      expect(clampCentipawn(2000)).toBe(EVAL_CLAMP_CP);
    });

    it('should clamp negative values to -EVAL_CLAMP_CP', () => {
      expect(clampCentipawn(-2000)).toBe(-EVAL_CLAMP_CP);
    });

    it('should clamp mate score (+10000) to EVAL_CLAMP_CP', () => {
      expect(clampCentipawn(10_000)).toBe(EVAL_CLAMP_CP);
    });

    it('should clamp mate score (-10000) to -EVAL_CLAMP_CP', () => {
      expect(clampCentipawn(-10_000)).toBe(-EVAL_CLAMP_CP);
    });

    it('should pass through values within range', () => {
      expect(clampCentipawn(500)).toBe(500);
      expect(clampCentipawn(-300)).toBe(-300);
    });
  });

  describe('toWhiteRelativeCp', () => {
    it('should return cp unchanged for even position index (White to move)', () => {
      expect(toWhiteRelativeCp(150, 0)).toBe(150);
      expect(toWhiteRelativeCp(-50, 2)).toBe(-50);
    });

    it('should negate cp for odd position index (Black to move)', () => {
      expect(toWhiteRelativeCp(150, 1)).toBe(-150);
      expect(toWhiteRelativeCp(-200, 3)).toBe(200);
    });
  });

  describe('formatEvalDisplay', () => {
    it('should format positive score with + sign', () => {
      expect(formatEvalDisplay(150)).toBe('+1.5');
    });

    it('should format negative score with - sign', () => {
      expect(formatEvalDisplay(-300)).toBe('-3.0');
    });

    it('should format zero as 0.0', () => {
      expect(formatEvalDisplay(0)).toBe('0.0');
    });

    it('should clamp large positive score', () => {
      expect(formatEvalDisplay(5000)).toBe('+10.0');
    });

    it('should clamp large negative score', () => {
      expect(formatEvalDisplay(-5000)).toBe('-10.0');
    });
  });

  describe('evalToBarPercent', () => {
    it('should return 50 for 0 cp', () => {
      expect(evalToBarPercent(0)).toBe(50);
    });

    it('should return 100 for +EVAL_CLAMP_CP', () => {
      expect(evalToBarPercent(EVAL_CLAMP_CP)).toBe(100);
    });

    it('should return 0 for -EVAL_CLAMP_CP', () => {
      expect(evalToBarPercent(-EVAL_CLAMP_CP)).toBe(0);
    });

    it('should return 75 for +500 cp', () => {
      expect(evalToBarPercent(500)).toBe(75);
    });

    it('should clamp values beyond range', () => {
      expect(evalToBarPercent(2000)).toBe(100);
      expect(evalToBarPercent(-2000)).toBe(0);
    });
  });

  describe('buildEvaluationTimeline', () => {
    it('should return [0] for empty moves array', () => {
      expect(buildEvaluationTimeline([])).toEqual([0]);
    });

    it('should build correct timeline from classified moves', () => {
      const moves: Partial<ClassifiedMove>[] = [
        { centipawnBefore: 20, centipawnAfter: -15 },
        { centipawnBefore: 15, centipawnAfter: -30 }
      ];

      const timeline = buildEvaluationTimeline(moves as ClassifiedMove[]);

      expect(timeline.length).toBe(3);
      // Position 0 (White to move): centipawnBefore[0] = 20, White-relative = 20
      expect(timeline[0]).toBe(20);
      // Position 1 (Black to move): centipawnAfter[0] = -15, White-relative = -(-15) = 15
      expect(timeline[1]).toBe(15);
      // Position 2 (White to move): centipawnAfter[1] = -30, White-relative = -30
      expect(timeline[2]).toBe(-30);
    });

    it('should clamp extreme values', () => {
      const moves: Partial<ClassifiedMove>[] = [
        { centipawnBefore: 10_000, centipawnAfter: -10_000 }
      ];

      const timeline = buildEvaluationTimeline(moves as ClassifiedMove[]);

      expect(timeline[0]).toBe(EVAL_CLAMP_CP);
      expect(timeline[1]).toBe(EVAL_CLAMP_CP);
    });

    it('should handle null centipawn values as 0', () => {
      const moves: Partial<ClassifiedMove>[] = [
        { centipawnBefore: null, centipawnAfter: null }
      ];

      const timeline = buildEvaluationTimeline(moves as ClassifiedMove[]);

      expect(timeline[0]).toBe(0);
      expect(timeline[1]).toBe(0);
    });
  });
});

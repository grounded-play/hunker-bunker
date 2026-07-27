import { describe, expect, it } from 'vitest';

import { MarkovGenerator } from './generator.js';

describe('MarkovGenerator', () => {
  it('seeds only valid coordinates', () => {
    const generator = new MarkovGenerator(3, 2, () => 0);

    generator.seed(1, 1, '.');
    generator.seed(-1, 0, '#');
    generator.seed(5, 5, '#');

    expect(generator.getGrid()).toEqual([
      [' ', ' ', ' '],
      [' ', '.', ' '],
    ]);
  });

  it('applies a matching rule during run', () => {
    const generator = new MarkovGenerator(3, 3, () => 0);
    generator.seed(1, 1, '.');
    generator.addRule(['.'], [['#']]);

    const grid = generator.run(5);

    expect(grid[1][1]).toBe('#');
  });

  it('supports wildcard matching without overwriting wildcard positions', () => {
    const generator = new MarkovGenerator(3, 1, () => 0);
    generator.seed(0, 0, 'A');
    generator.seed(1, 0, 'B');
    generator.seed(2, 0, 'C');

    generator.addRule(['A*C'], [['X', '*', 'Z']]);
    generator.step();

    expect(generator.getGrid()[0]).toEqual(['X', 'B', 'Z']);
  });

  it('returns false when no rule can be applied', () => {
    const generator = new MarkovGenerator(2, 2, () => 0);
    generator.addRule(['#'], [['.']]);

    expect(generator.step()).toBe(false);
  });

  it('finds matches that account for replacement size', () => {
    const generator = new MarkovGenerator(3, 3, () => 0);
    generator.seed(1, 1, '.');

    generator.addRule(['.'], [['.', '.']]);

    expect(generator.findMatches(generator.rules[0])).toEqual([{ x: 1, y: 1 }]);
  });

  describe('protectedCells', () => {
    it('never rewrites a cell inside protectedCells', () => {
      const generator = new MarkovGenerator(4, 1, () => 0.4);
      generator.grid = [['.', '#', '#', '.']];
      generator.protectedCells = new Set(['1,0']); // the '#' at x=1 is protected
      generator.addRule(['.#'], ['..'], 1.0);
      generator.run(10);
      expect(generator.grid[0][1]).toBe('#');
    });
  });
});

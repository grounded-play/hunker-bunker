import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HEX_SIZE,
  HEX_DIRECTIONS,
  addHex,
  axialToCube,
  cubeToAxial,
  hexDistance,
  hexKey,
  hexNeighbor,
  hexNeighbors,
  hexRing,
  hexRound,
  hexSpiral,
  hexToPixel,
  pixelToHex,
  scaleHex,
} from './hex.js';

describe('HEX_DIRECTIONS', () => {
  it('exports the six flat-top axial neighbor directions', () => {
    expect(HEX_DIRECTIONS).toEqual([
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ]);
  });

  it('has a matching opposite direction for every direction', () => {
    for (const direction of HEX_DIRECTIONS) {
      expect(
        HEX_DIRECTIONS.some(
          (candidate) => candidate.q === -direction.q && candidate.r === -direction.r,
        ),
      ).toBe(true);
    }
  });
});

describe('axial and cube conversion', () => {
  it('converts axial coordinates to cube coordinates', () => {
    expect(axialToCube({ q: 3, r: -5 })).toEqual({ q: 3, r: -5, s: 2 });
  });

  it('converts valid cube coordinates to axial coordinates', () => {
    expect(cubeToAxial({ q: -2, r: 4, s: -2 })).toEqual({ q: -2, r: 4 });
  });

  it('rejects invalid cube coordinates', () => {
    expect(() => cubeToAxial({ q: 1, r: 1, s: 1 })).toThrow(/q \+ r \+ s/);
  });
});

describe('hex arithmetic', () => {
  it('adds axial coordinates', () => {
    expect(addHex({ q: 2, r: -1 }, { q: -4, r: 3 })).toEqual({ q: -2, r: 2 });
  });

  it('scales axial coordinates', () => {
    expect(scaleHex({ q: -1, r: 2 }, 3)).toEqual({ q: -3, r: 6 });
  });

  it('returns wrapped directional neighbors', () => {
    const center = { q: 0, r: 0 };

    expect(hexNeighbor(center, 0)).toEqual({ q: 1, r: 0 });
    expect(hexNeighbor(center, 6)).toEqual({ q: 1, r: 0 });
    expect(hexNeighbor(center, -1)).toEqual({ q: 0, r: 1 });
  });

  it('returns all six neighboring coordinates', () => {
    expect(hexNeighbors({ q: 2, r: -1 })).toEqual([
      { q: 3, r: -1 },
      { q: 3, r: -2 },
      { q: 2, r: -2 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ]);
  });
});

describe('hexDistance', () => {
  it('returns zero for identical coordinates', () => {
    expect(hexDistance({ q: 4, r: -2 }, { q: 4, r: -2 })).toBe(0);
  });

  it('counts the minimum number of axial neighbor steps', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -2 })).toBe(3);
    expect(hexDistance({ q: -2, r: 4 }, { q: 2, r: -1 })).toBe(5);
  });
});

describe('hexToPixel and pixelToHex', () => {
  it('places the origin hex at the world origin', () => {
    expect(hexToPixel({ q: 0, r: 0 })).toEqual({ x: 0, z: 0 });
  });

  it('uses flat-top spacing along q', () => {
    const point = hexToPixel({ q: 1, r: 0 });

    expect(point.x).toBeCloseTo(DEFAULT_HEX_SIZE * 1.5, 5);
    expect(point.z).toBeCloseTo(DEFAULT_HEX_SIZE * Math.sqrt(3) * 0.5, 5);
  });

  it('round-trips hex centers back to their axial coordinates', () => {
    const samples = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: 3, r: -2 },
      { q: -4, r: 2 },
    ];

    for (const sample of samples) {
      expect(pixelToHex(hexToPixel(sample))).toEqual(sample);
    }
  });

  it('accepts a custom hex size', () => {
    const hex = { q: 2, r: -3 };
    const point = hexToPixel(hex, 2);

    expect(pixelToHex(point, 2)).toEqual(hex);
  });
});

describe('hexRound', () => {
  it('rounds fractional axial coordinates to the nearest legal hex', () => {
    expect(hexRound({ q: 1.2, r: -0.9 })).toEqual({ q: 1, r: -1 });
  });

  it('keeps rounded cube coordinates balanced', () => {
    const rounded = hexRound({ q: 2.49, r: -5.2 });
    const cube = axialToCube(rounded);

    expect(cube.q + cube.r + cube.s).toBe(0);
  });
});

describe('hexRing', () => {
  it('returns only the center for radius zero', () => {
    expect(hexRing({ q: 2, r: -2 }, 0)).toEqual([{ q: 2, r: -2 }]);
  });

  it('returns 6 * radius cells for non-zero radii', () => {
    expect(hexRing({ q: 0, r: 0 }, 1)).toHaveLength(6);
    expect(hexRing({ q: 0, r: 0 }, 3)).toHaveLength(18);
  });

  it('returns only cells at the requested distance', () => {
    const center = { q: -1, r: 2 };

    for (const hex of hexRing(center, 3)) {
      expect(hexDistance(center, hex)).toBe(3);
    }
  });

  it('rejects invalid radii', () => {
    expect(() => hexRing({ q: 0, r: 0 }, -1)).toThrow(/radius/);
    expect(() => hexRing({ q: 0, r: 0 }, 1.5)).toThrow(/radius/);
  });
});

describe('hexSpiral', () => {
  it('returns all cells from radius zero through the requested radius', () => {
    expect(hexSpiral({ q: 0, r: 0 }, 0)).toHaveLength(1);
    expect(hexSpiral({ q: 0, r: 0 }, 1)).toHaveLength(7);
    expect(hexSpiral({ q: 0, r: 0 }, 3)).toHaveLength(37);
  });

  it('does not duplicate coordinates', () => {
    const spiral = hexSpiral({ q: 0, r: 0 }, 4);
    const uniqueKeys = new Set(spiral.map(hexKey));

    expect(uniqueKeys.size).toBe(spiral.length);
  });
});

describe('hexKey', () => {
  it('serializes axial coordinates for maps and sets', () => {
    expect(hexKey({ q: -3, r: 7 })).toBe('-3,7');
  });
});

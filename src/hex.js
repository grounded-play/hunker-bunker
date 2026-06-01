export const HEX_DIRECTIONS = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 }),
]);

export const DEFAULT_HEX_SIZE = 0.75;

export function axialToCube({ q, r }) {
  return { q, r, s: -q - r };
}

export function cubeToAxial({ q, r, s }) {
  if (Math.round(q + r + s) !== 0) {
    throw new Error('Invalid cube coordinate: q + r + s must equal 0.');
  }

  return { q, r };
}

export function addHex(a, b) {
  return {
    q: a.q + b.q,
    r: a.r + b.r,
  };
}

export function scaleHex(hex, factor) {
  return {
    q: hex.q * factor,
    r: hex.r * factor,
  };
}

export function hexNeighbor(hex, directionIndex) {
  const direction = HEX_DIRECTIONS[((directionIndex % 6) + 6) % 6];
  return addHex(hex, direction);
}

export function hexNeighbors(hex) {
  return HEX_DIRECTIONS.map((direction) => addHex(hex, direction));
}

export function hexDistance(a, b) {
  const ac = axialToCube(a);
  const bc = axialToCube(b);

  return Math.max(
    Math.abs(ac.q - bc.q),
    Math.abs(ac.r - bc.r),
    Math.abs(ac.s - bc.s),
  );
}

export function hexRound({ q, r }) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

export function hexToPixel({ q, r }, size = DEFAULT_HEX_SIZE) {
  return {
    x: size * 1.5 * q,
    z: size * Math.sqrt(3) * (r + q * 0.5),
  };
}

export function pixelToHex({ x, z }, size = DEFAULT_HEX_SIZE) {
  return hexRound({
    q: ((2 / 3) * x) / size,
    r: ((-1 / 3) * x + (Math.sqrt(3) / 3) * z) / size,
  });
}

export function hexRing(center, radius) {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new Error('Hex ring radius must be a non-negative integer.');
  }

  if (radius === 0) {
    return [{ q: center.q, r: center.r }];
  }

  const results = [];
  let current = addHex(center, scaleHex(HEX_DIRECTIONS[4], radius));

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push(current);
      current = hexNeighbor(current, side);
    }
  }

  return results;
}

export function hexSpiral(center, radius) {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new Error('Hex spiral radius must be a non-negative integer.');
  }

  const results = [];
  for (let ring = 0; ring <= radius; ring++) {
    results.push(...hexRing(center, ring));
  }

  return results;
}

export function hexKey({ q, r }) {
  return `${q},${r}`;
}

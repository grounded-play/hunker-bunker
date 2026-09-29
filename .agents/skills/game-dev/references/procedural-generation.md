# Procedural Generation Patterns for Games

Procedural content generation (PCG) allows creating infinite, replayable worlds while keeping bundle size tiny.

---

## 1. Deterministic Pseudo-Random Number Generation (PRNG)

Never rely directly on `Math.random()` when world seeds or multiplayer synchronization are needed. Use a fast, 32-bit PRNG like **Mulberry32**:

```javascript
export function createMulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 2. Wave Function Collapse (WFC) Concepts

Wave Function Collapse models procedural generation as a constraint satisfaction problem:
1. **Superposition**: Every cell on the grid begins in a state of all possible tiles/modules.
2. **Entropy**: The cell with the lowest entropy (fewest possible valid remaining tiles) is selected.
3. **Collapse**: That cell is collapsed into a single chosen tile based on weights.
4. **Propagation**: Neighboring cells have invalid tiles pruned according to socket/adjacency compatibility matrices.
5. **Repeat** until all cells are collapsed or a contradiction is detected (triggering a retry).

---

## 3. Cellular Automata for Organic Caves

Generate organic caverns, ice caves, or tunnels:

```javascript
export function generateCaveMap(width, height, fillProbability = 0.45, iterations = 4, prng = Math.random) {
  let grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => (prng() < fillProbability ? 1 : 0))
  );

  // Border walls
  for (let x = 0; x < width; x++) {
    grid[0][x] = 1;
    grid[height - 1][x] = 1;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = 1;
    grid[y][width - 1] = 1;
  }

  function countNeighbors(map, x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || map[ny][nx] === 1) {
          count++;
        }
      }
    }
    return count;
  }

  // Smooth iterations (Rule B5678/S45678)
  for (let step = 0; step < iterations; step++) {
    const nextGrid = grid.map((arr) => [...arr]);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const wallCount = countNeighbors(grid, x, y);
        nextGrid[y][x] = wallCount >= 5 ? 1 : 0;
      }
    }
    grid = nextGrid;
  }

  return grid;
}
```

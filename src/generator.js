/**
 * A simplified MarkovJunior-style pattern rewriting engine.
 */
export class MarkovGenerator {
    constructor(width, height, random = Math.random) {
        this.width = width;
        this.height = height;
        this.random = random;
        this.grid = Array(height).fill(null).map(() => Array(width).fill(' '));
        this.rules = [];
        this.protectedCells = null; // optional Set of "x,y" strings
    }

    // Add a rule: find a subgrid pattern and replace it
    addRule(find, replace, probability = 1.0) {
        this.rules.push({ find, replace, probability });
    }

    seed(x, y, char) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y][x] = char;
        }
    }

    run(iterations = 100) {
        for (let i = 0; i < iterations; i++) {
            if (!this.step()) break;
        }
        return this.grid;
    }

    step() {
        // Shuffle rules for randomness
        const shuffledRules = [...this.rules].sort(() => this.random() - 0.5);

        for (const rule of shuffledRules) {
            const matches = this.findMatches(rule);
            if (matches.length > 0 && this.random() <= rule.probability) {
                // Pick a random match
                const match = matches[Math.floor(this.random() * matches.length)];
                this.applyRule(match, rule.replace);
                return true;
            }
        }
        return false;
    }

    findMatches(rule) {
        const matches = [];
        const find = rule.find;
        const replace = rule.replace;
        const fHeight = find.length;
        const fWidth = find[0].length;
        const rHeight = replace.length;
        const rWidth = replace[0].length;

        // Ensure both find and replace can fit
        const maxHeight = Math.max(fHeight, rHeight);
        const maxWidth = Math.max(fWidth, rWidth);

        for (let y = 0; y <= this.height - maxHeight; y++) {
            for (let x = 0; x <= this.width - maxWidth; x++) {
                if (this.matchAt(x, y, find) && !this.matchTouchesProtected({ x, y }, replace)) {
                    matches.push({ x, y });
                }
            }
        }
        return matches;
    }

    matchTouchesProtected(pos, replace) {
        if (!this.protectedCells || this.protectedCells.size === 0) return false;
        for (let py = 0; py < replace.length; py += 1) {
            for (let px = 0; px < replace[py].length; px += 1) {
                if (replace[py][px] === '*') continue;
                if (this.protectedCells.has(`${pos.x + px},${pos.y + py}`)) return true;
            }
        }
        return false;
    }

    matchAt(x, y, pattern) {
        for (let py = 0; py < pattern.length; py++) {
            for (let px = 0; px < pattern[py].length; px++) {
                const pChar = pattern[py][px];
                if (pChar === '*') continue; // Wildcard
                if (this.grid[y + py][x + px] !== pChar) return false;
            }
        }
        return true;
    }

    applyRule(pos, replace) {
        for (let py = 0; py < replace.length; py++) {
            for (let px = 0; px < replace[py].length; px++) {
                const rChar = replace[py][px];
                if (rChar === '*') continue; // Don't change
                this.grid[pos.y + py][pos.x + px] = rChar;
            }
        }
    }

    getGrid() {
        return this.grid;
    }
}

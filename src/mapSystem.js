export const DEFAULT_CELL_SIZE = 15;

export function worldToGrid(x, z, cellSize = DEFAULT_CELL_SIZE) {
    const gx = Math.floor((x + cellSize / 2) / cellSize);
    const gz = Math.floor((z + cellSize / 2) / cellSize);
    return { gx, gz, key: `${gx},${gz}` };
}

export function gridToWorld(gx, gz, cellSize = DEFAULT_CELL_SIZE) {
    return { x: gx * cellSize, z: gz * cellSize };
}

export class ExplorationTracker {
    constructor({ cellSize = DEFAULT_CELL_SIZE } = {}) {
        this.cellSize = cellSize;
        this.exploredCells = new Map();
        this.landmarks = new Map();
        this.currentCellKey = null;
        this.discoveredCount = 0;
        this.initDefaultLandmarks();
    }

    initDefaultLandmarks() {
        this.registerLandmark('home_base', {
            x: 0,
            z: 0,
            label: 'HOME BASE / BUNKER COMMAND',
            type: 'home_base',
            priority: 1000,
            icon: 'home'
        });
    }

    reset() {
        this.exploredCells.clear();
        this.landmarks.clear();
        this.currentCellKey = null;
        this.discoveredCount = 0;
        this.initDefaultLandmarks();
    }

    recordPlayerPosition(x, z, meta = {}) {
        const { gx, gz, key } = worldToGrid(x, z, this.cellSize);
        let newlyDiscovered = false;

        if (!this.exploredCells.has(key)) {
            const entry = {
                gx,
                gz,
                key,
                discoveredAt: Date.now(),
                roomType: meta.roomType ?? 'chamber',
                label: meta.label ?? '',
                cleared: meta.cleared ?? false
            };
            this.exploredCells.set(key, entry);
            this.discoveredCount += 1;
            newlyDiscovered = true;
        }

        const prevKey = this.currentCellKey;
        this.currentCellKey = key;

        return {
            currentKey: key,
            changedCell: prevKey !== key,
            newlyDiscovered,
            cell: this.exploredCells.get(key)
        };
    }

    registerLandmark(id, landmarkData = {}) {
        if (!id) return null;

        const x = Number(landmarkData.x ?? 0);
        const z = Number(landmarkData.z ?? 0);
        const { gx, gz } = worldToGrid(x, z, this.cellSize);

        const entry = {
            id,
            x,
            z,
            gx,
            gz,
            label: landmarkData.label ?? id,
            icon: landmarkData.icon ?? 'objective',
            type: landmarkData.type ?? 'objective',
            priority: Number(landmarkData.priority ?? 100),
            discovered: Boolean(landmarkData.discovered ?? true),
            active: Boolean(landmarkData.active ?? true)
        };

        this.landmarks.set(id, entry);
        return entry;
    }

    removeLandmark(id) {
        return this.landmarks.delete(id);
    }

    isExplored(gx, gz) {
        return this.exploredCells.has(`${gx},${gz}`);
    }

    getExploredCells() {
        return Array.from(this.exploredCells.values());
    }

    getLandmarks() {
        return Array.from(this.landmarks.values()).filter((l) => l.active);
    }

    getStats() {
        return {
            totalExplored: this.discoveredCount,
            activeLandmarks: this.landmarks.size,
            currentCellKey: this.currentCellKey
        };
    }

    getExploredBounds() {
        let minGx = 0, maxGx = 0, minGz = 0, maxGz = 0;
        if (this.exploredCells.size === 0) {
            return { minGx: -4, maxGx: 4, minGz: -4, maxGz: 4 };
        }
        let first = true;
        for (const cell of this.exploredCells.values()) {
            if (first) {
                minGx = cell.gx;
                maxGx = cell.gx;
                minGz = cell.gz;
                maxGz = cell.gz;
                first = false;
            } else {
                minGx = Math.min(minGx, cell.gx);
                maxGx = Math.max(maxGx, cell.gx);
                minGz = Math.min(minGz, cell.gz);
                maxGz = Math.max(maxGz, cell.gz);
            }
        }
        return { minGx, maxGx, minGz, maxGz };
    }
}

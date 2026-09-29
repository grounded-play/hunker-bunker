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
    constructor({
        cellSize = DEFAULT_CELL_SIZE,
        maxTrailPoints = 600,
        trailMaxAgeMs = 180_000,
        now = () => Date.now()
    } = {}) {
        this.cellSize = cellSize;
        this.maxTrailPoints = maxTrailPoints;
        this.trailMaxAgeMs = Math.max(1_000, Number(trailMaxAgeMs) || 180_000);
        this.now = typeof now === 'function' ? now : () => Date.now();
        this.exploredCells = new Map();
        this.landmarks = new Map();
        this.breadcrumbTrail = [];
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
        this.breadcrumbTrail = [];
        this.currentCellKey = null;
        this.discoveredCount = 0;
        this.initDefaultLandmarks();
    }

    recordPlayerPosition(x, z, meta = {}) {
        if (!Number.isFinite(x) || !Number.isFinite(z)) {
            return { currentKey: this.currentCellKey, changedCell: false, newlyDiscovered: false };
        }

        const now = this.now();
        const lastPoint = this.breadcrumbTrail[this.breadcrumbTrail.length - 1];
        if (!lastPoint || Math.hypot(x - lastPoint.x, z - lastPoint.z) >= 1.5) {
            this.breadcrumbTrail.push({ x, z, timestamp: now });
            if (this.breadcrumbTrail.length > this.maxTrailPoints) {
                this.breadcrumbTrail.shift();
            }
        }

        const { gx, gz, key } = worldToGrid(x, z, this.cellSize);
        let newlyDiscovered = false;

        if (!this.exploredCells.has(key)) {
            const entry = {
                gx,
                gz,
                key,
                discoveredAt: now,
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

    getBreadcrumbTrail() {
        const now = this.now();
        const cutoff = now - this.trailMaxAgeMs;
        while (this.breadcrumbTrail[0]?.timestamp < cutoff) this.breadcrumbTrail.shift();
        return this.breadcrumbTrail.map((point) => ({
            ...point,
            opacity: Math.max(0.08, Math.min(1, 1 - ((now - point.timestamp) / this.trailMaxAgeMs)))
        }));
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
            active: Boolean(landmarkData.active ?? true),
            revealOnMap: Boolean(landmarkData.revealOnMap),
            plane: landmarkData.plane ?? 'surface'
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

    isTileScanned(worldX, worldZ) {
        const { gx, gz } = worldToGrid(worldX, worldZ, this.cellSize);
        const cell = this.exploredCells.get(`${gx},${gz}`);
        return Boolean(cell && (cell.scanned || cell.discoveredAt));
    }

    getExplorationState(worldX, worldZ) {
        const { gx, gz } = worldToGrid(worldX, worldZ, this.cellSize);
        const key = `${gx},${gz}`;
        const cell = this.exploredCells.get(key);
        if (!cell) {
            return {
                explored: false,
                scanned: false,
                gx,
                gz,
                key,
                roomType: 'unscanned_sector',
                label: 'Unscanned Sector'
            };
        }
        return {
            explored: true,
            scanned: Boolean(cell.scanned),
            gx,
            gz,
            key,
            roomType: cell.roomType ?? 'scanned_sector',
            label: cell.label ?? 'Explored Sector',
            cleared: Boolean(cell.cleared)
        };
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

    recordRadarScan(x, z, radius, meta = {}) {
        const center = worldToGrid(x, z, this.cellSize);
        const gridRadius = Math.ceil((radius + this.cellSize * 0.5) / this.cellSize);
        let newlyDiscoveredCount = 0;
        let scannedCount = 0;
        const now = this.now();

        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
            for (let dz = -gridRadius; dz <= gridRadius; dz++) {
                const gx = center.gx + dx;
                const gz = center.gz + dz;
                const worldPos = gridToWorld(gx, gz, this.cellSize);
                const dist = Math.hypot(worldPos.x - x, worldPos.z - z);
                if (dist <= radius + this.cellSize * 0.5) {
                    const key = `${gx},${gz}`;
                    scannedCount++;
                    const existing = this.exploredCells.get(key);
                    if (existing) {
                        existing.scanned = true;
                        existing.scannedAt = now;
                    } else {
                        this.exploredCells.set(key, {
                            gx,
                            gz,
                            key,
                            discoveredAt: now,
                            scanned: true,
                            scannedAt: now,
                            roomType: meta.roomType ?? 'scanned_sector',
                            label: meta.label ?? 'Radar Ping',
                            cleared: meta.cleared ?? false
                        });
                        this.discoveredCount++;
                        newlyDiscoveredCount++;
                    }
                }
            }
        }

        this.lastScan = { x, z, radius, timestamp: now };
        return { scannedCount, newlyDiscoveredCount, centerKey: center.key };
    }

    computeScannedPath(startPos, endPos) {
        const directDist = Math.hypot(endPos.x - startPos.x, endPos.z - startPos.z);
        if (directDist < 0.001) {
            return { found: true, path: [{ x: startPos.x, z: startPos.z }], distance: 0, scannedPercentage: 1.0, gridLength: 1 };
        }

        const startGrid = worldToGrid(startPos.x, startPos.z, this.cellSize);
        const endGrid = worldToGrid(endPos.x, endPos.z, this.cellSize);

        // Calculate line coverage along direct ray
        const raySteps = Math.max(2, Math.ceil(directDist / (this.cellSize * 0.5)));
        let exploredRayCount = 0;
        for (let i = 0; i <= raySteps; i++) {
            const t = i / raySteps;
            const rx = startPos.x + t * (endPos.x - startPos.x);
            const rz = startPos.z + t * (endPos.z - startPos.z);
            const { key } = worldToGrid(rx, rz, this.cellSize);
            if (this.exploredCells.has(key)) exploredRayCount++;
        }
        const scannedPercentage = Math.min(1.0, exploredRayCount / (raySteps + 1));

        // A* search over explored/scanned grid cells
        const openSet = [startGrid.key];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const heuristic = (k1, k2) => {
            const [x1, z1] = k1.split(',').map(Number);
            const [x2, z2] = k2.split(',').map(Number);
            return Math.hypot(x2 - x1, z2 - z1) * this.cellSize;
        };

        gScore.set(startGrid.key, 0);
        fScore.set(startGrid.key, heuristic(startGrid.key, endGrid.key));

        const getNeighbors = (key) => {
            const [gx, gz] = key.split(',').map(Number);
            const neighbors = [
                `${gx + 1},${gz}`,
                `${gx - 1},${gz}`,
                `${gx},${gz + 1}`,
                `${gx},${gz - 1}`,
                `${gx + 1},${gz + 1}`,
                `${gx - 1},${gz + 1}`,
                `${gx + 1},${gz - 1}`,
                `${gx - 1},${gz - 1}`
            ];
            // Must be explored or target cell
            return neighbors.filter((nKey) => this.exploredCells.has(nKey) || nKey === endGrid.key);
        };

        const visited = new Set();
        let foundKey = null;

        while (openSet.length > 0) {
            // Pick lowest fScore
            openSet.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
            const current = openSet.shift();

            if (current === endGrid.key) {
                foundKey = current;
                break;
            }

            visited.add(current);

            for (const neighbor of getNeighbors(current)) {
                if (visited.has(neighbor)) continue;

                const [cx, cz] = current.split(',').map(Number);
                const [nx, nz] = neighbor.split(',').map(Number);
                const stepDist = Math.hypot(nx - cx, nz - cz) * this.cellSize;
                const tentativeG = (gScore.get(current) ?? Infinity) + stepDist;

                if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeG);
                    fScore.set(neighbor, tentativeG + heuristic(neighbor, endGrid.key));
                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        if (foundKey) {
            const gridPath = [foundKey];
            let curr = foundKey;
            while (cameFrom.has(curr)) {
                curr = cameFrom.get(curr);
                gridPath.unshift(curr);
            }

            const pathPoints = gridPath.map((k) => {
                const [gx, gz] = k.split(',').map(Number);
                return { gx, gz, ...gridToWorld(gx, gz, this.cellSize) };
            });

            return {
                found: true,
                path: pathPoints,
                distance: gScore.get(endGrid.key) ?? directDist,
                scannedPercentage: 1.0,
                gridLength: gridPath.length
            };
        }

        return {
            found: false,
            path: [],
            distance: directDist,
            scannedPercentage,
            gridLength: 0
        };
    }

    /**
     * Phase 4: Registers a pneumatic transit terminal landmark for the return network.
     */
    registerTransitTerminalLandmark(terminal) {
        if (!terminal || !terminal.id) return null;
        const pos = terminal.position || { x: 0, z: 0 };
        return this.registerLandmark(terminal.id, {
            x: pos.x,
            z: pos.z,
            label: terminal.name || 'Pneumatic Transit Terminal',
            type: 'transit_terminal',
            icon: 'transit',
            priority: 500,
            discovered: true,
            active: true
        });
    }

    /**
     * Phase 4: Registers an engineered nanite bridge crossing.
     */
    registerNaniteBridgeLandmark(bridge) {
        if (!bridge || !bridge.id) return null;
        const pos = bridge.position || { x: 0, z: 0 };
        return this.registerLandmark(bridge.id, {
            x: pos.x,
            z: pos.z,
            label: bridge.label || 'Nanite Chasm Bridge',
            type: 'nanite_bridge',
            icon: 'bridge',
            priority: 300,
            discovered: true,
            active: true
        });
    }

    /**
     * Phase 4: Registers a milestone gate boundary.
     */
    registerMilestoneGateLandmark(gate) {
        if (!gate || !gate.id) return null;
        const pos = gate.position || { x: 0, z: 0 };
        return this.registerLandmark(gate.id, {
            x: pos.x,
            z: pos.z,
            label: gate.label || 'Milestone Ring Gate',
            type: 'milestone_gate',
            icon: 'gate',
            priority: 400,
            discovered: true,
            active: true
        });
    }

    /**
     * Phase 4: Generates subtle floor breadcrumb waypoints along the computed scanned path.
     */
    getObjectiveBreadcrumbs(startPos, targetPos, stepDistance = 4.0) {
        const pathResult = this.computeScannedPath(startPos, targetPos);
        if (!pathResult.found || pathResult.path.length <= 1) {
            return [];
        }

        const waypoints = [];
        for (let i = 0; i < pathResult.path.length - 1; i++) {
            const p1 = pathResult.path[i];
            const p2 = pathResult.path[i + 1];
            const segmentDist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
            const steps = Math.max(1, Math.floor(segmentDist / stepDistance));
            for (let s = 1; s <= steps; s++) {
                const t = s / (steps + 1);
                waypoints.push({
                    x: p1.x + t * (p2.x - p1.x),
                    z: p1.z + t * (p2.z - p1.z),
                    index: waypoints.length,
                    active: true
                });
            }
        }
        return waypoints;
    }
}


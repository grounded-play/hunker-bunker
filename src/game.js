import { MarkovGenerator } from './generator.js';

export class GameScene extends window.Phaser.Scene {
    constructor() {
        super('GameScene');
        this.level = 0;
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.baseCameraZoom = 1.2;
        this.renderRadius = 22;
        this.chunkSize = 19;
        this.chunkCellCount = (this.chunkSize - 1) / 2;
        this.playerRadius = 10;
        this.collisionSampleRadius = 5;
        this.wallCollisionInsetX = 8;
        this.wallCollisionInsetY = 4;
        this.playerSafeRadius = 2;
        this.referenceViewport = {
            width: 960,
            height: 600
        };
        this.lastRenderedTile = null;
        this.chunkCache = new Map();
    }

    init(data) {
        this.playerType = data.playerType || 'TANK';
    }

    create() {
        this.cameras.main.setBackgroundColor('#0b0d0f');

        // Separate terrain layers let nearby walls occlude the player correctly.
        this.floorGraphics = this.add.graphics();
        this.backWallGraphics = this.add.graphics();
        this.frontWallGraphics = this.add.graphics();
        this.floorGraphics.setDepth(0);
        this.backWallGraphics.setDepth(50);

        // Player setup
        this.player = this.add.circle(0, 0, 10, this.getPlayerColor());
        const spawnPosition = this.isoToScreen(this.getSpawnIsoTile().x, this.getSpawnIsoTile().y);
        this.player.setPosition(spawnPosition.x, spawnPosition.y);
        this.player.setDepth(100);
        this.frontWallGraphics.setDepth(150);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');

        // Camera follow & Tactical Zoom
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 50);
        this.cameras.main.setBackgroundColor('#0b0d0f');
        this.scale.on('resize', this.updateResponsiveCamera, this);
        this.updateResponsiveCamera({ width: this.scale.width, height: this.scale.height });
        this.refreshVisibleTerrain(true);
    }

    getPlayerColor(type = null) {
        const checkType = type || this.playerType;
        switch(checkType) {
            case 'SCOUT': return 0x00ff00;
            case 'TANK': return 0xffb700;
            case 'ENGINEER': return 0x00e5ff;
            default: return 0xffffff;
        }
    }

    updatePlayerType(type) {
        this.playerType = type;
        if (this.player) {
            this.player.setFillStyle(this.getPlayerColor(type));
        }
    }

    generateLevel(_depth) {
        this.floorGraphics.clear();
        this.backWallGraphics.clear();
        this.frontWallGraphics.clear();
        const centerTile = this.getPlayerIsoTile();
        const playerScreenY = this.player?.y ?? 0;

        for (let row = -this.renderRadius; row <= this.renderRadius; row++) {
            for (let col = -this.renderRadius; col <= this.renderRadius; col++) {
                const isoX = centerTile.x + col;
                const isoY = centerTile.y + row;
                const screenPos = this.isoToScreen(isoX, isoY);
                this.drawFloorBatch(screenPos.x, screenPos.y, isoX, isoY);
            }
        }

        for (let row = -this.renderRadius; row <= this.renderRadius; row++) {
            for (let col = -this.renderRadius; col <= this.renderRadius; col++) {
                const isoX = centerTile.x + col;
                const isoY = centerTile.y + row;
                const tileType = this.getTileType(isoX, isoY);

                if (tileType === '#') {
                    const screenPos = this.isoToScreen(isoX, isoY);
                    const drawWallInFront = screenPos.y > playerScreenY + this.tileHeight * 0.1;
                    this.drawWallBaseBatch(screenPos.x, screenPos.y, isoX, isoY, this.backWallGraphics);

                    if (drawWallInFront) {
                        this.drawWallTopBatch(screenPos.x, screenPos.y, isoX, isoY, this.frontWallGraphics, true);
                    } else {
                        this.drawWallTopBatch(screenPos.x, screenPos.y, isoX, isoY, this.backWallGraphics, false);
                    }
                }
            }
        }

        this.lastRenderedTile = centerTile;
    }

    isoToScreen(isoX, isoY) {
        return {
            x: (isoX - isoY) * (this.tileWidth / 2),
            y: (isoX + isoY) * (this.tileHeight / 2)
        };
    }

    screenToIso(screenX, screenY) {
        const halfWidth = this.tileWidth / 2;
        const halfHeight = this.tileHeight / 2;

        return {
            x: (screenX / halfWidth + screenY / halfHeight) / 2,
            y: (screenY / halfHeight - screenX / halfWidth) / 2
        };
    }

    getPlayerIsoTile() {
        const iso = this.screenToIso(this.player?.x ?? 0, this.player?.y ?? 0);
        return {
            x: Math.round(iso.x),
            y: Math.round(iso.y)
        };
    }

    getSpawnIsoTile() {
        const centerCell = Math.floor(this.chunkCellCount / 2);
        return {
            x: centerCell * 2 + 1,
            y: centerCell * 2 + 1
        };
    }

    refreshVisibleTerrain(force = false) {
        const centerTile = this.getPlayerIsoTile();
        if (
            !force &&
            this.lastRenderedTile &&
            this.lastRenderedTile.x === centerTile.x &&
            this.lastRenderedTile.y === centerTile.y
        ) {
            return;
        }

        this.generateLevel(this.level);
    }

    getTileVariant(isoX, isoY) {
        const seed = this.hashTile(isoX, isoY);
        return {
            fill: seed % 5 === 0 ? 0x202429 : 0x1a1c1e,
            stroke: seed % 3 === 0 ? 0x364152 : 0x2d3748
        };
    }

    getTileType(isoX, isoY) {
        const { chunkX, chunkY, localX, localY } = this.getChunkTile(isoX, isoY);
        const chunk = this.getOrCreateChunk(chunkX, chunkY);
        return chunk[localY][localX];
    }

    hashTile(isoX, isoY) {
        const seed = Math.imul(isoX, 73856093) ^ Math.imul(isoY, 19349663);
        return Math.abs(seed);
    }

    getChunkTile(isoX, isoY) {
        const chunkX = Math.floor(isoX / this.chunkSize);
        const chunkY = Math.floor(isoY / this.chunkSize);
        const localX = isoX - chunkX * this.chunkSize;
        const localY = isoY - chunkY * this.chunkSize;

        return { chunkX, chunkY, localX, localY };
    }

    getOrCreateChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (!this.chunkCache.has(key)) {
            this.chunkCache.set(key, this.buildChunk(chunkX, chunkY));
        }

        return this.chunkCache.get(key);
    }

    buildChunk(chunkX, chunkY) {
        const grid = Array(this.chunkSize)
            .fill(null)
            .map(() => Array(this.chunkSize).fill('#'));
        const random = this.createSeededRandom(this.hashTile(chunkX + 1000, chunkY - 1000) + this.level * 101);
        const centerCell = Math.floor(this.chunkCellCount / 2);
        const stack = [[centerCell, centerCell]];
        const visited = new Set([`${centerCell},${centerCell}`]);

        this.carveCell(grid, centerCell, centerCell);

        while (stack.length > 0) {
            const [cellX, cellY] = stack[stack.length - 1];
            const neighbors = this.shuffleDirections([
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ], random);
            let carvedNeighbor = false;

            for (const { dx, dy } of neighbors) {
                const nextX = cellX + dx;
                const nextY = cellY + dy;
                const key = `${nextX},${nextY}`;

                if (
                    nextX < 0 ||
                    nextX >= this.chunkCellCount ||
                    nextY < 0 ||
                    nextY >= this.chunkCellCount ||
                    visited.has(key)
                ) {
                    continue;
                }

                this.carvePassage(grid, cellX, cellY, nextX, nextY);
                visited.add(key);
                stack.push([nextX, nextY]);
                carvedNeighbor = true;
                break;
            }

            if (!carvedNeighbor) {
                stack.pop();
            }
        }

        this.ensureChunkPortals(grid, chunkX, chunkY);
        this.runMarkovPass(grid, random);
        this.widenChunkCorridors(grid);
        this.clearSpawnArea(grid, chunkX, chunkY);

        return grid;
    }

    carveCell(grid, cellX, cellY) {
        const localX = cellX * 2 + 1;
        const localY = cellY * 2 + 1;
        grid[localY][localX] = '.';
    }

    carvePassage(grid, fromCellX, fromCellY, toCellX, toCellY) {
        const fromX = fromCellX * 2 + 1;
        const fromY = fromCellY * 2 + 1;
        const toX = toCellX * 2 + 1;
        const toY = toCellY * 2 + 1;

        grid[fromY][fromX] = '.';
        grid[toY][toX] = '.';
        grid[(fromY + toY) / 2][(fromX + toX) / 2] = '.';
    }

    ensureChunkPortals(grid, chunkX, chunkY) {
        const openings = {
            north: this.getEdgeOpening('horizontal', chunkX, chunkY),
            south: this.getEdgeOpening('horizontal', chunkX, chunkY + 1),
            west: this.getEdgeOpening('vertical', chunkX, chunkY),
            east: this.getEdgeOpening('vertical', chunkX + 1, chunkY)
        };

        if (!openings.north.open && !openings.south.open && !openings.west.open && !openings.east.open) {
            openings.east.open = true;
        }

        if (openings.north.open) {
            const localX = openings.north.offset * 2 + 1;
            grid[0][localX] = '.';
            grid[1][localX] = '.';
        }

        if (openings.south.open) {
            const localX = openings.south.offset * 2 + 1;
            grid[this.chunkSize - 1][localX] = '.';
            grid[this.chunkSize - 2][localX] = '.';
        }

        if (openings.west.open) {
            const localY = openings.west.offset * 2 + 1;
            grid[localY][0] = '.';
            grid[localY][1] = '.';
        }

        if (openings.east.open) {
            const localY = openings.east.offset * 2 + 1;
            grid[localY][this.chunkSize - 1] = '.';
            grid[localY][this.chunkSize - 2] = '.';
        }
    }

    getEdgeOpening(axis, edgeX, edgeY) {
        const seed = this.hashTile(edgeX * 97 + (axis === 'vertical' ? 11 : 23), edgeY * 193 + (axis === 'vertical' ? 41 : 59));
        return {
            open: seed % 100 < 68,
            offset: seed % this.chunkCellCount
        };
    }

    runMarkovPass(grid, random) {
        const generator = new MarkovGenerator(this.chunkSize, this.chunkSize, random);
        generator.grid = grid.map((row) => [...row]);
        generator.addRule(['.#'], ['..'], 0.15);
        generator.addRule(['#.'], ['..'], 0.15);
        generator.addRule(['.', '#'], ['.', '.'], 0.15);
        generator.addRule(['#', '.'], ['.', '.'], 0.15);
        generator.run(24);

        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                grid[y][x] = generator.grid[y][x];
            }
        }
    }

    widenChunkCorridors(grid) {
        const widened = grid.map((row) => [...row]);

        for (let y = 1; y < this.chunkSize - 1; y++) {
            for (let x = 1; x < this.chunkSize - 1; x++) {
                if (grid[y][x] !== '.') continue;

                const leftOpen = grid[y][x - 1] === '.';
                const rightOpen = grid[y][x + 1] === '.';
                const upOpen = grid[y - 1][x] === '.';
                const downOpen = grid[y + 1][x] === '.';

                if (leftOpen && rightOpen) {
                    widened[y - 1][x] = '.';
                    widened[y + 1][x] = '.';
                }

                if (upOpen && downOpen) {
                    widened[y][x - 1] = '.';
                    widened[y][x + 1] = '.';
                }

                if ((leftOpen || rightOpen) && (upOpen || downOpen)) {
                    widened[y - 1][x] = '.';
                    widened[y + 1][x] = '.';
                    widened[y][x - 1] = '.';
                    widened[y][x + 1] = '.';
                }
            }
        }

        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                grid[y][x] = widened[y][x];
            }
        }
    }

    clearSpawnArea(grid, chunkX, chunkY) {
        const spawnTile = this.getSpawnIsoTile();

        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const worldX = chunkX * this.chunkSize + localX;
                const worldY = chunkY * this.chunkSize + localY;
                const distance = Math.abs(worldX - spawnTile.x) + Math.abs(worldY - spawnTile.y);

                if (distance <= this.playerSafeRadius) {
                    grid[localY][localX] = '.';
                }
            }
        }
    }

    shuffleDirections(items, random) {
        const list = [...items];
        for (let i = list.length - 1; i > 0; i--) {
            const swapIndex = Math.floor(random() * (i + 1));
            [list[i], list[swapIndex]] = [list[swapIndex], list[i]];
        }
        return list;
    }

    createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;
        return () => {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return ((state >>> 0) / 4294967296);
        };
    }

    drawFloorBatch(x, y, isoX, isoY) {
        const variant = this.getTileVariant(isoX, isoY);
        const points = [
            0, -this.tileHeight/2,
            this.tileWidth/2, 0,
            0, this.tileHeight/2,
            -this.tileWidth/2, 0
        ];
        this.floorGraphics.fillStyle(variant.fill, 1);
        this.floorGraphics.fillPoints(this.getRelativePoints(x, y, points), true);
        this.floorGraphics.lineStyle(1, variant.stroke, 0.5);
        this.floorGraphics.strokePoints(this.getRelativePoints(x, y, points), true);
    }

    drawWallBaseBatch(x, y, isoX, isoY, graphics) {
        const h = 34 + (this.hashTile(isoX + 11, isoY - 7) % 20);
        const leftSide = [
            -this.tileWidth/2, -h,
            0, -h + this.tileHeight/2,
            0, this.tileHeight/2,
            -this.tileWidth/2, 0
        ];
        graphics.fillStyle(0x171b21, 1);
        graphics.fillPoints(this.getRelativePoints(x, y, leftSide), true);

        // Sides (Right)
        const rightSide = [
            this.tileWidth/2, -h,
            0, -h + this.tileHeight/2,
            0, this.tileHeight/2,
            this.tileWidth/2, 0
        ];
        graphics.fillStyle(0x101419, 1);
        graphics.fillPoints(this.getRelativePoints(x, y, rightSide), true);
    }

    drawWallTopBatch(x, y, isoX, isoY, graphics, occluderOnly = false) {
        const h = 34 + (this.hashTile(isoX + 11, isoY - 7) % 20);
        const top = [
            0, -this.tileHeight/2 - h,
            this.tileWidth/2, -h,
            0, this.tileHeight/2 - h,
            -this.tileWidth/2, -h
        ];

        graphics.fillStyle(0x2f3947, 1);
        graphics.fillPoints(this.getRelativePoints(x, y, top), true);
        graphics.lineStyle(1, 0x556273, 1);
        graphics.strokePoints(this.getRelativePoints(x, y, top), true);

        if (occluderOnly) {
            const upperLeft = [
                -this.tileWidth / 2, -h,
                0, -h + this.tileHeight / 2,
                0, -h + this.tileHeight * 0.15,
                -this.tileWidth * 0.26, -h + this.tileHeight * 0.08
            ];
            graphics.fillStyle(0x171b21, 1);
            graphics.fillPoints(this.getRelativePoints(x, y, upperLeft), true);

            const upperRight = [
                this.tileWidth / 2, -h,
                0, -h + this.tileHeight / 2,
                0, -h + this.tileHeight * 0.15,
                this.tileWidth * 0.26, -h + this.tileHeight * 0.08
            ];
            graphics.fillStyle(0x101419, 1);
            graphics.fillPoints(this.getRelativePoints(x, y, upperRight), true);
            return;
        }

        const leftSide = [
            -this.tileWidth / 2, -h,
            0, -h + this.tileHeight / 2,
            0, this.tileHeight / 2,
            -this.tileWidth / 2, 0
        ];
        graphics.fillStyle(0x171b21, 1);
        graphics.fillPoints(this.getRelativePoints(x, y, leftSide), true);

        const rightSide = [
            this.tileWidth / 2, -h,
            0, -h + this.tileHeight / 2,
            0, this.tileHeight / 2,
            this.tileWidth / 2, 0
        ];
        graphics.fillStyle(0x101419, 1);
        graphics.fillPoints(this.getRelativePoints(x, y, rightSide), true);
    }

    getRelativePoints(x, y, points) {
        const rel = [];
        for(let i=0; i<points.length; i+=2) {
            rel.push({ x: x + points[i], y: y + points[i+1] });
        }
        return rel;
    }

    updateResponsiveCamera(viewport = null) {
        const width = viewport?.width ?? this.scale.width;
        const height = viewport?.height ?? this.scale.height;
        if (!width || !height) return;

        const widthFactor = width / this.referenceViewport.width;
        const heightFactor = height / this.referenceViewport.height;
        const responsiveFactor = Math.min(widthFactor, heightFactor);
        const zoom = window.Phaser.Math.Clamp(this.baseCameraZoom * responsiveFactor, 0.5, 1.35);

        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(this.player.x, this.player.y);
        this.refreshVisibleTerrain(true);
    }

    canOccupyPosition(screenX, screenY) {
        const centerIso = this.screenToIso(screenX, screenY);
        const baseTileX = Math.round(centerIso.x);
        const baseTileY = Math.round(centerIso.y);

        for (let offsetY = -2; offsetY <= 2; offsetY++) {
            for (let offsetX = -2; offsetX <= 2; offsetX++) {
                const tileX = baseTileX + offsetX;
                const tileY = baseTileY + offsetY;

                if (this.getTileType(tileX, tileY) !== '#') continue;
                if (this.isCircleOverlappingWall(screenX, screenY, tileX, tileY)) return false;
            }
        }

        return true;
    }

    isCircleOverlappingWall(screenX, screenY, tileX, tileY) {
        const tileCenter = this.isoToScreen(tileX, tileY);
        const normalizedX = Math.abs(screenX - tileCenter.x) / (this.tileWidth / 2 - this.wallCollisionInsetX + this.playerRadius);
        const normalizedY = Math.abs(screenY - tileCenter.y) / (this.tileHeight / 2 - this.wallCollisionInsetY + this.playerRadius * 0.65);
        return normalizedX + normalizedY <= 1;
    }

    update() {
        const speed = 4;
        let vx = 0, vy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

        if (vx !== 0 || vy !== 0) {
            const vec = new window.Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
            let moved = false;

            if (this.canOccupyPosition(this.player.x + vec.x, this.player.y)) {
                this.player.x += vec.x;
                moved = true;
            }

            if (this.canOccupyPosition(this.player.x, this.player.y + vec.y)) {
                this.player.y += vec.y;
                moved = true;
            }

            if (moved) {
                this.refreshVisibleTerrain();
                this.events.emit('playerMove', { x: this.player.x, y: this.player.y });
            }
        }
    }
}

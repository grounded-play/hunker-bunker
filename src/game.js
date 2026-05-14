import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.level = 0;
        this.grid = [];
        this.tileWidth = 64;
        this.tileHeight = 32;
    }

    init(data) {
        this.playerType = data.playerType || 'SCOUT';
    }

    create() {
        this.cameras.main.setBackgroundColor('#0b0d0f');
        
        // Single Graphics object for the entire level (Infinite performance boost)
        this.levelGraphics = this.add.graphics();
        this.generateLevel(0);

        // Player setup
        this.player = this.add.circle(0, 0, 10, this.getPlayerColor());
        this.player.setDepth(100);
        
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');

        // Camera follow & Tactical Zoom
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2.0); /* Aggressive zoom to fill Map Box */
        this.cameras.main.setBackgroundColor('#0b0d0f');
        this.cameras.main.centerOn(0, 0);
    }

    getPlayerColor() {
        switch(this.playerType) {
            case 'SCOUT': return 0x00ff00;
            case 'TANK': return 0xffb700;
            case 'ENGINEER': return 0x00e5ff;
            default: return 0xffffff;
        }
    }

    generateLevel(depth) {
        this.levelGraphics.clear();
        const size = 30 + depth * 2;
        this.grid = Array(size).fill(null).map(() => Array(size).fill('#'));

        let cx = Math.floor(size/2);
        let cy = Math.floor(size/2);
        
        for(let i=0; i<600; i++) {
            this.grid[cy][cx] = '.';
            cx += Phaser.Math.Between(-1, 1);
            cy += Phaser.Math.Between(-1, 1);
            cx = Phaser.Math.Clamp(cx, 1, size-2);
            cy = Phaser.Math.Clamp(cy, 1, size-2);
        }

        // Batch Draw
        for(let y=0; y<size; y++) {
            for(let x=0; x<size; x++) {
                const char = this.grid[y][x];
                const screenPos = this.isoToScreen(x - size/2, y - size/2);
                
                if(char === '#') {
                    this.drawWallBatch(screenPos.x, screenPos.y);
                } else {
                    this.drawFloorBatch(screenPos.x, screenPos.y);
                }
            }
        }
    }

    isoToScreen(isoX, isoY) {
        return {
            x: (isoX - isoY) * (this.tileWidth / 2),
            y: (isoX + isoY) * (this.tileHeight / 2)
        };
    }

    drawFloorBatch(x, y) {
        const points = [
            0, -this.tileHeight/2,
            this.tileWidth/2, 0,
            0, this.tileHeight/2,
            -this.tileWidth/2, 0
        ];
        this.levelGraphics.fillStyle(0x1a1c1e, 1);
        this.levelGraphics.fillPoints(this.getRelativePoints(x, y, points), true);
        this.levelGraphics.lineStyle(1, 0x2d3748, 0.5);
        this.levelGraphics.strokePoints(this.getRelativePoints(x, y, points), true);
    }

    drawWallBatch(x, y) {
        const h = 20;
        const top = [
            0, -this.tileHeight/2 - h,
            this.tileWidth/2, -h,
            0, this.tileHeight/2 - h,
            -this.tileWidth/2, -h
        ];
        
        // Top
        this.levelGraphics.fillStyle(0x2d3748, 1);
        this.levelGraphics.fillPoints(this.getRelativePoints(x, y, top), true);
        this.levelGraphics.lineStyle(1, 0x4a5568, 1);
        this.levelGraphics.strokePoints(this.getRelativePoints(x, y, top), true);

        // Sides (Left)
        const leftSide = [
            -this.tileWidth/2, -h,
            0, -h + this.tileHeight/2,
            0, this.tileHeight/2,
            -this.tileWidth/2, 0
        ];
        this.levelGraphics.fillStyle(0x1a1c1e, 1);
        this.levelGraphics.fillPoints(this.getRelativePoints(x, y, leftSide), true);

        // Sides (Right)
        const rightSide = [
            this.tileWidth/2, -h,
            0, -h + this.tileHeight/2,
            0, this.tileHeight/2,
            this.tileWidth/2, 0
        ];
        this.levelGraphics.fillStyle(0x14171a, 1);
        this.levelGraphics.fillPoints(this.getRelativePoints(x, y, rightSide), true);
    }

    getRelativePoints(x, y, points) {
        const rel = [];
        for(let i=0; i<points.length; i+=2) {
            rel.push({ x: x + points[i], y: y + points[i+1] });
        }
        return rel;
    }

    update() {
        const speed = 4;
        let vx = 0, vy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

        if (vx !== 0 || vy !== 0) {
            const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
            this.player.x += vec.x;
            this.player.y += vec.y;
            this.events.emit('playerMove', { x: this.player.x, y: this.player.y });
        }
    }
}

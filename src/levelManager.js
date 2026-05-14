import * as THREE from 'three';
import { MarkovGenerator } from './generator.js';

export class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 0;
        this.tileGroup = new THREE.Group();
        this.scene.add(this.tileGroup);

        this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
        this.wallMat = new THREE.MeshStandardMaterial({ 
            color: 0x444444, 
            roughness: 0.4, 
            metalness: 0.8,
            emissive: 0x111111 
        });
        this.floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.9, 
            metalness: 0.2 
        });
        this.ladderMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00ffff, 
            emissiveIntensity: 0.5 
        });
    }

    generateLevel(depth) {
        this.currentLevel = depth;
        // Clear previous tiles
        while(this.tileGroup.children.length > 0) { 
            this.tileGroup.remove(this.tileGroup.children[0]); 
        }

        const width = 20 + depth * 2; // Grow levels as we go deeper
        const height = 20 + depth * 2;
        const gen = new MarkovGenerator(width, height);

        // Rules for bunker expansion
        gen.addRule(['.'], [['.', '.']], 0.3);
        gen.addRule(['.'], [['.'], ['.']], 0.3);
        gen.addRule(['. '], [['.#']], 0.9);
        gen.addRule([' .'], [['#.',]], 0.9);
        gen.addRule(['.'], [['#'], ['.']], 0.1); // Add occasional walls

        // Seed with floor
        gen.seed(Math.floor(width/2), Math.floor(height/2), '.');
        
        // Run generation
        gen.run(500 + depth * 100);

        const grid = gen.getGrid();

        // Place a ladder at a random floor tile, far from the center
        const centerX = Math.floor(width/2);
        const centerY = Math.floor(height/2);
        const floorTiles = [];
        for(let y=0; y<height; y++) {
            for(let x=0; x<width; x++) {
                if(grid[y][x] === '.') {
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    if (dist > 5) floorTiles.push({x, y});
                }
            }
        }
        
        // Fallback if no floor tiles are far enough
        if (floorTiles.length === 0) {
            for(let y=0; y<height; y++) {
                for(let x=0; x<width; x++) {
                    if(grid[y][x] === '.') floorTiles.push({x, y});
                }
            }
        }
        
        if(floorTiles.length > 0) {
            const ladderPos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
            grid[ladderPos.y][ladderPos.x] = 'L';
        }

        this.renderGrid(grid, width, height);
        return grid;
    }

    renderGrid(grid, width, height) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const char = grid[y][x];
                const pos = new THREE.Vector3(x - width/2, 0, y - height/2);

                if (char === '#') {
                    const wall = new THREE.Mesh(this.boxGeo, this.wallMat);
                    wall.position.copy(pos);
                    wall.position.y = 0.5;
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.tileGroup.add(wall);
                } else if (char === '.' || char === 'L') {
                    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.floorMat);
                    floor.rotation.x = -Math.PI / 2;
                    floor.position.copy(pos);
                    floor.receiveShadow = true;
                    this.tileGroup.add(floor);

                    if (char === 'L') {
                        // Ladder visual
                        const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), this.ladderMat);
                        ladder.position.copy(pos);
                        ladder.position.y = 0.05;
                        this.tileGroup.add(ladder);
                    }
                }
            }
        }
    }
}

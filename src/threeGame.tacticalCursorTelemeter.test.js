import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { ExplorationTracker } from './mapSystem.js';

describe('Tactical Cursor & Telemeter Hover System', () => {
    let originalDoc;
    let mockElements;
    let telemeterEl;
    let cursorEl;
    let badgeEl;

    beforeEach(() => {
        mockElements = new Map();

        badgeEl = {
            textContent: '',
            className: 'cursor-interact-badge'
        };

        const classListSet = () => {
            const classes = new Set();
            return {
                add: (...names) => names.forEach(n => classes.add(n)),
                remove: (...names) => names.forEach(n => classes.delete(n)),
                contains: (name) => classes.has(name),
                toggle: (name, force) => {
                    if (force === undefined) {
                        if (classes.has(name)) classes.delete(name);
                        else classes.add(name);
                    } else if (force) {
                        classes.add(name);
                    } else {
                        classes.delete(name);
                    }
                }
            };
        };

        cursorEl = {
            id: 'tactical-cursor',
            classList: classListSet(),
            querySelector: (sel) => (sel === '.cursor-interact-badge' ? badgeEl : null),
            appendChild: (child) => { badgeEl = child; }
        };

        const createSubElement = (id) => ({
            id,
            textContent: '',
            className: '',
            style: {},
            classList: classListSet()
        });

        const subEls = {
            '#telemeter-kicker': createSubElement('telemeter-kicker'),
            '#telemeter-type-tag': createSubElement('telemeter-type-tag'),
            '#telemeter-title': createSubElement('telemeter-title'),
            '#telemeter-coords': createSubElement('telemeter-coords'),
            '#telemeter-subtitle': createSubElement('telemeter-subtitle'),
            '#telemeter-meter-bar': createSubElement('telemeter-meter-bar'),
            '#telemeter-meter-val': createSubElement('telemeter-meter-val'),
            '#telemeter-range-val': createSubElement('telemeter-range-val'),
            '#telemeter-action-prompt': createSubElement('telemeter-action-prompt'),
            '#telemeter-action-key': createSubElement('telemeter-action-key'),
            '#telemeter-action-text': createSubElement('telemeter-action-text')
        };

        telemeterEl = {
            id: 'tactical-telemeter-box',
            classList: classListSet(),
            querySelector: (sel) => subEls[sel] || null
        };
        telemeterEl.classList.add('hidden');

        mockElements.set('tactical-cursor', cursorEl);
        mockElements.set('tactical-telemeter-box', telemeterEl);

        originalDoc = globalThis.document;
        globalThis.document = {
            getElementById: (id) => mockElements.get(id) || null,
            createElement: (tag) => {
                if (tag === 'div') {
                    return {
                        className: '',
                        textContent: '',
                        classList: classListSet()
                    };
                }
                return {};
            }
        };
    });

    afterEach(() => {
        globalThis.document = originalDoc;
    });

    function createMockGame() {
        const game = Object.create(ThreeGame.prototype);
        game.player = {
            position: new THREE.Vector3(0, 0, 0)
        };
        game.isGameplayInputActive = () => true;
        game.explorationTracker = new ExplorationTracker();
        game.disableFogOfWar = false;
        game.currentBiomeKey = 'cryo';
        game.currentDepthTier = 2;
        return game;
    }

    it('resolves remote rival players and squadmates', () => {
        const game = createMockGame();
        const rivalMesh = new THREE.Mesh();
        rivalMesh.position.set(5, 0, 5);

        game.remotePlayers = new Map([
            ['p1', { mesh: rivalMesh, callsign: 'Ghost', playerType: 'scout', isDown: false }]
        ]);
        game.multiplayerMode = 'pvp';

        const targetPvp = game.resolveTacticalInspectTarget({ x: 5.2, z: 5.1 });
        expect(targetPvp).not.toBeNull();
        expect(targetPvp.type).toBe('enemy');
        expect(targetPvp.targetId).toBe('rival_player');
        expect(targetPvp.badgeLabel).toBe('RIVAL: GHOST');

        game.multiplayerMode = 'coop';
        game.remotePlayers.get('p1').isDown = true;
        const targetDowned = game.resolveTacticalInspectTarget({ x: 5.2, z: 5.1 });
        expect(targetDowned.type).toBe('interact');
        expect(targetDowned.targetId).toBe('revive_peer');
        expect(targetDowned.badgeLabel).toBe('REVIVE: GHOST');
    });

    it('resolves active enemies and computes relative integrity', () => {
        const game = createMockGame();
        const enemySprite = new THREE.Sprite();
        enemySprite.position.set(8, 0, 8);
        enemySprite.scale.set(1.5, 1.5, 1.5);
        enemySprite.userData = {
            type: 'boss_frost_crawler',
            isEnemy: true,
            isBoss: true,
            hp: 350,
            maxHp: 500
        };
        const group = new THREE.Group();
        group.add(enemySprite);
        game.scatterSprites = [enemySprite];
        game.isEnemyType = (type) => Boolean(type?.startsWith('boss_'));

        const target = game.resolveTacticalInspectTarget({ x: 8.5, z: 8.2 });
        expect(target).not.toBeNull();
        expect(target.type).toBe('enemy');
        expect(target.targetId).toBe('enemy');
        expect(target.badgeLabel).toBe('FROST CRAWLER');
        expect(target.integrity).toBe(70);
        expect(target.promptKey).toBe('L-CLICK');
    });

    it('resolves destructible corrupted barriers and cryo walls', () => {
        const game = createMockGame();
        game.getCachedTileType = (x, z) => (x === 4 && z === 4 ? 'X' : '.');

        const target = game.resolveTacticalInspectTarget({ x: 4.1, z: 3.9 });
        expect(target).not.toBeNull();
        expect(target.type).toBe('enemy');
        expect(target.targetId).toBe('destructible_wall');
        expect(target.badgeLabel).toBe('CORRUPTED BARRIER');
        expect(target.promptText).toBe('DESTROY BARRIER');
    });

    it('resolves pickups and lore datapads', () => {
        const game = createMockGame();
        const pickupMesh = new THREE.Mesh();
        pickupMesh.position.set(3, 0, 3);
        pickupMesh.visible = true;
        pickupMesh.userData = { type: 'ammo' };
        const group = new THREE.Group();
        group.add(pickupMesh);
        game.pickupMeshes = [pickupMesh];

        const targetPickup = game.resolveTacticalInspectTarget({ x: 3.2, z: 3.1 });
        expect(targetPickup).not.toBeNull();
        expect(targetPickup.type).toBe('loot');
        expect(targetPickup.targetId).toBe('pickup');
        expect(targetPickup.badgeLabel).toBe('AMMO CACHE');
        expect(targetPickup.promptText).toBe('COLLECT');
    });

    it('identifies unscanned fog-of-war tiles as ???', () => {
        const game = createMockGame();
        game.player.position.set(0, 0, 0);
        const target = game.resolveTacticalInspectTarget({ x: 20, z: 20 });
        expect(target).not.toBeNull();
        expect(target.type).toBe('unscanned');
        expect(target.targetId).toBe('unscanned');
        expect(target.badgeLabel).toBe('???');
        expect(target.title).toContain('???');
        expect(target.kicker).toContain('FOG OF WAR');
    });

    it('identifies solid impassable walls', () => {
        const game = createMockGame();
        game.player.position.set(0, 0, 0);
        game.getCachedTileType = (x, z) => (x === 2 && z === 2 ? '#' : '.');

        const target = game.resolveTacticalInspectTarget({ x: 2.1, z: 2.0 });
        expect(target).not.toBeNull();
        expect(target.type).toBe('wall');
        expect(target.targetId).toBe('wall');
        expect(target.badgeLabel).toBe('WALL');
        expect(target.title).toContain('REINFORCED ICE BULWARK');
        expect(target.promptText).toBe('IMPASSABLE');
    });

    it('updates tactical telemeter box DOM correctly on hover', () => {
        const game = createMockGame();
        const target = {
            type: 'enemy',
            targetId: 'enemy',
            badgeLabel: 'ICE GOLIATH',
            kicker: 'TARGET LOCKED // HOSTILE',
            title: 'ICE GOLIATH',
            subtitle: 'THREAT LEVEL: CRITICAL',
            coords: { x: 12, z: -8 },
            distance: 14.5,
            integrity: 82,
            promptKey: 'L-CLICK',
            promptText: 'ENGAGE'
        };

        game.updateTacticalTelemeter(target);

        expect(telemeterEl.classList.contains('hidden')).toBe(false);
        expect(telemeterEl.querySelector('#telemeter-kicker').textContent).toBe('TARGET LOCKED // HOSTILE');
        expect(telemeterEl.querySelector('#telemeter-type-tag').textContent).toBe('ENEMY');
        expect(telemeterEl.querySelector('#telemeter-title').textContent).toBe('ICE GOLIATH');
        expect(telemeterEl.querySelector('#telemeter-coords').textContent).toBe('[X: +12, Z: -8]');
        expect(telemeterEl.querySelector('#telemeter-meter-bar').style.width).toBe('82%');
        expect(telemeterEl.querySelector('#telemeter-meter-val').textContent).toBe('82%');
        expect(telemeterEl.querySelector('#telemeter-action-prompt').classList.contains('hidden')).toBe(false);
        expect(telemeterEl.querySelector('#telemeter-action-key').textContent).toBe('L-CLICK');
        expect(telemeterEl.querySelector('#telemeter-action-text').textContent).toBe('ENGAGE');
    });

    it('updates cursor classes and interact badge correctly', () => {
        const game = createMockGame();

        game.setCursorInspectState({
            type: 'unscanned',
            badgeLabel: '???'
        });

        expect(cursorEl.classList.contains('cursor-unscanned')).toBe(true);
        expect(badgeEl.textContent).toBe('???');

        game.setCursorInspectState({
            type: 'wall',
            badgeLabel: 'WALL'
        });

        expect(cursorEl.classList.contains('cursor-unscanned')).toBe(false);
        expect(cursorEl.classList.contains('cursor-wall')).toBe(true);
        expect(badgeEl.textContent).toBe('WALL');

        game.setCursorInspectState({
            type: 'loot',
            badgeLabel: 'MEDKIT'
        });

        expect(cursorEl.classList.contains('cursor-wall')).toBe(false);
        expect(cursorEl.classList.contains('cursor-loot')).toBe(true);
        expect(badgeEl.textContent).toBe('MEDKIT');
    });
});

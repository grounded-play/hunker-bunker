import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import {
    CameraTraumaManager,
    WEAPON_TRAUMA_TABLE,
    create3DMuzzleFlash,
    KillstreakFeedbackSystem,
    KILLSTREAK_TIERS
} from './gameplayTactileVfx.js';

describe('CameraTraumaManager', () => {
    let traumaManager;

    beforeEach(() => {
        traumaManager = new CameraTraumaManager({
            decay: 1.0,
            maxPitch: 0.1,
            maxYaw: 0.1,
            maxRoll: 0.1,
            maxOffsetX: 0.5,
            maxOffsetY: 0.5,
            maxOffsetZ: 0.5
        });
    });

    it('initializes with 0 trauma and produces 0 shake', () => {
        expect(traumaManager.trauma).toBe(0);
        const shake = traumaManager.computeShake(0.016);
        expect(shake.offset.x).toBe(0);
        expect(shake.offset.y).toBe(0);
        expect(shake.offset.z).toBe(0);
        expect(shake.rotation.pitch).toBe(0);
        expect(shake.rotation.yaw).toBe(0);
        expect(shake.rotation.roll).toBe(0);
    });

    it('adds trauma up to 1.0 maximum', () => {
        traumaManager.addTrauma(0.4);
        expect(traumaManager.trauma).toBeCloseTo(0.4);

        traumaManager.addTrauma(0.8);
        expect(traumaManager.trauma).toBe(1.0);
    });

    it('decays trauma smoothly over time', () => {
        traumaManager.addTrauma(1.0);
        traumaManager.update(0.5);
        expect(traumaManager.trauma).toBeCloseTo(0.5);

        traumaManager.update(0.6);
        expect(traumaManager.trauma).toBe(0);
    });

    it('produces quadratic shake intensity (shake = trauma^2)', () => {
        traumaManager.addTrauma(0.5); // trauma = 0.5, shake = 0.25
        const shake = traumaManager.computeShake(0.016);
        expect(Math.abs(shake.offset.x)).toBeLessThanOrEqual(0.5 * 0.25 + 1e-4);
        expect(Math.abs(shake.rotation.roll)).toBeLessThanOrEqual(0.1 * 0.25 + 1e-4);
    });

    it('applies trauma shake to a THREE.Camera without mutating permanent base position', () => {
        const camera = new THREE.PerspectiveCamera();
        camera.position.set(10, 20, 30);
        camera.rotation.set(0.1, 0.2, 0.3);

        traumaManager.addTrauma(0.8);
        const shake = traumaManager.applyToCamera(camera, 0.016);

        expect(camera.position.x).toBeCloseTo(10 + shake.offset.x);
        expect(camera.position.y).toBeCloseTo(20 + shake.offset.y);
        expect(camera.position.z).toBeCloseTo(30 + shake.offset.z);
    });

    it('provides standard weapon trauma table constants', () => {
        expect(WEAPON_TRAUMA_TABLE.pistol).toBeGreaterThan(0);
        expect(WEAPON_TRAUMA_TABLE.shotgun).toBeGreaterThan(WEAPON_TRAUMA_TABLE.pistol);
        expect(WEAPON_TRAUMA_TABLE.rocket).toBeGreaterThan(WEAPON_TRAUMA_TABLE.rifle);
        expect(WEAPON_TRAUMA_TABLE.bossSlam).toBeGreaterThanOrEqual(0.5);
    });
});

describe('create3DMuzzleFlash', () => {
    it('constructs an additive unlit group with core, cone, and sparks', () => {
        const flash = create3DMuzzleFlash({
            color: 0xffd27a,
            isCryo: false
        });

        expect(flash).toBeInstanceOf(THREE.Group);
        expect(flash.children.length).toBeGreaterThan(1);
        expect(flash.userData).toBeDefined();
        expect(typeof flash.userData.update).toBe('function');
        expect(typeof flash.userData.dispose).toBe('function');
    });

    it('constructs cryo shockwave flash with custom cyan coloration', () => {
        const flash = create3DMuzzleFlash({
            color: 0x9beaff,
            isCryo: true
        });

        expect(flash).toBeInstanceOf(THREE.Group);
        expect(flash.userData.duration).toBeGreaterThan(0.1);
    });

    it('animates opacity and scale in userData.update until finished', () => {
        const flash = create3DMuzzleFlash({
            color: 0xffd27a,
            isCryo: false
        });

        const finishedImmediate = flash.userData.update(0.01);
        expect(finishedImmediate).toBe(false);

        const finishedEnd = flash.userData.update(0.2);
        expect(finishedEnd).toBe(true);
    });

    it('properly disposes geometries and materials without throwing', () => {
        const flash = create3DMuzzleFlash({
            color: 0xffd27a,
            isCryo: false
        });

        expect(() => {
            flash.userData.dispose();
        }).not.toThrow();
    });
});

function createMockElement(tag, id = '', initialClassName = '') {
    const children = [];
    const classListSet = new Set(initialClassName ? initialClassName.split(/\s+/).filter(Boolean) : []);
    let _className = initialClassName;
    let _textContent = '';
    const element = {
        tagName: tag.toUpperCase(),
        id,
        children,
        style: {},
        get textContent() {
            if (_textContent) return _textContent;
            return children.map(c => c.textContent).join(' ');
        },
        set textContent(val) {
            _textContent = val;
        },
        innerHTML: '',
        get className() {
            return _className;
        },
        set className(val) {
            _className = val;
            classListSet.clear();
            val.split(/\s+/).filter(Boolean).forEach(c => classListSet.add(c));
        },
        classList: {
            add: (c) => {
                classListSet.add(c);
                _className = Array.from(classListSet).join(' ');
            },
            remove: (c) => {
                classListSet.delete(c);
                _className = Array.from(classListSet).join(' ');
            },
            contains: (c) => classListSet.has(c)
        },
        appendChild: (child) => {
            children.push(child);
            child.parentElement = element;
            return child;
        },
        removeChild: (child) => {
            const idx = children.indexOf(child);
            if (idx >= 0) children.splice(idx, 1);
            child.parentElement = null;
            return child;
        },
        remove: () => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        },
        querySelector: (sel) => {
            if (sel.startsWith('.')) {
                const cls = sel.slice(1);
                return children.find(c => c.classList?.contains(cls)) || null;
            }
            if (sel.startsWith('#')) {
                const i = sel.slice(1);
                return children.find(c => c.id === i) || null;
            }
            return null;
        }
    };
    return element;
}

describe('KillstreakFeedbackSystem', () => {
    let killstreak;
    let originalDocument;
    let originalWindow;
    let mockContainer;

    beforeEach(() => {
        originalDocument = globalThis.document;
        originalWindow = globalThis.window;

        mockContainer = createMockElement('div', 'game-container');
        const elementsById = new Map([['game-container', mockContainer]]);

        globalThis.document = {
            createElement: (tag) => createMockElement(tag),
            getElementById: (id) => elementsById.get(id) || null,
            body: createMockElement('body')
        };

        // Track elements added to container
        const origAppend = mockContainer.appendChild;
        mockContainer.appendChild = (child) => {
            origAppend(child);
            if (child.id) elementsById.set(child.id, child);
            return child;
        };

        globalThis.window = {
            AudioManager: {
                play: vi.fn(),
                playVoiceCallout: vi.fn()
            }
        };

        killstreak = new KillstreakFeedbackSystem({
            container: mockContainer
        });
    });

    afterEach(() => {
        killstreak.dispose();
        globalThis.document = originalDocument;
        globalThis.window = originalWindow;
    });

    it('initializes cleanly and creates banner DOM container', () => {
        expect(killstreak.killCount).toBe(0);
        const container = mockContainer.querySelector('#killstreak-banner-container');
        expect(container).not.toBeNull();
    });

    it('accumulates kills within the streak window', () => {
        killstreak.registerKill({ enemyType: 'crawler' });
        expect(killstreak.killCount).toBe(1);

        killstreak.update(0.5); // 0.5s later (well within 3.5s window)
        killstreak.registerKill({ enemyType: 'crawler' });
        expect(killstreak.killCount).toBe(2);
    });

    it('triggers announcement banner at tier milestones (3, 5, 8, etc.)', () => {
        killstreak.registerKill(); // 1
        killstreak.registerKill(); // 2
        killstreak.registerKill(); // 3: TRIPLE PURGE
        expect(killstreak.killCount).toBe(3);

        const container = mockContainer.querySelector('#killstreak-banner-container');
        expect(container.children.length).toBe(1);
        const banner = container.querySelector('.killstreak-banner');
        expect(banner.textContent).toContain('TRIPLE PURGE');
        expect(window.AudioManager.playVoiceCallout).toHaveBeenCalledWith('killstreak');
    });

    it('handles boss kills with immediate high tier notification', () => {
        killstreak.registerKill({ isBoss: true });
        const container = mockContainer.querySelector('#killstreak-banner-container');
        const banner = container.querySelector('.killstreak-banner');
        expect(banner).not.toBeNull();
        expect(banner.textContent).toContain('TITAN DOWN');
    });

    it('resets streak count after streak window expires', () => {
        killstreak.registerKill();
        killstreak.registerKill();
        expect(killstreak.killCount).toBe(2);

        killstreak.update(4.0); // window is 3.5s
        expect(killstreak.killCount).toBe(0);
    });

    it('disposes DOM elements cleanly', () => {
        killstreak.dispose();
        const container = mockContainer.querySelector('#killstreak-banner-container');
        expect(container).toBeNull();
    });

    it('exports well-formed KILLSTREAK_TIERS configuration', () => {
        expect(KILLSTREAK_TIERS.length).toBeGreaterThanOrEqual(4);
        for (const tier of KILLSTREAK_TIERS) {
            expect(tier.count).toBeGreaterThan(0);
            expect(typeof tier.title).toBe('string');
            expect(typeof tier.subtitle).toBe('string');
            expect(tier.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });
});

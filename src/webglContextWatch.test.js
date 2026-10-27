import { describe, expect, it, vi } from 'vitest';
import { installWebglContextWatch, isCanvasContextLost, replaceLostCanvas } from './webglContextWatch.js';

// Just enough canvas for the watch: events, a WebGL context and DOM swap.
function canvasClass() {
    class FakeCanvas extends EventTarget {
        constructor(id) {
            super();
            this.id = id;
            this.parent = null;
        }
        getContext(type) {
            if (!type.startsWith('webgl')) return null;
            this.ctx ??= { lost: false, isContextLost() { return this.lost; } };
            return this.ctx;
        }
        cloneNode() {
            return new FakeCanvas(this.id);
        }
        replaceWith(next) {
            next.parent = this.parent;
            this.parent.child = next;
        }
    }
    return FakeCanvas;
}

describe('webglContextWatch', () => {
    it('logs a lost and restored context by canvas id', () => {
        const FakeCanvas = canvasClass();
        const log = vi.fn();
        installWebglContextWatch(log, FakeCanvas.prototype);
        const canvas = new FakeCanvas('armory-canvas');
        canvas.getContext('webgl2');
        canvas.dispatchEvent(new Event('webglcontextlost'));
        canvas.dispatchEvent(new Event('webglcontextrestored'));
        expect(log.mock.calls).toEqual([['lost', 'armory-canvas'], ['restored', 'armory-canvas']]);
    });

    it('replaces only a canvas whose context is lost', () => {
        const FakeCanvas = canvasClass();
        installWebglContextWatch(() => {}, FakeCanvas.prototype);
        const host = {};
        const canvas = new FakeCanvas('char-preview-3d');
        canvas.parent = host;
        host.child = canvas;
        const context = canvas.getContext('webgl2');
        expect(replaceLostCanvas(canvas)).toBe(canvas);

        context.lost = true;
        expect(isCanvasContextLost(canvas)).toBe(true);
        const fresh = replaceLostCanvas(canvas);
        expect(fresh).not.toBe(canvas);
        expect(fresh.id).toBe('char-preview-3d');
        expect(host.child).toBe(fresh);
        expect(isCanvasContextLost(fresh)).toBe(false);
    });

    it('never reports an untracked canvas as lost', () => {
        const FakeCanvas = canvasClass();
        expect(isCanvasContextLost(new FakeCanvas('x'))).toBe(false);
        expect(isCanvasContextLost(null)).toBe(false);
    });
});

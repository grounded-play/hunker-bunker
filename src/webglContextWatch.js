// A WebGL context lost to the GPU (out of memory, driver reset) leaves its
// canvas blank, and that canvas hands the same dead context to every renderer
// built on it afterwards. The 10-27 report "3D models don't load after Game
// Over" was this: the menu hero preview and the Armory came back white, and
// nothing in the session log said why.
//
// installWebglContextWatch() records every WebGL context as it is created and
// logs its loss and restore by canvas. replaceLostCanvas() swaps a canvas
// whose context is gone for a fresh copy, so a screen that builds its renderer
// on open gets a working one.
const contexts = new WeakMap();

function canvasName(canvas) {
    return canvas.id || canvas.parentElement?.id || canvas.className || 'canvas';
}

export function installWebglContextWatch(log, proto = globalThis.HTMLCanvasElement?.prototype) {
    if (!proto || proto.__hbContextWatch) return;
    const getContext = proto.getContext;
    proto.getContext = function watchedGetContext(type, ...rest) {
        const context = getContext.call(this, type, ...rest);
        if (context && String(type).startsWith('webgl') && !contexts.has(this)) {
            contexts.set(this, context);
            this.addEventListener('webglcontextlost', () => log?.('lost', canvasName(this)));
            this.addEventListener('webglcontextrestored', () => log?.('restored', canvasName(this)));
        }
        return context;
    };
    proto.__hbContextWatch = true;
}

export function isCanvasContextLost(canvas) {
    try {
        return Boolean(canvas && contexts.get(canvas)?.isContextLost?.());
    } catch {
        return false;
    }
}

export function replaceLostCanvas(canvas) {
    if (!isCanvasContextLost(canvas)) return canvas;
    const fresh = canvas.cloneNode(true);
    canvas.replaceWith(fresh);
    return fresh;
}

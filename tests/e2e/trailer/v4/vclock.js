// Virtual clock for trailer v4 capture (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §5.2).
//
// installVirtualClockShim runs in the page as an init script, before any game
// code. It wraps performance.now, Date.now, requestAnimationFrame and the
// timer functions. While the clock is "real" every wrapper passes straight
// through, so boot and shot setup run normally. capture.js then switches it to
// "virtual": time only moves when step(dtMs) is called, every pending timer
// and animation-frame callback is moved onto the virtual queue (keeping the
// ids the game holds), and CSS/Web Animations are paused and advanced by hand.
// Each step runs due timers, then the queued rAF callbacks (Three's
// setAnimationLoop, so game.render()), exactly as a real frame would.
//
// It also logs every game sound (AudioManager.play / playVoiceLine /
// playVoiceTrack) with the virtual time it fired, which is the per-shot cue
// sheet the trailer assembler uses to place the real game SFX on the frame.
//
// The function must stay self-contained: Playwright serialises it.
export function installVirtualClockShim() {
    if (window.__hbVClock) return;
    const real = {
        perfNow: performance.now.bind(performance),
        dateNow: Date.now.bind(Date),
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        raf: window.requestAnimationFrame.bind(window),
        caf: window.cancelAnimationFrame.bind(window)
    };

    let mode = 'real';
    let perfBase = 0;
    let dateBase = 0;
    let virtualMs = 0;
    // After leaving virtual mode the clock must not run backwards (game code
    // keeps lastTime from the last virtual frame), so real time is offset.
    let perfOffset = 0;
    let dateOffset = 0;

    const now = () => (mode === 'virtual' ? perfBase + virtualMs : real.perfNow() + perfOffset);
    performance.now = now;
    Date.now = () => (mode === 'virtual' ? dateBase + virtualMs : real.dateNow() + dateOffset);

    // Timers. Every id handed to page code is ours; `handle` is the real
    // timer behind it while in real mode.
    let nextId = 1;
    const timers = new Map();
    const fire = (id) => {
        const timer = timers.get(id);
        if (!timer) return;
        if (timer.interval === null) timers.delete(id);
        else timer.due += timer.interval;
        try {
            if (typeof timer.fn === 'function') timer.fn(...timer.args);
        } catch (error) {
            setTimeoutWrapped(() => { throw error; }, 0);
        }
    };
    const armReal = (id) => {
        const timer = timers.get(id);
        const delay = Math.max(0, timer.due - now());
        if (timer.interval === null) {
            timer.handle = real.setTimeout(() => fire(id), delay);
        } else {
            // Re-armed per tick so the due time stays the source of truth.
            const tick = () => {
                fire(id);
                if (timers.has(id) && mode === 'real') timer.handle = real.setTimeout(tick, Math.max(0, timer.due - now()));
            };
            timer.handle = real.setTimeout(tick, delay);
        }
    };
    const add = (fn, ms, args, repeat) => {
        const id = nextId++;
        const delay = Math.max(0, Number(ms) || 0);
        timers.set(id, { fn, args, due: now() + delay, interval: repeat ? Math.max(1, delay) : null, handle: null });
        if (mode === 'real') armReal(id);
        return id;
    };
    const clear = (id) => {
        const timer = timers.get(id);
        if (!timer) return;
        if (timer.handle !== null) real.clearTimeout(timer.handle);
        timers.delete(id);
    };
    function setTimeoutWrapped(fn, ms, ...args) { return add(fn, ms, args, false); }
    window.setTimeout = setTimeoutWrapped;
    window.setInterval = (fn, ms, ...args) => add(fn, ms, args, true);
    window.clearTimeout = clear;
    window.clearInterval = clear;

    // Animation frames.
    let nextFrameId = 1;
    const frames = new Map();
    window.requestAnimationFrame = (fn) => {
        const id = nextFrameId++;
        const entry = { fn, handle: null };
        frames.set(id, entry);
        if (mode === 'real') {
            entry.handle = real.raf((ts) => {
                if (!frames.has(id)) return;
                frames.delete(id);
                fn(ts + perfOffset);
            });
        }
        return id;
    };
    window.cancelAnimationFrame = (id) => {
        const entry = frames.get(id);
        if (!entry) return;
        if (entry.handle !== null) real.caf(entry.handle);
        frames.delete(id);
    };

    // Sound cue log, filled only while capturing.
    const events = [];
    let logging = false;
    let audioWrapped = false;
    const bufferKeys = new Map();
    const keyForBuffer = (manager, buffer) => {
        if (!buffer) return null;
        if (!bufferKeys.has(buffer)) {
            for (const [key, value] of Object.entries(manager.buffers ?? {})) bufferKeys.set(value, key);
        }
        return bufferKeys.get(buffer) ?? null;
    };
    const wrapAudio = () => {
        const manager = window.AudioManager;
        if (audioWrapped || !manager?.play) return;
        audioWrapped = true;
        let depth = 0;
        const original = manager.play;
        manager.play = function play(key, options = {}) {
            depth += 1;
            let result;
            try {
                result = original.call(this, key, options);
            } finally {
                depth -= 1;
            }
            if (logging && depth === 0) {
                events.push({
                    t: virtualMs,
                    kind: 'sfx',
                    key,
                    buffer: keyForBuffer(manager, result?.source?.buffer),
                    gain: result?.gainNode?.gain?.value ?? null,
                    pan: result?.panner?.pan?.value ?? null,
                    rate: result?.source?.playbackRate?.value ?? null,
                    loop: Boolean(options.loop),
                    bus: options.bus ?? null,
                    played: Boolean(result)
                });
            }
            return result;
        };
        for (const name of ['playVoiceLine', 'playVoiceTrack', 'playVoiceCallout', 'setRoomTone', 'playOST', 'setMusicContext']) {
            const fn = manager[name];
            if (typeof fn !== 'function') continue;
            manager[name] = function wrapped(key, options) {
                if (logging) {
                    events.push({ t: virtualMs, kind: name, key: typeof key === 'string' ? key : JSON.stringify(key ?? null) });
                }
                return fn.call(this, key, options);
            };
        }
    };

    const animations = new Set();
    const advanceAnimations = (dt) => {
        for (const animation of document.getAnimations()) {
            if (!animations.has(animation)) {
                animations.add(animation);
                animation.__hbWasRunning = animation.playState === 'running';
                animation.pause();
            }
            if (animation.playState === 'finished') continue;
            const current = Number(animation.currentTime) || 0;
            animation.currentTime = current + dt;
        }
    };

    window.__hbVClock = {
        get mode() { return mode; },
        get ms() { return virtualMs; },
        events,
        // `seed` swaps Math.random for a seeded generator for the take, so
        // spread, gibs and AI rolls repeat between recaptures of a recipe.
        startVirtual(seed = null) {
            if (mode === 'virtual') return;
            wrapAudio();
            if (seed !== null) {
                let state = seed >>> 0;
                window.__hbRealRandom = window.__hbRealRandom ?? Math.random;
                Math.random = () => {
                    state = (state + 0x6d2b79f5) >>> 0;
                    let t = state;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            }
            perfBase = now();
            dateBase = real.dateNow() + dateOffset;
            virtualMs = 0;
            mode = 'virtual';
            for (const timer of timers.values()) {
                if (timer.handle !== null) real.clearTimeout(timer.handle);
                timer.handle = null;
                // Due times were absolute real-perf times; keep the remaining delay.
                timer.due = perfBase + Math.max(0, timer.due - perfBase);
            }
            for (const entry of frames.values()) {
                if (entry.handle !== null) real.caf(entry.handle);
                entry.handle = null;
            }
            events.length = 0;
            logging = true;
        },
        // Advance by dtMs: due timers in order, then one animation frame.
        step(dtMs) {
            if (mode !== 'virtual') throw new Error('virtual clock is not running');
            const target = virtualMs + dtMs;
            for (let guard = 0; guard < 5000; guard += 1) {
                let nextTimer = null;
                for (const [id, timer] of timers) {
                    if (timer.due - perfBase <= target && (!nextTimer || timer.due < nextTimer[1].due)) nextTimer = [id, timer];
                }
                if (!nextTimer) break;
                virtualMs = Math.max(virtualMs, nextTimer[1].due - perfBase);
                fire(nextTimer[0]);
            }
            virtualMs = target;
            const due = [...frames.entries()];
            frames.clear();
            for (const [, entry] of due) {
                try {
                    entry.fn(perfBase + virtualMs);
                } catch (error) {
                    console.error('[vclock] frame callback failed', error);
                }
            }
            advanceAnimations(dtMs);
            return virtualMs;
        },
        stopVirtual() {
            if (mode !== 'virtual') return;
            logging = false;
            if (window.__hbRealRandom) Math.random = window.__hbRealRandom;
            const perfAtStop = perfBase + virtualMs;
            const dateAtStop = dateBase + virtualMs;
            mode = 'real';
            perfOffset = Math.max(0, perfAtStop - real.perfNow());
            dateOffset = Math.max(0, dateAtStop - real.dateNow());
            for (const id of timers.keys()) armReal(id);
            for (const [id, entry] of frames) {
                entry.handle = real.raf((ts) => {
                    if (!frames.has(id)) return;
                    frames.delete(id);
                    entry.fn(ts + perfOffset);
                });
            }
            for (const animation of animations) {
                if (animation.__hbWasRunning && animation.playState === 'paused') animation.play();
            }
            animations.clear();
        },
        pending() {
            return { timers: timers.size, frames: frames.size };
        }
    };
}

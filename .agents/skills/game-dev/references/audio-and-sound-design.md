# Web Audio Architecture & Sound Design

Great audio is 50% of the game experience. Modern web browsers impose strict autoplay restrictions and require robust pooling and spatial attenuation.

---

## 1. Browser Autoplay & AudioContext Unlock

Browsers block Web Audio until the user interacts with the page:

```javascript
let audioCtx = null;

export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }

  // Resume suspended context on user gesture
  if (audioCtx.state === 'suspended') {
    const unlock = () => {
      audioCtx.resume().then(() => {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  return audioCtx;
}
```

---

## 2. Preventing Ear Fatigue with Pitch Randomization

Repeated sound effects (gunshots, footsteps, hit impacts) sound mechanical and grating if played at the exact same pitch. Always randomize playback rate by `±8-12%`:

```javascript
export function playSound(audioBuffer, options = {}) {
  const ctx = getAudioContext();
  if (!audioBuffer || ctx.state !== 'running') return;

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  // Pitch randomization: [0.92, 1.08]
  const pitchVariation = options.pitchVariation || 0.08;
  const randomPitch = 1.0 + (Math.random() * 2 - 1) * pitchVariation;
  source.playbackRate.value = randomPitch;

  // Gain node for volume and ducking
  const gainNode = ctx.createGain();
  gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(0);
}
```

---

## 3. Positional 3D Audio

Use `PannerNode` connected to a listener attached to the camera:

```javascript
export function play3DSound(audioBuffer, emitterPosition, listenerCamera, maxDistance = 30) {
  const ctx = getAudioContext();
  if (!audioBuffer || ctx.state !== 'running') return;

  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1;
  panner.maxDistance = maxDistance;
  panner.rolloffFactor = 1.5;

  panner.positionX.value = emitterPosition.x;
  panner.positionY.value = emitterPosition.y;
  panner.positionZ.value = emitterPosition.z;

  // Update listener orientation from camera
  const listener = ctx.listener;
  if (listener.positionX) {
    listener.positionX.value = listenerCamera.position.x;
    listener.positionY.value = listenerCamera.position.y;
    listener.positionZ.value = listenerCamera.position.z;
  }

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(panner);
  panner.connect(ctx.destination);
  source.start(0);
}
```

---

## 4. Mute on Tab Inactive

Avoid annoying players when they switch tabs:

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
    }
  } else {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
});
```

import * as THREE from 'three';

export class KeyedVideoSprite {
    constructor(videoPath, {
        width = 1.0,
        height = 1.0,
        threshold = 0.06,
        edgeSoftness = 0.04,
        loop = false,
        onComplete = null
    } = {}) {
        this.videoPath = videoPath;
        this.width = width;
        this.height = height;
        this.threshold = threshold;
        this.edgeSoftness = edgeSoftness;
        this.loop = loop;
        this.onComplete = onComplete;

        this.video = null;
        this.texture = null;
        this.material = null;
        this.sprite = null;
        this._initFailed = false;

        this._init();
    }

    _init() {
        if (typeof document === 'undefined') {
            this._initFailed = true;
            return;
        }

        try {
            this.video = document.createElement('video');
            this.video.src = this.videoPath;
            this.video.crossOrigin = 'anonymous';
            this.video.playsInline = true;
            this.video.muted = true;
            this.video.loop = this.loop;
            
            if (!this.loop) {
                this.video.addEventListener('ended', () => {
                    if (this.onComplete) this.onComplete();
                });
            }

            this.video.addEventListener('error', (err) => {
                console.warn(`KeyedVideoSprite failed to load video ${this.videoPath}:`, err);
                this._initFailed = true;
            });

            this.video.play().catch(err => {
                console.warn(`KeyedVideoSprite video play failed (autorecover):`, err);
            });

            this.texture = new THREE.VideoTexture(this.video);
            this.texture.colorSpace = THREE.SRGBColorSpace;
            this.texture.minFilter = THREE.LinearFilter;
            this.texture.magFilter = THREE.LinearFilter;

            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    map: { value: this.texture },
                    threshold: { value: this.threshold },
                    edgeSoftness: { value: this.edgeSoftness }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                        mvPosition.xy += position.xy * vec2(
                            length(vec3(modelMatrix[0].x, modelMatrix[0].y, modelMatrix[0].z)),
                            length(vec3(modelMatrix[1].x, modelMatrix[1].y, modelMatrix[1].z))
                        );
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform sampler2D map;
                    uniform float threshold;
                    uniform float edgeSoftness;
                    varying vec2 vUv;
                    void main() {
                        vec4 color = texture2D(map, vUv);
                        float brightness = max(color.r, max(color.g, color.b));
                        if (brightness < threshold) {
                            discard;
                        }
                        float alpha = smoothstep(threshold, threshold + edgeSoftness, brightness);
                        gl_FragColor = vec4(color.rgb, color.a * alpha);
                    }
                `,
                transparent: true,
                depthWrite: false,
                depthTest: true
            });

            this.sprite = new THREE.Sprite(this.material);
            this.sprite.scale.set(this.width, this.height, 1);
        } catch (e) {
            console.error("KeyedVideoSprite initialization failed:", e);
            this._initFailed = true;
        }
    }

    getSprite() {
        if (this._initFailed || !this.sprite) {
            return new THREE.Object3D();
        }
        return this.sprite;
    }

    play() {
        if (this.video && this.video.paused) {
            this.video.play().catch(() => {});
        }
    }

    pause() {
        if (this.video && !this.video.paused) {
            this.video.pause();
        }
    }

    dispose() {
        if (this.video) {
            this.video.pause();
            this.video.src = '';
            this.video.load();
        }
        if (this.texture) {
            this.texture.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
        if (this.sprite && this.sprite.parent) {
            this.sprite.parent.remove(this.sprite);
        }
    }
}

import { describe, expect, it } from 'vitest';
import { TiltShiftPassShader } from './threeGame.js';

describe('TiltShiftPassShader Diorama Bokeh Upgrade', () => {
    it('defines expected uniforms for viewport and focus plane', () => {
        expect(TiltShiftPassShader.uniforms).toBeDefined();
        expect(TiltShiftPassShader.uniforms.focusY).toBeDefined();
        expect(TiltShiftPassShader.uniforms.focusRange).toBeDefined();
        expect(TiltShiftPassShader.uniforms.blurAmount).toBeDefined();
        expect(TiltShiftPassShader.uniforms.texelSize).toBeDefined();
        expect(TiltShiftPassShader.uniforms.dir).toBeDefined();
    });

    it('implements quadratic falloff for crisp diorama center', () => {
        const frag = TiltShiftPassShader.fragmentShader;
        expect(frag).toContain('normDist');
        expect(frag).toContain('factor * factor');
    });

    it('implements chromatic dispersion on defocused taps', () => {
        const frag = TiltShiftPassShader.fragmentShader;
        expect(frag).toContain('float chroma = factor * 0.0016');
        expect(frag).toContain('vec2(chroma, 0.0)');
    });

    it('preserves 1.000 energy with 7-tap Gaussian kernel weights', () => {
        // Parse weights from shader
        const frag = TiltShiftPassShader.fragmentShader;
        const w0Match = frag.match(/w0\s*=\s*([0-9.]+)/);
        const w1Match = frag.match(/w1\s*=\s*([0-9.]+)/);
        const w2Match = frag.match(/w2\s*=\s*([0-9.]+)/);
        const w3Match = frag.match(/w3\s*=\s*([0-9.]+)/);

        expect(w0Match).not.toBeNull();
        expect(w1Match).not.toBeNull();
        expect(w2Match).not.toBeNull();
        expect(w3Match).not.toBeNull();

        const w0 = parseFloat(w0Match[1]);
        const w1 = parseFloat(w1Match[1]);
        const w2 = parseFloat(w2Match[1]);
        const w3 = parseFloat(w3Match[1]);

        const totalWeight = w0 + 2 * (w1 + w2 + w3);
        expect(totalWeight).toBeCloseTo(1.0, 3);
    });
});

import { assetUrl } from './assetUrl.js';

const TITLES = [
    'Someone Is Still Alive', 'Kaelen\'s Sleeping Machine', 'The Math Is Beautiful Now',
    'Warmth Beneath the Ice', 'The Pipes Are Singing', 'Briggs Keeps the Ledger',
    'Your Name Was Written Twice', 'Dr. Nahl Remembers the Tissue', 'Mothership Customer Support',
    'Mothership Is Not Feeling Well', 'Her Voice Inside Your Helmet', 'The Queen Makes a Reasonable Offer',
    'A Snail Blocks the Hallway', 'Cold Enough to Think', 'The Spores Know Your Name',
    'We Could Avoid Doing This', 'It Understands the Gun', 'The Creature Lets You Pass',
    'Meridian Remembers You', 'Tallow Keeps the Steam', 'Vesper Sleeps in Shifts',
    'You Robbed the Only People Left', 'They Still Have Their Faces', 'Nobody Says Goodbye',
    'Gigawatt Goliath', 'Absolute Zero Has a Shell', 'The Bloom That Hunts',
    'Martha Runs Faster Now', 'Briggs Became the Barricade', 'Kaelen Is the Grid',
    'Mother of the Last World', 'Black Box Stain', 'The Cave Was Breathing',
    'Four Seats, One Survivor', 'Contraband Sunrise', 'We Escaped Together, Technically',
    'The Ice Gets Smaller', 'Destination: Core Worlds'
];

const slugify = (title) => title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export const SONG_INTERSTITIALS = Object.freeze(Object.fromEntries(TITLES.map((title, index) => {
    const number = index + 1;
    const id = String(number).padStart(2, '0');
    const slug = slugify(title);
    return [id, Object.freeze({
        id,
        title,
        image: `/interstitials/int_${id}_${slug}_key_v1.webp`,
        // Optional animator handoff: if absent or invalid, the still remains.
        motion: `/interstitials/motion/int_${id}_${slug}_motion_v1.webm`,
        audio: `/audio/ost/${title.replace(/:/g, '')}.mp3`,
        musicKey: `music_interstitial_${id}`,
        alt: `${title} interaction illustration`
    })];
})));

export const SIDE_STORY_INTERSTITIALS = Object.freeze({
    val_hearth_warmth: Object.freeze({
        id: 'val_hearth_warmth',
        title: 'Warmth of the Suture',
        character: 'Sister Val',
        camp: 'Camp Tallow',
        image: '/interstitials/int_val_hearth_warmth_key_v1.webp',
        audio: '/audio/ost/Warmth Beneath the Ice.mp3',
        musicKey: 'music_interstitial_04',
        alt: 'Sister Val warming the survivor hands at the geothermal hearth'
    }),
    val_spore_communion: Object.freeze({
        id: 'val_spore_communion',
        title: 'Botanical Spore Oil',
        character: 'Sister Val',
        camp: 'Camp Tallow',
        image: '/interstitials/int_val_spore_communion_key_v1.webp',
        audio: '/audio/ost/Tallow Keeps the Steam.mp3',
        musicKey: 'music_interstitial_20',
        alt: 'Sister Val applying glowing botanical spore salve'
    }),
    val_eternal_hearth: Object.freeze({
        id: 'val_eternal_hearth',
        title: 'The Eternal Hearth',
        character: 'Sister Val',
        camp: 'Camp Tallow',
        image: '/interstitials/int_val_eternal_hearth_key_v1.webp',
        audio: '/audio/ost/Warmth Beneath the Ice.mp3',
        musicKey: 'music_interstitial_04',
        alt: 'Devotional embrace at the Eternal Geothermal Hearth'
    }),
    briggs_scorched_rig: Object.freeze({
        id: 'briggs_scorched_rig',
        title: 'The Scorched Rig',
        character: 'Commander Briggs',
        camp: 'Camp Vesper',
        image: '/interstitials/int_briggs_scorched_rig_key_v1.webp',
        audio: '/audio/ost/Briggs Keeps the Ledger.mp3',
        musicKey: 'music_interstitial_06',
        alt: 'Commander Briggs resting at the smoking barricade'
    }),
    briggs_scar_tissue: Object.freeze({
        id: 'briggs_scar_tissue',
        title: 'Scar Tissue',
        character: 'Commander Briggs',
        camp: 'Camp Vesper',
        image: '/interstitials/int_briggs_scar_tissue_key_v1.webp',
        audio: '/audio/ost/Vesper Sleeps in Shifts.mp3',
        musicKey: 'music_interstitial_21',
        alt: 'Commander Briggs showing battle scars in the armory'
    }),
    briggs_vanguard_fire: Object.freeze({
        id: 'briggs_vanguard_fire',
        title: 'Vanguard Unyielding',
        character: 'Commander Briggs',
        camp: 'Camp Vesper',
        image: '/interstitials/int_briggs_vanguard_fire_key_v1.webp',
        audio: '/audio/ost/Briggs Became the Barricade.mp3',
        musicKey: 'music_interstitial_29',
        alt: 'Commander Briggs overlooking the subterranean canyon flares'
    }),
    kaelen_diagnostic_cradle: Object.freeze({
        id: 'kaelen_diagnostic_cradle',
        title: 'Diagnostic Cradle',
        character: 'Overseer Kaelen',
        camp: 'Camp Meridian',
        image: '/interstitials/int_kaelen_diagnostic_cradle_key_v1.webp',
        audio: '/audio/ost/Kaelens Sleeping Machine.mp3',
        musicKey: 'music_interstitial_02',
        alt: 'Overseer Kaelen at the cyan neural diagnostic cradle'
    }),
    kaelen_frequency_overclock: Object.freeze({
        id: 'kaelen_frequency_overclock',
        title: 'Frequency Overclock',
        character: 'Overseer Kaelen',
        camp: 'Camp Meridian',
        image: '/interstitials/int_kaelen_frequency_overclock_key_v1.webp',
        audio: '/audio/ost/Meridian Remembers You.mp3',
        musicKey: 'music_interstitial_19',
        alt: 'Overseer Kaelen and player connecting bio-link terminal'
    }),
    kaelen_supercharged_matrix: Object.freeze({
        id: 'kaelen_supercharged_matrix',
        title: 'Supercharged Matrix',
        character: 'Overseer Kaelen',
        camp: 'Camp Meridian',
        image: '/interstitials/int_kaelen_supercharged_matrix_key_v1.webp',
        audio: '/audio/ost/Kaelen Is the Grid.mp3',
        musicKey: 'music_interstitial_30',
        alt: 'Overseer Kaelen and player embraced inside the reactor matrix'
    }),
    aria_whispers_abyss: Object.freeze({
        id: 'aria_whispers_abyss',
        title: 'Whispers in the Abyss',
        character: 'Specimen 0047-B Aria',
        camp: 'The Hive Brood',
        image: '/interstitials/int_aria_whispers_abyss_key_v1.webp',
        audio: '/audio/ost/Her Voice Inside Your Helmet.mp3',
        musicKey: 'music_interstitial_11',
        alt: 'Aria floating suspended in purple bio-spore mist'
    }),
    aria_silk_trance: Object.freeze({
        id: 'aria_silk_trance',
        title: 'The Silk Trance',
        character: 'Specimen 0047-B Aria',
        camp: 'The Hive Brood',
        image: '/interstitials/int_aria_silk_trance_key_v1.webp',
        audio: '/audio/ost/The Queen Makes a Reasonable Offer.mp3',
        musicKey: 'music_interstitial_12',
        alt: 'Aria cradling the player helmet visor with chitin tendrils'
    }),
    aria_queens_mark: Object.freeze({
        id: 'aria_queens_mark',
        title: "The Queen's Mark",
        character: 'Specimen 0047-B Aria',
        camp: 'The Hive Brood',
        image: '/interstitials/int_aria_queens_mark_key_v1.webp',
        audio: '/audio/ost/Mother of the Last World.mp3',
        musicKey: 'music_interstitial_31',
        alt: "Symbiotic union in the heart of the Brood Queen chamber"
    })
});

export function getSideStoryInterstitial(id) {
    return SIDE_STORY_INTERSTITIALS[id] ?? null;
}

export function getSongInterstitial(id) {
    if (typeof id === 'string' && SIDE_STORY_INTERSTITIALS[id]) {
        return SIDE_STORY_INTERSTITIALS[id];
    }
    return SONG_INTERSTITIALS[String(id ?? '').padStart(2, '0')] ?? null;
}

export function selectCampInterstitial(detail = {}) {
    const id = detail.campId ?? detail.hiveId;
    const status = detail.campState?.status;
    if (detail.hiveId) return getSongInterstitial(status === 'turned' ? 23 : 11);
    if (status === 'robbed') return getSongInterstitial(22);
    if (status === 'turned') return getSongInterstitial(23);
    if (id === 'camp_meridian') return getSongInterstitial(2);
    if (id === 'camp_tallow') return getSongInterstitial(4);
    if (id === 'camp_vesper') return getSongInterstitial(6);
    return getSongInterstitial(1);
}

export class SongInterstitialController {
    constructor({ root, image, video, title, track, AudioManager, reducedMotion = false } = {}) {
        this.root = root;
        this.image = image;
        this.video = video;
        this.title = title;
        this.track = track;
        this.AudioManager = AudioManager;
        this.reducedMotion = reducedMotion;
        this._run = 0;
    }

    async startSong(spec) {
        const audio = this.AudioManager;
        if (!audio || !spec?.musicKey) return false;
        if (!audio.buffers?.[spec.musicKey] && spec.audio && audio.decodeAudioAsset) {
            try {
                audio.buffers[spec.musicKey] = await audio.decodeAudioAsset(assetUrl(spec.audio));
            } catch {
                return false;
            }
        }
        if (!audio.buffers?.[spec.musicKey]) return false;
        audio.stopMusic?.({ fadeSeconds: 0.18 });
        const started = audio.play?.(spec.musicKey, {
            volume: 0.86,
            loop: true,
            bus: 'music',
            varyPitch: false
        });
        if (!started) return false;
        audio.activeMusic = {
            source: started.source,
            gainNode: started.gainNode,
            bufferKey: spec.musicKey,
            context: `interstitial:${spec.id}`
        };
        audio.musicSource = started.source;
        return true;
    }

    loadStill(spec) {
        return new Promise((resolve) => {
            if (!this.image) return resolve(false);
            this.image.onload = () => resolve(true);
            this.image.onerror = () => resolve(false);
            this.image.src = assetUrl(spec.image);
        });
    }

    loadMotion(spec) {
        return new Promise((resolve) => {
            if (!this.video || !spec.motion) return resolve(false);
            let settled = false;
            const done = (loaded) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                this.video.oncanplay = null;
                this.video.onloadeddata = null;
                this.video.onerror = null;
                resolve(loaded);
            };
            const timeoutId = setTimeout(() => done(false), 1200);
            this.video.oncanplay = () => done(true);
            this.video.onloadeddata = () => done(true);
            this.video.onerror = () => done(false);
            this.video.src = assetUrl(spec.motion);
            this.video.load?.();
        });
    }

    async show(specOrId, { holdMs = 1050 } = {}) {
        const spec = typeof specOrId === 'object' ? specOrId : getSongInterstitial(specOrId);
        if (!spec || !this.root) return { shown: false, fallback: true };
        const run = ++this._run;
        const closeStartedAt = Date.now();
        this.root.classList.remove('hidden', 'is-open', 'is-settled', 'has-motion');
        this.root.classList.add('is-closing');
        this.root.setAttribute('aria-hidden', 'false');
        if (this.title) this.title.textContent = spec.title;
        if (this.track) this.track.textContent = `TRACK ${spec.id}`;
        const [loaded, motionLoaded] = await Promise.all([
            this.loadStill(spec),
            this.loadMotion(spec)
        ]);
        if (run !== this._run) return { shown: false, fallback: !loaded };

        if (!motionLoaded) {
            await this.startSong(spec);
        } else {
            this.AudioManager?.stopMusic?.({ fadeSeconds: 0.18 });
        }

        this.root.classList.toggle('has-placeholder', !loaded);
        if (this.image) {
            this.image.hidden = !loaded || motionLoaded;
            this.image.alt = loaded ? spec.alt : '';
        }
        if (this.video) {
            this.video.hidden = !motionLoaded;
            if (motionLoaded) {
                this.root.classList.add('has-motion');
                this.video.muted = false;
                this.video.volume = 0.86;
                this.video.currentTime = 0;
                this.video.play?.().catch?.(() => {});
            }
        }
        // Never reveal the incoming scene until the doors have completely met.
        // Asset decoding may finish instantly or slowly, so wait against the
        // original close start instead of adding an arbitrary post-load delay.
        const closeDuration = this.reducedMotion ? 100 : 540;
        const closeRemaining = Math.max(0, closeDuration - (Date.now() - closeStartedAt));
        await new Promise((resolve) => setTimeout(resolve, closeRemaining));
        this.root.classList.remove('is-closing');
        this.root.classList.add('is-open');
        await new Promise((resolve) => setTimeout(resolve, this.reducedMotion ? 120 : holdMs));
        this.root.classList.add('is-settled');
        await new Promise((resolve) => setTimeout(resolve, this.reducedMotion ? 80 : 260));
        this.hide();
        return { shown: true, fallback: !loaded };
    }

    hide() {
        if (!this.root) return;
        this.root.classList.add('hidden');
        this.root.classList.remove('is-closing', 'is-open', 'is-settled', 'has-placeholder', 'has-motion');
        this.root.setAttribute('aria-hidden', 'true');
        if (this.video) {
            this.video.pause?.();
            this.video.removeAttribute?.('src');
            this.video.load?.();
        }
    }
}

/**
 * Developer commentary: the opt-in cards that explain a moment as the player
 * reaches it (Settings > Audio > Developer Commentary), and the Read All list.
 *
 * Extracted from main.js (S49-38): main.js keeps the settings toggle and the
 * game-event hooks; this module owns the catalog, the cards, the per-run
 * once-only memory, the wait-for-gameplay hold and the list modal, and cleans
 * all of it up on dispose(). Everything environmental is injected, so the
 * behaviour is testable without a browser.
 */
import { localizeCatalog } from './i18nCatalog.js';

// Localized in place (narrative.commentary.<key>.title/body); English here is the source.
export const COMMENTARY_ENTRIES = localizeCatalog('narrative.commentary', Object.freeze({
    commentary_on: {
        title: 'Developer Commentary',
        body: 'Commentary is on. Cards like this one appear as you reach the moments they talk about: your first run, black boxes, special rooms, the Queen. Every entry can also be read from Settings > Audio > Developer Commentary > Read All.'
    },
    run_start: {
        title: 'The Run Loop',
        body: 'Oxygen, banking and the generator repair loop arrived together, in one commit on 28 May 2026. Before that nothing carried over between runs. The O2 clock is what turns "one more room" into a decision: deploy, read the threat, bank what matters, and get back before the air runs out.'
    },
    black_box_signal: {
        title: 'Failure Becomes Map Data',
        body: 'Black boxes went in during the first week of June 2026, and a day later the base began showing a previous contractor\'s box. A failed run stays on the map as a breadcrumb with its salvage still inside, rather than being wiped by a reload.'
    },
    black_box_recovered: {
        title: 'Recoverable Consequences',
        body: 'Recovering a box returns the salvage that run was carrying. In co-op every box has an owner: a September 2026 playtest showed one player\'s box being "recovered" when the other player died, so ownership is now sent over the network with the box.'
    },
    room_armory: {
        title: 'Armory Rooms',
        body: 'Armories were one of the first five authored room templates, added on 29 May 2026. They break the procedural rhythm on purpose: a hand-made room inside a generated map reads as meaningful before any UI does.'
    },
    room_the_nest: {
        title: 'Nest Rooms',
        body: 'The nest came from the same 29 May template pass. It is an authored danger shape inside generated terrain, so it says that something lives here, not that the dice rolled badly.'
    },
    room_agent_wreckage: {
        title: 'Three Wrecks',
        body: 'The wreckage rooms tie the three operators to one crash: one ship carried the tracking signal, one the relay and one the weapon. The wreck art was redrawn on 22 May 2026, one of the first art passes in the project.'
    },
    queen_fight: {
        title: 'Queen Fight',
        body: 'The Queen moves through three phases, brood, fury and desperation, and her armor only fully drops during weakpoint windows. Automated tests run every class through the fight, so none can skip the escalation and even the lowest-damage class still chips through her armor.'
    },
    queen_killed: {
        title: 'The Queen Can Die',
        body: 'Combat kills and narrative rejection are tracked separately. The story cares whether you defeated her body or only refused her offer.'
    },
    achievement: {
        title: 'Steam Achievements',
        body: 'Achievement tracking was added on 29 May 2026, alongside personal bests. They mark story milestones and should read like field records, not chores.'
    },
    leaderboard: {
        title: 'Trusted Scores',
        body: 'Scores are recomputed on our server from a run receipt; the client never just submits a number. In September 2026 that check silently rejected every Deck and PC score for six days, because the client and server tests used separate fixtures. One contract test now pins both.'
    },
    steam_vault: {
        title: 'Steam Vault',
        body: 'The Vault arrived with the Steam backend in July 2026. Tradable and marketable items live in Steam\'s inventory; the game only shows what Steam has verified you own.'
    }
}));

// The development history, told in order and read by the developer: the
// "Development History" section of Read All. Unlike the cards above it is not
// tied to a moment in play, so it is there whether or not commentary is on.
// Localized in place (narrative.devHistory.<key>.title/body).
export const DEV_HISTORY_ENTRIES = localizeCatalog('narrative.devHistory', Object.freeze({
    day_one: {
        title: 'Day One',
        body: 'The first commit landed on the fourteenth of May, 2026. It was a menu, a settings screen and a bunker door that slid shut between scenes. Hunker Bunker started as a phone game you played with your thumbs, and that door is still in the game today.'
    },
    engine: {
        title: 'Four Days In',
        body: 'On day four I threw out the engine. The first build ran on Phaser, a 2D framework, and I wanted light, depth and a world you look down into, so I moved everything to Three.js. The same week brought seeded procedural maps, wall collision and the first character sprites.'
    },
    loop: {
        title: 'Finding the Loop',
        body: 'For the first two weeks nothing carried over between runs. At the end of May oxygen, banking and the generator repair went in together, and the hand-made rooms arrived the next day. That was the moment it stopped being a toy and became a game: every room became a question of whether you could afford it.'
    },
    story: {
        title: 'The Story Shows Up',
        body: 'In July the story arrived all at once: the cave reveal, the hives, the human camps and the leaders who talk back. Ten endings came out of one long night of wiring, and the Queen fight followed a week later.'
    },
    steam: {
        title: 'Built for the Deck',
        body: 'In mid July the game moved into a desktop shell and a Steam build pipeline. On the twenty-fourth I deleted touch controls entirely and rebuilt the screen around the Steam Deck, sixteen by ten, controller first. Three days later the first two-point-oh beta was tagged.'
    },
    maze: {
        title: 'The Maze, Rebuilt',
        body: 'The underground is generated with wave function collapse, a technique that fits tiles together like a jigsaw. The first version made beautiful mazes you could not always finish. I rebuilt it again and again over one week, until the maze grew outward from the centre like a tree and every room had a way through.'
    },
    together: {
        title: 'Together, and Against',
        body: 'Co-op and versus arrived in August. Most of the work was not the fighting, it was the dull parts: what happens when the host leaves, who owns a black box, and making sure the server, not your machine, decides who won a round.'
    },
    languages: {
        title: 'Seven Languages',
        body: 'In September every word in the game was moved into seven languages, menus and story alike. An audit runs with the tests and fails the build if a new piece of English slips in untranslated.'
    },
    lessons: {
        title: 'What Broke',
        body: 'Plenty broke. Scores from Deck and PC were rejected for six days without anyone noticing. Frame rate was lost to things you never see, like rays fired at walls. I kept redrawing a player sprite that never came right, and in the end built the character in 3D instead. The rule I kept: never make the game look worse to make it run faster.'
    },
    voices: {
        title: 'The Voices',
        body: 'The cast you hear was generated on my own machine with an open voice model, then checked line by line by a speech recogniser. The voice reading this history is mine, cloned from a recording of me speaking. Thank you for playing, and for listening this far.'
    }
}));

const MENU_STACK_ID = 'menu-commentary-stack';
const PLAYING_WAIT_MS = 120_000;
const PLAYING_POLL_MS = 500;
const REMOVE_DELAY_MS = 320;

/**
 * @param {object} deps
 * @param {Document} [deps.doc]
 * @param {(key: string) => string} deps.t
 * @param {() => boolean} deps.isEnabled          commentary setting
 * @param {() => boolean} deps.isGameplayActive   gameplay phase with the HUD up
 * @param {() => boolean} [deps.isGameplayReady]  player in control (after the intro)
 * @param {() => Element|null} deps.getHudStack   the HUD notification stack
 * @param {() => number} deps.nextCardSeq         shared HUD card ordering
 * @param {(card: Element) => void} deps.dismissCard
 * @param {() => void} deps.updateDeck
 * @param {(el: Element|null) => void} [deps.focusTarget]
 * @param {(fn: () => void) => void} [deps.requestFrame]
 * @param {(key: string) => void} [deps.speak]  read an entry aloud if it has a recorded line
 * @param {(i18nKey: string) => boolean} [deps.hasVoice]  a recorded line exists for this key
 * @param {(i18nKey: string) => void} [deps.playVoice]    play it (Read All's play buttons)
 * @param {() => Promise<unknown>} [deps.loadVoices]       resolves once hasVoice() can answer
 */
export function createDeveloperCommentary({
    doc = globalThis.document,
    t,
    isEnabled,
    isGameplayActive,
    isGameplayReady = isGameplayActive,
    getHudStack,
    nextCardSeq,
    dismissCard,
    updateDeck,
    focusTarget = () => {},
    requestFrame = (fn) => globalThis.requestAnimationFrame(fn),
    speak = () => {},
    hasVoice = () => false,
    playVoice = () => {},
    loadVoices = () => Promise.resolve(),
    entries = COMMENTARY_ENTRIES,
    historyEntries = DEV_HISTORY_ENTRIES
}) {
    const seenThisRun = new Set();
    const timers = new Set();
    let disposed = false;

    const later = (fn, ms) => {
        const id = setTimeout(() => {
            timers.delete(id);
            if (!disposed) fn();
        }, ms);
        timers.add(id);
        return id;
    };

    // Commentary used to require the live gameplay HUD, so entries fired from
    // menus (Vault, Armory) or during the run intro were silently dropped and a
    // reviewer who switched it on saw nothing (Valve review 2026-09). Outside
    // gameplay, cards now go to a small stack over the menus.
    function getMenuStack() {
        let host = doc.getElementById(MENU_STACK_ID);
        if (!host) {
            host = doc.createElement('div');
            host.id = MENU_STACK_ID;
            host.className = 'menu-commentary-stack';
            doc.body.appendChild(host);
        }
        return host;
    }

    function show(key, detail = {}, { once = true } = {}) {
        if (disposed || !isEnabled()) return false;
        const entry = entries[key];
        if (!entry) return false;
        const seenKey = `${key}:${detail?.template ?? detail?.id ?? ''}`;
        if (once && seenThisRun.has(seenKey)) return false;

        const hudStack = isGameplayActive() ? getHudStack() : null;
        const stack = hudStack ?? getMenuStack();
        seenThisRun.add(seenKey);

        const card = doc.createElement('div');
        card.className = 'commentary-toast hud-stack-card hidden';
        card.setAttribute('aria-live', 'polite');
        card.dataset.notificationPriority = '22';
        card.dataset.seq = String(nextCardSeq());
        card.dataset.autoDismissMs = String(Math.max(6200, Math.min(11000, entry.body.length * 62)));
        card.dataset.removeDelayMs = String(REMOVE_DELAY_MS);

        const icon = doc.createElement('div');
        icon.className = 'commentary-toast__icon';
        icon.textContent = 'DC';
        const body = doc.createElement('div');
        body.className = 'commentary-toast__body';
        const kicker = doc.createElement('div');
        kicker.className = 'commentary-toast__kicker';
        kicker.textContent = t('ui.commentary.kicker');
        const title = doc.createElement('div');
        title.className = 'commentary-toast__title';
        title.textContent = entry.title;
        const blurb = doc.createElement('div');
        blurb.className = 'commentary-toast__blurb';
        blurb.textContent = entry.body;
        body.append(kicker, title, blurb);
        card.append(icon, body);
        card.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            dismissCard(card);
        });

        stack.append(card);
        card.classList.remove('hidden');
        speak(key);
        if (hudStack) {
            updateDeck();
            requestFrame(() => {
                card.classList.add('visible');
                updateDeck();
            });
        } else {
            // The menu stack has no HUD deck to time it out, so it times itself.
            requestFrame(() => card.classList.add('visible'));
            later(() => {
                card.classList.remove('visible');
                later(() => card.remove(), REMOVE_DELAY_MS);
            }, Number(card.dataset.autoDismissMs) || 8000);
        }
        return true;
    }

    // Run-start commentary fires while the intro is still playing; hold it
    // until the player is actually in control (gives up after 2 minutes).
    function showWhenPlaying(key) {
        if (disposed || !isEnabled()) return;
        const deadline = Date.now() + PLAYING_WAIT_MS;
        const tick = () => {
            if (isGameplayReady()) {
                show(key);
                return;
            }
            if (Date.now() < deadline) later(tick, PLAYING_POLL_MS);
        };
        tick();
    }

    function listItem(entry, voiceKey) {
        const item = doc.createElement('article');
        item.className = 'commentary-list__item';
        // Focusable like the achievement cards: the D-pad steps entry by entry
        // and each scrolls into view. Without it the play buttons were the only
        // stops, so focus cycled near the top and the history was unreachable.
        item.tabIndex = 0;
        const title = doc.createElement('h3');
        title.className = 'commentary-list__title';
        title.textContent = entry.title;
        item.append(title);
        if (hasVoice(voiceKey)) {
            const play = doc.createElement('button');
            play.type = 'button';
            play.className = 'commentary-list__play';
            play.textContent = t('ui.commentary.play');
            play.setAttribute('aria-label', t('ui.commentary.play_aria', { title: entry.title }));
            play.addEventListener('click', () => playVoice(voiceKey));
            item.append(play);
        }
        const body = doc.createElement('p');
        body.className = 'commentary-list__body';
        body.textContent = entry.body;
        item.append(body);
        return item;
    }

    function renderList() {
        const list = doc.getElementById('commentary-list');
        if (!list) return;
        list.innerHTML = '';
        for (const [key, entry] of Object.entries(entries)) {
            list.appendChild(listItem(entry, `narrative.commentary.${key}.body`));
        }
        const heading = doc.createElement('h3');
        heading.className = 'commentary-list__section';
        heading.textContent = t('ui.commentary.history_heading');
        const intro = doc.createElement('p');
        intro.className = 'commentary-list__section-intro';
        intro.textContent = t('ui.commentary.history_intro');
        list.append(heading, intro);
        for (const [key, entry] of Object.entries(historyEntries)) {
            list.appendChild(listItem(entry, `narrative.devHistory.${key}.body`));
        }
    }

    function openList() {
        const modal = doc.getElementById('commentary-list-modal');
        if (!modal) return;
        renderList();
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        // Play buttons appear once the voice manifest is known (first open only).
        Promise.resolve(loadVoices()).then(() => {
            if (!disposed && !modal.classList.contains('hidden')) renderList();
        }, () => {});
        requestFrame(() => focusTarget(doc.getElementById('close-commentary-list')));
    }

    function closeList() {
        const modal = doc.getElementById('commentary-list-modal');
        if (!modal || modal.classList.contains('hidden')) return false;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        return true;
    }

    function resetRun() {
        seenThisRun.clear();
    }

    // Cancels every pending card timeout and wait-for-gameplay poll, and
    // removes the menu stack with any cards still on it.
    function dispose() {
        disposed = true;
        for (const id of timers) clearTimeout(id);
        timers.clear();
        doc.getElementById(MENU_STACK_ID)?.remove();
        seenThisRun.clear();
    }

    return { show, showWhenPlaying, renderList, openList, closeList, resetRun, dispose };
}

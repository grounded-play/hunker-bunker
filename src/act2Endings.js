/**
 * Act 2 ending identifiers.
 *
 * Extracted from act2.js so storyLinchpins.js can name endings without a
 * circular import: act2 imports the linchpin lock filter, and the linchpins
 * need the ending ids to declare what they close off. act2.js re-exports
 * ACT2_ENDINGS, so every existing importer is unaffected.
 */
export const ACT2_ENDINGS = Object.freeze({
    FULL_BROOD: 'full_brood',
    CLEAN_ESCAPE: 'clean_escape',
    MIXED_CREW: 'mixed_crew',
    CARRIERS_BARGAIN: 'carriers_bargain',
    SCORCHED_SKY: 'scorched_sky',
    // Expanded families (docs/hive-swarm-camps-and-humanity-system-design.md)
    MOTHERSHIP_INFECTION: 'mothership_infection',
    ALIEN_EXODUS: 'alien_exodus',
    OUTED_ESCAPE: 'outed_escape',
    FAILED_CARRIER: 'failed_carrier',
    EMPTY_HUSK: 'empty_husk'
});

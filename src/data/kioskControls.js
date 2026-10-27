// The painted controls on each kiosk machine, in % of its overlay frame
// (public/ui/overlays/*.webp, 1376 x 768), measured off the art on a 10%
// grid. src/kioskTerminals.js seats the bezel interactivity layer
// (src/terminalBezelInteractivity.js) onto these, so a keypad press lands
// on the painted keypad and a screw turns on the painted bolt. Re-measure
// when an overlay is repainted.
const box = (x, y, w, h) => Object.freeze({ x, y, w, h });

export const KIOSK_CONTROLS = Object.freeze({
    fab_automart_overlay: Object.freeze({
        screwTL: box(6.4, 7.0, 3.6, 6.4),
        screwTR: box(89.9, 6.6, 3.6, 6.4),
        screwBL: box(6.8, 84.8, 3.6, 6.4),
        screwBR: box(90.6, 84.8, 3.6, 6.4),
        keypad: box(44.1, 77.7, 11.5, 15.7),
        auxDisplay: box(20.0, 78.5, 14.2, 8.3),
        leds: box(19.6, 69.0, 16.4, 7.8),
        coinInput: box(58.1, 69.3, 5.1, 9.9),
        currencySlot: box(43.6, 70.0, 13.1, 5.5),
        cardReader: box(77.9, 30.7, 5.5, 22.7),
        dispenser: box(65.0, 77.9, 18.2, 9.1),
        // The maintenance hatch drops open over the lower panel.
        hatch: box(18.5, 60.0, 66.0, 36.0)
    }),
    console_kiosk_overlay: Object.freeze({
        screwTL: box(9.4, 4.4, 2.8, 4.6),
        screwTR: box(88.1, 4.4, 2.8, 4.6),
        screwBL: box(9.4, 88.2, 2.8, 4.6),
        screwBR: box(88.1, 88.2, 2.8, 4.6),
        leds: box(85.9, 65.8, 4.2, 4.5),
        ledsLeft: box(10.0, 65.8, 4.2, 4.5),
        auxDisplay: box(35.6, 88.5, 28.8, 9.0),
        maintenancePort: box(57.4, 90.5, 5.1, 5.9),
        speakerLeft: box(6.2, 72.3, 8.0, 13.6),
        speakerRight: box(86.1, 72.3, 7.7, 13.6),
        switchLeft: box(10.0, 36.5, 1.6, 7.1),
        switchRight: box(88.2, 36.5, 1.9, 7.1),
        hatch: box(24.0, 58.0, 52.0, 39.0)
    })
});

// Which bezel-layer element sits on which painted control. Elements whose
// control a machine lacks are hidden rather than left floating.
export const BEZEL_SEATS = Object.freeze([
    ['.screw-tl', 'screwTL'],
    ['.screw-tr', 'screwTR'],
    ['.screw-bl', 'screwBL'],
    ['.screw-br', 'screwBR'],
    ['.bezel-keypad-grid', 'keypad'],
    ['#bezel-aux-display', 'auxDisplay'],
    ['.bezel-led-cluster', 'leds'],
    ['#bezel-coin-lever', 'coinInput'],
    ['#bezel-gauge-dial', 'gauge'],
    ['#bezel-maintenance-hatch', 'hatch']
]);

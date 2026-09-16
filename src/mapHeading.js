// The tactical map remains north-up. Three's zero yaw faces +Z, which is the
// bottom of the north-up canvas, while the arrow artwork's zero rotation faces
// the top. Translate between those coordinate systems without rotating the map.
export function mapRotationForWorldYaw(yaw = 0) {
    const safeYaw = Number.isFinite(yaw) ? yaw : 0;
    return Math.atan2(Math.sin(safeYaw), -Math.cos(safeYaw));
}

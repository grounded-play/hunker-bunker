
export function wrapAngle(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a <= -Math.PI) a += Math.PI * 2;
    return a;
}

export function stepAngleTowards(current, target, rate, delta) {
    const diff = wrapAngle(target - current);
    const t = 1 - Math.exp(-rate * delta);
    return wrapAngle(current + diff * t);
}

export function planarBasisFromOffsetAzimuth(offsetAzimuth) {
    const offsetX = Math.sin(offsetAzimuth);
    const offsetY = Math.cos(offsetAzimuth);
    const forward = { x: -offsetX, y: -offsetY };
    const right = { x: -forward.y, y: forward.x };
    return { forward, right };
}

export function aimVectorFromYaw(yaw) {
    return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

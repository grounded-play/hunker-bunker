# Cameras, Controls & Occlusion Raycasting in Three.js

Camera behavior defines how players perceive 3D space. Rigid camera locking creates jarring, motion-sick gameplay; smooth damping and occlusion avoidance provide a polished feel.

---

## 1. Smooth Third-Person Follow Camera

Avoid strict parent-child parenting of the camera directly to a rapidly rotating character. Instead, track the target using critically damped interpolation (smooth lerp):

```javascript
import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera, targetObject, options = {}) {
    this.camera = camera;
    this.target = targetObject;
    
    // Ideal camera offset relative to target orientation
    this.offset = options.offset || new THREE.Vector3(0, 3.5, -6.0);
    this.lookAtOffset = options.lookAtOffset || new THREE.Vector3(0, 1.8, 0);
    this.lerpSpeed = options.lerpSpeed || 6.0;

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Initialize position immediately
    this.calculateIdealPosition(this.currentPosition);
    this.calculateIdealLookAt(this.currentLookAt);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  calculateIdealPosition(outVec) {
    outVec.copy(this.offset);
    outVec.applyQuaternion(this.target.quaternion);
    outVec.add(this.target.position);
  }

  calculateIdealLookAt(outVec) {
    outVec.copy(this.lookAtOffset);
    outVec.applyQuaternion(this.target.quaternion);
    outVec.add(this.target.position);
  }

  update(dt) {
    const idealPosition = new THREE.Vector3();
    const idealLookAt = new THREE.Vector3();

    this.calculateIdealPosition(idealPosition);
    this.calculateIdealLookAt(idealLookAt);

    // Frame-rate independent exponential smoothing
    const t = 1.0 - Math.exp(-this.lerpSpeed * dt);
    this.currentPosition.lerp(idealPosition, t);
    this.currentLookAt.lerp(idealLookAt, t);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
```

---

## 2. Camera Wall Occlusion (Spring-Arm / Raycast)

In indoor environments or tight corridors, the camera will easily clip behind walls. Use a raycast from the player's head toward the ideal camera position to push the camera in front of occluding geometry:

```javascript
const raycaster = new THREE.Raycaster();
const cameraRay = new THREE.Vector3();

export function resolveCameraOcclusion(camera, playerHeadPos, idealCamPos, collisionObjects) {
  cameraRay.subVectors(idealCamPos, playerHeadPos);
  const maxDistance = cameraRay.length();
  const direction = cameraRay.normalize();

  raycaster.set(playerHeadPos, direction);
  raycaster.far = maxDistance;

  // Intersect against solid level walls and terrain
  const hits = raycaster.intersectObjects(collisionObjects, false);

  if (hits.length > 0) {
    // Push camera slightly in front of the hit point along the normal
    const hit = hits[0];
    const safeDistance = Math.max(0.5, hit.distance - 0.2);
    camera.position.copy(playerHeadPos).addScaledVector(direction, safeDistance);
  } else {
    camera.position.copy(idealCamPos);
  }
}
```

---

## 3. Robust Resize & Aspect Ratio Handling

Window resizing must update both the camera projection matrix and the renderer dimensions without stretching or warping:

```javascript
export function handleWindowResize(camera, renderer, composer) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (camera.isPerspectiveCamera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  } else if (camera.isOrthographicCamera) {
    const aspect = width / height;
    const frustumSize = 10;
    camera.left = (-frustumSize * aspect) / 2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
  }

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (composer) {
    composer.setSize(width, height);
  }
}
```

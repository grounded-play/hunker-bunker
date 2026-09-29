# Performance, Instancing & Batching in Three.js

In WebGL, CPU-to-GPU overhead is typically the primary bottleneck. Every distinct draw call requires the CPU to prepare uniform buffers, switch WebGL shader programs, and bind vertex attributes.

---

## 1. InstancedMesh for Duplicated Objects

When you have tens, hundreds, or thousands of objects sharing the same geometry and material (e.g. bullets, debris, foliage, enemies, crates), **NEVER create individual `new THREE.Mesh()` instances**. Use `THREE.InstancedMesh`.

### Implementation Pattern

```javascript
import * as THREE from 'three';

const count = 1000;
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // if instances move frequently

const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Initialize instance positions and colors
for (let i = 0; i < count; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 100,
    Math.random() * 10,
    (Math.random() - 0.5) * 100
  );
  dummy.rotation.set(0, Math.random() * Math.PI, 0);
  dummy.scale.setScalar(0.8 + Math.random() * 0.4);
  dummy.updateMatrix();

  instancedMesh.setMatrixAt(i, dummy.matrix);
  
  // Optional per-instance color
  color.setHSL(Math.random(), 0.7, 0.5);
  instancedMesh.setColorAt(i, color);
}

instancedMesh.instanceMatrix.needsUpdate = true;
if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
scene.add(instancedMesh);
```

### Updating Moving Instances

```javascript
export function updateBulletInstance(instancedMesh, index, position, rotation, scale) {
  dummy.position.copy(position);
  dummy.rotation.copy(rotation);
  if (scale) dummy.scale.copy(scale);
  dummy.updateMatrix();

  instancedMesh.setMatrixAt(index, dummy.matrix);
}

// At end of frame update:
instancedMesh.instanceMatrix.needsUpdate = true;
```

---

## 2. BatchedMesh (Three.js r159+)

If you have many static or dynamic objects that have **different geometries** but share the same material, `THREE.BatchedMesh` consolidates them into a single draw call.

```javascript
import * as THREE from 'three';

const maxGeometryCount = 50;
const maxVertexCount = 100000;
const maxIndexCount = 200000;
const material = new THREE.MeshStandardMaterial();

const batchedMesh = new THREE.BatchedMesh(
  maxGeometryCount,
  maxVertexCount,
  maxIndexCount,
  material
);

// Add unique geometries
const boxGeomId = batchedMesh.addGeometry(new THREE.BoxGeometry(1, 1, 1));
const sphereGeomId = batchedMesh.addGeometry(new THREE.SphereGeometry(0.5, 16, 16));

// Add instances referencing those geometries
const instanceId1 = batchedMesh.addInstance(boxGeomId);
const instanceId2 = batchedMesh.addInstance(sphereGeomId);

const matrix = new THREE.Matrix4();
batchedMesh.setMatrixAt(instanceId1, matrix.setPosition(0, 0, 0));
batchedMesh.setMatrixAt(instanceId2, matrix.setPosition(2, 0, 0));
scene.add(batchedMesh);
```

---

## 3. Merging Static Geometries (BufferGeometryUtils)

For static environment tiles or level geometry where models never move relative to each other:

```javascript
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const geometries = [];

for (const prop of staticProps) {
  const geom = prop.geometry.clone();
  geom.applyMatrix4(prop.matrix);
  geometries.push(geom);
}

const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);
const mergedMesh = new THREE.Mesh(mergedGeometry, sharedMaterial);
scene.add(mergedMesh);

// Clean up intermediate cloned geometries
geometries.forEach(g => g.dispose());
```

---

## 4. Frustum Culling & Level of Detail (LOD)

### Level of Detail
Reduce polygon complexity for distant objects:

```javascript
const lod = new THREE.LOD();

const highDetail = new THREE.Mesh(highGeom, material);
const medDetail = new THREE.Mesh(medGeom, material);
const lowDetail = new THREE.Mesh(lowGeom, material);

lod.addLevel(highDetail, 0);   // 0 - 20 units away
lod.addLevel(medDetail, 20);   // 20 - 50 units away
lod.addLevel(lowDetail, 50);   // 50+ units away

scene.add(lod);

// In render loop:
lod.update(camera);
```

### Manual Frustum / Distance Culling for Particles and Spawns
Disable updates and hide objects that are far beyond view:

```javascript
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

function cullEntities(entities, camera) {
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);

  for (const entity of entities) {
    if (!frustum.intersectsObject(entity.mesh)) {
      entity.mesh.visible = false;
    } else {
      entity.mesh.visible = true;
    }
  }
}
```

---

## 5. Performance Diagnostics Checklist

- [ ] `renderer.info.render.calls` is under 100 per frame.
- [ ] `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` is enabled.
- [ ] Transparent materials are used sparingly (alpha blending requires back-to-front depth sorting).
- [ ] Shadow casting is disabled on small props (`mesh.castShadow = false`, `mesh.receiveShadow = true`).
- [ ] Textures use power-of-two dimensions (e.g. 512x512, 1024x1024) to enable automatic GPU mipmapping.

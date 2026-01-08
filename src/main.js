import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ----- DOM -----
const canvas = document.getElementById('scene');

const ui = {
  // Part 1
  dirI: document.getElementById('dirI'),
  dirIVal: document.getElementById('dirIVal'),
  ambI: document.getElementById('ambI'),
  ambIVal: document.getElementById('ambIVal'),
  ptC: document.getElementById('ptC'),
  pyrC: document.getElementById('pyrC'),

  // Part 2
  modelFile: document.getElementById('modelFile'),
  dropHint: document.getElementById('dropHint'),
  tMode: document.getElementById('tMode'),

  posX: document.getElementById('posX'),
  posY: document.getElementById('posY'),
  posZ: document.getElementById('posZ'),

  rotX: document.getElementById('rotX'),
  rotY: document.getElementById('rotY'),
  rotZ: document.getElementById('rotZ'),

  sclX: document.getElementById('sclX'),
  sclY: document.getElementById('sclY'),
  sclZ: document.getElementById('sclZ'),
};

// ----- Renderer -----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ----- Scene -----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b10);

// ----- Camera -----
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(6, 4, 8);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);
controls.update();

// ----- Lights (>=3, >=2 types) -----
const ambient = new THREE.AmbientLight(0xffffff, Number(ui.ambI.value));
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, Number(ui.dirI.value));
sun.position.set(6, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
scene.add(sun);

const point = new THREE.PointLight(new THREE.Color(ui.ptC.value), 0.9, 60);
point.position.set(-4, 4, -2);
point.castShadow = true;
point.shadow.mapSize.set(1024, 1024);
scene.add(point);

// visible bulb for PointLight
const bulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
bulb.position.copy(point.position);
scene.add(bulb);

// ----- Texture (image) -----
const CHECKER_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAABAfUpbAAAArElEQVRYhe2XwQ2DMAxF3yJ0A0qgG5gG2gF0A1QDTgN0A9qQmQ7pJcW0rH2+u3qQv8r+0p8Qqkq9rYB3sYv5oSg8o4w2y4wX5o8m9bq3Qq0oQ9cJ8mQ0kQ8wQ1x7iQm2iQH4k1lQy6f6xYc4s3d+7dQZ5Z5zv2bq0r2kGm9xYx0kq6b9oQyF+gAAAABJRU5ErkJggg==';

const textureLoader = new THREE.TextureLoader();
const groundTex = textureLoader.load(CHECKER_PNG_DATA_URL);
groundTex.wrapS = THREE.RepeatWrapping;
groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(20, 20);
groundTex.colorSpace = THREE.SRGBColorSpace;

// ----- Objects (>=4) -----
// ground (PlaneGeometry is BufferGeometry)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.95,
    metalness: 0.0,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// custom pyramid (BufferGeometry)
function createPyramidGeometry({
  width = 2,
  depth = 2,
  height = 1.6,
  centerY = 0
} = {}) {
  const hw = width / 2;
  const hd = depth / 2;

  const A = new THREE.Vector3(-hw, centerY, -hd);
  const B = new THREE.Vector3(hw, centerY, -hd);
  const C = new THREE.Vector3(hw, centerY, hd);
  const D = new THREE.Vector3(-hw, centerY, hd);
  const E = new THREE.Vector3(0, centerY + height, 0);

  const triangles = [
    [D, C, E],
    [C, B, E],
    [B, A, E],
    [A, D, E],
    [A, B, C],
    [A, C, D],
  ];

  const positions = [];
  const normals = [];
  const uvs = [];

  const pushV3 = (arr, v) => arr.push(v.x, v.y, v.z);

  for (const [p0, p1, p2] of triangles) {
    const edge1 = new THREE.Vector3().subVectors(p1, p0);
    const edge2 = new THREE.Vector3().subVectors(p2, p0);
    const n = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    pushV3(positions, p0);
    pushV3(positions, p1);
    pushV3(positions, p2);

    for (let i = 0; i < 3; i++) normals.push(n.x, n.y, n.z);

    const isBase = (p0 === A && p1 === B && p2 === C) || (p0 === A && p1 === C && p2 === D);
    if (!isBase) {
      uvs.push(0, 0, 1, 0, 0.5, 1);
    } else {
      const mapXZ = (p) => {
        const u = (p.x + hw) / (2 * hw);
        const v = (p.z + hd) / (2 * hd);
        return [u, v];
      };
      const [u0, v0] = mapXZ(p0);
      const [u1, v1] = mapXZ(p1);
      const [u2, v2] = mapXZ(p2);
      uvs.push(u0, v0, u1, v1, u2, v2);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeBoundingSphere();
  return geom;
}

const pyramidMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(ui.pyrC.value),
  roughness: 0.55,
  metalness: 0.1,
  flatShading: true,
});
pyramidMat.needsUpdate = true;

const pyramid = new THREE.Mesh(createPyramidGeometry(), pyramidMat);
pyramid.castShadow = true;
pyramid.receiveShadow = true;
scene.add(pyramid);

// sphere
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.35, metalness: 0.2 })
);
sphere.position.set(3, 0.8, 1.5);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

// torus knot
const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.55, 0.2, 140, 18),
  new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.25, metalness: 0.35 })
);
knot.position.set(-3, 1.2, 1.5);
knot.castShadow = true;
knot.receiveShadow = true;
scene.add(knot);

// pedestal
const PEDESTAL_HEIGHT = 0.25;
const pedestal = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, PEDESTAL_HEIGHT, 2.2),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.0 })
);
pedestal.position.set(0, PEDESTAL_HEIGHT / 2, 0);
pedestal.castShadow = true;
pedestal.receiveShadow = true;
scene.add(pedestal);

// put pyramid on top
const pedestalTopY = pedestal.position.y + PEDESTAL_HEIGHT / 2;
pyramid.position.set(0, pedestalTopY + 0.001, 0);

// -------------------- PART 2 --------------------

// group to keep user models
const userModelsGroup = new THREE.Group();
userModelsGroup.name = 'UserModels';
scene.add(userModelsGroup);

// raycaster picking
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

// TransformControls
const transform = new TransformControls(camera, renderer.domElement);
transform.setSpace('world');
transform.addEventListener('dragging-changed', (e) => {
  controls.enabled = !e.value; // disable orbit while dragging
});
scene.add(transform);

let selected = null;
let suppressUIUpdate = false;

// helper: radians<->degrees
const radToDeg = (r) => (r * 180) / Math.PI;
const degToRad = (d) => (d * Math.PI) / 180;

// helper: make loaded meshes cast/receive shadow
function enableShadows(root) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        // keep it safe in case material is array
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        }
      }
    }
  });
}

// helper: compute nice scale + place on ground near center
function normalizeAndPlace(modelRoot) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  // move pivot to center
  modelRoot.position.sub(center);

  // scale to target size
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const target = 2.0;
  const s = target / maxDim;
  modelRoot.scale.setScalar(s);

  // recompute after scaling
  const box2 = new THREE.Box3().setFromObject(modelRoot);
  const minY = box2.min.y;

  // put on ground (y=0 plane)
  modelRoot.position.y -= minY;

  // offset a little so it's not inside pyramid/pedestal
  modelRoot.position.x = 0;
  modelRoot.position.z = -2.5;
}

// selection attach/detach
function selectObject(obj) {
  selected = obj;
  transform.attach(selected);
  updateTransformInputsFromSelected();
}

function clearSelection() {
  selected = null;
  transform.detach();
  clearTransformInputs();
}

function clearTransformInputs() {
  const ids = ['posX','posY','posZ','rotX','rotY','rotZ','sclX','sclY','sclZ'];
  suppressUIUpdate = true;
  for (const id of ids) ui[id].value = '';
  suppressUIUpdate = false;
}

function updateTransformInputsFromSelected() {
  if (!selected) return;
  suppressUIUpdate = true;

  ui.posX.value = selected.position.x.toFixed(2);
  ui.posY.value = selected.position.y.toFixed(2);
  ui.posZ.value = selected.position.z.toFixed(2);

  ui.rotX.value = radToDeg(selected.rotation.x).toFixed(0);
  ui.rotY.value = radToDeg(selected.rotation.y).toFixed(0);
  ui.rotZ.value = radToDeg(selected.rotation.z).toFixed(0);

  ui.sclX.value = selected.scale.x.toFixed(2);
  ui.sclY.value = selected.scale.y.toFixed(2);
  ui.sclZ.value = selected.scale.z.toFixed(2);

  suppressUIUpdate = false;
}

// apply numeric inputs -> selected
function applyInputsToSelected() {
  if (!selected || suppressUIUpdate) return;

  const px = Number(ui.posX.value);
  const py = Number(ui.posY.value);
  const pz = Number(ui.posZ.value);

  const rx = Number(ui.rotX.value);
  const ry = Number(ui.rotY.value);
  const rz = Number(ui.rotZ.value);

  const sx = Math.max(0.01, Number(ui.sclX.value));
  const sy = Math.max(0.01, Number(ui.sclY.value));
  const sz = Math.max(0.01, Number(ui.sclZ.value));

  if (!Number.isNaN(px)) selected.position.x = px;
  if (!Number.isNaN(py)) selected.position.y = py;
  if (!Number.isNaN(pz)) selected.position.z = pz;

  if (!Number.isNaN(rx)) selected.rotation.x = degToRad(rx);
  if (!Number.isNaN(ry)) selected.rotation.y = degToRad(ry);
  if (!Number.isNaN(rz)) selected.rotation.z = degToRad(rz);

  if (!Number.isNaN(sx)) selected.scale.x = sx;
  if (!Number.isNaN(sy)) selected.scale.y = sy;
  if (!Number.isNaN(sz)) selected.scale.z = sz;
}

// bind numeric fields
['posX','posY','posZ','rotX','rotY','rotZ','sclX','sclY','sclZ'].forEach((k) => {
  ui[k].addEventListener('input', applyInputsToSelected);
});

// update inputs while dragging with TransformControls
transform.addEventListener('objectChange', () => {
  updateTransformInputsFromSelected();
});

// transform mode
function setTransformMode(mode) {
  transform.setMode(mode);
  if (ui.tMode) ui.tMode.value = mode;
}
ui.tMode?.addEventListener('change', () => setTransformMode(ui.tMode.value));
setTransformMode(ui.tMode?.value || 'translate');

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
  if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
  if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
  if (e.key === 'Escape') clearSelection();
});

// picking by click
renderer.domElement.addEventListener('pointerdown', (e) => {
  // ignore if we're dragging gizmo
  if (transform.dragging) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

  raycaster.setFromCamera(mouseNDC, camera);

  // only pick from user models
  const pickables = [];
  userModelsGroup.traverse((o) => { if (o.isMesh) pickables.push(o); });

  const hits = raycaster.intersectObjects(pickables, true);
  if (hits.length) {
    // select top-most root model (we attach to model root, not mesh)
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== userModelsGroup) obj = obj.parent;
    selectObject(obj);
  } else {
    // click empty space -> unselect
    clearSelection();
  }
});

// ----- GLTF loading (input + drag/drop) -----
const gltfLoader = new GLTFLoader();

// load single file (glb/gltf) with support for related resources
async function loadModelFromFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  // find main file
  const main = files.find((f) => f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf'));
  if (!main) {
    alert('Please drop/select a .glb file.');
    return;
  }

  // create mapping name -> blob URL
  const urlMap = new Map();
  for (const f of files) urlMap.set(f.name, URL.createObjectURL(f));

  // custom URL resolver: if gltf references "model.bin" or textures, we redirect to blob URL
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const clean = decodeURIComponent(url).split('?')[0].split('#')[0];
    const base = clean.split('/').pop();
    if (urlMap.has(base)) return urlMap.get(base);
    return url;
  });

  const loader = new GLTFLoader(manager);

  const mainURL = urlMap.get(main.name);
  loader.load(
    mainURL,
    (gltf) => {
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) {
        alert('Could not load model scene.');
        return;
      }

      enableShadows(root);
      normalizeAndPlace(root);

      // give it a name
      root.name = `model_${Date.now()}`;

      userModelsGroup.add(root);
      selectObject(root);

      // cleanup blob urls (keep main + referenced until after load)
      setTimeout(() => {
        for (const u of urlMap.values()) URL.revokeObjectURL(u);
      }, 2000);
    },
    undefined,
    (err) => {
      console.error(err);
      alert('Failed to load model. Try a .glb file first.');
      for (const u of urlMap.values()) URL.revokeObjectURL(u);
    }
  );
}

// file input
ui.modelFile?.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (files && files.length) await loadModelFromFiles(files);
  // allow picking same file again
  e.target.value = '';
});

// drag and drop
function setDropState(isOver) {
  if (!ui.dropHint) return;
  ui.dropHint.classList.toggle('dragover', isOver);
}

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  setDropState(true);
});
window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  setDropState(false);
});
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  setDropState(false);

  const dt = e.dataTransfer;
  if (!dt) return;

  const files = dt.files;
  if (files && files.length) {
    await loadModelFromFiles(files);
  }
});

// ----- UI wiring (Part 1 params) -----
function syncLabels() {
  ui.dirIVal.textContent = Number(ui.dirI.value).toFixed(2);
  ui.ambIVal.textContent = Number(ui.ambI.value).toFixed(2);
}
syncLabels();

ui.dirI.addEventListener('input', () => {
  sun.intensity = Number(ui.dirI.value);
  syncLabels();
});

ui.ambI.addEventListener('input', () => {
  ambient.intensity = Number(ui.ambI.value);
  syncLabels();
});

ui.ptC.addEventListener('input', () => {
  point.color = new THREE.Color(ui.ptC.value);
});

ui.pyrC.addEventListener('input', () => {
  pyramid.material.color = new THREE.Color(ui.pyrC.value);
});

// ----- Resize -----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ----- Animate -----
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();

  // keep some motion for base scene
  pyramid.rotation.y = t * 0.4;
  knot.rotation.x = t * 0.3;
  knot.rotation.y = t * 0.55;

  // if user selected something, the inputs are updated by objectChange event;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();


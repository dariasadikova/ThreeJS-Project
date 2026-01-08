import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ----- DOM -----
const canvas = document.getElementById('scene');

const ui = {
  dirI: document.getElementById('dirI'),
  dirIVal: document.getElementById('dirIVal'),
  ambI: document.getElementById('ambI'),
  ambIVal: document.getElementById('ambIVal'),
  ptC: document.getElementById('ptC'),
  pyrC: document.getElementById('pyrC'),
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
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(6, 4, 8);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);
controls.update();

// ----- Helpers (optional, can comment out) -----
// scene.add(new THREE.AxesHelper(3));

// ----- Lights (>=3, at least 2 types) -----
const ambient = new THREE.AmbientLight(0xffffff, Number(ui.ambI.value));
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, Number(ui.dirI.value));
sun.position.set(6, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
scene.add(sun);

const point = new THREE.PointLight(new THREE.Color(ui.ptC.value), 0.9, 40);
point.position.set(-4, 4, -2);
point.castShadow = true;
point.shadow.mapSize.set(1024, 1024);
scene.add(point);

// Small visible bulb for PointLight
const bulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
bulb.position.copy(point.position);
scene.add(bulb);

// ----- Texture (image) -----
// Small checkerboard PNG as a data URL (still an image).
const CHECKER_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAABAfUpbAAAArElEQVRYhe2XwQ2DMAxF3yJ0A0qgG5gG2gF0A1QDTgN0A9qQmQ7pJcW0rH2+u3qQv8r+0p8Qqkq9rYB3sYv5oSg8o4w2y4wX5o8m9bq3Qq0oQ9cJ8mQ0kQ8wQ1x7iQm2iQH4k1lQy6f6xYc4s3d+7dQZ5Z5zv2bq0r2kGm9xYx0kq6b9oQyF+gAAAABJRU5ErkJggg==';

const textureLoader = new THREE.TextureLoader();
const groundTex = textureLoader.load(CHECKER_PNG_DATA_URL);
// Make the checker visible even on a big plane
groundTex.wrapS = THREE.RepeatWrapping;
groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(20, 20);
groundTex.colorSpace = THREE.SRGBColorSpace;

// ----- Objects (>=4) -----
// 1) Ground plane (BufferGeometry via PlaneGeometry) + texture
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

// 2) Custom pyramid (BufferGeometry)
function createPyramidGeometry({
  width = 2,
  depth = 2,
  height = 1.6,
  centerY = 0
} = {}) {
  const hw = width / 2;
  const hd = depth / 2;

  const A = new THREE.Vector3(-hw, centerY, -hd); // back-left
  const B = new THREE.Vector3(hw, centerY, -hd);  // back-right
  const C = new THREE.Vector3(hw, centerY, hd);   // front-right
  const D = new THREE.Vector3(-hw, centerY, hd);  // front-left
  const E = new THREE.Vector3(0, centerY + height, 0); // apex

  const triangles = [
    [D, C, E], // front
    [C, B, E], // right
    [B, A, E], // back
    [A, D, E], // left
    [A, B, C], // base 1 (down)
    [A, C, D], // base 2 (down)
  ];

  const positions = [];
  const normals = [];
  const uvs = [];

  const pushV3 = (arr, v) => arr.push(v.x, v.y, v.z);

  for (const [p0, p1, p2] of triangles) {
    // normal for the face
    const edge1 = new THREE.Vector3().subVectors(p1, p0);
    const edge2 = new THREE.Vector3().subVectors(p2, p0);
    const n = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    pushV3(positions, p0);
    pushV3(positions, p1);
    pushV3(positions, p2);

    // flat normals (same for 3 vertices)
    for (let i = 0; i < 3; i++) normals.push(n.x, n.y, n.z);

    // UV:
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
pyramid.position.set(0, 0, 0);
pyramid.castShadow = true;
pyramid.receiveShadow = true;
scene.add(pyramid);

// 3) Sphere
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.35, metalness: 0.2 })
);
sphere.position.set(3, 0.8, 1.5);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

// 4) Torus knot
const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.55, 0.2, 140, 18),
  new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.25, metalness: 0.35 })
);
knot.position.set(-3, 1.2, 1.5);
knot.castShadow = true;
knot.receiveShadow = true;
scene.add(knot);

// Extra: pedestal (object #5)
const PEDESTAL_HEIGHT = 0.25;
const pedestal = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, PEDESTAL_HEIGHT, 2.2),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.0 })
);
pedestal.position.set(0, PEDESTAL_HEIGHT / 2, 0);
pedestal.castShadow = true;
pedestal.receiveShadow = true;
scene.add(pedestal);

const pedestalTopY = pedestal.position.y + PEDESTAL_HEIGHT / 2;
pyramid.position.y = pedestalTopY + 0.001;

// ----- UI wiring (>=3 params) -----
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

  pyramid.rotation.y = t * 0.4;
  knot.rotation.x = t * 0.3;
  knot.rotation.y = t * 0.55;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();


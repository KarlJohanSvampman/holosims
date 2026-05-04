import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 1000);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();

// state
let center = { x: 0, y: 0 };
let zoom = 2; // 1 far, 3 close

// simple pan/zoom
window.addEventListener("wheel", (e) => {
  zoom = Math.max(1, Math.min(3, zoom + (e.deltaY > 0 ? -1 : 1)));
  fetchAndRender();
});

let isDragging = false;
let last = { x: 0, y: 0 };

renderer.domElement.addEventListener("mousedown", (e) => {
  isDragging = true; last = { x: e.clientX, y: e.clientY };
});
window.addEventListener("mouseup", () => isDragging = false);
window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - last.x;
  const dy = e.clientY - last.y;
  last = { x: e.clientX, y: e.clientY };

  center.x -= Math.round(dx * 0.05);
  center.y += Math.round(dy * 0.05);
  fetchAndRender();
});

// clear scene (keep camera)
function clearScene() {
  while (scene.children.length) scene.remove(scene.children[0]);
}

function addTile(t) {
  const geom = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(t.x, t.y, 0);
  scene.add(mesh);
}

function addModel(url, x, y, scale=1) {
  loader.load(url, (gltf) => {
    const obj = gltf.scene;
    obj.position.set(x, y, 0);
    obj.scale.set(scale, scale, scale);
    scene.add(obj);
  });
}

async function fetchAndRender() {
  const res = awaitfetch(`/api/view?sim_id=default&cx=${center.x}&cy=${center.y}&zoom=${zoom}`);
  const data = await res.json();

    console.log("DATA:", data); // 👈 add this

  clearScene();

  // tiles (LOD: only draw when zoom >=2)
  if (zoom >= 2) {
    data.tiles.forEach(addTile);
  }

  // props + doors (LOD: always, but fewer details when zoom=1)
  data.props.forEach(p => {
    // you can map type→model on client or request-resolved URLs from server
    const model = `/resources/props/${p.type}.glb`;
    addModel(model, p.x, p.y, zoom === 1 ? 0.5 : 1);
  });

  data.doors.forEach(d => {
    const model = d.is_open
      ? `/resources/props/door_open.glb`
      : `/resources/props/door.glb`;
    addModel(model, d.x, d.y, zoom === 1 ? 0.5 : 1);
  });

  // characters
  data.characters.forEach(c => {
    addModel(`/resources/characters/base.glb`, c.x, c.y, zoom === 1 ? 0.5 : 1);
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

fetchAndRender();
animate();
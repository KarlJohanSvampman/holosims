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

const propRegistry = {};

function loadProp(p) {
  const url = `/resources/props/${p.type}.glb`;

  loader.load(url, (gltf) => {
    const obj = gltf.scene;

    obj.position.set(p.x, p.y, 0);
    obj.rotation.z = (p.rotation || 0) * Math.PI / 180;

    // 🎬 animations
    const mixer = new THREE.AnimationMixer(obj);
    const actions = {};

    gltf.animations.forEach(clip => {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    // 🧠 anchors (NEW SYSTEM)
    const anchors = [];

    obj.traverse(child => {
      if (!child.name.startsWith("anchor_")) return;

      const interaction = child.userData.interaction;

      if (!interaction) return;

      anchors.push({
        name: child.name.replace("anchor_", ""),

        object: child,

        interaction: {
          type: interaction,

          animations: {
            start: child.userData.start_interaction || null,
            loop: interaction,
            stop: child.userData.stop_interaction || null,
            interrupted: child.userData.interrupted || null
          }
        },

        occupiedBy: null
      });
    });

    propRegistry[p.id] = {
      id: p.id,
      type: p.type,

      object: obj,
      mixer,
      actions,
      anchors,

      state: {
        is_closed: p.is_closed ?? false
      }
    };

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

  data.props.forEach(p => {
    if (!propRegistry[p.id]) {
      loadProp(p);
    }
  });

  data.doors.forEach(d => {
    if (!propRegistry[d.id]) {
      loadProp(d);
    }

    const prop = propRegistry[d.id];
    if (!prop) return;

    const anchor = prop.anchors[0]; // or pick push/pull

    if (d.is_open) {
      playPropAnimation(prop, anchor, "start");
    } else {
      playPropAnimation(prop, anchor, "stop");
    }
  });

  // characters
  data.characters.forEach(c => {
    addModel(`/resources/characters/Adult_Male.fbx`, c.x, c.y, zoom === 1 ? 0.5 : 1);
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

fetchAndRender();
animate();
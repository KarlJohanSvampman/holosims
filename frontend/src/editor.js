import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export let editorState = {
  selected: null,
  mode: "select",
  hovered: null
};

export function initEditor({
  scene,
  camera,
  renderer,
  propRegistry,
  sims
}) {

  // =====================================
  // ORBIT CONTROLS
  // =====================================

  const controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // =====================================
  // RAYCASTING
  // =====================================

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener(
    "pointerdown",
    (event)=>{

      mouse.x =
        (event.clientX / window.innerWidth) * 2 - 1;

      mouse.y =
        -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(
        mouse,
        camera
      );

      const objects = [];

      // props
      for(const id in propRegistry){

        const p = propRegistry[id];

        if(p?.mesh){

          p.mesh.userData.editor = {
            type: "prop",
            id
          };

          objects.push(p.mesh);
        }
      }

      // sims
      for(const id in sims){

        const s = sims[id];

        if(s){

          s.userData.editor = {
            type: "character",
            id
          };

          objects.push(s);
        }
      }

      const hits =
        raycaster.intersectObjects(
          objects,
          true
        );

      if(!hits.length){

        clearSelection();
        return;
      }

      let o = hits[0].object;

      while(o){

        if(o.userData?.editor){

          selectObject(
            o.userData.editor
          );

          return;
        }

        o = o.parent;
      }
    }
  );

  // =====================================
  // SELECTION HIGHLIGHT
  // =====================================

  function selectObject(data){

    editorState.selected = data;

    const panel =
      document.getElementById(
        "editorSelection"
      );

    if(panel){

      panel.innerHTML = `
        <b>${data.type}</b><br>
        ${data.id}
      `;
    }

    console.log(
      "Selected:",
      data
    );
  }

  function clearSelection(){

    editorState.selected = null;

    const panel =
      document.getElementById(
        "editorSelection"
      );

    if(panel){

      panel.innerHTML =
        "Nothing selected";
    }
  }

  // =====================================
  // DEBUG OVERLAY
  // =====================================

  const debug =
    document.createElement("div");

  debug.style.position = "fixed";
  debug.style.bottom = "10px";
  debug.style.left = "10px";
  debug.style.padding = "8px";
  debug.style.background =
    "rgba(0,0,0,0.7)";
  debug.style.color = "white";
  debug.style.fontFamily =
    "monospace";
  debug.style.fontSize = "12px";
  debug.style.zIndex = "9999";

  document.body.appendChild(debug);

  // =====================================
  // UPDATE LOOP
  // =====================================

  function update(){

    controls.update();

    debug.innerHTML = `
      props:
      ${Object.keys(propRegistry).length}
      <br>
      sims:
      ${Object.keys(sims).length}
      <br>
      selected:
      ${editorState.selected
        ? editorState.selected.id
        : "none"}
    `;

    requestAnimationFrame(update);
  }

  update();
}


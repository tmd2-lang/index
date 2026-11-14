/* =========================================================
   Ending: the spinning 3D Ligo logo, the title's letter pop-in, and the
   button's letters (split so they can roll away on hover).

   The logo replaces Pocketchange's gold coin: same 120px canvas, same
   endless spin. We take the real logo shape from logo-mark.svg, push it
   out into a solid (an "extrusion", like a cookie cutter through dough),
   and light it like the phones so the orange metal catches reflections.
   ========================================================= */

import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const finale = document.querySelector(".finale");
const canvas = finale.querySelector(".finale__logo");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------- Letters ----------
   Same splitter as the question card: every letter in its own span,
   numbered for the stagger, words kept together. */
const splitLetters = (element) => {
  let index = 0;
  element.innerHTML = element.textContent
    .trim()
    .split(" ")
    .map((word) => {
      const letters = [...word]
        .map((letter) => `<span class="char" style="--i:${index++}">${letter}</span>`)
        .join("");
      return `<span class="word">${letters}</span>`;
    })
    .join(" ");
};

splitLetters(finale.querySelector(".finale__title"));
splitLetters(finale.querySelector(".finale__label"));

// the title pops in when the block's top is ~85% down the screen
new IntersectionObserver(
  ([entry], observer) => {
    if (entry.isIntersecting) {
      finale.classList.add("is-in");
      observer.disconnect();
    }
  },
  { rootMargin: "0px 0px -15% 0px" }
).observe(finale);


/* ---------- 3D logo ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(120, 120, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 4.2);

// a soft studio to reflect, plus one warm key light for a bright edge
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xfff1e0, 2);
key.position.set(-2, 3, 4);
scene.add(key);

const svg = await new SVGLoader().loadAsync("assets/logo-mark.svg");

const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path));
const geometry = new THREE.ExtrudeGeometry(shapes, {
  depth: 60,
  bevelEnabled: true,
  bevelThickness: 10,
  bevelSize: 6,
  bevelSegments: 4,
  curveSegments: 24,
});

// center it and size it so it fills the canvas like their coin
geometry.center();
const box = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
const size = box.getSize(new THREE.Vector3());

const material = new THREE.MeshPhysicalMaterial({
  color: 0xf97316,
  metalness: 0.65,
  roughness: 0.22,
  clearcoat: 1,
  clearcoatRoughness: 0.15,
});

const logo = new THREE.Mesh(geometry, material);
// SVG's y axis points down, Three.js's points up: flip it
logo.scale.set(1, -1, 1).multiplyScalar(2 / Math.max(size.x, size.y));
const spinner = new THREE.Group();
spinner.add(logo);
scene.add(spinner);


/* ---------- Spin ----------
   One full turn about every 3.5s, around the upright axis, like a coin
   standing on its edge. Only draws while it's on screen. */
let visible = false;
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
}).observe(canvas);

const clock = new THREE.Clock();

const frame = () => {
  const dt = clock.getDelta();
  if (visible) {
    if (!reduceMotion) {
      spinner.rotation.y += dt * 1.8;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
};

renderer.render(scene, camera);
frame();

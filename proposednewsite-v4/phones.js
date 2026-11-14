/* =========================================================
   Ligo v4 hero phones: two real iPhone models and a reflection, in Three.js.

   Why a real model: a phone's look comes from its rounded metal band and
   glass catching light. A 3D model with real materials gets that for free
   once we give it something to reflect (an "environment").

   Model (CC Attribution, credited in the page): "Phone 17 Pro Max" by
   Ranguel on Sketchfab, compressed with gltf-transform (WebP textures +
   meshopt geometry: ~9.5 MB → 2.7 MB). Both phones are the same orange
   model, so the page downloads it once.
   ========================================================= */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const canvas = document.querySelector(".stage__canvas");
const stage = document.querySelector(".stage");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------- Renderer, scene, camera ----------
   alpha: true keeps the canvas see-through, so the liquid background
   shows around the phones.
   "Neutral" tone mapping tames the bright highlights without draining
   the color out of the orange (the filmic one we had turned it pale). */
// stencil: true gives us a "cut-out mask" layer, used to keep the reflection
// inside the back phone's screen (see "The reflection")
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: true });
// 1.5x, not full retina 2x: on a moving, softly lit 3D scene the eye can't
// tell, and it's ~45% fewer pixels to draw every frame (we draw 3 passes)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;

// we draw the scene in three passes (see "Render loop"), so we clear by hand
renderer.autoClear = false;

const scene = new THREE.Scene();

// a long lens (small field of view) flattens perspective, like product shots
const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
camera.position.set(0, 0, 9);


/* ---------- Layers ----------
   Pocketchange stacks three flat pictures: back phone, a reflection in the
   back phone's glass, front phone.
   We do the same with 3D objects: each one lives on its own layer and gets
   drawn in its own pass, bottom to top. That way the stacking order is
   fixed, however the phones are tilted, exactly like stacked pictures. */
const LAYER_BACK = 1;
const LAYER_REFLECTION = 2;
const LAYER_FRONT = 3;
const DRAW_ORDER = [LAYER_BACK, LAYER_REFLECTION, LAYER_FRONT];

const putOnLayer = (object, layer) => {
  object.traverse((part) => part.layers.set(layer));
};


/* ---------- Light ----------
   Shiny metal has almost no color of its own: it shows what it reflects.
   So instead of a white photo studio we build a tiny orange "room" for the
   phones to reflect: dark burnt-orange walls (the rich, deep tones) and a
   few very bright panels (the white streaks along the edges). */
const room = new THREE.Scene();

const walls = new THREE.Mesh(
  new THREE.SphereGeometry(10, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0x9a3a0c, side: THREE.BackSide })
);
room.add(walls);

const addPanel = (x, y, z, width, height, brightness) => {
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(brightness, brightness * 0.93, brightness * 0.82), side: THREE.DoubleSide })
  );
  panel.position.set(x, y, z);
  panel.lookAt(0, 0, 0);
  room.add(panel);
};

addPanel(-6, 5, 4, 5, 5, 9);   // big soft light, upper left
addPanel(7, 1, 2, 1.2, 9, 12); // tall thin strip on the right: the edge streak
addPanel(0, -7, 3, 6, 2, 3);   // low glow from below, like light off a table

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(room, 0.03).texture;
scene.environmentIntensity = 1;

const key = new THREE.DirectionalLight(0xfff1e0, 1.4);
key.position.set(-3, 4, 5);
key.layers.enableAll();
scene.add(key);


/* ---------- Screens ----------
   Each model's screen is its own material named "OLED", lit by an
   "emissive" image (it glows, like a real display). We swap that image
   for a Ligo screen. glTF images are stored upside-down compared to
   Three.js's default, hence flipY = false. These models also map the
   screen mirrored left-to-right, so we flip it back with repeat.x = -1. */
const COVER_GLASS = "PaletteMaterial007";

const textureLoader = new THREE.TextureLoader();

const loadScreen = (url) => {
  const texture = textureLoader.load(url);
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
};

const putOnScreen = (phone, texture) => {
  phone.traverse((part) => {
    if (part.isMesh && part.material.name === "OLED") {
      part.material = part.material.clone();
      part.material.map = null;
      part.material.color.set(0x000000);
      part.material.emissive.set(0xffffff);
      part.material.emissiveMap = texture;
      part.material.emissiveIntensity = 1;
      // keep the screen's real colors: tone mapping is for the lit metal, not a display
      part.material.toneMapped = false;
      // the display itself stays matte; the shine comes from the glass on top of it
      part.material.roughness = 1;
      part.material.envMapIntensity = 0;
    }

    // The cover glass (named "PaletteMaterial007" in this compressed model).
    // As shipped it re-draws what's behind it blurred and dimmed, which put
    // a grey haze over the screens. We rebuild it as a sheet that ADDS light
    // and never removes any: black glass + "additive" blending means the only
    // thing it contributes is its reflections (a soft shine along the edges).
    if (part.isMesh && part.material.name === COVER_GLASS) {
      part.material = part.material.clone();
      part.material.transmission = 0;
      part.material.clearcoat = 0;
      part.material.map = null;
      part.material.metalnessMap = null;
      part.material.roughnessMap = null;
      part.material.color.set(0x000000);
      part.material.metalness = 0;
      part.material.roughness = 0.06;
      part.material.transparent = true;
      part.material.blending = THREE.AdditiveBlending;
      part.material.depthWrite = false;
      part.material.toneMapped = false;
    }
  });

  addGlare(phone);
};


/* ---------- Glare ----------
   What makes a screen read as glass is a streak of light lying across it.
   Real reflections depend on luck (is there a lamp at exactly the right
   angle?), so product renders paint the streak on. We do the same: draw a
   diagonal band of light once, then lay it over each screen.
   Our screens are mostly white, and white can't get any brighter. So the
   picture does two things: it dims the whole screen a touch (a warm tint,
   like glass mirroring the orange room), then the band of light cuts
   through that tint. The contrast between the two is what you read as glare.
   The trick: we copy the screen's own shape for it, so the glare has the
   exact same rounded corners and can never spill onto the frame. */
const makeGlareTexture = () => {
  const art = document.createElement("canvas");
  art.width = 256;
  art.height = 512;
  const pen = art.getContext("2d");

  // the band runs corner to corner: soft on its upper side, crisp on its
  // lower side, like the edge of a window reflected in the glass
  const band = pen.createLinearGradient(0, 0, art.width * 1.15, art.height * 0.6);
  band.addColorStop(0, "rgba(255, 250, 244, 0)");
  band.addColorStop(0.3, "rgba(255, 250, 244, 0.35)");
  band.addColorStop(0.62, "rgba(255, 250, 244, 0.8)");
  band.addColorStop(0.625, "rgba(255, 250, 244, 0)");
  band.addColorStop(1, "rgba(255, 250, 244, 0)");

  // 1. the faint warm tint over everything
  pen.fillStyle = "rgba(110, 45, 10, 0.2)";
  pen.fillRect(0, 0, art.width, art.height);

  // 2. the band of light on top
  pen.fillStyle = band;
  pen.fillRect(0, 0, art.width, art.height);

  // same orientation fixes as the screen images
  const texture = new THREE.CanvasTexture(art);
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const glareMaterial = new THREE.MeshBasicMaterial({
  map: makeGlareTexture(),
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  // draw it a hair in front of the screen so the two don't flicker
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});

const addGlare = (phone) => {
  const screens = [];
  phone.traverse((part) => {
    if (part.isMesh && part.material.name === "OLED") {
      screens.push(part);
    }
  });

  for (const screen of screens) {
    const glare = new THREE.Mesh(screen.geometry, glareMaterial);
    glare.position.copy(screen.position);
    glare.quaternion.copy(screen.quaternion);
    glare.scale.copy(screen.scale);
    glare.renderOrder = 2;
    screen.parent.add(glare);
  }
};


/* ---------- Loading + normalizing a model ----------
   Every model arrives at its own size and position. We center it and
   scale it so it's exactly PHONE_HEIGHT tall, then turn it 180° so the
   screen faces the camera (these models face away by default). */
const PHONE_HEIGHT = 2;

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const loadPhone = async (url) => {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);
  const holder = new THREE.Group();
  holder.add(model);
  holder.scale.setScalar(PHONE_HEIGHT / size.y);
  holder.rotation.y = Math.PI;

  return holder;
};


/* ---------- The reflection ----------
   Pocketchange's middle picture (their file is literally named "reflection")
   is the BACK of the front phone, cameras and all, mirrored in the back
   phone's glass. Three things make a copy of the phone read as a reflection:
   1. It's dim and see-through, like anything you see mirrored in a screen.
   2. It fades out toward the bottom.
   3. It only appears where there's glass: it's cut off at the edges of the
      back phone's screen. That's the stencil: while drawing the back phone,
      its screen also paints a "1" into an invisible mask, and the reflection
      is only allowed to draw where the mask says 1. */
const MASK = 1;

// the back phone's screen paints the mask
const paintMask = (phone) => {
  phone.traverse((part) => {
    if (part.isMesh && part.material.name === "OLED") {
      part.material.stencilWrite = true;
      part.material.stencilRef = MASK;
      part.material.stencilFunc = THREE.AlwaysStencilFunc;
      part.material.stencilZPass = THREE.ReplaceStencilOp;
    }
  });
};

// Where the fade starts and ends, as heights in the scene. Updated every
// frame (see applyFloat) so the fade travels with the floating reflection.
const fade = {
  top: { value: 0 },
  bottom: { value: 0 },
};

// Adds "fade out toward the bottom" to any material: the shader works out how
// high each pixel is in the scene and lowers its opacity the lower it gets.
const addFade = (material) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.fadeTop = fade.top;
    shader.uniforms.fadeBottom = fade.bottom;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vHeight;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvHeight = (modelMatrix * vec4(transformed, 1.0)).y;");

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vHeight;\nuniform float fadeTop;\nuniform float fadeBottom;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(fadeBottom, fadeTop, vHeight);");
  };
};


// The reflection is a PICTURE of the phone's back, taken once when the page
// loads, like Pocketchange's pre-made "reflection" image. A flat picture can't
// show anything through itself, so the back always reads as one solid panel:
// orange glass, the camera plateau, three lenses and the flash.
const SNAPSHOT_HEIGHT = 1024;

const photographBack = (phone) => {
  // a tiny photo studio with only the phone in it, lit like the main scene
  const studio = new THREE.Scene();
  studio.environment = scene.environment;
  studio.environmentIntensity = scene.environmentIntensity;

  const light = new THREE.DirectionalLight(0xfff1e0, 1.4);
  light.position.set(-3, 4, 5);
  studio.add(light);

  // the phone as loaded faces this camera screen-first: turn it half a turn
  // so the picture is of its back
  const model = phone.clone(true);
  model.rotation.y += Math.PI;
  studio.add(model);

  // The model's back glass is see-through (a "transmission" material), so the
  // screen and its wallpaper show through it. For the picture we hide the
  // screen and make every material solid.
  model.traverse((part) => {
    if (!part.isMesh) {
      return;
    }
    if (part.material.name === "OLED") {
      part.visible = false;
      return;
    }
    part.material = part.material.clone();
    part.material.transparent = false;
    part.material.opacity = 1;
    if ("transmission" in part.material) {
      part.material.transmission = 0;
    }
  });

  // frame it exactly: a flat (orthographic) camera the size of the phone
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const lens = new THREE.OrthographicCamera(-size.x / 2, size.x / 2, size.y / 2, -size.y / 2, 0.1, 10);
  lens.position.set(0, 0, 5);

  // take the picture into an off-screen image
  const film = new THREE.WebGLRenderTarget(
    Math.round(SNAPSHOT_HEIGHT * (size.x / size.y)),
    SNAPSHOT_HEIGHT,
    { samples: 4 }
  );
  renderer.setRenderTarget(film);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(studio, lens);
  renderer.setRenderTarget(null);


  return { texture: film.texture, width: size.x, height: size.y };
};

// Pocketchange's reflection is barely there: you notice it only when you
// look for it. Low strength keeps ours at the same whisper.
const REFLECTION_STRENGTH = 0.2;

const makeReflection = (phone) => {
  const photo = photographBack(phone);

  const material = new THREE.MeshBasicMaterial({
    map: photo.texture,
    transparent: true,
    // dim: a reflection in a screen is darker and duller than the real thing
    color: new THREE.Color(0.55, 0.55, 0.55),
    opacity: REFLECTION_STRENGTH,
    depthWrite: false,
  });

  // only where the back phone's screen painted the mask
  material.stencilWrite = true;
  material.stencilRef = MASK;
  material.stencilFunc = THREE.EqualStencilFunc;
  material.stencilFail = THREE.KeepStencilOp;
  material.stencilZFail = THREE.KeepStencilOp;
  material.stencilZPass = THREE.KeepStencilOp;

  addFade(material);

  return new THREE.Mesh(new THREE.PlaneGeometry(photo.width, photo.height), material);
};


/* ---------- The three layers ----------
   Same layout as Pocketchange: a big front phone, its reflection in the
   back phone's screen, and a second, larger phone lower right, cut off by
   the hero's bottom.
   Each one sits in two groups:
   - "float": bobs up and down and tilts in the picture plane (the loop)
   - "pose":  the fixed 3D angle (lean back, turn, tilt) and size */
const makeSlot = (object, layer, { x, y, size, rx, ry, rz }) => {
  const pose = new THREE.Group();
  pose.add(object);
  pose.rotation.set(rx, ry, rz, "ZXY");
  pose.scale.setScalar(size);

  const float = new THREE.Group();
  float.add(pose);
  float.position.set(x, y, 0);
  scene.add(float);

  putOnLayer(float, layer);

  return { float, pose, base: float.position.clone() };
};

const deg = THREE.MathUtils.degToRad;

const frontPhone = await loadPhone("assets/models/phone_17_pro_max.glb");

// Some of the model's glass is "transmissive" (see-through like real glass).
// Three.js handles that by rendering the whole scene an EXTRA time, every
// frame, just to know what's behind the glass. At this size you can't see
// the difference, so we turn it off: a big speed-up for free.
frontPhone.traverse((part) => {
  if (part.isMesh && part.material.transmission > 0) {
    part.material.transmission = 0;
  }
});
const backPhone = frontPhone.clone(true);
const reflection = makeReflection(frontPhone);

putOnScreen(frontPhone, loadScreen("assets/feed-tke.jpg"));
putOnScreen(backPhone, loadScreen("assets/screens/events.jpg"));
paintMask(backPhone);

// Both phones share one tilt, like two phones lying on the same table.
// These numbers were matched by laying Pocketchange's three pictures over
// our canvas at half opacity and adjusting until the outlines lined up.
const TILT = { rx: deg(-28), ry: deg(-32), rz: deg(-19) };

const slots = {
  front: makeSlot(frontPhone, LAYER_FRONT, { x: -0.4, y: 0.36, size: 1.36, ...TILT, rz: deg(-12) }),
  reflection: makeSlot(reflection, LAYER_REFLECTION, { x: 0.16, y: -0.09, size: 1.08, ...TILT }),
  back: makeSlot(backPhone, LAYER_BACK, { x: 0.39, y: -0.37, size: 1.43, ...TILT }),
};


/* ---------- Floating loop ----------
   The measured Pocketchange keyframes, in 3D units. All three run 3s,
   ease-in-out, back and forth, but each moves a different amount and
   direction. The reflection drifts on its own loop, so it slides across
   the back phone's glass as the phones bob, like a real reflection would.
   Units: the visible stage is ~3.15 units tall, so 5% ≈ 0.16. */
const FLOATS = {
  front: { from: { y: 0.16, rz: 0 }, to: { y: 0, rz: deg(-2) } },
  reflection: { from: { x: 0, y: 0, rz: deg(-2) }, to: { x: 0.05, y: -0.16, rz: 0 } },
  back: { from: { y: 0, rz: deg(-2) }, to: { y: -0.06, rz: 0 } },
};

// ease-in-out, ping-pong: 0 → 1 over 3s, then 1 → 0 over the next 3s
const wave = (seconds) => {
  const t = (seconds % 6) / 3;
  const linear = t <= 1 ? t : 2 - t;
  return (1 - Math.cos(Math.PI * linear)) / 2;
};

/* ---------- Scroll exit: the phones split ----------
   Filmed on Pocketchange at 150px scroll steps: the phones don't leave
   together. The front phone flies off the TOP (and a little left); the back
   phone slides off the BOTTOM-RIGHT corner. Both are gone by ~400px.
   On phones the split is wider and flatter, so the handsets peel off
   opposite sides. These speeds add to the page's natural upward motion. */
const DESKTOP_SPLIT = {
  front: { x: -0.5, y: 1.9 },
  back: { x: 2.0, y: -2.3 },
};

const MOBILE_SPLIT = {
  front: { x: -1.35, y: 0.7 },
  back: { x: 1.0, y: -0.55 },
};

const desktop = window.matchMedia("(min-width: 761px)");

const applyFloat = (seconds) => {
  const p = wave(seconds);
  const scrolled = reduceMotion ? 0 : Math.max(0, scrollY);
  const speeds = desktop.matches ? DESKTOP_SPLIT : MOBILE_SPLIT;

  for (const [name, slot] of Object.entries(slots)) {
    const { from, to } = FLOATS[name];
    const lerp = (key) => (from[key] ?? 0) + ((to[key] ?? 0) - (from[key] ?? 0)) * p;

    // Pocketchange's layers are each a full-stage picture, so their 2° tilt
    // turns around the CENTER OF THE STAGE, not around each phone. A phone far
    // from the center swings a little sideways as it tilts. We do the same:
    // turn the phone's resting spot around the stage center (0, 0), then add
    // the bob on top.
    const angle = lerp("rz");
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // The reflection travels with the glass that masks it.
    const split = speeds[name === "reflection" ? "back" : name];
    const splitX = split.x * scrolled * unitsPerPixel;
    const splitY = split.y * scrolled * unitsPerPixel;

    slot.float.position.x = slot.base.x * cos - slot.base.y * sin + lerp("x") + splitX;
    slot.float.position.y = slot.base.x * sin + slot.base.y * cos + lerp("y") + splitY;
    slot.float.rotation.z = angle;
  }

  // the reflection's fade follows it: solid near its top, gone a phone-height lower
  const y = slots.reflection.float.position.y;
  fade.top.value = y + FADE_TOP;
  fade.bottom.value = y + FADE_BOTTOM;
};

const FADE_TOP = 0.6;
const FADE_BOTTOM = -0.55;


/* ---------- Size ----------
   The canvas matches the stage box. The camera's view is fitted so the
   stage always shows the same slice of the scene, at any width. */
const VIEW_HEIGHT = 3.15;

// The canvas is much bigger than the stage box on every side (see
// .stage__canvas in the CSS). When the phones fly off on scroll, or hang
// below the hero, they leave by going off-SCREEN, never by hitting the edge
// of the canvas (that's what made the hard cut lines).
// The camera still looks at the stage's center, so the phones look exactly
// the same as if the canvas were stage-sized: we render a bigger frame and
// keep only our (off-center) window of it. Three.js calls that a "view offset".
const LENS_DISTANCE = VIEW_HEIGHT / 2 / Math.tan(deg(22 / 2));

let unitsPerPixel = VIEW_HEIGHT / 783;

const resize = () => {
  const stageBox = stage.getBoundingClientRect();
  const canvasBox = canvas.getBoundingClientRect();

  // how far the canvas reaches past the stage on each side, in px
  const left = stageBox.left - canvasBox.left;
  const right = canvasBox.right - stageBox.right;
  const top = stageBox.top - canvasBox.top;
  const bottom = canvasBox.bottom - stageBox.bottom;

  // a frame centered on the stage, big enough to contain the whole canvas
  const fullWidth = stageBox.width + 2 * Math.max(left, right);
  const fullHeight = stageBox.height + 2 * Math.max(top, bottom);

  unitsPerPixel = VIEW_HEIGHT / stageBox.height;
  const fullViewHeight = fullHeight * unitsPerPixel;

  camera.position.set(0, 0, LENS_DISTANCE);
  camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(fullViewHeight / 2 / LENS_DISTANCE));
  camera.aspect = fullWidth / fullHeight;
  camera.setViewOffset(
    fullWidth,
    fullHeight,
    (fullWidth - stageBox.width) / 2 - left,
    (fullHeight - stageBox.height) / 2 - top,
    canvasBox.width,
    canvasBox.height
  );
  camera.updateProjectionMatrix();

  renderer.setSize(canvasBox.width, canvasBox.height, false);
};

resize();
new ResizeObserver(resize).observe(stage);


/* ---------- Render loop ----------
   Only draws while the stage is on screen: no GPU work once you've
   scrolled past the hero. */
let visible = true;
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
}).observe(stage);

const clock = new THREE.Clock();

const frame = () => {
  if (visible) {
    applyFloat(reduceMotion ? 0 : clock.getElapsedTime());

    // bottom to top: back phone, reflection, front phone. Forgetting the
    // depth between passes is what lets a later layer always sit on top.
    // renderer.clear() also wipes the stencil mask, once per frame.
    renderer.clear();
    for (const layer of DRAW_ORDER) {
      camera.layers.set(layer);
      renderer.render(scene, camera);
      renderer.clearDepth();
    }
  }
  requestAnimationFrame(frame);
};

frame();

// Replace the stills only once the canvas has rendered successfully.
stage.classList.add("has-3d");

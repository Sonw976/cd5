import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CATALOG, TOPIC_LABELS } from "./catalog.js";
import { OBJECT_FACTORIES } from "./object-factories.js";

const viewer = document.getElementById("viewer");
const assetList = document.getElementById("asset-list");
const searchInput = document.getElementById("search-input");
const resultCount = document.getElementById("result-count");
const catalogStatus = document.getElementById("catalog-status");
const catalogPanel = document.getElementById("catalog-panel");
const loadingCard = document.getElementById("loading-card");
const loadingTitle = document.getElementById("loading-title");
const loadingDetail = document.getElementById("loading-detail");
const inspectTools = document.getElementById("inspect-tools");

const ui = {
  kicker: document.getElementById("asset-kicker"),
  title: document.getElementById("asset-title"),
  description: document.getElementById("asset-description"),
  badge: document.getElementById("source-badge"),
  topic: document.getElementById("source-topic"),
  size: document.getElementById("metric-size"),
  mesh: document.getElementById("metric-mesh"),
  material: document.getElementById("metric-material"),
  source: document.getElementById("metric-source")
};

THREE.ColorManagement.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x18262e);
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 250);
camera.position.set(6.8, 4.5, 7.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.75;
controls.minDistance = 1.5;
controls.maxDistance = 28;
controls.target.set(0, 1.7, 0);

scene.add(new THREE.HemisphereLight(0xe9f7ff, 0x44382c, 1.45));
const keyLight = new THREE.DirectionalLight(0xfff0cf, 3.1);
keyLight.position.set(5, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -8;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x78cfe0, 2.1);
rimLight.position.set(-5, 4, -6);
scene.add(rimLight);

const stage = new THREE.Group();
scene.add(stage);
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(2.6, 2.82, 0.42, 64),
  new THREE.MeshStandardMaterial({ color: 0xd8c7a3, roughness: 0.65, metalness: 0.03 })
);
pedestal.position.y = -0.23;
pedestal.receiveShadow = true;
stage.add(pedestal);
const pedestalRing = new THREE.Mesh(
  new THREE.TorusGeometry(2.7, 0.028, 10, 80),
  new THREE.MeshStandardMaterial({ color: 0xd6b86f, roughness: 0.3, metalness: 0.75, emissive: 0x5a431a, emissiveIntensity: 0.2 })
);
pedestalRing.rotation.x = Math.PI / 2;
pedestalRing.position.y = -0.015;
stage.add(pedestalRing);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(45, 96),
  new THREE.MeshStandardMaterial({ color: 0x111d24, roughness: 0.96, metalness: 0.02 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.45;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(30, 30, 0x7ecbd6, 0x3e5962);
grid.position.y = -0.005;
grid.material.transparent = true;
grid.material.opacity = 0.27;
grid.visible = false;
scene.add(grid);
const axes = new THREE.AxesHelper(3.2);
axes.visible = false;
scene.add(axes);

const loader = new GLTFLoader();
let currentAsset = null;
let currentObject = null;
let boxHelper = null;
let activeFilter = "all";
let inspectMode = false;
let loadToken = 0;
let defaultCamera = { position: new THREE.Vector3(6.8, 4.5, 7.4), target: new THREE.Vector3(0, 1.7, 0) };

function showLoading(title, detail = "Đang chuẩn bị dữ liệu 3D…") {
  loadingTitle.textContent = title;
  loadingDetail.textContent = detail;
  loadingCard.classList.remove("hidden");
  catalogStatus.textContent = "Đang tải";
}

function hideLoading() {
  loadingCard.classList.add("hidden");
  catalogStatus.textContent = "Sẵn sàng";
}

function markRenderable(root) {
  root.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function fitObject(root) {
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error("Mô hình không có hình học hiển thị được.");

  const rawSize = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(rawSize.x, rawSize.y, rawSize.z);
  const scale = maxDimension > 0 ? Math.min(1, 4.8 / maxDimension) : 1;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(root);
  const displaySize = box.getSize(new THREE.Vector3());
  const displayCenter = box.getCenter(new THREE.Vector3());
  const radius = Math.max(displaySize.x, displaySize.y, displaySize.z) * 0.66;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = Math.max(3.2, radius / Math.tan(fov / 2) * 1.32);
  const direction = new THREE.Vector3(1, 0.62, 1).normalize();
  const target = new THREE.Vector3(0, displayCenter.y, 0);
  const position = target.clone().add(direction.multiplyScalar(distance));
  defaultCamera = { position, target };
  resetCamera();
  return { box, rawSize };
}

function resetCamera() {
  camera.position.copy(defaultCamera.position);
  controls.target.copy(defaultCamera.target);
  controls.update();
}

function collectStats(root, sourceSize) {
  let meshes = 0;
  const materials = new Set();
  root.traverse(child => {
    if (!child.isMesh) return;
    meshes++;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.filter(Boolean).forEach(material => materials.add(material.uuid));
  });
  return { meshes, materials: materials.size, size: sourceSize };
}

function formatSize(size) {
  const clean = value => value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${clean(size.x)} × ${clean(size.y)} × ${clean(size.z)}`;
}

function updateInfo(asset, stats) {
  ui.kicker.textContent = `${asset.type === "glb" ? "MÔ HÌNH GLB" : "VẬT THỂ TẠO BẰNG JS"} · ${asset.topicLabel}`;
  ui.title.textContent = asset.name;
  ui.description.textContent = asset.description;
  ui.badge.textContent = asset.type.toUpperCase();
  ui.topic.textContent = asset.topicLabel;
  ui.size.textContent = formatSize(stats.size);
  ui.mesh.textContent = String(stats.meshes);
  ui.material.textContent = String(stats.materials);
  ui.source.textContent = asset.source.split("/").pop();
  ui.source.title = asset.source;
}

function clearObject() {
  if (currentObject) scene.remove(currentObject);
  if (boxHelper) scene.remove(boxHelper);
  currentObject = null;
  boxHelper = null;
}

function loadGLB(url, token) {
  return new Promise((resolve, reject) => {
    loader.load(
      encodeURI(url),
      gltf => token === loadToken ? resolve(gltf.scene) : reject(new Error("Đã hủy lượt tải cũ.")),
      event => {
        if (token !== loadToken || !event.total) return;
        loadingDetail.textContent = `Đã tải ${Math.round(event.loaded / event.total * 100)}%`;
      },
      reject
    );
  });
}

async function selectAsset(asset) {
  const token = ++loadToken;
  currentAsset = asset;
  document.querySelectorAll(".asset-item").forEach(button => button.classList.toggle("active", button.dataset.id === asset.id));
  showLoading(`Đang mở “${asset.name}”`);
  try {
    const root = asset.type === "glb"
      ? await loadGLB(asset.url, token)
      : OBJECT_FACTORIES[asset.factory](asset.options || {});
    if (token !== loadToken) return;
    clearObject();
    currentObject = root;
    currentObject.name = asset.name;
    scene.add(currentObject);
    markRenderable(currentObject);
    const { box, rawSize } = fitObject(currentObject);
    const stats = collectStats(currentObject, rawSize);
    boxHelper = new THREE.Box3Helper(box, 0xf1d28a);
    boxHelper.visible = inspectMode && document.getElementById("box-toggle").checked;
    scene.add(boxHelper);
    updateInfo(asset, stats);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("asset", asset.id);
    history.replaceState(null, "", nextUrl);
    applyWireframe(document.getElementById("wireframe-toggle").checked);
    hideLoading();
    if (window.innerWidth <= 900) catalogPanel.classList.remove("open");
  } catch (error) {
    if (token !== loadToken) return;
    clearObject();
    loadingTitle.textContent = "Không thể mở vật thể";
    loadingDetail.textContent = error?.message || "Đường dẫn hoặc dữ liệu mô hình không hợp lệ.";
    catalogStatus.textContent = "Có lỗi";
    console.error("Gallery load error:", asset, error);
  }
}

function renderCatalog() {
  const query = searchInput.value.trim().toLocaleLowerCase("vi");
  const items = CATALOG.filter(asset => {
    const matchesFilter = activeFilter === "all"
      || asset.type === activeFilter
      || asset.topic === activeFilter
      || (activeFilter === "wall" && asset.topicLabel.includes("Gắn tường"));
    const haystack = `${asset.name} ${asset.topicLabel} ${asset.description}`.toLocaleLowerCase("vi");
    return matchesFilter && (!query || haystack.includes(query));
  });
  resultCount.textContent = `${items.length} vật thể`;
  assetList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Không tìm thấy vật thể phù hợp.";
    assetList.appendChild(empty);
    return;
  }

  const groups = new Map();
  items.forEach(item => {
    const key = item.topic;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  groups.forEach((assets, topic) => {
    const heading = document.createElement("h3");
    heading.className = "group-heading";
    heading.textContent = TOPIC_LABELS[topic] || topic;
    assetList.appendChild(heading);
    assets.forEach(asset => {
      const button = document.createElement("button");
      button.className = `asset-item${currentAsset?.id === asset.id ? " active" : ""}`;
      button.dataset.id = asset.id;
      button.innerHTML = `<span class="asset-icon">${asset.icon}</span><span><span class="asset-name"></span><span class="asset-meta">${asset.type.toUpperCase()} · ${asset.topicLabel}</span></span><span class="asset-arrow">›</span>`;
      button.querySelector(".asset-name").textContent = asset.name;
      button.addEventListener("click", () => selectAsset(asset));
      assetList.appendChild(button);
    });
  });
}

function setMode(mode) {
  inspectMode = mode === "inspect";
  document.querySelectorAll(".mode").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  document.querySelector(".viewer-panel").classList.toggle("inspect", inspectMode);
  inspectTools.classList.toggle("hidden", !inspectMode);
  grid.visible = inspectMode && document.getElementById("grid-toggle").checked;
  axes.visible = inspectMode && document.getElementById("axes-toggle").checked;
  if (boxHelper) boxHelper.visible = inspectMode && document.getElementById("box-toggle").checked;
  controls.autoRotate = !inspectMode;
}

function applyWireframe(enabled) {
  if (!currentObject) return;
  currentObject.traverse(child => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => {
      if ("wireframe" in material) {
        material.wireframe = enabled;
        material.needsUpdate = true;
      }
    });
  });
}

document.getElementById("filters").addEventListener("click", event => {
  const button = event.target.closest(".filter");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  renderCatalog();
});
searchInput.addEventListener("input", renderCatalog);
document.querySelectorAll(".mode").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.getElementById("grid-toggle").addEventListener("change", event => grid.visible = inspectMode && event.target.checked);
document.getElementById("axes-toggle").addEventListener("change", event => axes.visible = inspectMode && event.target.checked);
document.getElementById("box-toggle").addEventListener("change", event => { if (boxHelper) boxHelper.visible = inspectMode && event.target.checked; });
document.getElementById("wireframe-toggle").addEventListener("change", event => applyWireframe(event.target.checked));
document.getElementById("reset-button").addEventListener("click", resetCamera);
document.getElementById("menu-button").addEventListener("click", () => catalogPanel.classList.toggle("open"));
document.getElementById("fullscreen-button").addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

function resize() {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  controls.update(delta);
  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
resize();
renderCatalog();
setMode("display");
const requestedAssetId = new URLSearchParams(window.location.search).get("asset");
selectAsset(CATALOG.find(asset => asset.id === requestedAssetId) || CATALOG[0]);
animate();

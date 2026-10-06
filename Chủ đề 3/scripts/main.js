import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MEDIA_ASSETS, placeholderImage } from "./config/assets.js";
import {
    UI_FONT, LOOK_SENS, PITCH_LIMIT, SPAWN_POS, EYE_Y, WALL_H, MARGIN,
    RED, BLUE, GREEN, GOLD,
    R_CORE, R_OUTER, WALL_THICK, BOUNDARY_GAP, WALL_MOUNT_R, MID_R,
    BOUNDARIES, ZONES, getZoneById
} from "./config/scene-config.js";
import {
    normalizeAngle, zonePoint, faceCoreRotY, createSRGBCanvasTexture,
    bendGeometry, buildRingFloor, createAnnularSectorMesh, createArcFascia
} from "./geometry/radial-geometry.js";
import { createRadialCollision } from "./collision/radial-collision.js";
import { getZoneContent } from "./data/zone-content.js";

THREE.ColorManagement.enabled = true;

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let prevTime = performance.now();

let yaw = 0, pitch = 0;
let isDragging = false, dragMoved = false, lastMouseX = 0, lastMouseY = 0;
let started = false;

let raycaster;
const interactiveObjects = [];
const provinceMarkerGroups = new Map();
let hoveredObject = null;
const effectUpdaters = [];

let elHoverDot, elFocusLabel, elZoneBanner, elFade, elZoneFlash, elCanvas;
let elNowPlaying, elTrackName, elMuteBtn, elVolDown, elVolUp;
let elProvinceSelector, elProvinceButtons;

let masterVolume = 1.0;   // 0..1 — âm lượng tổng do người dùng điều chỉnh
let isMuted = false;      // tắt tiếng thủ công

// Phương án lai cho việc đổi zone: rời khỏi 1 zone từ ngưỡng này trở lên thì
// lần sau quay lại sẽ phát LẠI TỪ ĐẦU; nhanh hơn ngưỡng này thì PHÁT TIẾP đoạn dang dở.
const RESTART_THRESHOLD_MS = 20000; // 20 giây — chỉnh số này nếu muốn nhạy/chậm hơn

// Biến cho 3D Audio
let audioListener;
let audioLoader;
const positionalAudios = [];

let heatmapTVCanvas, heatmapTVCtx, heatmapTVTex, heatmapTVMesh;

// GLB chỉ có một mesh, nên các vùng bấm được đặt trên một lớp trong suốt ở phía
// trước bản đồ. Tọa độ được chuẩn hoá (0..1), tính từ góc trái dưới của mặt map.
// Có thể bổ sung/sửa polygon tại đây khi chốt vị trí các tỉnh cùng người biên tập.
const NORTHERN_MAP_GLB = '../Đồ 3D decord/Bản đồ VN/Vietnam_Northside_Map.glb';
const NORTHERN_MAP_DISPLAY_SCALE = 1.3;
const NORTHERN_MAP_SIZE = Object.freeze({
    width: 8.5 * NORTHERN_MAP_DISPLAY_SCALE,
    height: 5.34 * NORTHERN_MAP_DISPLAY_SCALE
});
// Tường của phòng cong còn GLB là một mặt phẳng. Đẩy map vào trong lòng phòng
// để hai mép không bị mặt tường che khuất.
const NORTHERN_MAP_WALL_CLEARANCE = 1.25;
// Bật trong giai đoạn căn chỉnh: hiện chấm vàng tại tâm từng hotspot.
// Khi đã chốt vị trí, đổi thành false để ẩn toàn bộ chấm mà không xoá hotspot.
const SHOW_PROVINCE_HOTSPOT_MARKERS = true;
const SHOW_PROVINCE_SELECTOR = true;
// Vùng bấm theo đúng bán kính ngoài của chấm vàng (bao gồm cả viền).
const PROVINCE_HOTSPOT_RADIUS = 0.15;
const createProvince = (id, name, polygon, color = '#43e8d8', markerOffset = [0, 0]) => Object.freeze({
    id, name, polygon, color,
    markerOffset,
    title: `Hoạt động tình nguyện tại ${name}`,
    content: `Chọn ${name}. Nội dung, hình ảnh và tư liệu hoạt động của Đoàn trường tại địa phương này sẽ được cập nhật trên màn hình tương tác.`
});

// Các polygon được căn theo khung UV của GLB trong cảnh hiện tại (gốc trái dưới).
// Nút trong bảng chọn là phương án truy cập chính xác cho mọi tỉnh, kể cả tỉnh nhỏ.
const NORTHERN_MAP_HOTSPOTS = Object.freeze([
    createProvince('lai-chau', 'Lai Châu', [[.00,.49],[.10,.80],[.25,.73],[.25,.53],[.16,.45],[.07,.49]], '#d62828', [.07, .15]),
    createProvince('dien-bien', 'Điện Biên', [[.06,.35],[.18,.55],[.24,.48],[.20,.37],[.12,.32]], '#d62828', [0, .025]),
    createProvince('son-la', 'Sơn La', [[.12,.20],[.42,.39],[.35,.52],[.24,.48],[.20,.37],[.12,.32],[.04,.39]], '#d62828', [.075, 0]),
    createProvince('lao-cai', 'Lào Cai', [[.23,.48],[.32,.80],[.45,.85],[.50,.62],[.43,.45],[.34,.43]], '#43b7ac'),
    createProvince('tuyen-quang', 'Tuyên Quang', [[.42,.51],[.50,.98],[.62,.86],[.63,.57],[.54,.45]], '#43b7ac'),
    createProvince('cao-bang', 'Cao Bằng', [[.52,.74],[.61,.92],[.76,.83],[.74,.70],[.62,.67]], '#d62828', [.025, .025]),
    createProvince('thai-nguyen', 'Thái Nguyên', [[.55,.47],[.63,.70],[.73,.67],[.76,.52],[.68,.43]], '#43b7ac', [-.025, 0]),
    createProvince('lang-son', 'Lạng Sơn', [[.71,.48],[.74,.70],[.86,.60],[.88,.47],[.78,.42]], '#d62828', [-.025, 0]),
    createProvince('phu-tho', 'Phú Thọ', [[.39,.28],[.49,.49],[.57,.43],[.59,.30],[.51,.20],[.43,.21]], '#43b7ac'),
    createProvince('ha-noi', 'Hà Nội', [[.52,.22],[.58,.42],[.65,.36],[.64,.25],[.58,.18]], '#d62828'),
    createProvince('bac-ninh', 'Bắc Ninh', [[.63,.35],[.67,.50],[.77,.45],[.76,.34],[.69,.30]], '#43b7ac'),
    createProvince('quang-ninh', 'Quảng Ninh', [[.77,.31],[.84,.50],[1.00,.44],[.91,.29],[.84,.26]], '#d62828'),
    createProvince('hai-phong', 'Hải Phòng', [[.67,.15],[.75,.35],[.82,.29],[.80,.17],[.74,.13]], '#43b7ac', [-.025, .025]),
    createProvince('hung-yen', 'Hưng Yên', [[.60,.06],[.67,.25],[.75,.19],[.76,.08],[.69,.03]], '#43b7ac', [.025, .020]),
    createProvince('ninh-binh', 'Ninh Bình', [[.63,.00],[.69,.16],[.76,.13],[.75,.01],[.69,.00]], '#43b7ac', [-.025, .025])
]);

const { resolveMovement } = createRadialCollision({
    rCore: R_CORE,
    rOuter: R_OUTER,
    wallThickness: WALL_THICK,
    margin: MARGIN,
    boundaries: BOUNDARIES,
    boundaryGap: BOUNDARY_GAP
});

function pointInPolygon(point, vs) {
    let x = point[0], y = point[1]; let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1]; let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function selectProvince(province) {
    updateHeatmapTV(province.title, province.content, province.color);
    provinceMarkerGroups.forEach((markerGroup, provinceId) => {
        markerGroup.visible = provinceId !== province.id;
    });
    elProvinceButtons?.querySelectorAll('.province-button').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.provinceId === province.id);
    });
}

function buildProvinceSelector() {
    NORTHERN_MAP_HOTSPOTS.forEach((province) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'province-button';
        button.dataset.provinceId = province.id;
        button.textContent = province.name;
        button.addEventListener('click', () => selectProvince(province));
        elProvinceButtons.appendChild(button);
    });
}

function getPolygonCenter(polygon) {
    const center = polygon.reduce((sum, point) => {
        sum.x += point[0]; sum.y += point[1];
        return sum;
    }, { x: 0, y: 0 });
    return { x: center.x / polygon.length, y: center.y / polygon.length };
}

function addProvinceHotspotMarkers(mapRoot) {
    if (!SHOW_PROVINCE_HOTSPOT_MARKERS) return;

    const dotGeometry = new THREE.CircleGeometry(0.105, 20);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffd21f, side: THREE.DoubleSide });
    const rimGeometry = new THREE.RingGeometry(0.115, 0.15, 20);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0x7a4a00, side: THREE.DoubleSide });

    NORTHERN_MAP_HOTSPOTS.forEach((province) => {
        const center = getPolygonCenter(province.polygon);
        const x = (center.x + province.markerOffset[0] - 0.5) * NORTHERN_MAP_SIZE.width;
        const y = (center.y + province.markerOffset[1] - 0.5) * NORTHERN_MAP_SIZE.height;
        const z = NORTHERN_MAP_WALL_CLEARANCE + 0.1;

        const markerGroup = new THREE.Group();
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.set(x, y, z - 0.002);
        markerGroup.add(rim);

        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(x, y, z);
        dot.userData.provinceId = province.id;
        markerGroup.add(dot);
        mapRoot.add(markerGroup);
        provinceMarkerGroups.set(province.id, markerGroup);
    });
}

function walnutDoorTex(){
    const c = document.createElement('canvas'); const W = 256, H = 512;
    c.width = W; c.height = H; const ctx = c.getContext('2d');
    ctx.fillStyle='#5e3a22';ctx.fillRect(0,0,W,H);
    var g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'#6b4429');g.addColorStop(.5,'#7a5133');g.addColorStop(1,'#5e3a22');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(var s=0;s<26;s++){
      var gx=Math.random()*W;
      ctx.strokeStyle=`rgba(30,15,6,${Math.random()*.22+.07})`;
      ctx.lineWidth=Math.random()*1.8+.5;
      ctx.beginPath();ctx.moveTo(gx,0);
      ctx.bezierCurveTo(gx+(Math.random()*14-7),H*.33,gx+(Math.random()*14-7),H*.66,gx+(Math.random()*10-5),H);
      ctx.stroke();
    }
    var pads=[[.14,.08,.42],[.14,.54,.88]];
    pads.forEach(function(pd){
      var px=W*pd[0],py=H*pd[1],ph=H*pd[2]-H*pd[1];
      ctx.strokeStyle='rgba(20,10,4,.55)';ctx.lineWidth=5;
      ctx.strokeRect(px,py,W*(1-2*pd[0]),ph);
      ctx.strokeStyle='rgba(230,190,140,.35)';ctx.lineWidth=2;
      ctx.strokeRect(px+5,py+5,W*(1-2*pd[0])-10,ph-10);
    });
    ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(0,0,W*.04,H);
    ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(W-W*.04,0,W*.04,H);
    return createSRGBCanvasTexture(c);
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdcdad2);
    scene.fog = new THREE.Fog(0xdcdad2, 16, 60);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d6b35, 0.72);
    hemiLight.position.set(0, 30, 0); scene.add(hemiLight);
    const ambient = new THREE.AmbientLight(0xffffff, 0.58); scene.add(ambient);

    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 140);
    camera.position.set(SPAWN_POS.x, EYE_Y, SPAWN_POS.z);
    yaw = Math.PI + Math.atan2(SPAWN_POS.x, -SPAWN_POS.z); 
    pitch = 0; applyCameraRotation();

    // -- THÊM AUDIO LISTENER VÀO CAMERA --
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    audioLoader = new THREE.AudioLoader();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    elCanvas = renderer.domElement;
    document.getElementById('canvas-container').appendChild(elCanvas);

    raycaster = new THREE.Raycaster();

    const blocker = document.getElementById('blocker');
    const startBtn = document.getElementById('btn-start');
    
    elHoverDot = document.getElementById('hover-dot');
    elFocusLabel = document.getElementById('focus-label');
    elZoneBanner = document.getElementById('zone-banner');
    elFade = document.getElementById('fade-overlay');
    elZoneFlash = document.getElementById('zone-flash');
    elNowPlaying = document.getElementById('now-playing');
    elTrackName = document.getElementById('np-track-name');
    elMuteBtn = document.getElementById('np-mute-btn');
    elVolDown = document.getElementById('np-vol-down');
    elVolUp = document.getElementById('np-vol-up');
    elProvinceSelector = document.getElementById('province-selector');
    elProvinceButtons = document.getElementById('province-buttons');
    buildProvinceSelector();

    startBtn.addEventListener('click', () => {
        started = true; blocker.style.display = 'none'; 
        document.getElementById('hud-hint').style.display = 'block';
        document.getElementById('hud-toolbar').style.display = 'flex'; 
        elZoneBanner.style.display = 'block';
        // Bảng tỉnh chỉ xuất hiện sau khi camera thực sự đi vào Cụm 2.
        elProvinceSelector.style.display = 'none';

        // Đánh thức Context Audio (Yêu cầu bắt buộc của trình duyệt)
        if (audioListener.context.state === 'suspended') {
            audioListener.context.resume();
        }

        // Phát ngầm tất cả các nhạc nền cụm đã tải xong (đang ở volume 0)
        // Âm lượng thực tế sẽ do recalcAudioTargets() + vòng lặp fade trong animate() quyết định
        positionalAudios.forEach(entry => {
            if (!entry.sound.isPlaying && entry.sound.buffer) entry.sound.play();
        });
    });

    document.getElementById('btn-guide').addEventListener('click', () => { document.getElementById('guide-overlay').style.display = 'flex'; });
    document.getElementById('guide-close').addEventListener('click', () => { document.getElementById('guide-overlay').style.display = 'none'; });
    document.getElementById('btn-reset').addEventListener('click', resetToSpawn);
    document.getElementById('info-close').addEventListener('click', () => { document.getElementById('info-overlay').style.display = 'none'; });

    // ── Điều khiển âm lượng: click icon loa để tắt/bật tiếng, nút +/- để tăng giảm 10%/lần ──
    elMuteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        updateVolumeIcon();
        recalcAudioTargets();
    });
    elVolDown.addEventListener('click', () => setMasterVolume(masterVolume - 0.1));
    elVolUp.addEventListener('click', () => setMasterVolume(masterVolume + 0.1));
    updateVolumeIcon();

    document.addEventListener('keydown', (e) => {
        if (!started) return;
        switch (e.code) { case 'KeyW': case 'ArrowUp': moveForward = true; break; case 'KeyA': case 'ArrowLeft': moveLeft = true; break; case 'KeyS': case 'ArrowDown': moveBackward = true; break; case 'KeyD': case 'ArrowRight': moveRight = true; break; }
    });
    document.addEventListener('keyup', (e) => {
        switch (e.code) { case 'KeyW': case 'ArrowUp': moveForward = false; break; case 'KeyA': case 'ArrowLeft': moveLeft = false; break; case 'KeyS': case 'ArrowDown': moveBackward = false; break; case 'KeyD': case 'ArrowRight': moveRight = false; break; }
    });

    elCanvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize);

    buildArchitecture();
    buildCeilings(); buildZoneContents();
}

function applyCameraRotation() {
    camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch; camera.rotation.z = 0;
}

function resetToSpawn() {
    elFade.classList.remove('show'); velocity.set(0, 0, 0);
    camera.position.set(SPAWN_POS.x, EYE_Y, SPAWN_POS.z); yaw = Math.PI + Math.atan2(SPAWN_POS.x, -SPAWN_POS.z); pitch = 0; applyCameraRotation();
    document.getElementById('info-overlay').style.display = 'none';
}

function onMouseDown(e) {
    if (!started || e.button !== 0) return;
    isDragging = true; dragMoved = false; lastMouseX = e.clientX; lastMouseY = e.clientY;
    elCanvas.classList.add('dragging');
}

function onMouseMove(e) {
    if (!started) return;
    if (isDragging) {
        const dx = e.clientX - lastMouseX, dy = e.clientY - lastMouseY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
        lastMouseX = e.clientX; lastMouseY = e.clientY;
        yaw -= dx * LOOK_SENS; pitch -= dy * LOOK_SENS; pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
        applyCameraRotation();
    } else updateHoverAt(e.clientX, e.clientY);
}

function onMouseUp(e) {
    if (!started || e.button !== 0) return;
    elCanvas.classList.remove('dragging');
    if (isDragging && !dragMoved) handleClickAt(e.clientX, e.clientY);
    isDragging = false;
}

function ndcFromClient(clientX, clientY) { return { x: (clientX / window.innerWidth) * 2 - 1, y: -(clientY / window.innerHeight) * 2 + 1 }; }

function updateHoverAt(clientX, clientY) {
    raycaster.setFromCamera(ndcFromClient(clientX, clientY), camera);
    const hits = raycaster.intersectObjects(interactiveObjects, false);
    const hitObj = hits.length > 0 ? hits[0].object : null;
    const hit = hits[0];

    if (hitObj !== hoveredObject) {
        hoveredObject = hitObj;
        if (hoveredObject) { elFocusLabel.style.display = 'block'; elHoverDot.style.display = 'block'; }
        else { elFocusLabel.style.display = 'none'; elHoverDot.style.display = 'none'; }
    }
    if (hoveredObject) {
        const d = hoveredObject.userData;
        const province = d.type === 'map-panel' && hit?.uv ? getProvinceAtUV(hit.uv.x, hit.uv.y) : null;
        elFocusLabel.textContent = province ? province.name : (d.title || 'Chi tiết');
        elFocusLabel.style.display = 'block';
        elHoverDot.style.display = 'block';
    }
    if (hoveredObject) { elFocusLabel.style.left = clientX + 'px'; elFocusLabel.style.top = clientY + 'px'; elHoverDot.style.left = clientX + 'px'; elHoverDot.style.top = clientY + 'px'; }
}

function handleClickAt(clientX, clientY) {
    raycaster.setFromCamera(ndcFromClient(clientX, clientY), camera);
    const hits = raycaster.intersectObjects(interactiveObjects, false);
    if (hits.length > 0) {
        const d = hits[0].object.userData;
        if (d.type === 'artifact' || d.type === 'infographic' || d.type === 'tv-panel') {
            showInfoPanel(d);
        } else if (d.type === 'map-panel') {
            checkMapHotspotClick(hits[0].uv.x, hits[0].uv.y);
        }
    }
}

function showInfoPanel(d) {
    const hex = '#' + (d.color || GOLD).toString(16).padStart(6, '0');
    const panel = document.getElementById('info-panel');
    panel.style.setProperty('--accent', hex); panel.style.borderColor = hex;
    document.getElementById('info-zone').textContent = d.zoneName || '';
    document.getElementById('info-zone').style.color = hex;
    document.getElementById('info-code').textContent = d.code || '';
    document.getElementById('info-title').textContent = d.title || '';
    const metaParts = []; if (d.year) metaParts.push(d.year); if (d.source) metaParts.push(d.source);
    document.getElementById('info-meta').textContent = metaParts.join(' · ');
    document.getElementById('info-content').textContent = d.content || '';
    
    const imgCont = document.getElementById('info-img-container');
    const imgEl = document.getElementById('info-img');
    if (d.imageUrl) {
        imgEl.src = d.imageUrl;
        imgCont.style.display = 'block';
    } else {
        imgCont.style.display = 'none';
        imgEl.src = '';
    }

    document.getElementById('info-overlay').style.display = 'flex';
}

// --- HÀM TẠO GIÁ SÁCH 3D (Cụm 3: NCKH) ---
function createBookshelf(position, rotationY) {
    const group = new THREE.Group();
    
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.7 });
    const shelfW = 2.0, shelfH = 3.5, shelfD = 0.4;
    
    // Khung chính
    const back = new THREE.Mesh(new THREE.BoxGeometry(shelfW, shelfH, 0.05), shelfMat);
    back.position.set(0, shelfH/2, -shelfD/2);
    group.add(back);
    
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.05, shelfH, shelfD), shelfMat);
    left.position.set(-shelfW/2, shelfH/2, 0);
    group.add(left);
    
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.05, shelfH, shelfD), shelfMat);
    right.position.set(shelfW/2, shelfH/2, 0);
    group.add(right);
    
    // 5 kệ sách
    for (let i = 0; i < 5; i++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.04, shelfD), shelfMat);
        shelf.position.set(0, i * 0.7 + 0.02, 0);
        group.add(shelf);
    }
    
    // Sách trên mỗi kệ (mỗi kệ 4-5 cuốn)
    const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0x1abc9c, 0xe74c3c, 0x3498db];
    for (let shelf = 0; shelf < 4; shelf++) {
        const numBooks = 4 + Math.floor(Math.random() * 2);
        let x = -shelfW/2 + 0.15;
        for (let b = 0; b < numBooks; b++) {
            const bw = 0.08 + Math.random() * 0.12;
            const bh = 0.45 + Math.random() * 0.15;
            const bd = 0.25 + Math.random() * 0.1;
            const bookMat = new THREE.MeshStandardMaterial({ 
                color: bookColors[Math.floor(Math.random() * bookColors.length)], 
                roughness: 0.8 
            });
            const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bookMat);
            book.position.set(x + bw/2, shelf * 0.7 + 0.02 + bh/2 + 0.02, 0);
            group.add(book);
            x += bw + 0.02;
        }
    }
    
    group.position.set(position.x, position.y || 0, position.z);
    if (rotationY) group.rotation.y = rotationY;
    scene.add(group);
    return group;
}

// --- HÀM TẠO BỤC PHÁT BIỂU 3D (Cụm 1: Yêu nước) ---
function createPodium(position, rotationY) {
    const group = new THREE.Group();
    
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.5, roughness: 0.3 });
    
    // Bệ podium
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.6), goldMat);
    base.position.set(0, 0.075, 0);
    group.add(base);
    
    // Thân podium (hình tam giác cắt)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.5), woodMat);
    body.position.set(0, 0.65, 0);
    group.add(body);
    
    // Mặt nghiêng để đặt tài liệu
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.45), woodMat);
    top.position.set(0, 1.2, 0.05);
    top.rotation.x = -0.2;
    group.add(top);
    
    // Viền vàng trên
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.52), goldMat);
    trim.position.set(0, 1.22, 0.05);
    trim.rotation.x = -0.2;
    group.add(trim);
    
    // Logo tròn trên mặt (đại diện logo Đoàn)
    const logoGeo = new THREE.CircleGeometry(0.12, 24);
    const logoMat = new THREE.MeshStandardMaterial({ color: 0xe3000f, side: THREE.DoubleSide });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, 1.23, 0.05);
    logo.rotation.x = -Math.PI/2 - 0.2;
    group.add(logo);
    
    group.position.set(position.x, position.y || 0, position.z);
    if (rotationY) group.rotation.y = rotationY;
    scene.add(group);
    return group;
}

function buildArcWall(radius, a0, a1, skipRanges, height, thickness, color, steps, isCore = false) {
    const arcLen = Math.abs(a1 - a0) * radius;
    const roughness = isCore ? 0.92 : 0.98;
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: roughness });
    for (let i = 0; i < steps; i++) {
        const aS = a0 + (a1 - a0) * i / steps; const aE = a0 + (a1 - a0) * (i + 1) / steps; const aMid = (aS + aE) / 2;
        let inGap = false; for (const [s0, s1] of skipRanges) if (aMid >= s0 && aMid <= s1) inGap = true;
        if (inGap) continue;
        const x0 = Math.cos(aS) * radius, z0 = Math.sin(aS) * radius; const x1 = Math.cos(aE) * radius, z1 = Math.sin(aE) * radius;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; const len = Math.hypot(x1 - x0, z1 - z0) * 1.2; const rotY = -Math.atan2(z1 - z0, x1 - x0);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(len, height, thickness), mat);
        wall.position.set(mx, height / 2, mz); wall.rotation.y = rotY; scene.add(wall);
    }
}

function buildRadialWall(angle, rInner, rOuter, skipRanges, height, thickness, steps) {
    const radialLen = rOuter - rInner;
    const mat = new THREE.MeshStandardMaterial({ color: 0xdcdad2, roughness: 0.98 });
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let i = 0; i < steps; i++) {
        const r0 = rInner + (rOuter - rInner) * i / steps; const r1 = rInner + (rOuter - rInner) * (i + 1) / steps; const rmid = (r0 + r1) / 2;
        let inGap = false; for (const [g0, g1] of skipRanges) if (rmid >= g0 && rmid <= g1) inGap = true;
        if (inGap) continue;
        const len = (r1 - r0) * 1.2; const mx = ca * rmid, mz = sa * rmid;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, len), mat);
        wall.position.set(mx, height / 2, mz); wall.rotation.y = Math.PI / 2 - angle; scene.add(wall);
    }
}

function buildBaseboardStripe(radius, a0, a1, steps) {
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f8, roughness: 0.55, metalness: 0.01 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd3b36d, roughness: 0.3, metalness: 0.5 });
    for (let i = 0; i < steps; i++) {
        const aS = a0 + (a1 - a0) * i / steps; const aE = a0 + (a1 - a0) * (i + 1) / steps;
        const x0 = Math.cos(aS) * radius, z0 = Math.sin(aS) * radius; const x1 = Math.cos(aE) * radius, z1 = Math.sin(aE) * radius;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; const len = Math.hypot(x1 - x0, z1 - z0) * 1.2; const rotY = -Math.atan2(z1 - z0, x1 - x0);
        const tile = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, WALL_THICK + 0.06), tileMat);
        tile.position.set(mx, 0.125, mz); tile.rotation.y = rotY; scene.add(tile);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, WALL_THICK + 0.08), capMat);
        cap.position.set(mx, 0.275, mz); cap.rotation.y = rotY; scene.add(cap);
    }
}

function buildArchitecture() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xdcd0be, roughness: 0.52, side: THREE.DoubleSide });
    
    // --- 1. SẢNH TRUNG TÂM ---
    const coreFloor = new THREE.Mesh(new THREE.CircleGeometry(R_CORE, 56), floorMat);
    coreFloor.rotation.x = -Math.PI / 2; scene.add(coreFloor);

    buildArcWall(R_CORE, Math.PI*190/180, Math.PI*237/180, [], WALL_H, WALL_THICK, 0xdcdad2, 10, true);
    createTV(Math.PI*213.5/180, R_CORE - WALL_THICK/2 - 0.05, 4.0, 1);
    
    buildArcWall(R_CORE, Math.PI*303/180, Math.PI*350/180, [], WALL_H, WALL_THICK, 0xdcdad2, 10, true);
    createTV(Math.PI*326.5/180, R_CORE - WALL_THICK/2 - 0.05, 4.0, 2);
    
    buildArcWall(R_CORE, Math.PI*10/180, Math.PI*170/180, [], WALL_H, WALL_THICK, 0xdcdad2, 30, true);
    createWallInfographic(R_CORE - WALL_THICK/2 - 0.05, 5.0);

    // Three.js r155+ dùng thang cường độ ánh sáng vật lý; các giá trị r128 rất nhỏ
    // nên được hiệu chỉnh lại để giữ độ sáng của không gian trưng bày.
    const coreLight = new THREE.PointLight(0xffedcf, 70, 32, 1.7);
    coreLight.position.set(0, WALL_H - 1.35, 0); scene.add(coreLight);

    // --- 2. CÁC CỤM PHÒNG (ZONES) ---
    ZONES.forEach(zone => {
        buildRingFloor(R_CORE, R_OUTER, zone.a0, zone.a1, floorMat, 40, scene);
        buildArcWall(R_OUTER, zone.a0, zone.a1, [], WALL_H, WALL_THICK, 0xdcdad2, 26);
        buildBaseboardStripe(R_OUTER - WALL_THICK / 2 - 0.04, zone.a0, zone.a1, 26);

        const lightCount = 2;
        for (let i = 0; i < lightCount; i++) {
            const t = (i + 0.5) / lightCount; const a = zone.a0 + (zone.a1 - zone.a0) * t; const r = (R_CORE + R_OUTER) / 2;
            const pl = new THREE.PointLight(0xffe7c2, 52, 22, 1.75);
            pl.position.set(Math.cos(a) * r, WALL_H - 1.05, Math.sin(a) * r);
            pl.userData.zoneId = zone.id;
            scene.add(pl);
        }
    });

    BOUNDARIES.forEach((angle, idx) => { 
        buildRadialWall(angle, R_CORE, R_OUTER, [[BOUNDARY_GAP.r0, BOUNDARY_GAP.r1]], WALL_H, WALL_THICK, 16); 
    });

    // --- 3. LỐI VÀO (ENTRANCE CORRIDOR) ---
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcdad2, roughness: 0.98 });
    
    const lw1 = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WALL_H, 6.5), wallMat);
    lw1.position.set(-3, WALL_H/2, -15.25); scene.add(lw1);
    const lw2 = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WALL_H, 3.4), wallMat);
    lw2.position.set(-3, WALL_H/2, -6.3); scene.add(lw2);
    
    const rw1 = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WALL_H, 6.5), wallMat);
    rw1.position.set(3, WALL_H/2, -15.25); scene.add(rw1); 
    const rw2 = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WALL_H, 3.4), wallMat);
    rw2.position.set(3, WALL_H/2, -6.3); scene.add(rw2); 

    const eFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 14.5), floorMat);
    eFloor.rotation.x = -Math.PI/2; eFloor.position.set(0, -0.001, -11.25); scene.add(eFloor);

    createDoubleDoor(0, -12.5, 4.4, 5.0);

    const frontWallMat = new THREE.MeshStandardMaterial({ color: 0xdcdad2, roughness: 0.98 });
    const fwLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, WALL_THICK), frontWallMat);
    fwLeft.position.set(-2.75, WALL_H/2, -12.5); scene.add(fwLeft);
    const fwRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, WALL_THICK), frontWallMat);
    fwRight.position.set(2.75, WALL_H/2, -12.5); scene.add(fwRight);
    const fwTop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 5.05, WALL_THICK), frontWallMat);
    fwTop.position.set(0, 5.45 + 5.05/2, -12.5); scene.add(fwTop);
}

function createDoubleDoor(xc, z, doorW, doorH) {
    const matGold = new THREE.MeshStandardMaterial({color:0xd4af37, metalness:0.65, roughness:0.32});
    const matDoor = new THREE.MeshStandardMaterial({map:walnutDoorTex(), roughness:0.5});
    const leafW = doorW/2 - 0.06, gap = 0.06;
    
    const jL = new THREE.Mesh(new THREE.BoxGeometry(.3, doorH+.3, .34), matGold);
    jL.position.set(xc - doorW/2 - .15, (doorH+.3)/2, z); scene.add(jL);
    const jR = new THREE.Mesh(new THREE.BoxGeometry(.3, doorH+.3, .34), matGold);
    jR.position.set(xc + doorW/2 + .15, (doorH+.3)/2, z); scene.add(jR);
    const lin = new THREE.Mesh(new THREE.BoxGeometry(doorW+.6, .3, .34), matGold);
    lin.position.set(xc, doorH+.3, z); scene.add(lin);
    
    [-1, 1].forEach(side => {
        const pivot = new THREE.Group();
        pivot.position.set(xc + side*(doorW/2), doorH/2, z); 
        scene.add(pivot);

        const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, doorH, .08), matDoor);
        leaf.position.set(-side*(leafW/2 + gap/2), 0, 0);
        pivot.add(leaf);
        
        const hd = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .34, 10), matGold);
        hd.rotation.z = Math.PI/2;
        hd.position.set(-side*(leafW - 0.1), 0, 0.09);
        pivot.add(hd);
        pivot.rotation.y = 0;
    });
}

function createTV(angle, radius, y, index) {
    const w = 3.2, h = 1.8;
    const geo = new THREE.PlaneGeometry(w, h, 24, 1);
    bendGeometry(geo, radius);
    
    // Đã thay đổi đường link video sang nguồn cho phép CORS và xử lý lỗi Promise
    const video = document.createElement('video');
    video.src = MEDIA_ASSETS.lobbyVideo;
    video.loop = true; video.muted = true; video.playsInline = true; video.crossOrigin = 'anonymous';
    
    document.getElementById('btn-start').addEventListener('click', () => {
        video.play().catch(e => console.warn(`Màn hình số ${index} chưa tải được video:`, e));
    });

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
    mesh.rotation.y = faceCoreRotY(angle);
    
    const fGeo = new THREE.BoxGeometry(w+0.1, h+0.1, 0.1, 24, 1, 1);
    fGeo.translate(0,0,-0.06);
    bendGeometry(fGeo, radius);
    const frame = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({color: 0x111, roughness: 0.2}));
    frame.position.copy(mesh.position); frame.rotation.copy(mesh.rotation);
    
    scene.add(mesh); scene.add(frame);
    
    mesh.userData = { 
        type: 'tv-panel', title: `MÀN HÌNH TƯƠNG TÁC SỐ ${index}`, zoneName: 'SẢNH TRUNG TÂM', color: GOLD,
        content: `Video tư liệu về phong trào và hoạt động tiêu biểu của Đoàn thanh niên. Nhấp chuột vào màn hình để phóng to.`
    };
    interactiveObjects.push(mesh);
}

// --- HÀM TẠO INFOGRAPHIC LỚN TRÀN TƯỜNG (Sảnh trung tâm) ---
function createWallInfographic(radius, y) {
    const c = document.createElement('canvas');
    c.width = 3200; c.height = 1200;
    const ctx = c.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#1a0a0a');
    grad.addColorStop(0.5, '#2d0a0a');
    grad.addColorStop(1, '#1a0505');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    // Viền vàng
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, c.width - 40, c.height - 40);

    // Header区域
    ctx.fillStyle = '#e3000f';
    ctx.fillRect(0, 0, c.width, 200);

    // Logo vòng tròn
    ctx.beginPath();
    ctx.arc(160, 100, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#fff200';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(160, 100, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#e3000f';
    ctx.fill();
    ctx.fillStyle = '#fff200';
    ctx.font = '900 36px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ĐHSP', 160, 100);

    // Tiêu đề chính
    ctx.fillStyle = '#fff200';
    ctx.font = '900 64px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('PHÒNG TRUYỀN THỐNG SỐ', c.width / 2, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px ' + UI_FONT;
    ctx.fillText('TRƯỜNG ĐẠI HỌC SƯ PHẠM HÀ NỘI', c.width / 2, 145);

    // Dòng kẻ vàng
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(400, 190, c.width - 800, 3);

    // 3 cột nội dung
    const colW = 900;
    const colX = [150, 1150, 2150];
    const titles = ['LỊCH SỬ TRUYỀN THỐNG', 'PHONG TRÀO TIÊU BIỂU', 'TÀI NĂNG & KHỞI NGHIỆP'];
    const contents = [
        'Trường Đại học Sư phạm Hà Nội - cái nôi đào tạo教师,\nđược thành lập năm 1954. Hơn 70 năm xây dựng và phát triển,\ntrường đã đào tạo hàng trăm ngàn教师 cho đất nước.',
        'Từ phong trào "Ba sẵn sàng" đến "Mùa hè xanh",\nthanh niên Sư phạm luôn xung phong đi đầu trong mọi phong trào,\nđóng góp tích cực vào sự nghiệp cách mạng.',
        'Nhiều giáo sư, nhà khoa học xuất sắc của trường\nđã có đóng góp to lớn cho nền giáo dục và khoa học Việt Nam,\nxứng đáng là niềm tự hào của Sư phạm.'
    ];

    for (let i = 0; i < 3; i++) {
        // Box nền
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(colX[i], 230, colW - 80, 700);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(colX[i], 230, colW - 80, 700);

        // Icon vòng tròn
        ctx.beginPath();
        ctx.arc(colX[i] + 80, 310, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#e3000f';
        ctx.fill();
        ctx.fillStyle = '#fff200';
        ctx.font = '900 28px ' + UI_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((i + 1).toString(), colX[i] + 80, 310);

        // Tiêu đề cột
        ctx.fillStyle = '#d4af37';
        ctx.font = '700 32px ' + UI_FONT;
        ctx.textAlign = 'left';
        ctx.fillText(titles[i], colX[i] + 30, 400);

        // Dòng kẻ
        ctx.fillStyle = '#e3000f';
        ctx.fillRect(colX[i] + 30, 420, 200, 3);

        // Nội dung
        ctx.fillStyle = '#e8d5b5';
        ctx.font = '400 26px ' + UI_FONT;
        ctx.textAlign = 'left';
        const lines = contents[i].split('\n');
        lines.forEach((line, j) => {
            ctx.fillText(line, colX[i] + 30, 470 + j * 45);
        });
    }

    // Footer
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, c.height - 80, c.width, 80);
    ctx.fillStyle = '#1a0a0a';
    ctx.font = '900 32px ' + UI_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('NCKH · KHOA CÔNG NGHỆ THÔNG TIN · 2025', c.width / 2, c.height - 35);

    const tex = createSRGBCanvasTexture(c);
    tex.anisotropy = 4;

    // Tạo geometry cong theo tường
    const w = 15.0, h = 6.0;
    const segments = 64;
    const panelGeo = new THREE.PlaneGeometry(w, h, segments, 1);
    bendGeometry(panelGeo, radius);

    const panel = new THREE.Mesh(panelGeo, new THREE.MeshStandardMaterial({
        map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15, roughness: 0.5
    }));

    // Đặt giữa tường (góc 90° = Math.PI/2)
    const angle = Math.PI / 2;
    panel.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    panel.rotation.y = faceCoreRotY(angle);
    scene.add(panel);

    // Khung viền
    const fGeo = new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.08, segments, 1, 1);
    fGeo.translate(0, 0, -0.05);
    bendGeometry(fGeo, radius);
    const frame = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.5 }));
    frame.position.copy(panel.position);
    frame.rotation.copy(panel.rotation);
    scene.add(frame);

    panel.userData = {
        type: 'infographic', title: 'PHÒNG TRUYỀN THỐNG SỐ - ĐHSP HÀ NỘI',
        zoneName: 'SẢNH TRUNG TÂM', color: RED,
        content: 'Phòng Truyền thống số Trường Đại học Sư phạm Hà Nội - nơi lưu giữ và tôn vinh truyền thống vẻ vang của hơn 70 năm xây dựng và phát triển.'
    };
    interactiveObjects.push(panel);
}

function buildCeilings() {
    const ceiling = new THREE.Group();
    ceiling.name = 'radial-drop-ceiling';
    scene.add(ceiling);

    const backstopY = WALL_H + 0.28;
    const recessedY = WALL_H + 0.18;
    const rimY = WALL_H - 0.18;
    const rimThickness = 0.36;
    const angleOverlap = 0.006;

    const backstopMat = new THREE.MeshStandardMaterial({
        color: 0xf1f0ec, roughness: 0.95, side: THREE.DoubleSide
    });
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc, roughness: 0.9, side: THREE.DoubleSide
    });
    const recessedMat = new THREE.MeshStandardMaterial({
        color: 0xe4eaf0, roughness: 0.92, side: THREE.DoubleSide
    });
    const fasciaMat = new THREE.MeshStandardMaterial({
        color: 0xd7dde3, roughness: 0.82, side: THREE.DoubleSide
    });
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xc9aa62, roughness: 0.38, metalness: 0.48,
        emissive: 0x3b2a0d, emissiveIntensity: 0.12,
        side: THREE.DoubleSide
    });

    // Sảnh trung tâm: trần nền, vành hạ cốt và lõi tròn cao hơn.
    const coreBackstop = new THREE.Mesh(new THREE.CircleGeometry(R_CORE + 0.14, 96), backstopMat);
    coreBackstop.rotation.x = Math.PI / 2;
    coreBackstop.position.y = backstopY;
    ceiling.add(coreBackstop);

    const coreRecessR = 3.55;
    const coreRim = new THREE.Mesh(new THREE.RingGeometry(coreRecessR, R_CORE + 0.14, 96), rimMat);
    coreRim.rotation.x = Math.PI / 2;
    coreRim.position.y = rimY;
    ceiling.add(coreRim);

    const coreRecess = new THREE.Mesh(new THREE.CircleGeometry(coreRecessR + 0.02, 96), recessedMat);
    coreRecess.rotation.x = Math.PI / 2;
    coreRecess.position.y = recessedY;
    ceiling.add(coreRecess);

    const coreFascia = new THREE.Mesh(
        new THREE.CylinderGeometry(coreRecessR, coreRecessR, recessedY - rimY, 96, 1, true),
        fasciaMat
    );
    coreFascia.position.y = (rimY + recessedY) / 2;
    ceiling.add(coreFascia);

    const coreGoldRing = new THREE.Mesh(new THREE.TorusGeometry(coreRecessR, 0.055, 10, 96), goldMat);
    coreGoldRing.rotation.x = Math.PI / 2;
    coreGoldRing.position.y = rimY - rimThickness / 2 - 0.01;
    ceiling.add(coreGoldRing);

    // Ba vùng trưng bày: nền kín, hai vành hạ cốt, lõi cong và dải nhận diện.
    const innerTransitionR = R_CORE + 1.3;
    const outerTransitionR = R_OUTER - 1.6;
    ZONES.forEach(zone => {
        const a0 = zone.a0 - angleOverlap;
        const a1 = zone.a1 + angleOverlap;
        const steps = 48;

        createAnnularSectorMesh(R_CORE - 0.1, R_OUTER + 0.12, a0, a1, backstopY, backstopMat, steps, ceiling);
        createAnnularSectorMesh(R_CORE - 0.08, innerTransitionR + 0.08, a0, a1, rimY, rimMat, steps, ceiling);
        createAnnularSectorMesh(outerTransitionR - 0.08, R_OUTER + 0.1, a0, a1, rimY, rimMat, steps, ceiling);
        createAnnularSectorMesh(innerTransitionR, outerTransitionR, a0, a1, recessedY, recessedMat, steps, ceiling);

        createArcFascia(innerTransitionR, a0, a1, rimY, recessedY, fasciaMat, steps, ceiling);
        createArcFascia(outerTransitionR, a0, a1, rimY, recessedY, fasciaMat, steps, ceiling);

        const accentColor = new THREE.Color(zone.color).lerp(new THREE.Color(0xffffff), 0.18);
        const accentMat = new THREE.MeshStandardMaterial({
            color: accentColor,
            emissive: new THREE.Color(zone.color),
            emissiveIntensity: 0.2,
            roughness: 0.42,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        createAnnularSectorMesh(
            outerTransitionR - 0.02, outerTransitionR + 0.1,
            a0, a1, rimY - rimThickness / 2 - 0.012,
            accentMat, steps, ceiling
        );
    });

    // Dầm hướng tâm che đường nối giữa các cung và nhấn mạnh bố cục ba phần.
    [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].forEach(angle => {
        const length = R_OUTER - R_CORE + 0.25;
        const radiusMid = (R_CORE + R_OUTER) / 2;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(length, rimThickness, 0.24), rimMat);
        beam.position.set(Math.cos(angle) * radiusMid, rimY, Math.sin(angle) * radiusMid);
        beam.rotation.y = -angle;
        ceiling.add(beam);

        const inlay = new THREE.Mesh(new THREE.BoxGeometry(length - 0.2, 0.05, 0.065), goldMat);
        inlay.position.set(Math.cos(angle) * radiusMid, rimY - rimThickness / 2 - 0.012, Math.sin(angle) * radiusMid);
        inlay.rotation.y = -angle;
        ceiling.add(inlay);
    });

    // Hành lang: giữ hình chữ nhật nhưng nâng thành trần thả giật cấp như Chủ đề 5.
    const hallW = 6, hallD = 14.5, hallZ = -11.25, hallRimW = 1.05;
    const hallBackstop = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallD), backstopMat);
    hallBackstop.rotation.x = Math.PI / 2;
    hallBackstop.position.set(0, backstopY, hallZ);
    ceiling.add(hallBackstop);

    const hallInnerW = hallW - hallRimW * 2;
    const hallInnerD = hallD - hallRimW * 2;
    [
        [hallW, rimThickness, hallRimW, 0, rimY, hallZ - hallD / 2 + hallRimW / 2],
        [hallW, rimThickness, hallRimW, 0, rimY, hallZ + hallD / 2 - hallRimW / 2],
        [hallRimW, rimThickness, hallInnerD, -hallW / 2 + hallRimW / 2, rimY, hallZ],
        [hallRimW, rimThickness, hallInnerD, hallW / 2 - hallRimW / 2, rimY, hallZ]
    ].forEach(v => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(v[0], v[1], v[2]), rimMat);
        mesh.position.set(v[3], v[4], v[5]);
        ceiling.add(mesh);
    });

    const hallCore = new THREE.Mesh(new THREE.BoxGeometry(hallInnerW, 0.12, hallInnerD), recessedMat);
    hallCore.position.set(0, recessedY, hallZ);
    ceiling.add(hallCore);

    [-1, 1].forEach(side => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(hallInnerW, 0.05, 0.07), goldMat);
        strip.position.set(0, rimY - rimThickness / 2 - 0.012, hallZ + side * hallInnerD / 2);
        ceiling.add(strip);
    });

    const hallLight = new THREE.PointLight(0xffedcf, 44, 18, 1.7);
    hallLight.position.set(0, WALL_H - 1.1, hallZ);
    ceiling.add(hallLight);
}

// --- HÀM TẠO LOA 3D CHUYÊN DỤNG ---

function createZone3DAudio(path, position, zoneId) {
    const sound = new THREE.PositionalAudio(audioListener);

    // Metadata điều khiển "cách ly cứng theo zone": mỗi loa chỉ được mở âm lượng
    // khi camera đang đứng trong đúng zoneId của nó. Bắt đầu ở mức 0 (câm lặng).
    // leftAt = 0 nghĩa là "chưa từng ghé qua" → lần đầu tiên vào zone sẽ luôn phát từ đầu bài.
    const audioEntry = { zoneId, sound, baseVolume: 1.0, targetVolume: 0, leftAt: 0 };

    audioLoader.load(path, function(buffer) {
        sound.setBuffer(buffer);
        // Cấu hình mô hình lan truyền âm thanh (vẫn giữ để có chiều sâu không gian
        // NHẸ trong phạm vi zone, nhưng việc cách ly giữa các zone do targetVolume quyết định)
        sound.setDistanceModel('linear'); 
        sound.setRefDistance(8);   
        sound.setMaxDistance(25);  
        sound.setRolloffFactor(1);
        sound.setLoop(true);
        
        // KHÔNG bật to ngay: chỉ phát "ngầm" ở volume 0, chờ recalcAudioTargets() mở dần
        sound.setVolume(0);
        
        // Nếu người dùng đã click Bắt Đầu trước khi load xong
        if (started) {
            sound.play();
        }
    }, 
    undefined, 
    function(err) {
        // KHÔNG còn phát âm thanh dự phòng nữa — nếu file lỗi/không tải được thì
        // track này im lặng vĩnh viễn (sound.buffer vẫn là null, mọi nơi khác trong code
        // đều kiểm tra "if (entry.sound.buffer)" trước khi play/tính volume nên tự động bỏ qua).
        // Cảnh báo rõ trong Console để người chỉnh sửa dễ debug đường dẫn/CORS.
        console.warn(`⚠️ Không tải được nhạc cho zone ${zoneId}: "${path}"`);
        console.warn('   → Kiểm tra lại đường dẫn file, hoặc file không cho phép CORS. Zone này sẽ không phát nhạc.');
    });

    // Tạo Mesh rỗng để neo Âm thanh vào Không gian
    const speakerMesh = new THREE.Object3D();
    speakerMesh.position.copy(position);
    speakerMesh.add(sound);
    scene.add(speakerMesh);
    
    positionalAudios.push(audioEntry);
}

// Phương án lai: nếu rời khỏi 1 zone từ RESTART_THRESHOLD_MS trở lên thì lần quay lại
// sẽ phát LẠI TỪ ĐẦU bài (stop rồi play lại, offset về 0); nếu quay lại nhanh hơn ngưỡng
// đó (ví dụ đứng gần biên 2 zone rồi nhích qua lại) thì PHÁT TIẾP đúng đoạn đang dang dở,
// tránh giật/restart liên tục.
function handleZoneMusicTransition(oldZoneId, newZoneId) {
    const now = performance.now();

    // Đánh dấu mốc thời gian vừa rời khỏi zone cũ (nếu có zone cũ)
    if (oldZoneId !== null) {
        positionalAudios.forEach(entry => {
            if (entry.zoneId === oldZoneId) entry.leftAt = now;
        });
    }

    // Zone mới được kích hoạt: nếu đã "vắng mặt" đủ lâu (hoặc chưa từng ghé, leftAt=0)
    // thì restart về đầu bài; ngược lại giữ nguyên nguồn phát đang chạy ngầm.
    positionalAudios.forEach(entry => {
        if (entry.zoneId === newZoneId && entry.sound.buffer) {
            const awayMs = now - entry.leftAt;
            if (awayMs >= RESTART_THRESHOLD_MS) {
                if (entry.sound.isPlaying) entry.sound.stop();
                entry.sound.play();
            }
            entry.leftAt = now; // đang active — mốc này sẽ bị ghi đè khi thực sự rời đi lần sau
        }
    });
}

// Cách ly cứng theo zone + áp dụng âm lượng tổng/mute do người dùng điều chỉnh.
// Chỉ zone đang đứng trong mới có targetVolume > 0, và toàn bộ bị nhân thêm masterVolume,
// hoặc về thẳng 0 nếu đang isMuted — tất cả gói gọn trong MỘT nguồn sự thật duy nhất.
function recalcAudioTargets() {
    positionalAudios.forEach(entry => {
        const zoneActive = (entry.zoneId === lastZoneId);
        entry.targetVolume = (zoneActive && !isMuted) ? entry.baseVolume * masterVolume : 0;
    });
}

// Đặt âm lượng tổng (0..1), tự động bỏ mute nếu người dùng chủ động tăng lên từ 0
function setMasterVolume(v) {
    masterVolume = Math.min(1, Math.max(0, v));
    if (masterVolume > 0 && isMuted) isMuted = false;
    updateVolumeIcon();
    recalcAudioTargets();
}

// Cập nhật icon loa theo trạng thái: 🔇 khi mute/volume=0, 🔉 khi nhỏ, 🔊 khi bình thường
function updateVolumeIcon() {
    if (!elMuteBtn) return;
    if (isMuted || masterVolume <= 0) {
        elMuteBtn.textContent = '🔇';
        elMuteBtn.classList.add('muted');
        elMuteBtn.title = 'Bật tiếng';
    } else if (masterVolume < 0.55) {
        elMuteBtn.textContent = '🔉';
        elMuteBtn.classList.remove('muted');
        elMuteBtn.title = 'Tắt tiếng';
    } else {
        elMuteBtn.textContent = '🔊';
        elMuteBtn.classList.remove('muted');
        elMuteBtn.title = 'Tắt tiếng';
    }
}

// --- HÀM RENDER CHỮ 3D VÀ BẢNG THÔNG TIN ---
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' '); let line = ''; const lines = [];
    for (let n = 0; n < words.length; n++) {
        const test = line + words[n] + ' ';
        if (ctx.measureText(test).width > maxWidth && n > 0) { lines.push(line.trim()); line = words[n] + ' '; } else line = test;
    }
    lines.push(line.trim()); 
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight)); 
}

function createReferenceTitle(cfg) {
    const c = document.createElement('canvas'); 
    c.width = cfg.w ? cfg.w * 200 : 900; 
    c.height = cfg.h ? cfg.h * 200 : 150; 
    const ctx = c.getContext('2d'); 
    
    if (cfg.bgColor) {
        ctx.fillStyle = cfg.bgColor; ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
    } else ctx.clearRect(0, 0, c.width, c.height);

    const tColor = cfg.textColor || ('#' + cfg.color.toString(16).padStart(6, '0'));
    const fontSize = cfg.bgColor ? 60 : 42;
    ctx.fillStyle = tColor; ctx.font = '700 ' + fontSize + 'px ' + UI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    wrapText(ctx, cfg.text, c.width / 2, c.height / 2, c.width - 80, fontSize * 1.25); 

    const tex = createSRGBCanvasTexture(c);
    const segments = cfg.curveRadius ? 32 : 1;
    const panelGeo = new THREE.PlaneGeometry(cfg.w || 4.8, cfg.h || 0.8, segments, 1);
    if (cfg.curveRadius) bendGeometry(panelGeo, cfg.curveRadius);

    const matOpts = { map: tex, transparent: !cfg.bgColor };
    if (cfg.color && !cfg.bgColor) { matOpts.emissive = cfg.color; matOpts.emissiveMap = tex; matOpts.emissiveIntensity = 0.28; } else if (cfg.bgColor) { matOpts.roughness = 0.6; }

    const panel = new THREE.Mesh(panelGeo, new THREE.MeshStandardMaterial(matOpts));
    panel.position.set(cfg.x, cfg.y, cfg.z); panel.rotation.y = cfg.rotY; scene.add(panel);
}

function createLargeInfographic(cfg) {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const ctx = c.getContext('2d');
    const accent = '#' + (cfg.accent || RED).toString(16).padStart(6, '0');
    
    ctx.fillStyle = cfg.bgColor || '#171a21'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, c.width, 180);
    ctx.fillStyle = cfg.titleColor || '#ffffff'; ctx.font = '900 86px ' + UI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cfg.title.toUpperCase(), c.width/2, 90);
    
    ctx.fillStyle = cfg.textColor || '#ffffff'; ctx.font = '700 48px ' + UI_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText("PHONG TRÀO NỔI BẬT", 80, 240);
    
    ctx.fillStyle = cfg.contentColor || '#cbd5e1'; ctx.font = '400 36px ' + UI_FONT;
    wrapText(ctx, cfg.content, 80, 320, 800, 52);
    
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(1250, 500, 220, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = cfg.bgColor || '#171a21'; ctx.beginPath(); ctx.arc(1250, 500, 180, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = cfg.titleColor || '#ffffff'; ctx.font = '900 96px ' + UI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cfg.year || "1964", 1250, 500);
    
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(80, 750, 1440, 180);
    ctx.fillStyle = accent; ctx.font = '900 64px ' + UI_FONT; ctx.textAlign = 'left';
    ctx.fillText("200,000+", 120, 840);
    ctx.fillStyle = cfg.textColor || '#ffffff'; ctx.font = '400 32px ' + UI_FONT;
    ctx.fillText("Lá đơn tình nguyện", 440, 840);

    const tex = createSRGBCanvasTexture(c); tex.anisotropy = 4;
    const segments = cfg.curveRadius ? 48 : 1;
    const panelGeo = new THREE.PlaneGeometry(cfg.w, cfg.h, segments, 1);
    
    let frameDepth = 0.1, framePadding = 0.2;
    const frameGeo = new THREE.BoxGeometry(cfg.w + framePadding, cfg.h + framePadding, frameDepth, segments, 1, 1);
    frameGeo.translate(0, 0, -frameDepth / 2 - 0.01);
    if (cfg.curveRadius) { bendGeometry(panelGeo, cfg.curveRadius); bendGeometry(frameGeo, cfg.curveRadius); }

    const panel = new THREE.Mesh(panelGeo, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.1, roughness: 0.5 }));
    const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.5, metalness: 0.5 }));
    
    const group = new THREE.Group(); group.add(frame, panel);
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);
    
    panel.userData = { 
        type: 'infographic', title: cfg.title, zoneName: cfg.zoneName, 
        content: cfg.content, color: cfg.accent, 
        imageUrl: placeholderImage(1600, 1000, cfg.accent.toString(16).padStart(6, '0'), cfg.title)
    };
    interactiveObjects.push(panel); return group;
}

function createWallPicture(cfg) {
    const segments = cfg.curveRadius ? 24 : 1;
    const group = new THREE.Group();
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);

    const w = cfg.w; const h = cfg.h;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xcdbb86, roughness: .36, metalness: .42 });
    const matBoardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .62 });

    const outerGeo = new THREE.BoxGeometry(w + .48, h + .48, .18, segments, 1, 1); outerGeo.translate(0, 0, .03);
    if (cfg.curveRadius) bendGeometry(outerGeo, cfg.curveRadius);
    group.add(new THREE.Mesh(outerGeo, frameMat));

    const matGeo = new THREE.BoxGeometry(w + .18, h + .18, .08, segments, 1, 1); matGeo.translate(0, 0, .1);
    if (cfg.curveRadius) bendGeometry(matGeo, cfg.curveRadius);
    group.add(new THREE.Mesh(matGeo, matBoardMat));

    const picGeo = new THREE.PlaneGeometry(w, h, segments, 1); picGeo.translate(0, 0, .15);
    if (cfg.curveRadius) bendGeometry(picGeo, cfg.curveRadius);
    
    const picMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, side: THREE.DoubleSide });
    if (cfg.imageUrl) {
        new THREE.TextureLoader().load(cfg.imageUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            const imageAspect = tex.image.width / tex.image.height;
            const frameAspect = w / h;
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            if (imageAspect > frameAspect) {
                tex.repeat.x = frameAspect / imageAspect;
                tex.offset.x = (1 - tex.repeat.x) / 2;
            } else {
                tex.repeat.y = imageAspect / frameAspect;
                tex.offset.y = (1 - tex.repeat.y) / 2;
            }
            picMat.map = tex;
            picMat.needsUpdate = true;
        });
    }
    const picture = new THREE.Mesh(picGeo, picMat);
    picture.userData = { type: 'artifact', title: cfg.title, zoneName: cfg.zoneName, content: cfg.content, color: cfg.accent, imageUrl: cfg.imageUrl };
    interactiveObjects.push(picture); group.add(picture);

    if (cfg.subtitle || cfg.year) {
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 1200; labelCanvas.height = 240;
        const labelCtx = labelCanvas.getContext('2d');
        labelCtx.fillStyle = '#17344c'; labelCtx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
        labelCtx.fillStyle = '#d7b56b'; labelCtx.fillRect(0, 0, 18, labelCanvas.height);
        labelCtx.textAlign = 'left'; labelCtx.textBaseline = 'middle';
        labelCtx.fillStyle = '#ffffff'; labelCtx.font = '700 48px ' + UI_FONT;
        labelCtx.fillText(cfg.title, 52, 76, 1080);
        labelCtx.fillStyle = '#d7b56b'; labelCtx.font = '600 34px ' + UI_FONT;
        labelCtx.fillText([cfg.year, cfg.subtitle].filter(Boolean).join(' · '), 52, 158, 1080);
        const labelTexture = createSRGBCanvasTexture(labelCanvas);
        const labelGeo = new THREE.PlaneGeometry(w + .18, .62);
        labelGeo.translate(0, -h / 2 - .42, .17);
        const label = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({ map: labelTexture, roughness: .58 }));
        group.add(label);
    }
}

function addExhibitBox(group, size, material, position, rotation = null) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    group.add(object);
    return object;
}

function createExhibitPhoto(group, cfg, width, height, z = .2, emissive = false) {
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: emissive ? .28 : .62,
        emissive: emissive ? 0xffffff : 0x000000,
        emissiveIntensity: emissive ? .1 : 0,
        side: THREE.DoubleSide
    });
    new THREE.TextureLoader().load(cfg.imageUrl, texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const imageAspect = texture.image.width / texture.image.height;
        const frameAspect = width / height;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        if (imageAspect > frameAspect) {
            texture.repeat.x = frameAspect / imageAspect;
            texture.offset.x = (1 - texture.repeat.x) / 2;
        } else {
            texture.repeat.y = imageAspect / frameAspect;
            texture.offset.y = (1 - texture.repeat.y) / 2;
        }
        material.map = texture;
        if (emissive) material.emissiveMap = texture;
        material.needsUpdate = true;
    });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    photo.position.z = z;
    photo.userData = { type: 'artifact', title: cfg.title, zoneName: cfg.zoneName, content: cfg.content, color: cfg.accent, imageUrl: cfg.imageUrl };
    interactiveObjects.push(photo);
    group.add(photo);
    return photo;
}

function createExhibitLabel(group, cfg, y, width, palette = {}, height = .66) {
    const canvas = document.createElement('canvas');
    canvas.width = 1400; canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = palette.background || '#17344c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.accent || '#d7b56b'; ctx.fillRect(0, 0, 20, canvas.height);
    ctx.strokeStyle = palette.border || 'rgba(215,181,107,.7)'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.title || '#ffffff'; ctx.font = '700 48px ' + UI_FONT;
    wrapText(ctx, cfg.title, canvas.width / 2, 96, canvas.width - 120, 54);
    ctx.fillStyle = palette.meta || '#d7b56b'; ctx.font = '600 34px ' + UI_FONT;
    ctx.fillText([cfg.year, cfg.subtitle].filter(Boolean).join(' · '), canvas.width / 2, 242, canvas.width - 110);
    const texture = createSRGBCanvasTexture(canvas);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .52 }));
    label.position.set(0, y, .24); group.add(label);
    return label;
}

function createHeritageExhibit(cfg) {
    const group = new THREE.Group();
    const goldVariant = cfg.displayStyle === 'heritage-gold';
    const wood = new THREE.MeshStandardMaterial({ color: 0x4b2b20, roughness: .64, metalness: .02 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x20120d, roughness: .72 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb58a3c, roughness: .3, metalness: .68 });
    const warm = new THREE.MeshStandardMaterial({ color: 0xeee2ce, roughness: .82 });
    const w = cfg.w, h = cfg.h;
    addExhibitBox(group, [w + .48, h + .48, .16], goldVariant ? brass : woodDark, [0, 0, 0]);
    addExhibitBox(group, [w + .32, h + .32, .13], goldVariant ? woodDark : wood, [0, 0, .09]);
    addExhibitBox(group, [w + .14, h + .14, .08], goldVariant ? wood : brass, [0, 0, .17]);
    addExhibitBox(group, [w, h, .05], warm, [0, 0, .22]);
    createExhibitPhoto(group, cfg, w - .18, h - .18, .26, false);
    if (goldVariant) {
        addExhibitBox(group, [w * .72, .1, .12], brass, [0, h / 2 + .32, .2]);
        addExhibitBox(group, [w * .42, .1, .14], woodDark, [0, h / 2 + .46, .21]);
    } else {
        const crest = new THREE.Mesh(new THREE.CircleGeometry(.16, 32), brass);
        crest.position.set(0, h / 2 + .37, .22); group.add(crest);
        addExhibitBox(group, [.7, .06, .08], brass, [0, h / 2 + .16, .2]);
    }
    createExhibitLabel(group, cfg, -h / 2 - .48, w + .38, { background: '#2a1811', accent: '#b58a3c', border: '#6f4b22', meta: '#e0bd73' }, .68);
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);
    return group;
}

function createDigitalScholarExhibit(cfg) {
    const group = new THREE.Group();
    const portraitMode = cfg.displayStyle === 'digital-portrait';
    const navy = new THREE.MeshStandardMaterial({ color: 0x102f4a, roughness: .28, metalness: .32 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x38c8ef, emissive: 0x18a8df, emissiveIntensity: .75, roughness: .18, metalness: .48 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xdbe6ed, roughness: .32, metalness: .45 });
    const w = cfg.w, h = cfg.h;
    addExhibitBox(group, [w + .38, h + .38, .15], navy, [0, 0, .02]);
    addExhibitBox(group, [w + .16, h + .16, .06], silver, [0, 0, .13]);
    createExhibitPhoto(group, cfg, w, h, .19, true);
    if (portraitMode) {
        addExhibitBox(group, [.07, h + .7, .1], cyan, [-w / 2 - .27, 0, .14]);
        addExhibitBox(group, [.07, h + .7, .1], cyan, [w / 2 + .27, 0, .14]);
        addExhibitBox(group, [w * .55, .07, .1], cyan, [0, h / 2 + .28, .14]);
    } else {
        addExhibitBox(group, [w + .72, .08, .1], cyan, [0, h / 2 + .28, .14]);
        addExhibitBox(group, [.55, .08, .1], cyan, [-w / 2 - .08, -h / 2 - .12, .14], [0, 0, -.42]);
        addExhibitBox(group, [.55, .08, .1], cyan, [w / 2 + .08, -h / 2 - .12, .14], [0, 0, .42]);
    }
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w + .04, h + .04), new THREE.MeshPhysicalMaterial({ color: 0xdff7ff, transparent: true, opacity: .08, roughness: .05, clearcoat: 1, depthWrite: false }));
    glass.position.z = .225; group.add(glass);
    createExhibitLabel(group, cfg, -h / 2 - .48, w + .35, { background: '#0b2942', accent: '#38c8ef', border: '#237fa4', meta: '#8ee9ff' }, .68);
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);
    return group;
}

function createAwardExhibit(cfg) {
    const group = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: 0xd7b56b, roughness: .26, metalness: .72 });
    const navy = new THREE.MeshStandardMaterial({ color: 0x17344c, roughness: .38, metalness: .22 });
    const ivory = new THREE.MeshStandardMaterial({ color: 0xf3eadb, roughness: .78 });
    const w = cfg.w, h = cfg.h;
    addExhibitBox(group, [w + .5, h + .5, .18], navy, [0, 0, 0]);
    addExhibitBox(group, [w + .28, h + .28, .08], brass, [0, 0, .12]);
    addExhibitBox(group, [w + .08, h + .08, .04], ivory, [0, 0, .18]);
    createExhibitPhoto(group, cfg, w - .1, h - .1, .22, false);
    const shelf = addExhibitBox(group, [w + .7, .12, .48], brass, [0, -h / 2 - .22, .12]);
    shelf.rotation.x = -.06;
    [-.38, 0, .38].forEach((x, index) => {
        const medal = new THREE.Mesh(new THREE.CylinderGeometry(.09 + index * .01, .09 + index * .01, .08, 24), brass);
        medal.rotation.x = Math.PI / 2; medal.position.set(x, -h / 2 - .18, .42); group.add(medal);
    });
    createExhibitLabel(group, cfg, -h / 2 - .72, w + .45, { background: '#f0e5d3', accent: '#b58a3c', border: '#b58a3c', title: '#17344c', meta: '#76502e' }, .66);
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);
    return group;
}

function createSeminarScreenExhibit(cfg) {
    const group = new THREE.Group();
    const black = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: .2, metalness: .5 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x4bd5f4, emissive: 0x1eaed5, emissiveIntensity: .9, roughness: .16, metalness: .4 });
    const w = cfg.w, h = cfg.h;
    addExhibitBox(group, [w + .42, h + .42, .2], black, [0, 0, 0]);
    createExhibitPhoto(group, cfg, w, h, .13, true);
    addExhibitBox(group, [w + .56, .07, .09], cyan, [0, h / 2 + .25, .14]);
    addExhibitBox(group, [w * .66, .07, .09], cyan, [w * .12, -h / 2 - .24, .14]);
    const tagCanvas = document.createElement('canvas'); tagCanvas.width = 600; tagCanvas.height = 180;
    const tagCtx = tagCanvas.getContext('2d'); tagCtx.fillStyle = '#4bd5f4'; tagCtx.fillRect(0, 0, 600, 180);
    tagCtx.fillStyle = '#071722'; tagCtx.textAlign = 'center'; tagCtx.textBaseline = 'middle'; tagCtx.font = '800 68px ' + UI_FONT; tagCtx.fillText('SEMINAR · 2025', 300, 90);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.75, .46), new THREE.MeshStandardMaterial({ map: createSRGBCanvasTexture(tagCanvas), emissive: 0x4bd5f4, emissiveIntensity: .15 }));
    tag.position.set(-w / 2 + .7, h / 2 + .48, .18); group.add(tag);
    createExhibitLabel(group, cfg, -h / 2 - .52, w + .3, { background: '#111820', accent: '#4bd5f4', border: '#287b93', meta: '#8ee9ff' }, .7);
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);
    return group;
}

function createResearchPanoramaExhibit(cfg) {
    const group = new THREE.Group();
    const navy = new THREE.MeshStandardMaterial({ color: 0x102f4a, roughness: .3, metalness: .3 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd7b56b, roughness: .28, metalness: .66 });
    const w = cfg.w, h = cfg.h;
    addExhibitBox(group, [w + .5, h + .38, .15], navy, [0, 0, 0]);
    createExhibitPhoto(group, cfg, w, h, .12, true);
    addExhibitBox(group, [.55, .1, .1], brass, [-w / 2 - .18, h / 2 + .05, .14], [0, 0, -.55]);
    addExhibitBox(group, [.55, .1, .1], brass, [w / 2 + .18, -h / 2 - .05, .14], [0, 0, -.55]);
    const stats = [['743', 'ĐỀ TÀI'], ['2.000+', 'SINH VIÊN'], ['100', 'GIẢI THƯỞNG']];
    stats.forEach(([value, label], index) => {
        const c = document.createElement('canvas'); c.width = 420; c.height = 240; const ctx = c.getContext('2d');
        ctx.fillStyle = '#f0e5d3'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = '#d7b56b'; ctx.lineWidth = 10; ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
        ctx.fillStyle = '#17344c'; ctx.textAlign = 'center'; ctx.font = '800 72px ' + UI_FONT; ctx.fillText(value, 210, 100);
        ctx.fillStyle = '#76502e'; ctx.font = '700 34px ' + UI_FONT; ctx.fillText(label, 210, 178);
        const chip = new THREE.Mesh(new THREE.PlaneGeometry(.82, .48), new THREE.MeshStandardMaterial({ map: createSRGBCanvasTexture(c), roughness: .62 }));
        chip.position.set((index - 1) * .94, -h / 2 - .38, .18); group.add(chip);
    });
    createExhibitLabel(group, cfg, h / 2 + .52, w + .25, { background: '#17344c', accent: '#d7b56b', border: '#d7b56b', meta: '#f0d598' }, .66);
    group.position.set(cfg.x, cfg.y, cfg.z); group.rotation.y = cfg.rotY; scene.add(group);
    return group;
}

function createResearchExhibit(cfg) {
    if (cfg.displayStyle?.startsWith('heritage-')) return createHeritageExhibit(cfg);
    if (cfg.displayStyle?.startsWith('digital-')) return createDigitalScholarExhibit(cfg);
    if (cfg.displayStyle === 'award') return createAwardExhibit(cfg);
    if (cfg.displayStyle === 'seminar-screen') return createSeminarScreenExhibit(cfg);
    if (cfg.displayStyle === 'research-panorama') return createResearchPanoramaExhibit(cfg);
    return createWallPicture(cfg);
}

function createResearchKiosk(position, rotationY) {
    const group = new THREE.Group();
    const navy = new THREE.MeshStandardMaterial({ color: 0x102f4a, roughness: .36, metalness: .18 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x76502e, roughness: .68, metalness: .04 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd7b56b, roughness: .28, metalness: .62 });
    const addBox = (size, material, xyz, rotX = 0) => {
        const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        object.position.set(...xyz); object.rotation.x = rotX; group.add(object); return object;
    };
    addBox([2.9, .14, 1.72], brass, [0, .07, 0]);
    addBox([2.72, .1, 1.56], navy, [0, .16, 0]);
    addBox([1.62, 1.08, .86], wood, [0, .68, .06]);
    addBox([1.42, .9, .7], navy, [0, .78, -.1]);
    addBox([3.05, .15, 1.96], navy, [0, 1.42, -.02], -.38);

    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1200; screenCanvas.height = 700;
    const ctx = screenCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1200, 700);
    gradient.addColorStop(0, '#0b2942'); gradient.addColorStop(1, '#086994');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1200, 700);
    ctx.strokeStyle = '#42c9ee'; ctx.lineWidth = 8; ctx.strokeRect(28, 28, 1144, 644);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = '800 64px ' + UI_FONT;
    ctx.fillText('TRA CỨU TƯ LIỆU NCKH', 600, 145);
    ctx.fillStyle = '#8ee9ff'; ctx.font = '500 38px ' + UI_FONT;
    ctx.fillText('Chọn các khung ảnh trên tường để xem chi tiết', 600, 220);
    ['04 NHÀ KHOA HỌC', '03 HOẠT ĐỘNG', '05 MỐC THỜI GIAN'].forEach((text, index) => {
        const x = 110 + index * 360;
        ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x, 320, 300, 190);
        ctx.fillStyle = '#d7b56b'; ctx.font = '700 36px ' + UI_FONT; ctx.fillText(text, x + 150, 420);
    });
    const screenTexture = createSRGBCanvasTexture(screenCanvas);
    const screenMaterial = new THREE.MeshStandardMaterial({ map: screenTexture, emissive: 0x0b5f8d, emissiveMap: screenTexture, emissiveIntensity: .28, roughness: .22 });
    addBox([2.75, .035, 1.66], screenMaterial, [0, 1.49, .12], -.38);
    addBox([2.48, .018, .035], brass, [0, 1.77, .22], -.38);
    group.position.set(position.x, position.y || 0, position.z);
    group.rotation.y = rotationY;
    scene.add(group);
    return group;
}

function createZoneTimeline(zone, entries) {
    const radius = WALL_MOUNT_R - .16;
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x17344c, roughness: .34, metalness: .28 });
    const dotMat = new THREE.MeshStandardMaterial({ color: 0xd7b56b, roughness: .26, metalness: .68 });
    const steps = 36;
    const safeStart = .09;
    const safeSpan = .82;
    for (let i = 0; i < steps; i++) {
        const f0 = safeStart + i * (safeSpan / steps);
        const f1 = safeStart + (i + 1) * (safeSpan / steps);
        const p0 = zonePoint(zone, f0, radius);
        const p1 = zonePoint(zone, f1, radius);
        const mid = zonePoint(zone, (f0 + f1) / 2, radius);
        const segment = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(p1.x - p0.x, p1.z - p0.z) * 1.08, .08, .07), lineMat);
        segment.position.set(mid.x, 1.18, mid.z);
        segment.rotation.y = faceCoreRotY(mid.angle);
        scene.add(segment);
    }
    entries.forEach(entry => {
        const p = zonePoint(zone, entry.fraction, radius - .03);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), dotMat);
        dot.position.set(p.x, 1.18, p.z); scene.add(dot);
        createReferenceTitle({
            x: p.x, z: p.z, y: .68, rotY: faceCoreRotY(p.angle), text: entry.year,
            color: BLUE, curveRadius: radius, bgColor: '#f0e5d3', textColor: '#17344c', w: 1.4, h: .38
        });
    });
}

function buildZoneContents() {
    buildZone1_YeuNuoc();
    buildZone2_TinhNguyenVaSuPham();
    buildZone3_NCKH();
}

function buildZone1_YeuNuoc() {
    const Z = getZoneById(1); 
    const content = getZoneContent(1);

    // Đặt loa ở trung tâm Cụm 1 lơ lửng trên không trung (Y = WALL_H/2)
    const pCenter = zonePoint(Z, 0.5, MID_R);
    createZone3DAudio(Z.audio, new THREE.Vector3(pCenter.x, WALL_H/2, pCenter.z), Z.id);

    const titleP = zonePoint(Z, 0.5, WALL_MOUNT_R - 0.08);
    createReferenceTitle({
        x: titleP.x, z: titleP.z, y: 7.6, rotY: faceCoreRotY(titleP.angle),
        text: content.heading, color: RED, curveRadius: WALL_MOUNT_R - 0.08, 
        bgColor: '#e3000f', textColor: '#fff200', w: 7.5, h: 1.2
    });
    
    const info1 = content.infographics[0];
    const info1P = zonePoint(Z, info1.fraction, WALL_MOUNT_R);
    createLargeInfographic({
        x: info1P.x, z: info1P.z, y: 4.2, rotY: faceCoreRotY(info1P.angle),
        w: 6.5, h: 4.0, accent: GOLD, bgColor: '#b30000', titleColor: '#e3000f', textColor: '#fff200', contentColor: '#ffffff', zoneName: Z.name,
        title: info1.title, year: info1.year, content: info1.content,
        curveRadius: WALL_MOUNT_R
    });

    const info2 = content.infographics[1];
    const info2P = zonePoint(Z, info2.fraction, WALL_MOUNT_R);
    createLargeInfographic({
        x: info2P.x, z: info2P.z, y: 4.2, rotY: faceCoreRotY(info2P.angle),
        w: 6.5, h: 4.0, accent: GOLD, bgColor: '#b30000', titleColor: '#e3000f', textColor: '#fff200', contentColor: '#ffffff', zoneName: Z.name,
        title: info2.title, year: info2.year, content: info2.content,
        curveRadius: WALL_MOUNT_R
    });

    // --- 3D DECOR: Khu tưởng niệm ---
    // [Khu trung tâm] Bục phát biểu - đối diện lối vào, tạo điểm nhấn chính
    const podiumP = zonePoint(Z, 0.5, R_CORE + 2.0);
    createPodium({ x: podiumP.x, y: 0, z: podiumP.z }, faceCoreRotY(podiumP.angle) + Math.PI);

}

function buildZone3_NCKH() {
    const Z = getZoneById(3);
    const content = getZoneContent(3);

    // Đặt loa ở trung tâm Cụm 3
    const pCenter = zonePoint(Z, 0.5, MID_R);
    createZone3DAudio(Z.audio, new THREE.Vector3(pCenter.x, WALL_H/2, pCenter.z), Z.id);

    const titleP = zonePoint(Z, 0.5, WALL_MOUNT_R - 0.08);
    createReferenceTitle({ 
        x: titleP.x, z: titleP.z, y: 8.75, rotY: faceCoreRotY(titleP.angle), 
        text: content.heading, color: BLUE, curveRadius: WALL_MOUNT_R - 0.08, 
        bgColor: '#17344c', textColor: '#ffffff', w: 9.4, h: 1.0 
    });

    content.sections.forEach(section => {
        const p = zonePoint(Z, section.fraction, WALL_MOUNT_R - .1);
        createReferenceTitle({
            x: p.x, z: p.z, y: 7.25, rotY: faceCoreRotY(p.angle),
            text: section.title, color: BLUE, curveRadius: WALL_MOUNT_R - .1,
            bgColor: '#f0e5d3', textColor: '#17344c', w: section.width, h: .55
        });
    });

    content.gallery.forEach(item => {
        const p = zonePoint(Z, item.f, WALL_MOUNT_R - 0.1);
        createResearchExhibit({ 
            x: p.x, z: p.z, y: item.y, rotY: faceCoreRotY(p.angle), w: item.w, h: item.h, 
            displayStyle: item.displayStyle, accent: BLUE, title: item.title, subtitle: item.subtitle, year: item.year,
            zoneName: Z.name, content: item.content,
            curveRadius: WALL_MOUNT_R - 0.1, 
            imageUrl: item.imageUrl
        });
    });

    createZoneTimeline(Z, content.timeline);

    // Kiosk được thu nhỏ và đặt trong vành an toàn, không lấn ranh hai đầu cung.
    const kioskP = zonePoint(Z, .54, 13.5);
    const kiosk = createResearchKiosk({ x: kioskP.x, y: 0, z: kioskP.z }, faceCoreRotY(kioskP.angle) + Math.PI);
    kiosk.scale.setScalar(.72);
}

function buildZone2_TinhNguyenVaSuPham() {
    const Z = getZoneById(2);
    const content = getZoneContent(2);
    
    // Đặt loa ở trung tâm Cụm 2
    const pCenter = zonePoint(Z, 0.5, MID_R);
    createZone3DAudio(Z.audio, new THREE.Vector3(pCenter.x, WALL_H/2, pCenter.z), Z.id);

    const titleP = zonePoint(Z, 0.5, WALL_MOUNT_R - 0.08);
    createReferenceTitle({ 
        x: titleP.x, z: titleP.z, y: 8.5, rotY: faceCoreRotY(titleP.angle), 
        text: content.heading, color: GREEN, curveRadius: WALL_MOUNT_R - 0.08,
        bgColor: '#009688', textColor: '#ffffff', w: 9.0, h: 1.2
    });

    const mapP = zonePoint(Z, 0.25, WALL_MOUNT_R);
    createHeatmapPanel(mapP, Z);

    const tvP = zonePoint(Z, 0.48, WALL_MOUNT_R);
    createHeatmapTV(tvP, Z);

    const headerH = zonePoint(Z, 0.70, WALL_MOUNT_R - 0.05);
    createReferenceTitle({
        x: headerH.x, z: headerH.z, y: 6.5, rotY: faceCoreRotY(headerH.angle),
        text: content.campaignHeading, color: GREEN, curveRadius: WALL_MOUNT_R - 0.05, w: 5.0, h: 0.6
    });
    
    content.campaigns.forEach((campaign) => {
        const point = zonePoint(Z, campaign.fraction, WALL_MOUNT_R);
        createWallPicture({
            x: point.x, z: point.z, y: 3.8, rotY: faceCoreRotY(point.angle), w: campaign.width, h: 3.2,
            accent: GREEN, title: campaign.title, zoneName: Z.name, content: campaign.content,
            curveRadius: WALL_MOUNT_R, imageUrl: placeholderImage(600, 800, '009688', campaign.placeholder)
        });
    });

}

function createHeatmapPanel(p, zone) {
    const mapRoot = new THREE.Group();
    mapRoot.position.set(p.x, 4.8, p.z);
    mapRoot.rotation.y = faceCoreRotY(p.angle);
    scene.add(mapRoot);

    // Raycast chỉ làm việc với lớp này, không phải với GLB hơn 5 triệu chỉ mục.
    const hitArea = new THREE.Mesh(
        new THREE.PlaneGeometry(NORTHERN_MAP_SIZE.width, NORTHERN_MAP_SIZE.height),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    );
    hitArea.position.z = NORTHERN_MAP_WALL_CLEARANCE + 0.08;
    hitArea.userData = { type: 'map-panel', title: 'Bản đồ miền Bắc · bấm để xem hoạt động', zoneName: zone.name, color: zone.color };
    mapRoot.add(hitArea);
    interactiveObjects.push(hitArea);
    addProvinceHotspotMarkers(mapRoot);

    new GLTFLoader().load(NORTHERN_MAP_GLB, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = NORTHERN_MAP_SIZE.width / size.x;
        model.position.set(
            -center.x * scale,
            -center.y * scale,
            -center.z * scale + NORTHERN_MAP_WALL_CLEARANCE
        );
        model.scale.setScalar(scale);
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.castShadow = false;
            child.receiveShadow = false;
            if (Array.isArray(child.material)) child.material.forEach((material) => { material.side = THREE.DoubleSide; });
            else if (child.material) child.material.side = THREE.DoubleSide;
        });
        mapRoot.add(model);
    }, undefined, (error) => {
        console.error('Không tải được bản đồ GLB miền Bắc:', error);
        hitArea.userData.title = 'Bản đồ miền Bắc (chưa tải được GLB)';
    });
}

function createHeatmapTV(p, zone) {
    heatmapTVCanvas = document.createElement('canvas'); heatmapTVCanvas.width = 1280; heatmapTVCanvas.height = 720;
    heatmapTVCtx = heatmapTVCanvas.getContext('2d');
    heatmapTVTex = createSRGBCanvasTexture(heatmapTVCanvas); heatmapTVTex.anisotropy = 4;

    const w = 4.2, h = 2.4;
    const geo = new THREE.PlaneGeometry(w, h, 32, 1); bendGeometry(geo, WALL_MOUNT_R);
    heatmapTVMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: heatmapTVTex, emissive: 0xffffff, emissiveMap: heatmapTVTex, emissiveIntensity: 0.5 }));
    heatmapTVMesh.position.set(p.x, 4.5, p.z); heatmapTVMesh.rotation.y = faceCoreRotY(p.angle);
    scene.add(heatmapTVMesh);

    const fGeo = new THREE.BoxGeometry(w+0.1, h+0.1, 0.1, 32, 1, 1); fGeo.translate(0, 0, -0.06); bendGeometry(fGeo, WALL_MOUNT_R);
    const frame = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({color: 0x111, roughness: 0.2}));
    frame.position.copy(heatmapTVMesh.position); frame.rotation.copy(heatmapTVMesh.rotation); scene.add(frame);

    updateHeatmapTV('MÀN HÌNH TƯƠNG TÁC', 'Hãy click vào các khu vực trên Bản đồ nhiệt để xem chi tiết hoạt động tại nơi đó.', '#009688');
}

function updateHeatmapTV(title, content, colorHex) {
    const ctx = heatmapTVCtx; const c = heatmapTVCanvas;
    ctx.fillStyle = '#0a0e17'; ctx.fillRect(0, 0, c.width, c.height);
    
    ctx.fillStyle = colorHex; ctx.fillRect(0, 0, c.width, 140);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 56px ' + UI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), c.width/2, 70);

    ctx.fillStyle = '#cbd5e1'; ctx.font = '400 38px ' + UI_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    wrapText(ctx, content, 80, 240, 1120, 56);
    
    ctx.fillStyle = colorHex; ctx.beginPath(); ctx.arc(1080, 540, 160, 0, Math.PI*2); ctx.fill();
    heatmapTVTex.needsUpdate = true;
}

function checkMapHotspotClick(uvX, uvY) {
    const hotspot = getProvinceAtUV(uvX, uvY);
    if (hotspot) {
        selectProvince(hotspot);
        return;
    }

    // Dùng các giá trị này để hiệu chỉnh chính xác hotspot theo vị trí bạn chỉ.
    console.info(`[Northern map] UV: ${uvX.toFixed(4)}, ${uvY.toFixed(4)}`);
    elZoneFlash.style.boxShadow = `inset 0 0 260px 60px #f4b223`;
    elZoneFlash.style.opacity = '0.5';
    setTimeout(() => { elZoneFlash.style.opacity = '0'; }, 300);
}

function getProvinceAtUV(uvX, uvY) {
    const hitX = (uvX - 0.5) * NORTHERN_MAP_SIZE.width;
    const hitY = (uvY - 0.5) * NORTHERN_MAP_SIZE.height;
    const radiusSquared = PROVINCE_HOTSPOT_RADIUS ** 2;

    return NORTHERN_MAP_HOTSPOTS.find((province) => {
        const center = getPolygonCenter(province.polygon);
        const dotX = (center.x + province.markerOffset[0] - 0.5) * NORTHERN_MAP_SIZE.width;
        const dotY = (center.y + province.markerOffset[1] - 0.5) * NORTHERN_MAP_SIZE.height;
        return (hitX - dotX) ** 2 + (hitY - dotY) ** 2 <= radiusSquared;
    }) || null;
}

let lastZoneId = null; const baseFogColor = new THREE.Color(0xdcdad2); const targetFogColor = new THREE.Color(0xdcdad2);
let zoneFlashTimer = null;

function updateZoneBanner(zone) {
    if (zone.id !== lastZoneId) {
        const isFirstLoad = lastZoneId === null; const oldZoneId = lastZoneId; lastZoneId = zone.id;
        if (started && elProvinceSelector) {
            elProvinceSelector.style.display = (SHOW_PROVINCE_SELECTOR && zone.id === 2) ? 'block' : 'none';
        }
        elZoneBanner.textContent = zone.id === 0 ? 'Sảnh trung tâm' : zone.name;
        const hex = '#' + zone.color.toString(16).padStart(6, '0');
        elZoneBanner.style.color = hex; elZoneBanner.style.borderColor = hex;
        targetFogColor.copy(baseFogColor).lerp(new THREE.Color(zone.color), zone.id === 0 ? 0 : 0.12);
        
        if (!isFirstLoad) {
            elZoneFlash.style.boxShadow = `inset 0 0 260px 60px ${hex}`; elZoneFlash.style.opacity = '0.5';
            clearTimeout(zoneFlashTimer); zoneFlashTimer = setTimeout(() => { elZoneFlash.style.opacity = '0'; }, 550);
        }
        
        // Phương án lai: quyết định restart-từ-đầu hay phát-tiếp tuỳ thời gian đã rời zone
        handleZoneMusicTransition(oldZoneId, zone.id);

        // Cách ly cứng âm thanh theo zone: chỉ mở đúng 1 bài của zone hiện tại,
        // mọi zone khác (kể cả khi đứng ở id 0 - Sảnh trung tâm) đều bị tắt.
        // Đồng thời áp dụng masterVolume/mute hiện tại của người dùng.
        recalcAudioTargets();

        // Điều khiển giao diện Loa phát nhạc
        if (zone.id === 0) {
            elNowPlaying.classList.remove('show');
            setTimeout(() => { if (lastZoneId === 0) elNowPlaying.style.display = 'none'; }, 500);
        } else {
            elNowPlaying.style.display = 'flex';
            void elNowPlaying.offsetWidth; // Bắt buộc trình duyệt render lại để chạy animation mượt
            elNowPlaying.classList.add('show');
            elTrackName.textContent = zone.track;
            elTrackName.style.color = hex;
        }
    }
    scene.fog.color.lerp(targetFogColor, 0.06);
}

function onWindowResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

function animate() {
    const time = performance.now(); const delta = Math.min(0.05, (time - prevTime) / 1000); prevTime = time;
    for (const fn of effectUpdaters) fn(time / 1000, delta);

    if (started) {
        const oldX = camera.position.x, oldZ = camera.position.z;
        velocity.x -= velocity.x * 10.0 * delta; velocity.z -= velocity.z * 10.0 * delta;
        const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(-forward.z, 0, forward.x);
        const moveVec = new THREE.Vector3();
        if (moveForward) moveVec.add(forward); if (moveBackward) moveVec.sub(forward);
        if (moveRight) moveVec.add(right); if (moveLeft) moveVec.sub(right);
        if (moveVec.lengthSq() > 0) moveVec.normalize();
        velocity.x += moveVec.x * 42.0 * delta; velocity.z += moveVec.z * 42.0 * delta;
        
        const res = resolveMovement(oldX, oldZ, oldX + velocity.x * delta, oldZ + velocity.z * delta);
        camera.position.x = res.x; camera.position.z = res.z; camera.position.y = EYE_Y;
        
        const r = Math.hypot(camera.position.x, camera.position.z);
        let cz = { id: 0, color: GOLD, name: 'Sảnh trung tâm' };
        if (r > R_CORE + 0.1 || camera.position.z < -R_CORE) {
            const a = normalizeAngle(Math.atan2(camera.position.z, camera.position.x));
            if (camera.position.z < -R_CORE && Math.abs(camera.position.x) < 3.5) {
                cz = { id: 0, color: GOLD, name: 'Lối vào' };
            } else {
                // Kiểm tra góc `a` (đã chuẩn hóa về [0, 2π)) so với a0/a1 THÔ của từng zone
                // theo CẢ 2 cách biểu diễn: chính nó, và trừ thêm 2π (đưa về dải âm).
                // Cách này xử lý đúng cả zone quét qua điểm gốc 0°/360° (như Cụm 3: -90°→30°)
                // mà không cần đụng tới a0/a1 thô đang dùng để dựng hình học tường/sàn.
                cz = ZONES.find(z => {
                    const inRange = (ang) => ang >= z.a0 && ang < z.a1;
                    return inRange(a) || inRange(a - Math.PI * 2);
                }) || cz;
            }
        }
        updateZoneBanner(cz);

        // Fade âm lượng từng loa về đúng targetVolume (0 hoặc baseVolume) mỗi khung hình,
        // đây là bước thực thi "cách ly cứng": zone không đứng trong sẽ luôn tiến về volume 0.
        const AUDIO_FADE_SPEED = 3.5; // càng lớn chuyển càng nhanh (giây^-1)
        positionalAudios.forEach(entry => {
            if (!entry.sound.buffer) return;
            const cur = entry.sound.getVolume();
            if (Math.abs(cur - entry.targetVolume) > 0.002) {
                entry.sound.setVolume(cur + (entry.targetVolume - cur) * Math.min(1, delta * AUDIO_FADE_SPEED));
            }
        });
    }
    renderer.render(scene, camera);
}

window.onload = function () {
    if (!WebGL.isWebGL2Available()) {
        const startBtn = document.getElementById('btn-start');
        startBtn.disabled = true;
        startBtn.textContent = 'Thiết bị không hỗ trợ WebGL 2';
        document.getElementById('blocker').appendChild(WebGL.getWebGL2ErrorMessage());
        return;
    }

    console.info(`[Chủ đề 3] Three.js r${THREE.REVISION}`);
    init();

    // Góc quan sát tĩnh phục vụ kiểm tra kiến trúc trần, không kích hoạt audio/video.
    const ceilingPreview = new URLSearchParams(window.location.search).get('ceilingPreview');
    if (ceilingPreview !== null) {
        document.getElementById('blocker').style.display = 'none';
        const zoneMatch = /^zone([1-3])$/.exec(ceilingPreview);
        if (zoneMatch) {
            const zone = ZONES.find(item => item.id === Number(zoneMatch[1]));
            const previewRadius = (R_CORE + R_OUTER) / 2;
            camera.position.set(Math.cos(zone.mid) * previewRadius, EYE_Y, Math.sin(zone.mid) * previewRadius);
            yaw = faceCoreRotY(zone.mid);
        } else {
            camera.position.set(0, EYE_Y, 0);
            yaw = 0;
        }
        pitch = 0.92;
        applyCameraRotation();
    }

    renderer.setAnimationLoop(animate);
}

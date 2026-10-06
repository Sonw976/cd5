import * as THREE from "three";

function material(color, roughness = 0.55, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(parent, name, size, position, sourceMaterial) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), sourceMaterial);
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function createPortraitTexture(accent = "#315f70") {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 920;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#dce8e9");
  gradient.addColorStop(1, "#78929a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 325, 145, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, 885, 285, 360, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPlaqueTexture(title, subtitle, date, background) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#21160c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 44px 'Be Vietnam Pro', Arial, sans-serif";
  ctx.fillText(title, canvas.width / 2, 72);
  ctx.font = "500 30px 'Be Vietnam Pro', Arial, sans-serif";
  ctx.fillText(subtitle, canvas.width / 2, 135);
  ctx.font = "500 25px 'Be Vietnam Pro', Arial, sans-serif";
  ctx.fillText(date, canvas.width / 2, 190);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addRectangularMoulding(parent, width, height, railWidth, depth, sourceMaterial, z, name) {
  const horizontalLength = width - railWidth * 2;
  addBox(parent, `${name}_top`, [horizontalLength, railWidth, depth], [0, height / 2 - railWidth / 2, z], sourceMaterial);
  addBox(parent, `${name}_bottom`, [horizontalLength, railWidth, depth], [0, -height / 2 + railWidth / 2, z], sourceMaterial);
  addBox(parent, `${name}_left`, [railWidth, height, depth], [-width / 2 + railWidth / 2, 0, z], sourceMaterial);
  addBox(parent, `${name}_right`, [railWidth, height, depth], [width / 2 - railWidth / 2, 0, z], sourceMaterial);
}

export function createProceduralFrame(options = {}) {
  const config = {
    width: 1.42,
    height: 1.82,
    depth: 0.12,
    woodColor: 0x4b2b20,
    woodDark: 0x20120d,
    woodLight: 0x78503a,
    goldColor: 0xa47d38,
    plaqueColor: "#aa7d32",
    title: "PHÒNG TRUYỀN THỐNG SỐ",
    subtitle: "ĐẠI HỌC SƯ PHẠM HÀ NỘI",
    date: "HNUE",
    portraitAccent: "#315f70",
    ...options
  };

  const group = new THREE.Group();
  group.name = "GalleryProceduralFrame";
  const wood = material(config.woodColor, 0.62, 0.02);
  const woodDark = material(config.woodDark, 0.68, 0.01);
  const woodLight = material(config.woodLight, 0.56, 0.03);
  const gold = material(config.goldColor, 0.38, 0.42);
  const backing = material(0xe8e1d5, 0.9, 0);

  addBox(group, "frame_back", [config.width, config.height, config.depth * 0.45], [0, 0, -config.depth * 0.2], woodDark);
  addRectangularMoulding(group, config.width, config.height, 0.14, config.depth, wood, 0, "outer_wood");
  addRectangularMoulding(group, config.width - 0.18, config.height - 0.18, 0.045, config.depth * 1.08, gold, config.depth * 0.08, "gold_trim");
  addRectangularMoulding(group, config.width - 0.29, config.height - 0.29, 0.055, config.depth * 0.82, woodLight, config.depth * 0.13, "inner_wood");

  const openingW = config.width - 0.43;
  const openingH = config.height - 0.43;
  addBox(group, "picture_backing", [openingW, openingH, 0.035], [0, 0, config.depth * 0.18], backing);
  const portraitTexture = createPortraitTexture(config.portraitAccent);
  const portrait = new THREE.Mesh(
    new THREE.PlaneGeometry(openingW - 0.04, openingH - 0.04),
    new THREE.MeshStandardMaterial({ map: portraitTexture, roughness: 0.72, side: THREE.DoubleSide })
  );
  portrait.name = "replaceable_picture";
  portrait.position.z = config.depth * 0.39;
  group.add(portrait);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(openingW, openingH),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.12, clearcoat: 0.4, depthWrite: false })
  );
  glass.name = "protective_glass";
  glass.position.z = config.depth * 0.43;
  group.add(glass);

  const plaque = new THREE.Group();
  plaque.name = "plaque_group";
  plaque.position.y = -config.height / 2 - 0.23;
  group.add(plaque);
  addBox(plaque, "plaque_support", [1.28, 0.32, 0.075], [0, 0, 0], woodDark);
  addBox(plaque, "plaque_plate", [1.18, 0.25, 0.09], [0, 0, 0.025], gold);
  const plaqueTexture = createPlaqueTexture(config.title, config.subtitle, config.date, config.plaqueColor);
  const plaqueText = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 0.205),
    new THREE.MeshBasicMaterial({ map: plaqueTexture, transparent: false })
  );
  plaqueText.name = "plaque_text";
  plaqueText.position.z = 0.076;
  plaque.add(plaqueText);

  return group;
}

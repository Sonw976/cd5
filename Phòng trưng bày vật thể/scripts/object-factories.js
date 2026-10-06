import * as THREE from "three";
import { createProceduralFrame } from "./objects/procedural-frame.js";
import { createFramedLogoPanel } from "./objects/framed-logo-panel.js";

const standard = (color, roughness = 0.7, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function mesh(geometry, material, position, parent) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function bookshelf() {
  const group = new THREE.Group();
  const wood = standard(0x5c3d2e, 0.7);
  const w = 2, h = 3.5, d = 0.4;
  mesh(new THREE.BoxGeometry(w, h, 0.05), wood, [0, h / 2, -d / 2], group);
  mesh(new THREE.BoxGeometry(0.05, h, d), wood, [-w / 2, h / 2, 0], group);
  mesh(new THREE.BoxGeometry(0.05, h, d), wood, [w / 2, h / 2, 0], group);
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(w, 0.04, d), wood, [0, i * 0.7 + 0.02, 0], group);

  const colors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0x1abc9c];
  const widths = [0.13, 0.18, 0.11, 0.16, 0.14];
  for (let shelf = 0; shelf < 4; shelf++) {
    let x = -w / 2 + 0.14;
    for (let b = 0; b < 5; b++) {
      const bw = widths[(b + shelf) % widths.length];
      const bh = 0.46 + ((b * 7 + shelf * 3) % 12) / 100;
      const book = mesh(new THREE.BoxGeometry(bw, bh, 0.29), standard(colors[(b + shelf * 2) % colors.length], 0.8), [x + bw / 2, shelf * 0.7 + 0.04 + bh / 2, 0], group);
      book.rotation.z = b === 4 ? -0.07 : 0;
      x += bw + 0.035;
    }
  }
  return group;
}

function podium() {
  const group = new THREE.Group();
  const wood = standard(0x6b3a2a, 0.6);
  const gold = standard(0xd4af37, 0.3, 0.5);
  mesh(new THREE.BoxGeometry(0.8, 0.15, 0.6), gold, [0, 0.075, 0], group);
  mesh(new THREE.BoxGeometry(0.7, 1, 0.5), wood, [0, 0.65, 0], group);
  const top = mesh(new THREE.BoxGeometry(0.72, 0.08, 0.54), wood, [0, 1.2, 0.05], group);
  top.rotation.x = -0.2;
  const trim = mesh(new THREE.BoxGeometry(0.76, 0.035, 0.58), gold, [0, 1.245, 0.05], group);
  trim.rotation.x = -0.2;
  const logo = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.018, 32), standard(0xe3000f, 0.45), [0, 0.78, -0.262], group);
  logo.rotation.x = Math.PI / 2;
  return group;
}

function interactiveScreen() {
  const group = new THREE.Group();
  const frame = standard(0x13171c, 0.22, 0.3);
  const screen = new THREE.MeshStandardMaterial({ color: 0x164e63, emissive: 0x0ea5e9, emissiveIntensity: 0.55, roughness: 0.28 });
  mesh(new THREE.BoxGeometry(3.35, 1.95, 0.15), frame, [0, 1.15, 0], group);
  mesh(new THREE.PlaneGeometry(3.12, 1.72), screen, [0, 1.15, 0.081], group);
  const stand = mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.9, 24), frame, [0, 0.42, -0.05], group);
  stand.rotation.z = 0;
  mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.1, 36), frame, [0, 0.05, -0.05], group);
  return group;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
}

function framedCanvasPanel(width, height, texture, options = {}) {
  const group = new THREE.Group();
  const frameColor = options.frameColor ?? 0xd4af37;
  const frame = mesh(
    new THREE.BoxGeometry(width + 0.28, height + 0.28, options.depth || 0.15),
    standard(frameColor, 0.34, options.metalness ?? 0.48),
    [0, height / 2, 0], group
  );
  frame.name = "wall_frame";
  const panel = mesh(
    new THREE.PlaneGeometry(width, height, options.segments || 1, 1),
    new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: options.emissive ?? 0.1, roughness: 0.55, side: THREE.DoubleSide }),
    [0, height / 2, (options.depth || 0.15) / 2 + 0.012], group
  );
  panel.name = "wall_content";
  return group;
}

function wallTitle(options = {}) {
  const title = options.title || "HỌC TẬP VÀ NGHIÊN CỨU KHOA HỌC";
  const background = options.background || "#005baa";
  const textColor = options.textColor || "#ffffff";
  const width = options.width || 7.5;
  const texture = canvasTexture(1500, 240, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    const color = new THREE.Color(background);
    const dark = `#${color.clone().multiplyScalar(0.68).getHexString()}`;
    gradient.addColorStop(0, dark);
    gradient.addColorStop(0.5, background);
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,.32)";
    ctx.lineWidth = 7;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = textColor;
    ctx.font = `700 ${title.length > 34 ? 55 : 70}px 'Be Vietnam Pro', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, w / 2, h / 2);
  });
  return framedCanvasPanel(width, 1.2, texture, { frameColor: 0xcdbb86, depth: 0.12, emissive: 0.08 });
}

function largeInfographic(options = {}) {
  const title = options.title || "PHONG TRÀO BA SẴN SÀNG";
  const year = options.year || "1964";
  const content = options.content || "Khởi nguồn từ phong trào Tam bất kỳ do BCH Đoàn Trường phát động, lan rộng thành Ba sẵn sàng. Hàng vạn sinh viên Sư phạm đã viết đơn tình nguyện bằng máu.";
  const texture = canvasTexture(1600, 1000, (ctx, w, h) => {
    ctx.fillStyle = "#5d0909";
    ctx.fillRect(0, 0, w, h);
    const header = ctx.createLinearGradient(0, 0, w, 0);
    header.addColorStop(0, "#a90000");
    header.addColorStop(1, "#df1515");
    ctx.fillStyle = header;
    ctx.fillRect(0, 0, w, 180);
    ctx.fillStyle = "#fff200";
    ctx.font = `900 ${title.length > 26 ? 65 : 82}px 'Be Vietnam Pro', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, w / 2, 90);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 42px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("PHONG TRÀO NỔI BẬT", 80, 255);
    ctx.fillStyle = "#f2e8dc";
    ctx.font = "400 34px 'Be Vietnam Pro', Arial, sans-serif";
    wrapCanvasText(ctx, content, 80, 325, 810, 52, 7);
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.arc(1250, 505, 225, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5d0909";
    ctx.beginPath();
    ctx.arc(1250, 505, 178, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff200";
    ctx.font = "900 112px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(year, 1250, 520);
    ctx.fillStyle = "rgba(255,255,255,.1)";
    ctx.fillRect(80, 760, 1440, 150);
    ctx.fillStyle = "#d4af37";
    ctx.font = "900 60px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("200.000+", 120, 850);
    ctx.fillStyle = "#ffffff";
    ctx.font = "400 31px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.fillText("lá đơn tình nguyện", 455, 848);
  });
  return framedCanvasPanel(6.5, 4, texture, { frameColor: 0x2a2a35, depth: 0.18, metalness: 0.5, emissive: 0.12 });
}

function wallPicture(options = {}) {
  const title = options.title || "GS. ĐẶNG THAI MAI";
  const subtitle = options.subtitle || "Học giả · Nhà giáo";
  const accent = options.accent || "#12324a";
  const texture = canvasTexture(800, 600, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#d7e7ee");
    bg.addColorStop(1, "#7894a3");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.76;
    ctx.beginPath();
    ctx.arc(w / 2, 225, 112, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w / 2, 520, 215, 195, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.fillRect(0, h - 105, w, 105);
    ctx.fillStyle = "#12324a";
    ctx.font = "700 34px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title.toUpperCase(), w / 2, h - 58);
    ctx.font = "400 22px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.fillText(subtitle, w / 2, h - 25);
  });
  const group = new THREE.Group();
  mesh(new THREE.BoxGeometry(3.02, 2.32, 0.2), standard(0xcdbb86, 0.36, 0.42), [0, 1.16, 0], group);
  mesh(new THREE.BoxGeometry(2.72, 2.02, 0.1), standard(0xffffff, 0.62), [0, 1.16, 0.1], group);
  mesh(new THREE.PlaneGeometry(2.5, 1.8), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62 }), [0, 1.16, 0.16], group);
  return group;
}

function heatmapPanel() {
  const texture = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#172535";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#43e8d8";
    ctx.font = "900 48px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BẢN ĐỒ NHIỆT TÌNH NGUYỆN", w / 2, 75);
    const west = [[340,270],[250,250],[165,350],[105,500],[170,680],[275,760],[420,720],[450,620],[390,510]];
    const center = [[340,270],[390,510],[450,620],[420,720],[560,830],[680,770],[740,680],[700,610],[780,550],[680,390],[540,300],[520,150],[390,200]];
    const east = [[570,220],[680,210],[740,250],[730,320],[850,420],[930,520],[810,560],[740,510],[680,390],[600,340],[540,300]];
    const polygon = (points, fill) => {
      ctx.fillStyle = fill; ctx.strokeStyle = "#0b1622"; ctx.lineWidth = 7; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(point => ctx.lineTo(...point)); ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    polygon(center, "#43e8d8"); polygon(west, "#ff8785"); polygon(east, "#ff8785");
    ctx.fillStyle = "#ffef9a";
    ctx.font = "700 24px 'Be Vietnam Pro', Arial, sans-serif";
    [["Lai Châu",220,345],["Điện Biên",165,515],["Hà Nội",535,625],["Quảng Ninh",835,530]].forEach(([label,x,y]) => ctx.fillText(label, x, y));
    ctx.fillStyle = "#ffffff"; ctx.font = "400 23px 'Be Vietnam Pro', Arial, sans-serif"; ctx.fillText("Khu vực miền Bắc", w / 2, 975);
  });
  return framedCanvasPanel(5.5, 5.5, texture, { frameColor: 0x18212b, depth: 0.18, emissive: 0.28 });
}

function heatmapTV() {
  const texture = canvasTexture(1280, 720, (ctx, w, h) => {
    ctx.fillStyle = "#080d16";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#009688";
    ctx.fillRect(0, 0, w, 140);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 54px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("MÀN HÌNH TƯƠNG TÁC", w / 2, 70);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "400 36px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    wrapCanvasText(ctx, "Hãy chọn các khu vực trên Bản đồ nhiệt để xem chi tiết hoạt động tình nguyện tại nơi đó.", 75, 225, 880, 54, 5);
    ctx.fillStyle = "#009688";
    ctx.beginPath(); ctx.arc(1090, 535, 135, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "900 70px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("＋", 1090, 535);
  });
  return framedCanvasPanel(4.2, 2.4, texture, { frameColor: 0x111111, depth: 0.16, metalness: 0.2, emissive: 0.48 });
}

function centralInfographic() {
  const texture = canvasTexture(2048, 800, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#310c0c"); bg.addColorStop(1, "#140707");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d30e17"; ctx.fillRect(0, 0, w, 135);
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 5; ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = "#fff200"; ctx.font = "900 56px 'Be Vietnam Pro', Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("PHÒNG TRUYỀN THỐNG SỐ", w / 2, 63);
    ctx.fillStyle = "#ffffff"; ctx.font = "600 27px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.fillText("TRƯỜNG ĐẠI HỌC SƯ PHẠM HÀ NỘI", w / 2, 105);
    const titles = ["LỊCH SỬ TRUYỀN THỐNG", "PHONG TRÀO TIÊU BIỂU", "TÀI NĂNG & KHỞI NGHIỆP"];
    const texts = ["Hơn 70 năm xây dựng và phát triển, đào tạo nhiều thế hệ nhà giáo.", "Từ Ba sẵn sàng đến Mùa hè xanh, thanh niên Sư phạm luôn xung phong.", "Nhiều nhà khoa học xuất sắc đóng góp cho giáo dục Việt Nam."];
    const colW = 600;
    titles.forEach((title, index) => {
      const x = 92 + index * 655;
      ctx.fillStyle = "rgba(255,255,255,.055)"; ctx.fillRect(x, 175, colW, 485);
      ctx.strokeStyle = "rgba(212,175,55,.38)"; ctx.lineWidth = 2; ctx.strokeRect(x, 175, colW, 485);
      ctx.fillStyle = "#d4af37"; ctx.font = "700 28px 'Be Vietnam Pro', Arial, sans-serif"; ctx.textAlign = "left"; ctx.fillText(title, x + 35, 285);
      ctx.fillStyle = "#e7d8c1"; ctx.font = "400 25px 'Be Vietnam Pro', Arial, sans-serif";
      wrapCanvasText(ctx, texts[index], x + 35, 350, colW - 70, 42, 6);
      ctx.fillStyle = "#d30e17"; ctx.beginPath(); ctx.arc(x + 55, 220, 27, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff200"; ctx.textAlign = "center"; ctx.font = "800 24px Arial"; ctx.fillText(String(index + 1), x + 55, 229);
    });
    ctx.fillStyle = "#d4af37"; ctx.fillRect(0, h - 58, w, 58);
    ctx.fillStyle = "#2a0b0b"; ctx.font = "700 22px 'Be Vietnam Pro', Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("HNUE · PHÒNG TRUYỀN THỐNG SỐ", w / 2, h - 22);
  });
  return framedCanvasPanel(9, 3.5, texture, { frameColor: 0xd4af37, depth: 0.17, emissive: 0.14 });
}

function galleryBench() {
  const group = new THREE.Group();
  mesh(new THREE.BoxGeometry(4.5, 1.2, 1.6), standard(0xb89262, 0.76), [0, 0.6, 0], group);
  mesh(new THREE.BoxGeometry(4.7, 0.2, 1.8), standard(0xb8c7d4, 0.84), [0, 1.3, 0], group);
  return group;
}

function windowSeat() {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd7edf7, roughness: 0.18, transparent: true, opacity: 0.66, transmission: 0.25, side: THREE.DoubleSide });
  mesh(new THREE.PlaneGeometry(6, 4), glass, [0, 3.4, 0], group);
  mesh(new THREE.BoxGeometry(6, 0.6, 2.2), standard(0xb89262, 0.72), [0, 1.1, 1.1], group);
  mesh(new THREE.BoxGeometry(5.6, 0.22, 1.9), standard(0xb8c7d4, 0.9), [0, 1.41, 1.1], group);
  return group;
}

function glassShowcase() {
  const group = new THREE.Group();
  const length = 9.2, depth = 1.72, baseH = 1.05, glassH = 2.45;
  const wood = standard(0x7a5733, 0.68, 0.04);
  const white = standard(0xf4f7f9, 0.62, 0.02);
  const brass = standard(0xd6b86f, 0.3, 0.62);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdff1fb, roughness: 0.04, transparent: true, opacity: 0.22, transmission: 0.48, clearcoat: 1, side: THREE.DoubleSide });
  mesh(new THREE.BoxGeometry(depth, baseH, length), wood, [0, baseH / 2, 0], group);
  mesh(new THREE.BoxGeometry(depth - 0.12, 0.3, length - 0.18), white, [0, baseH + 0.15, 0], group);
  const gy = baseH + 0.3 + glassH / 2;
  [-1, 1].forEach(s => mesh(new THREE.BoxGeometry(0.035, glassH, length - 0.42), glass, [s * (depth / 2 - 0.1), gy, 0], group));
  [-1, 1].forEach(s => mesh(new THREE.BoxGeometry(depth - 0.2, glassH, 0.035), glass, [0, gy, s * (length / 2 - 0.2)], group));
  mesh(new THREE.BoxGeometry(depth - 0.2, 0.04, length - 0.4), glass, [0, baseH + 0.3 + glassH, 0], group);
  [-1, 1].forEach(x => [-1, 1].forEach(z => mesh(new THREE.BoxGeometry(0.055, glassH, 0.055), brass, [x * (depth / 2 - 0.08), gy, z * (length / 2 - 0.12)], group)));
  [-3.3, -1.1, 1.1, 3.3].forEach((z, i) => {
    mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.12, 32), brass, [0, baseH + 0.38, z], group);
    const shape = i % 2 ? new THREE.OctahedronGeometry(0.4) : new THREE.IcosahedronGeometry(0.38, 1);
    const exhibit = mesh(shape, standard(0xffffff, 0.38, 0.06), [0, baseH + 0.85, z], group);
    exhibit.rotation.set(0.28, i * 0.55, 0.18);
  });
  return group;
}

function guestbookDesk() {
  const group = new THREE.Group();
  const wood = standard(0x7a5733, 0.65, 0.02);
  const brass = standard(0xd6b86f, 0.32, 0.5);
  mesh(new THREE.BoxGeometry(3.15, 0.18, 0.92), wood, [0, 1.42, 0], group);
  mesh(new THREE.BoxGeometry(3, 1.12, 0.1), wood, [0, 0.82, -0.43], group);
  [-1, 1].forEach(x => mesh(new THREE.BoxGeometry(0.16, 1.36, 0.16), wood, [x * 1.36, 0.72, 0.28], group));
  mesh(new THREE.BoxGeometry(1.05, 0.08, 0.6), standard(0xf8fafc, 0.72), [-0.58, 1.56, 0], group);
  const pen = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.88, 16), brass, [0.66, 1.64, 0.05], group);
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = -0.45;
  return group;
}

function proceduralFrame() {
  return createProceduralFrame();
}

function framedLogoPanel(options = {}) {
  return createFramedLogoPanel(
    options.imageSrc || "./image/HNUE_logo.png",
    [0, 0, 0],
    options.radius || 1.95
  );
}

// Mẫu dành riêng cho Cụm 3: màn hình được hạ thấp để người xem đứng tra cứu,
// không cạnh tranh thị giác với dải tư liệu treo tường phía sau.
function researchKiosk() {
  const group = new THREE.Group();
  const navy = standard(0x102f4a, 0.36, 0.18);
  const wood = standard(0x76502e, 0.68, 0.04);
  const brass = standard(0xd7b56b, 0.28, 0.62);
  mesh(new THREE.BoxGeometry(2.9, 0.14, 1.72), brass, [0, 0.07, 0], group);
  mesh(new THREE.BoxGeometry(2.72, 0.1, 1.56), navy, [0, 0.16, 0], group);
  mesh(new THREE.BoxGeometry(1.62, 1.08, 0.86), wood, [0, 0.68, 0.06], group);
  mesh(new THREE.BoxGeometry(1.42, 0.9, 0.7), navy, [0, 0.78, -0.1], group);
  const displayFrame = mesh(new THREE.BoxGeometry(3.05, 0.15, 1.96), navy, [0, 1.42, -0.02], group);
  displayFrame.rotation.x = -0.38;
  const screenTexture = canvasTexture(1200, 700, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0b2942'); gradient.addColorStop(1, '#086994');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#42c9ee'; ctx.lineWidth = 8; ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = '#ffffff'; ctx.font = "800 64px 'Be Vietnam Pro', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('TRA CỨU TƯ LIỆU NCKH', w / 2, 145);
    ctx.fillStyle = '#8ee9ff'; ctx.font = "500 38px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.fillText('Chọn các khung ảnh trên tường để xem chi tiết', w / 2, 220);
    ['04 NHÀ KHOA HỌC', '03 HOẠT ĐỘNG', '05 MỐC THỜI GIAN'].forEach((text, index) => {
      const x = 110 + index * 360;
      ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x, 320, 300, 190);
      ctx.fillStyle = '#d7b56b'; ctx.font = "700 36px 'Be Vietnam Pro', Arial, sans-serif"; ctx.fillText(text, x + 150, 420);
    });
  });
  const screen = new THREE.MeshStandardMaterial({ map: screenTexture, emissive: 0x0b5f8d, emissiveMap: screenTexture, emissiveIntensity: 0.28, roughness: 0.22 });
  const display = mesh(new THREE.BoxGeometry(2.75, 0.035, 1.66), screen, [0, 1.49, 0.12], group);
  display.rotation.x = -0.38;
  const goldLine = mesh(new THREE.BoxGeometry(2.48, 0.018, 0.035), brass, [0, 1.77, 0.22], group);
  goldLine.rotation.x = -0.38;
  return group;
}

function archivalPhotoPanel(options = {}) {
  const group = new THREE.Group();
  const width = options.width || 3.1;
  const height = options.height || 3.9;
  const frame = standard(0x17344c, 0.32, 0.28);
  const brass = standard(0xd7b56b, 0.3, 0.6);
  const warm = standard(0xf0e5d3, 0.7, 0.02);
  mesh(new THREE.BoxGeometry(width + 0.22, height + 0.22, 0.16), frame, [0, height / 2, 0], group);
  mesh(new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.06), brass, [0, height / 2, 0.1], group);
  mesh(new THREE.BoxGeometry(width - 0.12, height - 0.12, 0.04), warm, [0, height / 2, 0.145], group);
  const imageHeight = height * 0.63;
  const photoMaterial = new THREE.MeshStandardMaterial({ color: 0x8093a1, roughness: 0.62 });
  if (options.imageUrl) {
    const texture = new THREE.TextureLoader().load(options.imageUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    photoMaterial.map = texture;
    photoMaterial.needsUpdate = true;
  }
  mesh(new THREE.PlaneGeometry(width - 0.34, imageHeight), photoMaterial, [0, height - imageHeight / 2 - 0.2, 0.19], group);
  const labelTexture = canvasTexture(1000, 320, (ctx, w, h) => {
    ctx.fillStyle = '#f0e5d3'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#17344c'; ctx.font = "700 60px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.textAlign = 'center'; ctx.fillText(options.title || 'TƯ LIỆU NGHIÊN CỨU', w / 2, 92);
    ctx.fillStyle = '#8a642c'; ctx.font = "500 38px 'Be Vietnam Pro', Arial, sans-serif";
    ctx.fillText(options.subtitle || 'HNUE · Học tập và NCKH', w / 2, 165);
    ctx.fillStyle = '#456176'; ctx.font = "400 30px 'Be Vietnam Pro', Arial, sans-serif";
    wrapCanvasText(ctx, options.caption || 'Tư liệu ảnh', 55, 225, w - 110, 38, 2);
  });
  mesh(new THREE.PlaneGeometry(width - 0.32, height * 0.26), new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.74 }), [0, height * 0.15 + 0.08, 0.2], group);
  return group;
}

// Bảy hiện vật NCKH của scene dùng chung khung nền này, sau đó thêm đúng dấu hiệu
// hình thức của từng builder trong Chủ đề 3 (phào gỗ/vàng, cyan số hoá, kệ huy chương...).
function researchExhibit(options = {}) {
  const group = archivalPhotoPanel(options);
  const width = options.width || 3.1;
  const height = options.height || 3.9;
  const style = options.displayStyle || 'heritage-wood';
  const navy = standard(0x102f4a, 0.3, 0.32);
  const cyan = standard(0x38c8ef, 0.18, 0.48);
  const brass = standard(0xd7b56b, 0.28, 0.66);
  const wood = standard(0x4b2b20, 0.64, 0.02);
  const black = standard(0x111820, 0.2, 0.5);
  if (style === 'heritage-wood') {
    mesh(new THREE.BoxGeometry(width + 0.48, height + 0.48, 0.05), wood, [0, height / 2, -0.08], group);
    mesh(new THREE.CircleGeometry(0.16, 32), brass, [0, height + 0.36, 0.22], group);
  } else if (style === 'heritage-gold') {
    mesh(new THREE.BoxGeometry(width + 0.48, height + 0.48, 0.05), brass, [0, height / 2, -0.08], group);
    mesh(new THREE.BoxGeometry(width * 0.72, 0.1, 0.12), brass, [0, height + 0.32, 0.2], group);
  } else if (style.startsWith('digital-')) {
    mesh(new THREE.BoxGeometry(width + 0.38, height + 0.38, 0.05), navy, [0, height / 2, -0.08], group);
    if (style === 'digital-portrait') {
      [-1, 1].forEach(side => mesh(new THREE.BoxGeometry(0.07, height + 0.7, 0.1), cyan, [side * (width / 2 + 0.27), height / 2, 0.2], group));
    }
    mesh(new THREE.BoxGeometry(width + (style === 'digital-landscape' ? 0.72 : 0), 0.08, 0.1), cyan, [0, height + 0.28, 0.2], group);
  } else if (style === 'award') {
    mesh(new THREE.BoxGeometry(width + 0.5, height + 0.5, 0.05), navy, [0, height / 2, -0.08], group);
    mesh(new THREE.BoxGeometry(width + 0.7, 0.12, 0.48), brass, [0, -0.22, 0.2], group);
    [-0.38, 0, 0.38].forEach((x, index) => { const medal = mesh(new THREE.CylinderGeometry(0.09 + index * 0.01, 0.09 + index * 0.01, 0.08, 24), brass, [x, -0.18, 0.45], group); medal.rotation.x = Math.PI / 2; });
  } else if (style === 'seminar-screen') {
    mesh(new THREE.BoxGeometry(width + 0.42, height + 0.42, 0.05), black, [0, height / 2, -0.08], group);
    mesh(new THREE.BoxGeometry(width + 0.56, 0.07, 0.09), cyan, [0, height + 0.25, 0.2], group);
  } else if (style === 'research-panorama') {
    mesh(new THREE.BoxGeometry(width + 0.5, height + 0.38, 0.05), navy, [0, height / 2, -0.08], group);
    ['743 ĐỀ TÀI', '2.000+ SV', '100 GIẢI'].forEach((text, index) => {
      const texture = canvasTexture(320, 140, (ctx, w, h) => { ctx.fillStyle = '#f0e5d3'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#d7b56b'; ctx.lineWidth = 7; ctx.strokeRect(4, 4, w - 8, h - 8); ctx.fillStyle = '#17344c'; ctx.font = "700 30px 'Be Vietnam Pro', Arial, sans-serif"; ctx.textAlign = 'center'; ctx.fillText(text, w / 2, h / 2 + 10); });
      mesh(new THREE.PlaneGeometry(0.82, 0.38), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62 }), [(index - 1) * 0.94, -0.32, 0.22], group);
    });
  }
  return group;
}

function researchTimeline() {
  const group = new THREE.Group();
  const navy = standard(0x17344c, 0.34, 0.24);
  const brass = standard(0xd7b56b, 0.27, 0.64);
  const radius = 4.2;
  const points = [
    ['1949', 'Di sản học thuật'], ['1954', 'Khoa học cơ bản'], ['2007', 'Thế hệ nghiên cứu trẻ'],
    ['2018', '7/7 đề tài đạt giải'], ['2025', '743 đề tài hoàn thành']
  ];
  for (let i = 0; i < 36; i++) {
    const angle = THREE.MathUtils.degToRad(-55 + i * (110 / 36));
    const segment = mesh(new THREE.BoxGeometry(0.23, 0.08, 0.07), navy, [Math.sin(angle) * radius, 0.18, Math.cos(angle) * radius], group);
    segment.rotation.y = angle;
  }
  points.forEach(([year, label], index) => {
    const angle = THREE.MathUtils.degToRad(-52 + index * 26);
    const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
    mesh(new THREE.SphereGeometry(0.16, 24, 16), brass, [x, 0.18, z], group);
    const texture = canvasTexture(520, 250, (ctx, w, h) => {
      ctx.fillStyle = '#f0e5d3'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#17344c'; ctx.font = "800 70px 'Be Vietnam Pro', Arial, sans-serif"; ctx.textAlign = 'center'; ctx.fillText(year, w / 2, 88);
      ctx.fillStyle = '#76502e'; ctx.font = "500 34px 'Be Vietnam Pro', Arial, sans-serif"; wrapCanvasText(ctx, label, 36, 148, w - 72, 42, 2);
    });
    const card = mesh(new THREE.PlaneGeometry(1.4, 0.38), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.68 }), [x, 0.65, z], group);
    card.lookAt(0, 0.65, 0);
  });
  return group;
}

export const OBJECT_FACTORIES = {
  bookshelf,
  podium,
  interactiveScreen,
  wallTitle,
  largeInfographic,
  wallPicture,
  heatmapPanel,
  heatmapTV,
  centralInfographic,
  researchKiosk,
  researchExhibit,
  researchTimeline,
  galleryBench,
  windowSeat,
  glassShowcase,
  guestbookDesk,
  proceduralFrame,
  framedLogoPanel
};

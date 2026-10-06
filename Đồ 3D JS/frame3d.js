
import * as THREE from "three";

const SHARED_GEOMETRIES = new Map();
const SHARED_MATERIALS = new Map();
let SHARED_WOOD_TEXTURE = null;

/**
 * ProceduralFrame3D
 * -----------------
 * Dựng model hoàn toàn bằng code. KHÔNG load GLB.
 *
 * Tỷ lệ mặc định được lấy gần theo file GLB tham chiếu:
 * - khung chính: cao ~1.65, rộng ~1.26
 * - bảng tên nằm tách bên dưới
 * - mặt khung gồm nhiều lớp gờ / rãnh / viền.
 */
export class ProceduralFrame3D {
  constructor(config = {}) {
    this.config = {
      width: 1.26,
      height: 1.65,
      depth: 0.055,
      frameWidth: 0.14,

      // Opening / picture
      pictureMargin: 0.018,
      pictureDepth: 0.003,

      // Plaque
      plaqueEnabled: true,
      plaqueGap: 0.075,
      plaqueWidth: 1.48,
      plaqueHeight: 0.31,
      plaqueDepth: 0.032,
      plaqueText: "",
      plaqueSubText: "",
      plaqueDate: "",

      // Materials
      woodColor: 0x48281c,
      woodDark: 0x1b100c,
      woodLight: 0x63402c,
      goldColor: 0x806130,
      backingColor: 0xe8e1d5,
      plaqueColor: 0xaa7d32,
      plaqueRimColor: 0x3d2915,
      textColor: "#17100a",
      plaqueTextBackground: "#aa7d32",

      // Detail controls
      bevelSegments: 3,
      curveSegments: 10,
      moldingDetail: 1.0,

      ...config
    };

    this.group = new THREE.Group();
    this.group.name = "ProceduralFrame3D";
    this.textureLoader = new THREE.TextureLoader();
    this.woodTexture = this._createWoodTexture();

    this._build();
  }

  // ---------------------------
  // Geometry helpers
  // ---------------------------

  _roundedRectPath(path, x, y, w, h, r = 0.02, reverse = false) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));

    if (!reverse) {
      path.moveTo(x + r, y);
      path.lineTo(x + w - r, y);
      path.quadraticCurveTo(x + w, y, x + w, y + r);
      path.lineTo(x + w, y + h - r);
      path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      path.lineTo(x + r, y + h);
      path.quadraticCurveTo(x, y + h, x, y + h - r);
      path.lineTo(x, y + r);
      path.quadraticCurveTo(x, y, x + r, y);
    } else {
      // reversed winding for hole
      path.moveTo(x + r, y);
      path.quadraticCurveTo(x, y, x, y + r);
      path.lineTo(x, y + h - r);
      path.quadraticCurveTo(x, y + h, x + r, y + h);
      path.lineTo(x + w - r, y + h);
      path.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
      path.lineTo(x + w, y + r);
      path.quadraticCurveTo(x + w, y, x + w - r, y);
      path.lineTo(x + r, y);
    }
  }

  _ringGeometry(outerW, outerH, innerW, innerH, depth, bevel = 0.01, radius = 0.025) {
    const cacheKey = [
      "ring", outerW, outerH, innerW, innerH, depth, bevel, radius,
      this.config.bevelSegments, this.config.curveSegments
    ].join("|");
    if (SHARED_GEOMETRIES.has(cacheKey)) return SHARED_GEOMETRIES.get(cacheKey);
    const shape = new THREE.Shape();
    this._roundedRectPath(
      shape,
      -outerW / 2,
      -outerH / 2,
      outerW,
      outerH,
      radius,
      false
    );

    const hole = new THREE.Path();
    this._roundedRectPath(
      hole,
      -innerW / 2,
      -innerH / 2,
      innerW,
      innerH,
      radius > 0 ? Math.max(radius * 0.6, 0.008) : 0,
      true
    );
    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: this.config.bevelSegments,
      curveSegments: this.config.curveSegments,
      steps: 1
    });

    geometry.center();
    geometry.computeVertexNormals();
    SHARED_GEOMETRIES.set(cacheKey, geometry);
    return geometry;
  }

  _rectGeometry(w, h, depth, bevel = 0.008, radius = 0.025) {
    const cacheKey = [
      "rect", w, h, depth, bevel, radius,
      this.config.bevelSegments, this.config.curveSegments
    ].join("|");
    if (SHARED_GEOMETRIES.has(cacheKey)) return SHARED_GEOMETRIES.get(cacheKey);
    const shape = new THREE.Shape();
    this._roundedRectPath(shape, -w/2, -h/2, w, h, radius, false);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: this.config.bevelSegments,
      curveSegments: this.config.curveSegments,
      steps: 1
    });
    geometry.center();
    geometry.computeVertexNormals();
    SHARED_GEOMETRIES.set(cacheKey, geometry);
    return geometry;
  }

  _planeGeometry(w, h) {
    const cacheKey = ["plane", w, h].join("|");
    if (!SHARED_GEOMETRIES.has(cacheKey)) {
      SHARED_GEOMETRIES.set(cacheKey, new THREE.PlaneGeometry(w, h));
    }
    return SHARED_GEOMETRIES.get(cacheKey);
  }

  _plaqueShape(w, h) {
    const shape = new THREE.Shape();
    const x = w / 2;
    const y = h / 2;
    const shoulder = h * 0.18;
    const neck = h * 0.075;

    shape.moveTo(-x + shoulder, y);
    shape.lineTo(x - shoulder, y);
    shape.lineTo(x - shoulder, y - neck);
    shape.quadraticCurveTo(x - shoulder * 0.45, y - neck, x, y - shoulder);
    shape.lineTo(x, -y + shoulder);
    shape.quadraticCurveTo(x - shoulder * 0.45, -y + neck, x - shoulder, -y + neck);
    shape.lineTo(x - shoulder, -y);
    shape.lineTo(-x + shoulder, -y);
    shape.lineTo(-x + shoulder, -y + neck);
    shape.quadraticCurveTo(-x + shoulder * 0.45, -y + neck, -x, -y + shoulder);
    shape.lineTo(-x, y - shoulder);
    shape.quadraticCurveTo(-x + shoulder * 0.45, y - neck, -x + shoulder, y - neck);
    shape.closePath();
    return shape;
  }

  _plaqueGeometry(w, h, depth) {
    const cacheKey = ["plaque", w, h, depth].join("|");
    if (SHARED_GEOMETRIES.has(cacheKey)) return SHARED_GEOMETRIES.get(cacheKey);
    const geometry = new THREE.ExtrudeGeometry(this._plaqueShape(w, h), {
      depth,
      bevelEnabled: false,
      curveSegments: 8,
      steps: 1
    });
    geometry.center();
    geometry.computeVertexNormals();
    SHARED_GEOMETRIES.set(cacheKey, geometry);
    return geometry;
  }

  _mat(color, roughness = 0.44, metalness = 0.04) {
    const cacheKey = ["standard", color, roughness, metalness].join("|");
    if (SHARED_MATERIALS.has(cacheKey)) return SHARED_MATERIALS.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
    SHARED_MATERIALS.set(cacheKey, material);
    return material;
  }

  _createWoodTexture() {
    if (SHARED_WOOD_TEXTURE) return SHARED_WOOD_TEXTURE;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const grain = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grain.addColorStop(0, "#eadcca");
    grain.addColorStop(0.5, "#fff7eb");
    grain.addColorStop(1, "#d9c6ae");
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Delicate grain variation: enough to break up a flat surface, not enough
    // to appear as repeated painted stripes.
    for (let y = 11; y < canvas.height; y += 13) {
      const wave = Math.sin(y * 0.071) * 5 + Math.sin(y * 0.019) * 8;
      ctx.beginPath();
      ctx.moveTo(0, y + wave);
      ctx.bezierCurveTo(150, y - wave, 310, y + wave * 0.45, 512, y - wave * 0.25);
      ctx.strokeStyle = y % 39 === 0 ? "rgba(88, 62, 39, .07)" : "rgba(255, 255, 255, .12)";
      ctx.lineWidth = y % 39 === 0 ? 1.1 : 0.55;
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.6, 3.6);
    SHARED_WOOD_TEXTURE = texture;
    return SHARED_WOOD_TEXTURE;
  }

  _woodMat(color, roughness = 0.48) {
    const cacheKey = ["wood", color, Math.max(roughness, 0.58)].join("|");
    if (SHARED_MATERIALS.has(cacheKey)) return SHARED_MATERIALS.get(cacheKey);
    const material = new THREE.MeshStandardMaterial({
      color,
      map: this.woodTexture,
      roughness: Math.max(roughness, 0.58),
      metalness: 0.015
    });
    SHARED_MATERIALS.set(cacheKey, material);
    return material;
  }

  _addRing(params) {
    const mesh = new THREE.Mesh(
      this._ringGeometry(
        params.outerW,
        params.outerH,
        params.innerW,
        params.innerH,
        params.depth,
        params.bevel,
        params.radius
      ),
      params.wood
        ? this._woodMat(params.color, params.roughness)
        : this._mat(params.color, params.roughness, params.metalness)
    );
    mesh.position.z = params.z;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = params.name ?? "molding";
    this.group.add(mesh);
    return mesh;
  }

  _build() {
    const c = this.config;
    const W = c.width;
    const H = c.height;
    const F = c.frameWidth;
    const D = c.depth;

    // opening measured as a proportion of the reference GLB
    const innerW = W - F * 2.0;
    const innerH = H - F * 2.0;

    // 1) Deep rear body
    this._addRing({
      name: "frame_body",
      outerW: W,
      outerH: H,
      innerW: innerW,
      innerH: innerH,
      depth: D,
      bevel: 0,
      radius: 0,
      z: 0,
      color: c.woodDark,
      wood: true,
      roughness: 0.48,
      metalness: 0.02
    });

    // 2) Broad rounded wood molding
    this._addRing({
      name: "outer_molding",
      outerW: W - 0.020,
      outerH: H - 0.020,
      innerW: innerW + 0.193,
      innerH: innerH + 0.193,
      depth: D * 0.84,
      bevel: 0,
      radius: 0,
      z: D * 0.47,
      color: c.woodColor,
      wood: true,
      roughness: 0.39,
      metalness: 0.03
    });

    // 3) Raised highlight ridge
    this._addRing({
      name: "outer_highlight",
      outerW: W - 0.085,
      outerH: H - 0.085,
      innerW: innerW + 0.165,
      innerH: innerH + 0.165,
      depth: D * 0.54,
      bevel: 0,
      radius: 0,
      z: D * 0.535,
      color: c.woodLight,
      wood: true,
      roughness: 0.33,
      metalness: 0.04
    });

    // 4) Dark recessed valley
    this._addRing({
      name: "dark_valley",
      outerW: W - 0.115,
      outerH: H - 0.115,
      innerW: innerW + 0.135,
      innerH: innerH + 0.135,
      depth: D * 0.30,
      bevel: 0,
      radius: 0,
      z: D * 0.60,
      color: c.woodDark,
      wood: true,
      roughness: 0.55,
      metalness: 0.01
    });

    // 5) Secondary wood ridge
    this._addRing({
      name: "inner_wood_ridge",
      outerW: W - 0.145,
      outerH: H - 0.145,
      innerW: innerW + 0.075,
      innerH: innerH + 0.075,
      depth: D * 0.42,
      bevel: 0,
      radius: 0,
      z: D * 0.523,
      color: c.woodColor,
      wood: true,
      roughness: 0.37,
      metalness: 0.03
    });

    // 6) Gold accent
    this._addRing({
      name: "gold_trim",
      outerW: innerW + 0.115,
      outerH: innerH + 0.115,
      innerW: innerW + 0.050,
      innerH: innerH + 0.050,
      depth: D * 0.14,
      bevel: 0,
      radius: 0,
      z: D * 0.65,
      color: c.goldColor,
      roughness: 0.28,
      metalness: 0.42
    });

    // 7) Very thin inner dark lip
    this._addRing({
      name: "inner_lip",
      outerW: innerW + 0.060,
      outerH: innerH + 0.060,
      innerW: innerW + 0.010,
      innerH: innerH + 0.010,
      depth: D * 0.20,
      bevel: 0,
      radius: 0,
      z: D * 0.58,
      color: c.woodDark,
      wood: true,
      roughness: 0.43,
      metalness: 0.02
    });

    // Narrow carved grooves and a restrained antique-metal pinstripe.
    this._addRing({
      name: "carved_inner_groove",
      outerW: innerW + 0.094,
      outerH: innerH + 0.094,
      innerW: innerW + 0.060,
      innerH: innerH + 0.060,
      depth: D * 0.08,
      bevel: 0,
      radius: 0,
      z: D * 0.65,
      color: c.woodDark,
      wood: true,
      roughness: 0.58,
      metalness: 0.01
    });

    this._addRing({
      name: "fine_antique_gold_line",
      outerW: innerW + 0.062,
      outerH: innerH + 0.062,
      innerW: innerW + 0.030,
      innerH: innerH + 0.030,
      depth: D * 0.055,
      bevel: 0,
      radius: 0,
      z: D * 0.68,
      color: c.goldColor,
      roughness: 0.42,
      metalness: 0.27
    });

    // Picture backing
    const backing = new THREE.Mesh(
      this._planeGeometry(innerW, innerH),
      new THREE.MeshStandardMaterial({
        color: c.backingColor,
        roughness: 0.95,
        side: THREE.DoubleSide
      })
    );
    // Keep the picture assembly recessed behind every molding layer.
    backing.position.z = D * 0.20;
    backing.name = "picture_backing";
    backing.receiveShadow = true;
    this.group.add(backing);

    // Replaceable photo
    this.pictureMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      side: THREE.DoubleSide
    });

    this.picture = new THREE.Mesh(
      this._planeGeometry(
        innerW - c.pictureMargin * 2,
        innerH - c.pictureMargin * 2
      ),
      this.pictureMaterial
    );
    this.picture.position.z = D * 0.30 + c.pictureDepth;
    this.picture.name = "replaceable_picture";
    this.group.add(this.picture);

    // subtle glass panel
    this.glass = new THREE.Mesh(
      this._planeGeometry(innerW - 0.008, innerH - 0.008),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.02,
        roughness: 0.20,
        metalness: 0,
        transmission: 0,
        clearcoat: 0.25,
        clearcoatRoughness: 0.30,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.glass.position.z = D * 0.39;
    this.glass.name = "glass";
    this.group.add(this.glass);

    if (c.plaqueEnabled) {
      this._buildPlaque();
    }
  }

  _buildPlaque() {
    const c = this.config;

    const plaque = new THREE.Group();
    plaque.name = "plaque_group";

    const y = -c.height / 2 - c.plaqueGap - c.plaqueHeight / 2;
    plaque.position.set(0, y, -c.depth * 0.02);

    // Thin walnut support following the decorative stepped silhouette.
    const body = new THREE.Mesh(
      this._plaqueGeometry(c.plaqueWidth, c.plaqueHeight, c.plaqueDepth),
      this._woodMat(c.woodDark, 0.64)
    );
    body.castShadow = true;
    body.receiveShadow = true;
    plaque.add(body);

    // A dark brass underlay remains visible as the stamped border.
    const rim = new THREE.Mesh(
      this._plaqueGeometry(
        c.plaqueWidth * 0.975,
        c.plaqueHeight * 0.88,
        c.plaqueDepth * 0.20
      ),
      this._mat(c.plaqueRimColor, 0.50, 0.44)
    );
    rim.position.z = c.plaqueDepth * 0.57;
    rim.castShadow = true;
    plaque.add(rim);

    // Main antique-brass face, inset from the darker border.
    const plate = new THREE.Mesh(
      this._plaqueGeometry(
        c.plaqueWidth * 0.95,
        c.plaqueHeight * 0.78,
        c.plaqueDepth * 0.12
      ),
      this._mat(c.plaqueColor, 0.53, 0.40)
    );
    plate.position.z = c.plaqueDepth * 0.69;
    plate.castShadow = true;
    plaque.add(plate);

    // Two shallow hemispherical rivets, matching the reference plaque.
    for (const sx of [-1, 1]) {
      const rivet = new THREE.Mesh(
        new THREE.SphereGeometry(
          c.plaqueHeight * 0.052,
          24,
          10,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        ),
        this._mat(0x74501f, 0.40, 0.52)
      );
      rivet.rotation.x = Math.PI / 2;
      rivet.position.set(
        sx * c.plaqueWidth * 0.405,
        0,
        c.plaqueDepth * 0.77
      );
      rivet.castShadow = true;
      plaque.add(rivet);
    }

    // Text is rendered to texture, so it is configurable without fonts/models.
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");

    this.plaqueCanvas = canvas;
    this.plaqueCtx = ctx;
    this._drawPlaqueText();
    this.plaqueTexture = new THREE.CanvasTexture(canvas);
    this.plaqueTexture.colorSpace = THREE.SRGBColorSpace;
    this.plaqueTexture.anisotropy = 8;
    this.plaqueTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.plaqueTexture.magFilter = THREE.LinearFilter;

    this.plaqueTextMaterial = new THREE.MeshBasicMaterial({
      map: this.plaqueTexture,
      transparent: true,
      depthWrite: false
    });

    const textPlane = new THREE.Mesh(
      this._planeGeometry(
        c.plaqueWidth * 0.88,
        c.plaqueHeight * 0.68
      ),
      this.plaqueTextMaterial
    );
    textPlane.position.z = c.plaqueDepth * 0.84;
    plaque.add(textPlane);

    this.group.add(plaque);
  }

  // ---------------------------
  // Public API
  // ---------------------------

  async setImage(url) {
    const tex = await this.textureLoader.loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    this.pictureMaterial.map = tex;
    this.pictureMaterial.needsUpdate = true;
    return tex;
  }

  async setImageFromFile(file) {
    const url = URL.createObjectURL(file);
    try {
      return await this.setImage(url);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  _drawPlaqueText() {
    const ctx = this.plaqueCtx;
    const canvas = this.plaqueCanvas;
    if (!ctx || !canvas) return;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = this.config.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const drawFitted = (
      text,
      weight,
      maxSize,
      minSize,
      y,
      maxWidth,
      fontFamily
    ) => {
      const safeText = String(text ?? "").normalize("NFC");
      let size = maxSize;
      do {
        ctx.font = `${weight} ${size}px ${fontFamily}`;
        if (ctx.measureText(safeText).width <= maxWidth) break;
        size -= 2;
      } while (size > minSize);
      ctx.fillText(safeText, canvas.width / 2, y);
    };

    const serif = "'Times New Roman', Georgia, serif";
    const sans = "Arial, 'Segoe UI', sans-serif";
    // Giữ tên trên một dòng; chỉ thu nhỏ khi thật sự cần thiết.
    drawFitted(this.config.plaqueText, 700, 94, 46, 43, 940, serif);
    drawFitted(this.config.plaqueSubText, 600, 40, 23, 108, 930, sans);
    drawFitted(this.config.plaqueDate, 600, 32, 20, 160, 940, serif);
  }

  setPlaqueText(title, subtitle = "", date = this.config.plaqueDate) {
    if (!this.plaqueCanvas) return;
    this.config.plaqueText = title;
    this.config.plaqueSubText = subtitle;
    this.config.plaqueDate = date;

    this._drawPlaqueText();

    this.plaqueTexture.needsUpdate = true;
  }

  setScale(value) {
    this.group.scale.setScalar(value);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(x, y, z) {
    this.group.rotation.set(x, y, z);
  }

  dispose() {
    // Geometry, wood texture and molding materials are shared between frames.
    // Only dispose resources that belong exclusively to this instance.
    if (this.pictureMaterial) {
      if (this.pictureMaterial.map) this.pictureMaterial.map.dispose();
      this.pictureMaterial.dispose();
    }
    if (this.plaqueTexture) this.plaqueTexture.dispose();
    if (this.plaqueTextMaterial) this.plaqueTextMaterial.dispose();
    if (this.glass?.material) this.glass.material.dispose();
    const backing = this.group.getObjectByName("picture_backing");
    if (backing?.material) backing.material.dispose();
  }
}

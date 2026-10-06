const HOUSE_PLANTS_URL = new URL("house_plants_embedded.glb", import.meta.url).href;

export const HOUSE_PLANT_NAMES = Object.freeze([
  "tall_potted_house_plant",
  "monstera_b02",
  "house_plants",
  "house_plant",
]);

let housePlantsPromise;

export function loadHousePlants(gltfLoader) {
  if (!housePlantsPromise) {
    housePlantsPromise = gltfLoader.loadAsync(HOUSE_PLANTS_URL).then((gltf) => {
      const models = new Map();
      for (const name of HOUSE_PLANT_NAMES) {
        const model = gltf.scene.getObjectByName(name);
        if (!model) {
          throw new Error(`Missing embedded house plant model: ${name}`);
        }
        models.set(name, model);
      }
      return { gltf, models };
    });
  }
  return housePlantsPromise;
}

export async function createHousePlant(gltfLoader, name) {
  const { models } = await loadHousePlants(gltfLoader);
  const model = models.get(name);
  if (!model) {
    throw new Error(`Unknown house plant model: ${name}`);
  }
  return model.clone(true);
}

export async function addHousePlant(gltfLoader, scene, name, options = {}) {
  const model = await createHousePlant(gltfLoader, name);
  const position = options.position || [0, 0, 0];
  model.position.set(position[0], position[1] || 0, position[2]);
  model.rotation.y = options.rotationY || 0;
  model.scale.setScalar(options.scale || 1);
  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = options.castShadow !== false;
      child.receiveShadow = options.receiveShadow !== false;
    }
  });
  scene.add(model);
  return model;
}

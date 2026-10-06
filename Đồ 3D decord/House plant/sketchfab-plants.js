export const SKETCHFAB_PLANTS = Object.freeze([
  {
    id: "b69d4bb48a974a20bf508c92321496f7",
    title: "decor_flower",
    author: "Furniture",
    modelUrl: "https://sketchfab.com/3d-models/decor-flower-b69d4bb48a974a20bf508c92321496f7",
    embedUrl: "https://sketchfab.com/models/b69d4bb48a974a20bf508c92321496f7/embed"
  },
  {
    id: "8e7d3ae5b19448dba43f33746a517bb8",
    title: "CHAU CAY",
    author: "Furniture",
    modelUrl: "https://sketchfab.com/3d-models/chau-cay-8e7d3ae5b19448dba43f33746a517bb8",
    embedUrl: "https://sketchfab.com/models/8e7d3ae5b19448dba43f33746a517bb8/embed"
  },
  {
    id: "c0f9f9b8f0c74d679a7ba055706dd6ed",
    title: "CHAU HOA HONG",
    author: "Furniture",
    modelUrl: "https://sketchfab.com/3d-models/chau-hoa-hong-c0f9f9b8f0c74d679a7ba055706dd6ed",
    embedUrl: "https://sketchfab.com/models/c0f9f9b8f0c74d679a7ba055706dd6ed/embed"
  },
  {
    id: "c6bb79c7791346e4bb4ffa9ede218dcb",
    title: "HOA LY",
    author: "Furniture",
    modelUrl: "https://sketchfab.com/3d-models/hoa-ly-c6bb79c7791346e4bb4ffa9ede218dcb",
    embedUrl: "https://sketchfab.com/models/c6bb79c7791346e4bb4ffa9ede218dcb/embed"
  }
]);

export function createSketchfabPlantEmbed(plant) {
  const iframe = document.createElement("iframe");
  iframe.title = plant.title;
  iframe.src = plant.embedUrl;
  iframe.frameBorder = "0";
  iframe.allowFullscreen = true;
  iframe.allow = "autoplay; fullscreen; xr-spatial-tracking";
  iframe.setAttribute("xr-spatial-tracking", "");
  iframe.setAttribute("execution-while-out-of-viewport", "");
  iframe.setAttribute("execution-while-not-rendered", "");
  iframe.setAttribute("web-share", "");
  return iframe;
}

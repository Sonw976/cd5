import { angleDiff, normalizeAngle } from "../geometry/radial-geometry.js";

export function createRadialCollision(config) {
  const {
    rCore,
    rOuter,
    wallThickness,
    margin,
    boundaries,
    boundaryGap
  } = config;

  function isWalkable(x, z) {
    const radius = Math.hypot(x, z);
    const angle = normalizeAngle(Math.atan2(z, x));

    if (z < -4.5 && Math.abs(x) < 3.5) {
      if (z < -12.5 + margin) return false;
      if (z < -12.0 && z > -13.0 && (x < -2.2 + margin || x > 2.2 - margin)) return false;
      if (x < -3 + margin) {
        if (!(z > -12 && z < -8)) return false;
      }
      if (x > 3 - margin) {
        if (!(z > -12 && z < -8)) return false;
      }
      if (Math.abs(x) < 3 - margin) return true;
    }

    if (radius > rOuter - margin) return false;

    if (Math.abs(radius - rCore) < wallThickness + 0.3) {
      const degrees = angle * 180 / Math.PI;
      if (degrees > 10 && degrees < 170) return false;
      if (degrees > 190 && degrees < 237) return false;
      if (degrees > 303 && degrees < 350) return false;
    }

    if (radius > rCore) {
      for (const boundaryAngle of boundaries) {
        const distance = angleDiff(angle, boundaryAngle);
        if (distance * radius < wallThickness + 0.3) {
          if (!(radius >= boundaryGap.r0 && radius <= boundaryGap.r1)) return false;
        }
      }
      if (angle > Math.PI && angle < 2 * Math.PI) {
        if (x > -3 - wallThickness - margin && x < -3 + margin && z < -4.5 && (z < -12 || z > -8)) return false;
        if (x < 3 + wallThickness + margin && x > 3 - margin && z < -4.5 && (z < -12 || z > -8)) return false;
      }
    }
    return true;
  }

  function resolveMovement(oldX, oldZ, newX, newZ) {
    if (isWalkable(newX, newZ)) return { x: newX, z: newZ };
    const oldRadius = Math.hypot(oldX, oldZ) || 0.0001;
    const radialX = oldX / oldRadius;
    const radialZ = oldZ / oldRadius;
    const tangentX = -radialZ;
    const tangentZ = radialX;
    const dx = newX - oldX;
    const dz = newZ - oldZ;
    const radialComponent = dx * radialX + dz * radialZ;
    const tangentComponent = dx * tangentX + dz * tangentZ;

    const tangentOnlyX = oldX + tangentX * tangentComponent;
    const tangentOnlyZ = oldZ + tangentZ * tangentComponent;
    if (isWalkable(tangentOnlyX, tangentOnlyZ)) return { x: tangentOnlyX, z: tangentOnlyZ };

    const radialOnlyX = oldX + radialX * radialComponent;
    const radialOnlyZ = oldZ + radialZ * radialComponent;
    if (isWalkable(radialOnlyX, radialOnlyZ)) return { x: radialOnlyX, z: radialOnlyZ };

    return { x: oldX, z: oldZ };
  }

  return Object.freeze({ isWalkable, resolveMovement });
}

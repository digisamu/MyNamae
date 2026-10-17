import { BoxGeometry, Vector3 } from "three";

/**
 * A rounded cube that keeps BoxGeometry's six material groups (one per face), so each face can carry
 * its own label texture. Vertices of a subdivided box are pushed onto a rounded-corner surface.
 */
export function createRoundedBoxGeometry(size = 1, radius = 0.14, segments = 6): BoxGeometry {
  const geometry = new BoxGeometry(size, size, size, segments, segments, segments);
  const half = size / 2;
  const inner = half - radius;
  const position = geometry.attributes.position!;
  const p = new Vector3();
  const core = new Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    core.set(
      Math.max(-inner, Math.min(inner, p.x)),
      Math.max(-inner, Math.min(inner, p.y)),
      Math.max(-inner, Math.min(inner, p.z)),
    );
    const offset = p.clone().sub(core);
    if (offset.lengthSq() > 0) p.copy(core).add(offset.normalize().multiplyScalar(radius));
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

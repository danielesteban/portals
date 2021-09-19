import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

class Box extends Mesh {
  static setupTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;
    const s = 32;
    const sx = canvas.width / s;
    const sy = canvas.height / s;
    const c = new Color();
    for (let x = 0; x < sx; x += 1) {
      for (let y = 0; y < sy; y += 1) {
        const l = (
          x <= 0 || x >= sx - 1
          || y <= 0 || y >= sy - 1
        ) ? 1.0 : 0.8;
        c.setHSL(0, 0, l - Math.random() * 0.1);
        ctx.fillStyle = `#${c.getHexString()}`;
        ctx.fillRect(x * s, y * s, s, s);
      }
    }
    Box.texture = new CanvasTexture(canvas);
    Box.texture.anisotropy = 16;
  }

  constructor(width, height, depth, diffuse) {
    const geometry = (new BoxGeometry(width, height, depth, Math.ceil(width * 2), Math.ceil(height * 2), Math.ceil(depth * 2))).toNonIndexed();
    geometry.translate(0, height * 0.5, 0);
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const color = new BufferAttribute(new Float32Array(position.count * 3), 3);
    const vertex = new Vector3();
    const aux = new Color();
    const simplex = new SimplexNoise();
    const uvs = [
      [0.0, 1.0],
      [0.0, 0.0],
      [1.0, 1.0],
      [0.0, 0.0],
      [1.0, 0.0],
      [1.0, 1.0],
    ];
    for (let i = 0; i < position.count; i++) {
      if (i % 6 === 0) {
        vertex.fromBufferAttribute(position, i).multiplyScalar(0.008);
        aux.setHSL(simplex.noise3d(vertex.x, vertex.y, vertex.z) + 0.5, 0.4 - Math.random() * 0.1, 0.4 - Math.random() * 0.1);
      }
      color.setXYZ(i, aux.r, aux.g, aux.b);
      const [uvx, uvy] = uvs[i % 6];
      uv.setXY(i, uvx, uvy);

    }
    geometry.setAttribute('color', color);
    if (!Box.texture) Box.setupTexture();
    super(mergeVertices(geometry), new MeshStandardMaterial({
      color: diffuse || 0xFFFFFF,
      envMapIntensity: 0.5,
      map: Box.texture,
      vertexColors: true,
    }));
  }
}

export default Box;

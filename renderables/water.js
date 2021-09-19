import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
} from 'three';

class Water extends InstancedMesh {
  static setupGeometry() {
    Water.geometry = new BufferGeometry();
    const position = new Float32Array(Water.size * Water.size * 9 * 2);
    const color = new Float32Array(Water.size * Water.size * 9 * 2);
    const light = new Float32Array(Water.size * Water.size * 2);
    let stride = 0;
    for (let z = 0; z < Water.size; z += 1) {
      for (let x = 0; x < Water.size; x += 1) {
        for (let i = 0; i < 2; i += 1) {
          light[stride] = 1 + (Math.random() * 2);
          stride += 1;
        }
      }
    }
    Water.geometry.setAttribute('position', (new BufferAttribute(position, 3)).setUsage(DynamicDrawUsage));
    Water.geometry.setAttribute('color', (new BufferAttribute(color, 3)).setUsage(DynamicDrawUsage));
    Water.light = light;
  }

  static setupMaterial() {
    Water.material = new MeshBasicMaterial({
      color: 0x226699,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
    });
  }

  constructor() {
    if (!Water.geometry) {
      Water.setupGeometry();
    }
    if (!Water.material) {
      Water.setupMaterial();
    }
    super(
      Water.geometry,
      Water.material,
      (Water.instances * 2 + 1) ** 2
    );
    const matrix = new Matrix4();
    for (let z = -Water.instances, i = 0; z <= Water.instances; z += 1) {
      for (let x = -Water.instances; x <= Water.instances; x += 1, i += 1) {
        matrix.setPosition(
          x * Water.size,
          0,
          z * Water.size
        );
        this.setMatrixAt(i, matrix);
      }
    }
    this.position.set(0, -1, 0);
    this.rotation.y = Math.PI * 0.25;
    this.matrixAutoUpdate = false;
    this.updateMatrix();
    this.renderOrder = 1;
  }

  static animate({ time }) {
    const { geometry, light, size } = Water;
    const { attributes: { color, position } } = geometry;
    let stride = 0;
    const waveHeight = Math.sin(time) * 0.05;
    for (let z = 0; z < size; z += 1) {
      for (let x = 0; x < size; x += 1) {
        const pos = {
          x: x - (size * 0.5),
          y: 0,
          z: z - (size * 0.5),
        };
        const elevationA = (
          (Math.sin(z * Math.PI * 0.5) * waveHeight)
          + (Math.sin(z * Math.PI * 0.125) * waveHeight)
        );
        const elevationB = (
          (Math.sin((z + 1) * Math.PI * 0.5) * waveHeight)
          + (Math.sin((z + 1) * Math.PI * 0.125) * waveHeight)
        );
        position.array.set([
          pos.x + 0.5, pos.y + elevationB, pos.z + 1,
          pos.x + 1, pos.y + elevationA, pos.z,
          pos.x, pos.y + elevationA, pos.z,
        ], stride);
        {
          const intensity = 0.95 + (Math.sin(time * light[stride / 9]) * 0.05);
          color.array.set([
            intensity, intensity, intensity,
            intensity, intensity, intensity,
            intensity, intensity, intensity,
          ], stride);
        }
        stride += 9;
        position.array.set([
          pos.x + 0.5, pos.y + elevationB, pos.z + 1,
          pos.x + 1.5, pos.y + elevationB, pos.z + 1,
          pos.x + 1, pos.y + elevationA, pos.z,
        ], stride);
        {
          const intensity = 0.95 + (Math.sin(time * light[stride / 9]) * 0.05);
          color.array.set([
            intensity, intensity, intensity,
            intensity, intensity, intensity,
            intensity, intensity, intensity,
          ], stride);
        }
        stride += 9;
      }
    }
    color.needsUpdate = true;
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
}

Water.instances = 1;
Water.size = 16;

export default Water;

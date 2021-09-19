import {
  Color,
  DataTexture,
  FloatType,
  LinearFilter,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RedFormat,
  RepeatWrapping,
  RGBFormat,
  ShaderMaterial,
  ShaderLib,
  sRGBEncoding,
  UniformsUtils,
  Vector3,
  WebGLMultisampleRenderTarget,
} from 'three';

class Portal extends Mesh {
  static setupGeometry() {
    Portal.geometry = new PlaneGeometry(2, 3, 1, 1);
  }

  constructor(color) {
    if (!Portal.geometry) {
      Portal.setupGeometry();
    }
    const target = new WebGLMultisampleRenderTarget(
      720,
      1080,
      {
        format: RGBFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
      }
    );
    target.texture.generateMipmaps = false;
    const noise = new DataTexture(new Uint8Array([...Array(32 * 32)].map(() => Math.floor(Math.random() * 256))), 32, 32, RedFormat);
    noise.repeat.set(2, 3);
    noise.wrapS = RepeatWrapping;
    noise.wrapT = RepeatWrapping;
    super(
      Portal.geometry,
      new ShaderMaterial({
        toneMapped: false,
        transparent: true,
        uniforms: {
          ...UniformsUtils.clone(ShaderLib.basic.uniforms),
          map: { value: target.texture },
          halo: { value: new Color(color) },
          noise: { value: noise },
          noiseTransform: { value: noise.matrix },
        },
        vertexShader: ShaderLib.basic.vertexShader,
        fragmentShader: ShaderLib.basic.fragmentShader
          .replace('uniform vec3 diffuse;', [
            'uniform vec3 diffuse;',
            'uniform vec3 halo;',
            'uniform sampler2D noise;',
            'uniform mat3 noiseTransform;',
          ].join('\n'))
          .replace('#include <specularmap_fragment>', [
            '#include <specularmap_fragment>',
            'float vignette = 0.4 - distance(vUv, vec2(0.5, 0.5));',
            'vignette = smoothstep(-0.1, 0.1, vignette);',
            'float n = 0.75 + texture(noise, (noiseTransform * vec3(vUv, 1)).xy).r * 0.25;',
            'diffuseColor = vec4(mix(mapTexelToLinear(vec4(halo * n, 1.0)).rgb, diffuseColor.rgb, vignette), min(vignette * 1.5, 1.0));',
          ].join('\n')),
      })
    );
    this.material.map = target.texture;
    this.aux = {
      dummy: new Object3D(),
      mirror: (new Quaternion()).setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      vector: new Vector3(),
    };
    this.camera = new PerspectiveCamera();
    this.renderTarget = target;
  }

  updateCamera(viewer) {
    const {
      aux: {
        dummy,
        mirror,
        vector,
      },
      camera,
      destination,
    } = this;

    camera.position.setFromMatrixPosition(viewer.matrixWorld);
    this.worldToLocal(camera.position);
    dummy.position.copy(destination.position);
    dummy.quaternion.multiplyQuaternions(destination.quaternion, mirror);
    dummy.updateMatrixWorld();
    dummy.localToWorld(camera.position);
    camera.quaternion.copy(dummy.quaternion);
    camera.updateMatrixWorld();
    camera.worldToLocal(vector.setFromMatrixPosition(dummy.matrixWorld));

    const { width, height } = Portal.geometry.parameters;
    camera.aspect = width / height;
    camera.near = Math.abs(vector.z);
    camera.far = camera.near + 100;

    camera.projectionMatrix.makePerspective(
      (vector.x - width / 2),
      (vector.x + width / 2),
      (vector.y + height / 2),
      (vector.y - height / 2),
      camera.near,
      camera.far
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  onBeforeRender(renderer, scene, viewer) {
    this.updateCamera(viewer);
    const { camera, destination, player, renderTarget } = this;

    player.mesh.visible = true;
    this.visible = false;
    destination.visible = false;
		const currentTarget = renderer.getRenderTarget();
		const currentXrEnabled = renderer.xr.enabled;
		const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
		renderer.xr.enabled = false;
		renderer.shadowMap.autoUpdate = false;
		renderer.setRenderTarget(renderTarget);
		renderer.state.buffers.depth.setMask(true);
		if (renderer.autoClear === false) renderer.clear();
		renderer.render(scene, camera);
		renderer.xr.enabled = currentXrEnabled;
		renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.setRenderTarget(currentTarget);
		const viewport = viewer.viewport;
		if (viewport !== undefined) {
			renderer.state.viewport(viewport);
		}
    destination.visible = true;
    this.visible = true;
    player.mesh.visible = false;
    this.material.uniforms.noise.value.rotation = renderer.animation.time * 0.5;
    this.material.uniforms.noise.value.updateMatrix();
  }
}

export default Portal;

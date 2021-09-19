import {
  ACESFilmicToneMapping,
  AudioListener,
  Clock,
  PerspectiveCamera,
  sRGBEncoding,
  WebGLRenderer,
} from 'three';

class Renderer {
  constructor(dom) {
    this.clock = new Clock();
    this.clock.localStartTime = Date.now();
    this.fps = {
      count: 0,
      lastTick: this.clock.oldTime / 1000,
    };
    this.dom = dom;

    this.camera = new PerspectiveCamera(70, 1, 0.01, 100);
    this.renderer = new WebGLRenderer({
      antialias: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    // this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setAnimationLoop(this.onAnimationTick.bind(this));
    dom.renderer.appendChild(this.renderer.domElement);

    this.onFirstInteraction = this.onFirstInteraction.bind(this);
    window.addEventListener('click', this.onFirstInteraction, false);
    window.addEventListener('keydown', this.onFirstInteraction, false);

    window.addEventListener('resize', this.onResize.bind(this), false);
    requestAnimationFrame(this.onResize.bind(this));
  }

  onAnimationTick() {
    const {
      camera,
      clock,
      dom,
      fps,
      listener,
      renderer,
      scene,
    } = this;

    renderer.animation = {
      delta: Math.min(clock.getDelta(), 1 / 30),
      time: clock.oldTime / 1000,
    };
    scene.onAnimationTick(renderer.animation);
    if (listener) {
      camera.matrixWorld.decompose(listener.position, listener.quaternion, listener.scale);
      listener.updateMatrixWorld();
    }
    renderer.render(scene, camera);

    fps.count += 1;
    if (renderer.animation.time >= fps.lastTick + 1) {
      renderer.fps = Math.round(fps.count / (renderer.animation.time - fps.lastTick));
      dom.fps.innerText = `${renderer.fps}fps`;
      fps.lastTick = renderer.animation.time;
      fps.count = 0;
    }
  }

  onFirstInteraction() {
    const { scene } = this;
    window.removeEventListener('click', this.onFirstInteraction);
    window.removeEventListener('keydown', this.onFirstInteraction);
    this.listener = new AudioListener();
    scene.onFirstInteraction && scene.onFirstInteraction();
  }

  onResize() {
    const {
      camera,
      dom,
      renderer,
      scene,
    } = this;

    const { width, height } = dom.renderer.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    scene.onResize && scene.onResize();
  }
}

export default Renderer;

import {
  AudioLoader,
  BackSide,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PositionalAudio,
  Quaternion,
  Raycaster,
  Scene,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices, mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Player from './core/player.js';
import Renderer from './core/renderer.js';
import Box from './renderables/box.js';
import Portal from './renderables/portal.js';
import Water from './renderables/water.js';

const renderer = new Renderer({
  fps: document.getElementById('fps'),
  renderer: document.getElementById('renderer'),
});

class Main extends Scene {
  constructor() {
    super();

    const { texture: environment } = (new PMREMGenerator(renderer.renderer)).fromScene(new RoomEnvironment(), 0.04);
    this.environment = environment;

    this.player = new Player({
      camera: renderer.camera,
      renderer: renderer.dom.renderer,
    });
    this.player.camera.position.set(0, 1.6, 10);
    this.add(this.player.camera);
    {
      const body = (new CylinderGeometry(0.2, 0.1, 1.3)).toNonIndexed();
      body.translate(0, -1.6 + 1.3 * 0.5, 0);
      const head = new IcosahedronGeometry(0.3, 2);
      this.player.mesh = new Mesh(mergeVertices(mergeBufferGeometries([head, body])), new MeshStandardMaterial({ envMapIntensity: 0.5 }));
      this.player.mesh.rotation.order = 'YXZ';
      this.player.mesh.visible = false;
      this.add(this.player.mesh);
    }

    this.surfaces = [];

    const room = new Box(15, 12, 36);
    room.position.set(0, -4, 0);
    room.material.side = BackSide;
    this.add(room);
    this.surfaces.push(room);
    
    for (let i = 0; i < 2; i++) {
      const box = new Box(15, 4, 6);
      box.position.set(0, -4, i === 0 ? -15 : 15);
      this.add(box);
      this.surfaces.push(box);
    }
    {
      const box = new Box(6, 12, 6);
      box.position.set(-4.5, -4, 0);
      this.add(box);
      this.surfaces.push(box);
    }
    {
      const box = new Box(3, 5, 1);
      box.position.set(6, -0.5, 0);
      this.add(box);
      this.surfaces.push(box);
    }
    {
      const box = new Box(5, 5, 2);
      box.position.set(0, 0, -17);
      this.add(box);
      this.surfaces.push(box);
    }
    for (let i = 0; i < 2; i++) {
      const box = new Box(3, 8, 2);
      box.position.set(i === 0 ? -6 : 6, 0, 17);
      this.add(box);
      this.surfaces.push(box);
    }

    this.water = new Water();
    this.add(this.water);

    this.portals = [
      new Portal(0x0065ff),
      new Portal(0xff5d00),
    ];
    this.portals.forEach((portal, i) => {
      portal.position.set(0, 2, i === 0 ? -15.99 : 17.99);
      portal.rotation.y = i === 0 ? 0 : Math.PI;
      portal.player = this.player;
      portal.destination = this.portals[i === 0 ? 1 : 0];
      this.add(portal);
    });

    this.aux = {
      matrix: new Matrix4(),
      raycaster: new Raycaster(),
      quaternion: new Quaternion(),
      mirror: (new Quaternion()).setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
      one: new Vector3(1, 1, 1),
    };
  }

  onAnimationTick(animation) {
    const { aux: { matrix, raycaster, quaternion, mirror, one }, player, portals, surfaces } = this;
    player.onAnimationTick(animation);
    Water.animate(animation);

    raycaster.ray.direction.subVectors(player.camera.position, player.camera.lastPosition);
    raycaster.far = raycaster.ray.direction.length();
    raycaster.ray.direction.normalize();
    raycaster.ray.origin.copy(player.camera.lastPosition).addScaledVector(raycaster.ray.direction, -0.25);
    raycaster.far += 0.5;
    const crossedPortal = raycaster.intersectObjects(portals)[0];
    if (crossedPortal) {
      const portal = crossedPortal.object;
      player.camera.applyMatrix4(
        matrix.copy(portal.matrixWorld).invert()
      );
      player.camera.applyMatrix4(
        matrix.compose(portal.destination.position, quaternion.multiplyQuaternions(portal.destination.quaternion, mirror).normalize(), one)
      );
      player.camera.rotation.z = 0;
      player.camera.lastPosition.copy(player.camera.position);
      player.camera.updateMatrixWorld();
    }

    player.mesh.position.copy(player.camera.position);
    player.mesh.quaternion.copy(player.camera.quaternion);
    player.mesh.rotation.x = 0;
    player.mesh.rotation.z = 0;

    if (player.buttons.primaryDown || player.buttons.secondaryDown) {
      const hit = player.raycaster.intersectObjects(surfaces)[0];
      if (hit) {
        const portal = portals[player.buttons.primaryDown ? 0 : 1];
        if (hit.object.material.side === BackSide) {
          hit.face.normal.negate();
        }
        portal.position.copy(hit.point.addScaledVector(hit.face.normal, 0.01));
        portal.lookAt(hit.point.add(hit.face.normal));
        if (portal.sfx && !portal.sfx.isPlaying) {
          portal.sfx.filter.frequency.value = (Math.random() + 0.5) * 1024;
          portal.sfx.play();
        }
      }
    }
  }

  onFirstInteraction() {
    ['ambientA', 'ambientB'].forEach((sound, i) => {
      const ambient = new Audio(`/sounds/${sound}.ogg`);
      ambient.volume = i === 0 ? 0.1 : 0.3;
      ambient.loop = true;
      ambient.play();
    });
    (new AudioLoader())
      .loadAsync('/sounds/shot.ogg')
      .then((buffer) => {
        this.portals.forEach((portal, i) => {
          const audio = new PositionalAudio(renderer.listener);
          audio.filter = audio.context.createBiquadFilter();
          audio.filter.type = i === 0 ? 'highpass' : 'lowpass';
          audio.setBuffer(buffer);
          audio.setFilter(audio.filter);
          audio.setRefDistance(8);
          portal.sfx = audio;
          portal.add(audio);
        });
      });
  }
}

renderer.scene = new Main();

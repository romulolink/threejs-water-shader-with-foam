import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

var camera, scene, renderer, renderTarget, depthMaterial, clock;

var water;

var params = {
  foamColor: 0xffffff,
  waterColor: 0x14c6a5,
  threshold: 0.1
};

init();
animate();

function init() {
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 7, 10);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e485e);

  // lights

  var ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
  scene.add(ambientLight);

  var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0, 5, 5);
  scene.add(dirLight);

  // border

  var boxGeometry = new THREE.BoxBufferGeometry(10, 1, 1);
  var boxMaterial = new THREE.MeshLambertMaterial({ color: 0xea4d10 });

  var box1 = new THREE.Mesh(boxGeometry, boxMaterial);
  box1.position.z = 4.5;
  scene.add(box1);

  var box2 = new THREE.Mesh(boxGeometry, boxMaterial);
  box2.position.z = -4.5;
  scene.add(box2);

  var box3 = new THREE.Mesh(boxGeometry, boxMaterial);
  box3.position.x = -5;
  box3.rotation.y = Math.PI * 0.5;
  scene.add(box3);

  var box4 = new THREE.Mesh(boxGeometry, boxMaterial);
  box4.position.x = 5;
  box4.rotation.y = Math.PI * 0.5;
  scene.add(box4);

  // box middle

  var box5 = new THREE.Mesh(new THREE.BoxBufferGeometry(), boxMaterial);
  box5.rotation.y = Math.PI * 0.1;
  box5.rotation.x = Math.PI * 0.05;
  scene.add(box5);


  var box6 = new THREE.Mesh(new THREE.BoxBufferGeometry(), boxMaterial);
  box6.position.y = 0;
  box6.position.x = 3;
  box6.position.z = 3;
  scene.add(box6);


  var box7 = new THREE.Mesh(new THREE.BoxBufferGeometry(), boxMaterial);
  box7.position.y = 0;
  box7.position.x = -3;
  box7.position.z = -2;
  scene.add(box7);



  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.gammaOutput = true;
  document.body.appendChild(renderer.domElement);

  var supportsDepthTextureExtension = !!renderer.extensions.get(
    "WEBGL_depth_texture"
  );

  //

  var pixelRatio = renderer.getPixelRatio();

  renderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
  renderTarget.texture.minFilter = THREE.NearestFilter;
  renderTarget.texture.magFilter = THREE.NearestFilter;
  renderTarget.texture.generateMipmaps = false;
  renderTarget.stencilBuffer = false;

  if (supportsDepthTextureExtension === true) {
    renderTarget.depthTexture = new THREE.DepthTexture();
    renderTarget.depthTexture.type = THREE.UnsignedShortType;
    renderTarget.depthTexture.minFilter = THREE.NearestFilter;
    renderTarget.depthTexture.maxFilter = THREE.NearestFilter;
  }

  depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.depthPacking = THREE.RGBADepthPacking;
  depthMaterial.blending = THREE.NoBlending;


  // water

  var dudvMap = new THREE.TextureLoader().load(
    "https://i.imgur.com/uVQJZFn.png"
  );
  dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;

  var uniforms = {
    time: {
      value: 0
    },
    threshold: {
      value: 0.1
    },
    tDudv: {
      value: null
    },
    tDepth: {
      value: null
    },
    cameraNear: {
      value: 0
    },
    cameraFar: {
      value: 0
    },
    resolution: {
      value: new THREE.Vector2()
    },
    foamColor: {
      value: new THREE.Color()
    },
    waterColor: {
      value: new THREE.Color()
    }
  };

  var waterGeometry = new THREE.PlaneBufferGeometry(10, 10);
  var waterMaterial = new THREE.ShaderMaterial({
    defines: {
      DEPTH_PACKING: supportsDepthTextureExtension === true ? 0 : 1,
      ORTHOGRAPHIC_CAMERA: 0
    },
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib["fog"], uniforms]),
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShader").textContent,
    fog: true
  });

  waterMaterial.uniforms.cameraNear.value = camera.near;
  waterMaterial.uniforms.cameraFar.value = camera.far;
  waterMaterial.uniforms.resolution.value.set(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
  waterMaterial.uniforms.tDudv.value = dudvMap;
  waterMaterial.uniforms.tDepth.value =
    supportsDepthTextureExtension === true
      ? renderTarget.depthTexture
      : renderTarget.texture;

  water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI * 0.5;
  scene.add(water);

  //

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 50;

  //

  var gui = new GUI();

  gui.addColor(params, "foamColor");
  gui.addColor(params, "waterColor");
  gui.add(params, "threshold", 0.1, 1);
  gui.open();

  //

  window.addEventListener("resize", onWindowResize, false);
}



function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  var pixelRatio = renderer.getPixelRatio();

  renderTarget.setSize(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
  water.material.uniforms.resolution.value.set(
    window.innerWidth * pixelRatio,
    window.innerHeight * pixelRatio
  );
}

function animate() {
  requestAnimationFrame(animate);

  // depth pass

  water.visible = false; // we don't want the depth of the water
  scene.overrideMaterial = depthMaterial;

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  scene.overrideMaterial = null;
  water.visible = true;

  // beauty pass

  var time = clock.getElapsedTime();

  water.material.uniforms.threshold.value = params.threshold;
  water.material.uniforms.time.value = time;
  water.material.uniforms.foamColor.value.set(params.foamColor);
  water.material.uniforms.waterColor.value.set(params.waterColor);

  renderer.render(scene, camera);
}



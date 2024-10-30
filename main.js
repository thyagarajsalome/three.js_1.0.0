// main.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { gsap } from "gsap";

// Debug flag
const DEBUG = true;

// Function to log debug messages
function debug(...args) {
  if (DEBUG) console.log(...args);
}

// Initialize scene only after DOM is loaded
document.addEventListener("DOMContentLoaded", init);

function init() {
  debug("Initializing application...");

  // Scene setup
  const scene = new THREE.Scene();
  debug("Scene created");

  // Camera setup
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 10;
  debug("Camera created and positioned");

  // Renderer setup
  const canvas = document.querySelector(".webgl");
  if (!canvas) {
    console.error(
      "Canvas element not found! Make sure you have <canvas class='webgl'></canvas> in your HTML"
    );
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  debug("Renderer created");

  // Load textures with error handling
  const textureLoader = new THREE.TextureLoader();
  const textures = {
    earth: null,
    clouds: null,
    bump: null,
    specular: null,
    milkyWay: null,
  };

  // Function to load texture with error handling
  function loadTexture(url, name) {
    return new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        (texture) => {
          textures[name] = texture;
          debug(`Loaded texture: ${name}`);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Error loading texture ${name}:`, error);
          reject(error);
        }
      );
    });
  }

  // Load all textures
  Promise.all([
    loadTexture("/texture/earth.jpg", "earth"),
    loadTexture("/texture/cloud.jpg", "clouds"),
    loadTexture("/texture/bump.jpg", "bump"),
    loadTexture("/texture/reflection.jpg", "specular"),
    loadTexture("/texture/milky_way.jpg", "milkyWay"),
  ])
    .then(() => {
      debug("All textures loaded successfully");
      createScene();
    })
    .catch((error) => {
      console.error("Error loading textures:", error);
      // Create scene anyway with default materials
      createScene(true);
    });

  function createScene(useDefaultMaterials = false) {
    // Milky Way background
    if (!useDefaultMaterials && textures.milkyWay) {
      const milkyWayGeometry = new THREE.SphereGeometry(500, 60, 40);
      const milkyWayMaterial = new THREE.MeshBasicMaterial({
        map: textures.milkyWay,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.3,
      });
      const milkyWay = new THREE.Mesh(milkyWayGeometry, milkyWayMaterial);
      scene.add(milkyWay);
      debug("Milky Way background added");
    }

    // Earth Group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Constants for Earth dimensions
    const outerRadius = 3;
    const thickness = 0.1;
    const innerRadius = outerRadius - thickness;

    // Outer Earth
    const earthGeometry = new THREE.SphereGeometry(outerRadius, 64, 64);
    const earthMaterial = useDefaultMaterials
      ? new THREE.MeshPhongMaterial({ color: 0x2233ff })
      : new THREE.MeshPhongMaterial({
          map: textures.earth,
          bumpMap: textures.bump,
          bumpScale: -0.4,
          specularMap: textures.specular,
          specular: new THREE.Color("grey"),
          shininess: 5,
          side: THREE.FrontSide,
        });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // Inner Earth
    const innerEarthGeometry = new THREE.SphereGeometry(innerRadius, 64, 64);
    const innerEarthMaterial = useDefaultMaterials
      ? new THREE.MeshPhongMaterial({ color: 0x1122dd })
      : new THREE.MeshPhongMaterial({
          map: textures.earth,
          bumpMap: textures.bump,
          bumpScale: -0.4,
          specularMap: textures.specular,
          specular: new THREE.Color("grey"),
          shininess: 5,
          side: THREE.BackSide,
          color: new THREE.Color(0x666666),
        });
    const innerEarthMesh = new THREE.Mesh(
      innerEarthGeometry,
      innerEarthMaterial
    );
    earthGroup.add(innerEarthMesh);

    // Clouds
    if (!useDefaultMaterials && textures.clouds) {
      const cloudGeometry = new THREE.SphereGeometry(
        outerRadius + 0.01,
        64,
        64
      );
      const cloudMaterial = new THREE.MeshPhongMaterial({
        map: textures.clouds,
        transparent: true,
        opacity: 0.4,
      });
      const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
      earthGroup.add(cloudMesh);
    }

    // Earth glow
    const glowGeometry = new THREE.SphereGeometry(5.5, 64, 64);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { type: "f", value: 0.3 },
        p: { type: "f", value: 3.5 },
        glowColor: { type: "c", value: new THREE.Color(0x00ffff) },
        viewVector: { type: "v3", value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          vec3 actual_normal = vec3(modelMatrix * vec4(normal, 0.0));
          intensity = pow( dot(normalize(viewVector), actual_normal), 6.0 );
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4( glow, 1.0 );
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);

    // Stars
    function addStar() {
      const geometry = new THREE.SphereGeometry(0.03, 24, 24);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const star = new THREE.Mesh(geometry, material);

      const [x, y, z] = Array(3)
        .fill()
        .map(() => THREE.MathUtils.randFloatSpread(100));
      star.position.set(x, y, z);
      scene.add(star);
    }

    Array(200).fill().forEach(addStar);
    debug("Stars added");

    // Enhanced Lighting
    const pointLight = new THREE.PointLight(0xffffff, 70);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.01);
    scene.add(ambientLight);
    debug("Enhanced lighting added");

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    debug("Controls created");

    // Animation
    function animate() {
      requestAnimationFrame(animate);
      controls.update();

      earthGroup.rotation.y += 0.0005;
      if (!useDefaultMaterials) {
        const cloudMesh = earthGroup.children.find(
          (child) => child.material.opacity === 0.4
        );
        if (cloudMesh) cloudMesh.rotation.y += 0.0007;
      }

      // Update glow
      glowMaterial.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        glowMesh.position
      );

      renderer.render(scene, camera);
    }

    // Start animation
    animate();
    debug("Animation started");

    // GSAP Animations
    const tl = gsap.timeline({ defaults: { duration: 1 } });
    tl.fromTo(earthGroup.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    tl.fromTo("nav", { y: "-100%" }, { y: "0%" });
    tl.fromTo(".title", { opacity: 0 }, { opacity: 1 });

    // Responsive handling
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}

// Sound

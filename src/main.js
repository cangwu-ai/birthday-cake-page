import * as THREE from 'three';
import { EffectComposer } from 'postprocessing';
import { RenderPass, EffectPass, BloomEffect, VignetteEffect } from 'postprocessing';

const COLORS = {
  cyan: new THREE.Color('#74ebff'),
  pink: new THREE.Color('#f886ce'),
  gold: new THREE.Color('#ffe578'),
  purple: new THREE.Color('#a58cf4'),
  white: new THREE.Color('#ffffff'),
  red: new THREE.Color('#ff5577'),
  orange: new THREE.Color('#ffaa44'),
  blue: new THREE.Color('#4488ff'),
  green: new THREE.Color('#44ff88'),
  yellow: new THREE.Color('#ffee55'),
};

const colorArray = Object.values(COLORS);

class BirthdayCakeScene {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.targetRotation = new THREE.Vector2();
    this.currentRotation = new THREE.Vector2();
    this.isAnimatingIn = true;
    this.animationProgress = 0;
    this.candleLit = true;
    this.flameIntensity = 0;
    this.isDragging = false;
    this.previousMouse = new THREE.Vector2();
    this.breathPhase = 0;

    this.init();
    this.createScene();
    this.setupPostProcessing();
    this.bindEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    const aspect = this.width / this.height;
    const fov = aspect < 1 ? 55 : 40;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this.camera.position.set(0, 1, 7);
    this.camera.lookAt(0, 0.3, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);
  }

  createScene() {
    this.cakeGroup = new THREE.Group();
    this.scene.add(this.cakeGroup);

    this.createGlassSphere();
    this.createCake();
    this.createNeonIcing();
    this.createPlate();
    this.createCandle();
    this.createFlame();
    this.createStarParticles();
    this.createFloatingConfetti();
    this.setupLights();
  }

  createGlassSphere() {
    const sphereGeometry = new THREE.SphereGeometry(2.8, 64, 64);

    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.5);

          vec3 rimColor = vec3(0.7, 0.8, 1.0);
          vec3 goldHighlight = vec3(1.0, 0.85, 0.6);

          float topGradient = smoothstep(-1.0, 2.0, vPosition.y);
          vec3 color = mix(rimColor, goldHighlight, topGradient * 0.3);

          float highlight = pow(max(0.0, dot(vNormal, normalize(vec3(0.3, 1.0, 0.5)))), 8.0);
          color += vec3(1.0, 0.95, 0.9) * highlight * 0.6;

          float alpha = fresnel * 0.12;
          alpha += highlight * 0.15;
          alpha = clamp(alpha, 0.0, 0.35);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 0.8;
    this.glassSphere = sphere;
    this.cakeGroup.add(sphere);

    const ringGeometry = new THREE.TorusGeometry(2.8, 0.03, 16, 128);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xddccaa,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.8;
    this.cakeGroup.add(ring);
  }

  createCake() {
    const cakeGeometry = new THREE.CylinderGeometry(1.3, 1.4, 1.1, 64);

    const cakeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec3 deepBlue = vec3(0.02, 0.04, 0.12);
          vec3 midBlue = vec3(0.05, 0.08, 0.2);

          float gradient = smoothstep(-0.6, 0.6, vPosition.y);
          vec3 baseColor = mix(deepBlue, midBlue, gradient);

          float starDensity = hash(vUv * 80.0);
          float starBright = step(0.985, starDensity);
          vec3 starColor = vec3(0.9, 0.92, 1.0) * starBright * 0.8;

          float nebula1 = smoothstep(0.4, 0.6, sin(vUv.x * 8.0 + vUv.y * 4.0));
          float nebula2 = smoothstep(0.3, 0.7, cos(vUv.x * 6.0 - vUv.y * 5.0 + 0.5));
          vec3 nebulaColor = vec3(0.15, 0.25, 0.5) * nebula1 * 0.15 + vec3(0.3, 0.1, 0.35) * nebula2 * 0.1;

          vec3 color = baseColor + starColor + nebulaColor;

          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          color += vec3(0.2, 0.35, 0.6) * fresnel * 0.25;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.cake = new THREE.Mesh(cakeGeometry, cakeMaterial);
    this.cake.position.y = -0.45;
    this.cakeGroup.add(this.cake);

    this.createCakeText();
  }

  createCakeText() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 128);

    ctx.fillStyle = 'rgba(238, 233, 220, 0.85)';
    ctx.font = 'italic 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('happy birthday', 256, 55);

    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = 'rgba(200, 195, 185, 0.5)';
    ctx.fillText('✦  5386024  ✦', 256, 85);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const textGeometry = new THREE.PlaneGeometry(1.2, 0.35);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, -0.4, 1.35);
    this.cakeGroup.add(textMesh);
  }

  createNeonIcing() {
    const icingGroup = new THREE.Group();

    const splatCount = 45;
    for (let i = 0; i < splatCount; i++) {
      const angle = (i / splatCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radius = 1.32 + Math.random() * 0.08;

      const isTop = Math.random() > 0.4;
      let x, y, z;

      if (isTop) {
        const r = Math.random() * 1.0;
        const a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * r;
        y = 0.1 + Math.random() * 0.15;
        z = Math.sin(a) * r;
      } else {
        x = Math.cos(angle) * radius;
        y = -0.1 - Math.random() * 0.7;
        z = Math.sin(angle) * radius;
      }

      const splatSize = 0.08 + Math.random() * 0.15;
      const splatGeometry = new THREE.SphereGeometry(splatSize, 8, 8);
      splatGeometry.scale(1 + Math.random() * 0.5, 0.4 + Math.random() * 0.6, 1 + Math.random() * 0.5);

      const hue = Math.random();
      let color;
      if (hue < 0.25) {
        color = new THREE.Color('#74ebff');
      } else if (hue < 0.5) {
        color = new THREE.Color('#f886ce');
      } else if (hue < 0.75) {
        color = new THREE.Color('#ffe578');
      } else {
        color = new THREE.Color('#a58cf4');
      }

      const splatMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        metalness: 0.4,
        roughness: 0.3,
      });

      const splat = new THREE.Mesh(splatGeometry, splatMaterial);
      splat.position.set(x, y, z);
      splat.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      splat.userData.phase = Math.random() * Math.PI * 2;
      splat.userData.baseEmissive = 0.6;
      icingGroup.add(splat);
    }

    const dripCount = 20;
    for (let i = 0; i < dripCount; i++) {
      const angle = (i / dripCount) * Math.PI * 2;
      const radius = 1.33;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const dripLength = 0.2 + Math.random() * 0.4;
      const dripWidth = 0.04 + Math.random() * 0.04;

      const dripGeometry = new THREE.CylinderGeometry(dripWidth * 0.3, dripWidth, dripLength, 8);

      const hue = Math.random();
      let color;
      if (hue < 0.25) {
        color = new THREE.Color('#74ebff');
      } else if (hue < 0.5) {
        color = new THREE.Color('#f886ce');
      } else if (hue < 0.75) {
        color = new THREE.Color('#ffe578');
      } else {
        color = new THREE.Color('#a58cf4');
      }

      const dripMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.4,
      });

      const drip = new THREE.Mesh(dripGeometry, dripMaterial);
      drip.position.set(x, 0.05 - dripLength / 2, z);
      drip.userData.phase = Math.random() * Math.PI * 2;
      icingGroup.add(drip);
    }

    this.icingGroup = icingGroup;
    this.cakeGroup.add(icingGroup);
  }

  createPlate() {
    const plateGeometry = new THREE.CylinderGeometry(2.2, 2.0, 0.12, 64);
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      metalness: 0.05,
      roughness: 0.4,
    });

    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = -1.06;
    this.cakeGroup.add(plate);

    const rimGeometry = new THREE.TorusGeometry(2.1, 0.04, 12, 64);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e4dc,
      metalness: 0.2,
      roughness: 0.3,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.0;
    this.cakeGroup.add(rim);

    const shadowGeometry = new THREE.CircleGeometry(2.0, 64);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x102050,
      transparent: true,
      opacity: 0.35,
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.13;
    this.cakeGroup.add(shadow);
  }

  createCandle() {
    const candleGeometry = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 12);
    const candleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffeebb,
      emissive: 0xffe088,
      emissiveIntensity: 0.15,
      metalness: 0.0,
      roughness: 0.7,
    });

    this.candle = new THREE.Mesh(candleGeometry, candleMaterial);
    this.candle.position.y = 0.55;
    this.cakeGroup.add(this.candle);

    const wickGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6);
    const wickMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const wick = new THREE.Mesh(wickGeometry, wickMaterial);
    wick.position.y = 1.1;
    this.cakeGroup.add(wick);
  }

  createFlame() {
    const flameGeometry = new THREE.PlaneGeometry(0.4, 0.55, 1, 12);

    const flameMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;

        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;
          vec2 center = uv - vec2(0.5, 0.3);

          float distort = noise(vec2(uv.x * 3.0, uv.y * 2.0 - uTime * 4.0)) * 0.15;
          center.x += distort * (1.0 - uv.y);

          float teardrop = 1.0 - length(center * vec2(2.5, 1.8));
          teardrop = smoothstep(0.0, 0.6, teardrop);
          teardrop *= smoothstep(0.0, 0.15, uv.y);
          teardrop *= 1.0 - smoothstep(0.7, 1.0, uv.y);

          float flicker = 0.88 + 0.12 * sin(uTime * 12.0 + noise(uv * 4.0) * 6.0);
          teardrop *= flicker * uIntensity;

          vec3 innerColor = vec3(1.0, 1.0, 0.98);
          vec3 midColor = vec3(1.0, 0.9, 0.5);
          vec3 outerColor = vec3(1.0, 0.65, 0.2);

          vec3 color = mix(outerColor, midColor, smoothstep(0.0, 0.5, teardrop));
          color = mix(color, innerColor, smoothstep(0.6, 0.95, teardrop));

          float alpha = teardrop * uIntensity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.flame = new THREE.Mesh(flameGeometry, flameMaterial);
    this.flame.position.y = 1.4;
    this.cakeGroup.add(this.flame);

    const flame2 = this.flame.clone();
    flame2.rotation.y = Math.PI / 2;
    flame2.material = flameMaterial.clone();
    this.flame2 = flame2;
    this.cakeGroup.add(flame2);

    this.createFlameGlow();
    this.createStarRays();
  }

  createFlameGlow() {
    const glowGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff4cc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.flameGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.flameGlow.position.y = 1.35;
    this.cakeGroup.add(this.flameGlow);

    const outerGlowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    this.outerGlow.position.y = 1.35;
    this.cakeGroup.add(this.outerGlow);

    this.flameLight = new THREE.PointLight(0xffcc66, 0, 5);
    this.flameLight.position.y = 1.35;
    this.cakeGroup.add(this.flameLight);
  }

  createStarRays() {
    const rayGroup = new THREE.Group();

    const rayGeometry = new THREE.PlaneGeometry(0.06, 0.8);
    const rayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float dist = abs(vUv.x - 0.5) * 2.0;
          float falloff = abs(vUv.y - 0.5) * 2.0;
          float alpha = (1.0 - dist) * (1.0 - falloff * falloff) * uIntensity * 0.5;
          vec3 color = vec3(1.0, 0.98, 0.9);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const ray1 = new THREE.Mesh(rayGeometry, rayMaterial.clone());
    ray1.position.y = 1.35;
    rayGroup.add(ray1);

    const ray2 = new THREE.Mesh(rayGeometry, rayMaterial.clone());
    ray2.rotation.z = Math.PI / 2;
    ray2.position.y = 1.35;
    rayGroup.add(ray2);

    const ray3 = new THREE.Mesh(rayGeometry, rayMaterial.clone());
    ray3.rotation.y = Math.PI / 2;
    ray3.position.y = 1.35;
    rayGroup.add(ray3);

    const ray4 = new THREE.Mesh(rayGeometry, rayMaterial.clone());
    ray4.rotation.set(0, Math.PI / 2, Math.PI / 2);
    ray4.position.y = 1.35;
    rayGroup.add(ray4);

    this.starRays = rayGroup;
    this.cakeGroup.add(rayGroup);
  }

  createStarParticles() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    const targetY = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 0.5 + Math.random() * 2.2;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) + 0.8;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorArray[Math.floor(Math.random() * colorArray.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 3 + Math.random() * 12;
      phases[i] = Math.random() * Math.PI * 2;

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      targetY[i] = -2 + Math.random() * 4.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.particleVelocities = velocities;
    this.particleTargetY = targetY;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uBreath;

        void main() {
          vColor = aColor;
          vec3 pos = position;

          float breathOffset = sin(uTime * 0.8 + aPhase) * 0.15;
          pos.y += breathOffset;
          pos.x += sin(uTime * 0.5 + aPhase * 2.0) * 0.08;
          pos.z += cos(uTime * 0.4 + aPhase * 1.5) * 0.08;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float twinkle = 0.5 + 0.5 * sin(uTime * 3.0 + aPhase * 6.28);
          vAlpha = twinkle;
          gl_PointSize = aSize * uBreath * twinkle * (180.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          float starShape = 1.0;
          float angle = atan(center.y, center.x);
          float rays = abs(sin(angle * 4.0));
          starShape = smoothstep(0.5, 0.0, dist - rays * 0.15);

          float glow = smoothstep(0.5, 0.0, dist) * 0.6;
          float core = smoothstep(0.15, 0.0, dist);

          float alpha = (starShape * 0.4 + glow + core) * vAlpha;
          vec3 color = vColor + vec3(0.3) * core;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.starParticles = new THREE.Points(geometry, material);
    this.cakeGroup.add(this.starParticles);
  }

  createFloatingConfetti() {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const rotations = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 2.4;
      const y = -1.5 + Math.random() * 4;

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      const color = colorArray[Math.floor(Math.random() * colorArray.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 4 + Math.random() * 10;
      phases[i] = Math.random() * Math.PI * 2;
      rotations[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBreath: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aRotation;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vRotation;
        uniform float uTime;
        uniform float uBreath;

        void main() {
          vColor = aColor;
          vRotation = aRotation + uTime * 0.5;

          vec3 pos = position;
          pos.y += sin(uTime * 0.6 + aPhase) * 0.2;
          pos.x += sin(uTime * 0.4 + aPhase * 1.5) * 0.1;
          pos.z += cos(uTime * 0.35 + aPhase * 1.2) * 0.1;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float twinkle = 0.6 + 0.4 * sin(uTime * 2.5 + aPhase * 6.28);
          vAlpha = twinkle;
          gl_PointSize = aSize * uBreath * twinkle * (160.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vRotation;

        void main() {
          vec2 center = gl_PointCoord - 0.5;

          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 rotated = vec2(c * center.x - s * center.y, s * center.x + c * center.y);

          float star = 1.0;
          float angle = atan(rotated.y, rotated.x);
          float points = abs(sin(angle * 2.5));
          float dist = length(rotated);
          star = smoothstep(0.45 + points * 0.1, 0.0, dist);

          float glow = smoothstep(0.5, 0.1, dist) * 0.5;

          float alpha = (star + glow) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.confetti = new THREE.Points(geometry, material);
    this.cakeGroup.add(this.confetti);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x303060, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(3, 8, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.25);
    fillLight.position.set(-4, 4, -4);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaadd, 0.15);
    rimLight.position.set(0, -3, 4);
    this.scene.add(rimLight);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomEffect = new BloomEffect({
      intensity: 1.8,
      luminanceThreshold: 0.3,
      luminanceSmoothing: 0.8,
      mipmapBlur: true,
    });

    const vignetteEffect = new VignetteEffect({
      darkness: 0.6,
      offset: 0.25,
    });

    const effectPass = new EffectPass(this.camera, bloomEffect, vignetteEffect);
    this.composer.addPass(effectPass);
  }

  bindEvents() {
    window.addEventListener('resize', this.onResize.bind(this));

    this.container.addEventListener('mousedown', this.onPointerDown.bind(this));
    this.container.addEventListener('mousemove', this.onPointerMove.bind(this));
    this.container.addEventListener('mouseup', this.onPointerUp.bind(this));
    this.container.addEventListener('mouseleave', this.onPointerUp.bind(this));

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    this.container.addEventListener('touchend', this.onPointerUp.bind(this));

    this.container.addEventListener('click', this.onClick.bind(this));
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const aspect = this.width / this.height;
    this.camera.fov = aspect < 1 ? 55 : 40;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
  }

  onPointerDown(e) {
    this.isDragging = true;
    this.previousMouse.set(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    if (!this.isDragging) {
      this.mouse.x = (e.clientX / this.width - 0.5) * 2;
      this.mouse.y = (e.clientY / this.height - 0.5) * 2;
      return;
    }

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.targetRotation.x += deltaX * 0.005;
    this.targetRotation.y = Math.max(-0.4, Math.min(0.4, this.targetRotation.y + deltaY * 0.003));

    this.previousMouse.set(e.clientX, e.clientY);
  }

  onPointerUp() {
    this.isDragging = false;
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  onTouchMove(e) {
    if (!this.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.previousMouse.x;
    const deltaY = touch.clientY - this.previousMouse.y;

    this.targetRotation.x += deltaX * 0.005;
    this.targetRotation.y = Math.max(-0.4, Math.min(0.4, this.targetRotation.y + deltaY * 0.003));

    this.previousMouse.set(touch.clientX, touch.clientY);
  }

  onClick(e) {
    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const flameObjects = [this.flame, this.flame2, this.flameGlow, this.outerGlow];
    const intersects = raycaster.intersectObjects(flameObjects);

    if (intersects.length > 0) {
      this.candleLit = !this.candleLit;
    }
  }

  updateEntryAnimation(delta) {
    if (!this.isAnimatingIn) return;

    this.animationProgress += delta * 0.4;

    if (this.animationProgress < 1) {
      const ease = 1 - Math.pow(1 - this.animationProgress, 3);
      this.cakeGroup.position.y = -2.5 + ease * 2.5;
      this.cakeGroup.scale.setScalar(0.3 + ease * 0.7);
    } else if (this.animationProgress < 2) {
      const t = this.animationProgress - 1;
      this.flameIntensity = Math.min(1, t * 1.5);
    } else {
      this.isAnimatingIn = false;
      this.flameIntensity = 1;
    }
  }

  updateFlame(time) {
    const targetIntensity = this.candleLit ? 1 : 0;
    this.flameIntensity += (targetIntensity - this.flameIntensity) * 0.06;

    this.flame.material.uniforms.uTime.value = time;
    this.flame.material.uniforms.uIntensity.value = this.flameIntensity;
    this.flame2.material.uniforms.uTime.value = time;
    this.flame2.material.uniforms.uIntensity.value = this.flameIntensity;

    const flicker = 0.85 + Math.sin(time * 10) * 0.15;
    this.flameLight.intensity = this.flameIntensity * 1.8 * flicker;
    this.flameGlow.material.opacity = this.flameIntensity * 0.5 * flicker;
    this.outerGlow.material.opacity = this.flameIntensity * 0.2 * flicker;

    const scale = 0.92 + Math.sin(time * 9) * 0.08;
    this.flame.scale.set(scale, 1 + (1 - scale) * 0.4, 1);
    this.flame2.scale.set(scale, 1 + (1 - scale) * 0.4, 1);

    this.starRays.children.forEach(ray => {
      ray.material.uniforms.uIntensity.value = this.flameIntensity * flicker;
    });
  }

  updateBreathing(time) {
    this.breathPhase = time * 0.5;
    const breath = 0.92 + Math.sin(this.breathPhase) * 0.08;

    this.starParticles.material.uniforms.uBreath.value = breath;
    this.confetti.material.uniforms.uBreath.value = breath;
  }

  updateIcing(time) {
    if (!this.icingGroup) return;

    this.icingGroup.children.forEach((item) => {
      if (item.userData.phase !== undefined) {
        const pulse = 0.5 + Math.sin(time * 2 + item.userData.phase) * 0.2;
        item.material.emissiveIntensity = item.userData.baseEmissive ? item.userData.baseEmissive * pulse : 0.5 * pulse;
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateEntryAnimation(delta);

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.04;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.04;

    if (!this.isDragging) {
      this.targetRotation.x += 0.0008;
    }

    this.cakeGroup.rotation.y = this.currentRotation.x;
    this.camera.position.y = 1 + this.currentRotation.y * 1.5;
    this.camera.lookAt(0, 0.3, 0);

    this.glassSphere.material.uniforms.uTime.value = time;
    this.cake.material.uniforms.uTime.value = time;
    this.starParticles.material.uniforms.uTime.value = time;
    this.confetti.material.uniforms.uTime.value = time;

    this.updateFlame(time);
    this.updateBreathing(time);
    this.updateIcing(time);

    this.composer.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BirthdayCakeScene();
});

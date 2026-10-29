import * as THREE from 'three';
import { EffectComposer } from 'postprocessing';
import { RenderPass, EffectPass, BloomEffect, VignetteEffect } from 'postprocessing';

const COLORS = {
  cyan: new THREE.Color('#74ebff'),
  pink: new THREE.Color('#f886ce'),
  gold: new THREE.Color('#ffe578'),
  purple: new THREE.Color('#a58cf4'),
  white: new THREE.Color('#fffaf3'),
  red: new THREE.Color('#f74261'),
  teal: new THREE.Color('#62e0cf'),
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
    const fov = aspect < 1 ? 65 : 45;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  createScene() {
    this.cakeGroup = new THREE.Group();
    this.scene.add(this.cakeGroup);

    this.createStarfield();
    this.createNebula();
    this.createCake();
    this.createPlate();
    this.createCandle();
    this.createFlame();
    this.createGlassDome();
    this.createConfetti();
    this.createAmbientParticles();
    this.setupLights();
  }

  createStarfield() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 50 + Math.random() * 100;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = Math.random() * 3 + 1;
      phases[i] = Math.random();

      const color = colorArray[Math.floor(Math.random() * colorArray.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vPhase;
        uniform float uTime;
        void main() {
          vColor = aColor;
          vPhase = aPhase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aPhase * 6.28);
          gl_PointSize = aSize * twinkle * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPhase;
        uniform float uTime;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float twinkle = 0.7 + 0.3 * sin(uTime * 3.0 + vPhase * 6.28);
          float alpha = smoothstep(0.5, 0.0, dist) * twinkle;
          float glow = smoothstep(0.5, 0.1, dist);
          vec3 color = vColor + vec3(0.3) * glow;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  createNebula() {
    const geometry = new THREE.PlaneGeometry(80, 80);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
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
        varying vec2 vUv;

        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float fbm(vec2 p) {
          float f = 0.0;
          f += 0.5000 * noise(p); p *= 2.02;
          f += 0.2500 * noise(p); p *= 2.03;
          f += 0.1250 * noise(p); p *= 2.01;
          f += 0.0625 * noise(p);
          return f / 0.9375;
        }

        void main() {
          vec2 uv = vUv;
          float n1 = fbm(uv * 3.0 + uTime * 0.02);
          float n2 = fbm(uv * 5.0 - uTime * 0.015);

          vec3 color1 = vec3(0.2, 0.3, 0.8);
          vec3 color2 = vec3(0.5, 0.2, 0.6);
          vec3 color = mix(color1, color2, n1);

          float alpha = (n1 * n2) * 0.15;
          alpha *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const nebula = new THREE.Mesh(geometry, material);
    nebula.position.z = -30;
    nebula.position.y = 10;
    this.nebula = nebula;
    this.scene.add(nebula);
  }

  createCake() {
    const cakeGeometry = new THREE.CylinderGeometry(1.8, 2, 1.5, 64);

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

        void main() {
          vec3 baseColor = vec3(0.04, 0.08, 0.18);

          float starNoise = fract(sin(dot(vUv * 50.0, vec2(127.1, 311.7))) * 43758.5453);
          vec3 starColor = vec3(0.8, 0.85, 1.0) * step(0.97, starNoise);

          vec3 nebula1 = vec3(0.2, 0.4, 0.9) * smoothstep(0.3, 0.7, sin(vUv.x * 6.0 + vUv.y * 3.0));
          vec3 nebula2 = vec3(0.5, 0.2, 0.7) * smoothstep(0.4, 0.8, cos(vUv.x * 4.0 - vUv.y * 5.0));

          vec3 color = baseColor + starColor * 0.3 + (nebula1 + nebula2) * 0.15;

          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          color += vec3(0.3, 0.5, 0.8) * fresnel * 0.3;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.cake = new THREE.Mesh(cakeGeometry, cakeMaterial);
    this.cake.position.y = -0.25;
    this.cakeGroup.add(this.cake);

    this.createIcing();
    this.createCakeText();
  }

  createIcing() {
    const icingGroup = new THREE.Group();
    const segments = 32;
    const radius = 1.85;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const dripLength = 0.3 + Math.random() * 0.5;
      const dripWidth = 0.08 + Math.random() * 0.06;

      const dripGeometry = new THREE.CylinderGeometry(dripWidth * 0.3, dripWidth, dripLength, 8);
      const hue = (i / segments + this.clock.getElapsedTime() * 0.1) % 1;
      const color = new THREE.Color().setHSL(hue * 0.6 + 0.5, 0.9, 0.6);

      const dripMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.4,
      });

      const drip = new THREE.Mesh(dripGeometry, dripMaterial);
      drip.position.set(x, 0.5 - dripLength / 2, z);
      drip.userData.baseY = drip.position.y;
      drip.userData.phase = Math.random() * Math.PI * 2;
      drip.userData.hueOffset = i / segments;
      icingGroup.add(drip);
    }

    this.icingDrips = icingGroup;
    this.cakeGroup.add(icingGroup);
  }

  createCakeText() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(238, 233, 220, 0.9)';
    ctx.font = '600 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('happy birthday', 256, 50);
    ctx.font = '300 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(238, 233, 220, 0.5)';
    ctx.letterSpacing = '4px';
    ctx.fillText('MAKE A WISH', 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const textGeometry = new THREE.PlaneGeometry(1.5, 0.4);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, -0.3, 1.9);
    textMesh.rotation.y = Math.PI * 0.03;
    this.cakeGroup.add(textMesh);
  }

  createPlate() {
    const plateGeometry = new THREE.CylinderGeometry(2.8, 2.6, 0.15, 64);
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.3,
      envMapIntensity: 0.5,
    });

    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = -1.1;
    this.cakeGroup.add(plate);

    const rimGeometry = new THREE.TorusGeometry(2.7, 0.08, 16, 64);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xc1cdfa,
      metalness: 0.3,
      roughness: 0.2,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.02;
    this.cakeGroup.add(rim);

    const shadowGeometry = new THREE.CircleGeometry(2.5, 64);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1945d1,
      transparent: true,
      opacity: 0.3,
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.2;
    this.cakeGroup.add(shadow);
  }

  createCandle() {
    const candleGeometry = new THREE.CylinderGeometry(0.06, 0.07, 1.2, 16);
    const candleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe9a5,
      emissive: 0xffe9a5,
      emissiveIntensity: 0.2,
      metalness: 0.1,
      roughness: 0.6,
    });

    this.candle = new THREE.Mesh(candleGeometry, candleMaterial);
    this.candle.position.y = 1.1;
    this.cakeGroup.add(this.candle);

    const wickGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8);
    const wickMaterial = new THREE.MeshBasicMaterial({ color: 0x302a26 });
    const wick = new THREE.Mesh(wickGeometry, wickMaterial);
    wick.position.y = 1.75;
    this.cakeGroup.add(wick);

    this.createWaxDrips();
  }

  createWaxDrips() {
    const waxGroup = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const dripGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      dripGeometry.scale(1, 2, 1);

      const dripMaterial = new THREE.MeshStandardMaterial({
        color: 0xfff3bb,
        emissive: 0xfff3bb,
        emissiveIntensity: 0.1,
        metalness: 0.1,
        roughness: 0.7,
      });

      const drip = new THREE.Mesh(dripGeometry, dripMaterial);
      drip.position.set(
        Math.cos(angle) * 0.07,
        0.8 + Math.random() * 0.3,
        Math.sin(angle) * 0.07
      );
      drip.userData.baseY = drip.position.y;
      drip.userData.speed = 0.1 + Math.random() * 0.2;
      waxGroup.add(drip);
    }

    this.waxDrips = waxGroup;
    this.cakeGroup.add(waxGroup);
  }

  createFlame() {
    const flameGeometry = new THREE.PlaneGeometry(0.3, 0.5, 1, 8);

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

        float fbm(vec2 p) {
          float f = 0.0;
          f += 0.5000 * noise(p); p *= 2.02;
          f += 0.2500 * noise(p); p *= 2.03;
          f += 0.1250 * noise(p);
          return f / 0.875;
        }

        void main() {
          vec2 uv = vUv;

          float distort = fbm(vec2(uv.x * 3.0, uv.y * 2.0 - uTime * 3.0)) * 0.25;
          uv.x += distort * (1.0 - uv.y);

          float flame = 1.0 - smoothstep(0.0, 0.5, abs(uv.x - 0.5) * 2.0);
          flame *= smoothstep(0.0, 0.25, uv.y);
          flame *= 1.0 - smoothstep(0.6, 1.0, uv.y);

          float flicker = 0.85 + 0.15 * sin(uTime * 10.0 + fbm(uv * 5.0) * 8.0);
          flame *= flicker * uIntensity;

          vec3 innerColor = vec3(1.0, 1.0, 0.98);
          vec3 midColor = vec3(1.0, 0.92, 0.5);
          vec3 outerColor = vec3(1.0, 0.6, 0.15);

          vec3 color = mix(outerColor, midColor, smoothstep(0.0, 0.5, flame));
          color = mix(color, innerColor, smoothstep(0.6, 1.0, flame));

          float alpha = flame * uIntensity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.flame = new THREE.Mesh(flameGeometry, flameMaterial);
    this.flame.position.y = 2.05;
    this.cakeGroup.add(this.flame);

    const flame2 = this.flame.clone();
    flame2.rotation.y = Math.PI / 2;
    flame2.material = flameMaterial.clone();
    this.flame2 = flame2;
    this.cakeGroup.add(flame2);

    this.flameLight = new THREE.PointLight(0xffcc48, 0, 5);
    this.flameLight.position.y = 2;
    this.cakeGroup.add(this.flameLight);

    const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff6b8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.flameGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.flameGlow.position.y = 2;
    this.cakeGroup.add(this.flameGlow);
  }

  createGlassDome() {
    const domeGeometry = new THREE.SphereGeometry(3.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);

    const domeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);

          vec3 color1 = vec3(0.47, 0.6, 0.76);
          vec3 color2 = vec3(1.0, 0.8, 0.53);
          vec3 color3 = vec3(0.84, 0.87, 1.0);

          float gradient = vUv.y;
          vec3 color = mix(color1, color2, smoothstep(0.0, 0.3, gradient));
          color = mix(color, color3, smoothstep(0.5, 1.0, gradient));

          float alpha = fresnel * 0.15;
          alpha += smoothstep(0.8, 1.0, fresnel) * 0.3;

          float highlight = smoothstep(0.7, 1.0, dot(vNormal, normalize(vec3(0.5, 1.0, 0.5))));
          color += vec3(1.0, 0.95, 0.8) * highlight * 0.5;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = -1;
    this.dome = dome;
    this.cakeGroup.add(dome);
  }

  createConfetti() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      const y = Math.random() * 4 - 1;

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      const color = colorArray[Math.floor(Math.random() * colorArray.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 8 + 4;
      phases[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vColor = aColor;
          vec3 pos = position;
          pos.y += sin(uTime * 0.5 + aPhase * 6.28) * 0.1;
          pos.x += sin(uTime * 0.3 + aPhase * 3.14) * 0.05;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aPhase * 6.28);
          vAlpha = twinkle;
          gl_PointSize = aSize * twinkle * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
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

  createAmbientParticles() {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 2 + 0.5;
      phases[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.2 + aPhase * 6.28) * 2.0;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + aPhase * 6.28);
          vAlpha = twinkle * 0.4;
          gl_PointSize = aSize * twinkle * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff80ff, 0.2);
    rimLight.position.set(0, -5, 5);
    this.scene.add(rimLight);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomEffect = new BloomEffect({
      intensity: 1.5,
      luminanceThreshold: 0.4,
      luminanceSmoothing: 0.7,
      mipmapBlur: true,
    });

    const vignetteEffect = new VignetteEffect({
      darkness: 0.5,
      offset: 0.3,
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
    this.camera.fov = aspect < 1 ? 65 : 45;
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
    this.targetRotation.y = Math.max(-0.5, Math.min(0.5, this.targetRotation.y + deltaY * 0.005));

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
    this.targetRotation.y = Math.max(-0.5, Math.min(0.5, this.targetRotation.y + deltaY * 0.005));

    this.previousMouse.set(touch.clientX, touch.clientY);
  }

  onClick(e) {
    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const intersects = raycaster.intersectObject(this.flame);
    if (intersects.length > 0) {
      this.candleLit = !this.candleLit;
    }
  }

  updateEntryAnimation(delta) {
    if (!this.isAnimatingIn) return;

    this.animationProgress += delta * 0.3;

    if (this.animationProgress < 1) {
      this.cakeGroup.position.y = -3 + this.animationProgress * 3;
      this.cakeGroup.scale.setScalar(this.animationProgress);
    } else if (this.animationProgress < 2) {
      const t = this.animationProgress - 1;
      this.flameIntensity = Math.min(1, t * 2);
    } else {
      this.isAnimatingIn = false;
      this.flameIntensity = 1;
    }
  }

  updateFlame(time) {
    const targetIntensity = this.candleLit ? 1 : 0;
    this.flameIntensity += (targetIntensity - this.flameIntensity) * 0.05;

    this.flame.material.uniforms.uTime.value = time;
    this.flame.material.uniforms.uIntensity.value = this.flameIntensity;
    this.flame2.material.uniforms.uTime.value = time;
    this.flame2.material.uniforms.uIntensity.value = this.flameIntensity;

    this.flameLight.intensity = this.flameIntensity * 2 * (0.8 + Math.sin(time * 10) * 0.2);
    this.flameGlow.material.opacity = this.flameIntensity * 0.4 * (0.8 + Math.sin(time * 8) * 0.2);

    const scale = 0.95 + Math.sin(time * 8) * 0.05;
    this.flame.scale.set(scale, 1 + (1 - scale) * 0.5, 1);
    this.flame2.scale.set(scale, 1 + (1 - scale) * 0.5, 1);
  }

  updateIcing(time) {
    if (!this.icingDrips) return;

    this.icingDrips.children.forEach((drip, i) => {
      const hue = (drip.userData.hueOffset + time * 0.05) % 1;
      drip.material.color.setHSL(hue * 0.6 + 0.5, 0.9, 0.6);
      drip.material.emissive.setHSL(hue * 0.6 + 0.5, 0.9, 0.6);

      drip.position.y = drip.userData.baseY + Math.sin(time * 0.5 + drip.userData.phase) * 0.02;
    });
  }

  updateWaxDrips(time) {
    if (!this.waxDrips) return;

    this.waxDrips.children.forEach(drip => {
      drip.position.y -= drip.userData.speed * 0.001;
      if (drip.position.y < 0.5) {
        drip.position.y = drip.userData.baseY;
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateEntryAnimation(delta);

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.05;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.05;

    if (!this.isDragging) {
      this.targetRotation.x += 0.001;
    }

    this.cakeGroup.rotation.y = this.currentRotation.x;
    this.camera.position.y = 2 + this.currentRotation.y * 2;
    this.camera.lookAt(0, 0, 0);

    this.stars.material.uniforms.uTime.value = time;
    this.nebula.material.uniforms.uTime.value = time;
    this.confetti.material.uniforms.uTime.value = time;
    this.ambientParticles.material.uniforms.uTime.value = time;
    this.dome.material.uniforms.uTime.value = time;
    this.cake.material.uniforms.uTime.value = time;

    this.updateFlame(time);
    this.updateIcing(time);
    this.updateWaxDrips(time);

    this.stars.rotation.y += 0.0001;

    this.composer.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BirthdayCakeScene();
});

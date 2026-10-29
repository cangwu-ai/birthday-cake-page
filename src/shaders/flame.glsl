// Flame vertex shader
varying vec2 vUv;
varying float vHeight;

void main() {
  vUv = uv;
  vHeight = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- FRAGMENT ---
// Flame fragment shader
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
varying float vHeight;

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

  float distort = fbm(vec2(uv.x * 3.0, uv.y * 2.0 - uTime * 2.5)) * 0.3;
  uv.x += distort * (1.0 - uv.y);

  float flame = 1.0 - smoothstep(0.0, 0.6, abs(uv.x - 0.5) * 2.0);
  flame *= smoothstep(0.0, 0.3, uv.y);
  flame *= 1.0 - smoothstep(0.5, 1.0, uv.y);

  float flicker = 0.85 + 0.15 * sin(uTime * 8.0 + fbm(uv * 5.0) * 10.0);
  flame *= flicker * uIntensity;

  vec3 innerColor = vec3(1.0, 1.0, 0.95);
  vec3 midColor = vec3(1.0, 0.9, 0.4);
  vec3 outerColor = vec3(1.0, 0.5, 0.1);

  vec3 color = mix(outerColor, midColor, smoothstep(0.0, 0.5, flame));
  color = mix(color, innerColor, smoothstep(0.5, 1.0, flame));

  float alpha = flame * uIntensity;
  gl_FragColor = vec4(color, alpha);
}

// Stars vertex shader
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

// --- FRAGMENT ---
// Stars fragment shader
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

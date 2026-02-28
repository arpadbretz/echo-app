"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, createPortal } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";

// --- GLSL SHADERS ---

const simulationVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const simulationFragmentShader = `
uniform sampler2D positions;
uniform sampler2D origins;
uniform float uTime;
uniform float uScroll;
uniform vec3 uMouse;

varying vec2 vUv;

// SNOISE
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - 0.5;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 snoiseVec3( vec3 x ){
  float s  = snoise(vec3( x ));
  float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
  float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
  return vec3( s , s1 , s2 );
}

vec3 curlNoise( vec3 p ){
  const float e = .1;
  vec3 dx = vec3( e   , 0.0 , 0.0 );
  vec3 dy = vec3( 0.0 , e   , 0.0 );
  vec3 dz = vec3( 0.0 , 0.0 , e   );

  vec3 p_x0 = snoiseVec3( p - dx );
  vec3 p_x1 = snoiseVec3( p + dx );
  vec3 p_y0 = snoiseVec3( p - dy );
  vec3 p_y1 = snoiseVec3( p + dy );
  vec3 p_z0 = snoiseVec3( p - dz );
  vec3 p_z1 = snoiseVec3( p + dz );

  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

  const float divisor = 1.0 / ( 2.0 * e );
  return normalize( vec3( x , y , z ) * divisor );
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 getNebula(vec2 uv) {
  // A sprawling, volumetric cosmos.
  float theta = hash(uv) * 6.2831853;
  
  // Stretch way into the background and directly into the camera lens
  float z = (hash(uv + vec2(1.0)) - 0.5) * 60.0; 
  
  // Radius expands drastically depending on depth and random factors
  float r = (hash(uv + vec2(2.0)) + 0.1) * 15.0; 
  
  if (hash(uv + vec2(3.0)) > 0.8) {
      r *= 4.0; // Distant floating space dust
  } else {
      r *= pow(hash(uv + vec2(4.0)), 2.0); // Dense, clustered galactic core
  }
  
  // Gentle spiral twist
  float x = r * cos(theta + z * 0.05);
  float y = r * sin(theta + z * 0.05);
  
  return vec3(x, y, z);
}

vec3 getCosmicWeb(vec2 uv) {
  // Act 2: Massive branching filaments (Dark matter grid / web)
  float id = hash(uv);
  
  // Create a massive cavernous tunnel effect
  float theta = hash(uv + 1.0) * 6.2831853;
  float radius = 10.0 + (hash(uv + 2.0) * 20.0); // Very wide
  
  // Add heavy turbulence mapping to create the "webbing" filaments
  float turb = sin(theta * 5.0) * cos(id * 10.0);
  radius += turb * 8.0;
  
  float x = radius * cos(theta);
  float y = radius * sin(theta);
  
  // Stretch incredibly deep into the Z axis
  float z = (hash(uv + 3.0) - 0.5) * 100.0;
  
  return vec3(x, y, z);
}

vec3 getPulsar(vec2 uv) {
  // Act 3: A violently spinning neutron star with massive polar jets
  float id = hash(uv);
  float isJet = step(0.85, hash(uv + 1.0)); // 15% of particles belong to the jets
  
  if (isJet > 0.5) {
      // The massive energy beams shooting out of the poles
      float angle = hash(uv + 2.0) * 6.2831853;
      float r = hash(uv + 3.0) * 1.5; // Narrow beam
      
      float x = r * cos(angle);
      float z = r * sin(angle);
      
      // Shoot incredibly far up and down the Y axis
      float yDir = sign(hash(uv + 4.0) - 0.5);
      float y = yDir * (hash(uv + 5.0) * 40.0 + 5.0); 
      
      return vec3(x, y, z);
  } else {
      // The ultra-dense, rapidly spinning core
      float theta = hash(uv + 6.0) * 6.2831853;
      float phi = acos((hash(uv + 7.0) * 2.0) - 1.0);
      float r = 2.0 + (hash(uv + 8.0) * 0.2); // Very tight sphere
      
      // Squish it slightly because of high rotation speed
      return vec3(r * 1.2 * sin(phi) * cos(theta), r * 0.8 * cos(phi), r * 1.2 * sin(phi) * sin(theta));
  }
}

vec3 getBlackHole(vec2 uv) {
  // A monumental event horizon / accretion disk
  float t = hash(uv) * 6.2831853; // Angle
  float rBase = 12.0 + (hash(uv + 1.0) * 15.0); // Wide flat disk
  
  // Create the deep void in the center
  float eventHorizon = 5.0;
  if (rBase < eventHorizon) {
      rBase += eventHorizon; // push matter out of the black hole center
  }

  // Squashed Y axis to make it a disk
  float yNoise = (hash(uv + 2.0) - 0.5) * 2.0; 
  // Funnel effect near the event horizon
  float funnel = smoothstep(eventHorizon + 4.0, eventHorizon, rBase) * 8.0;

  float x = rBase * cos(t);
  float z = rBase * sin(t);
  float y = yNoise - funnel;

  return vec3(x, y, z);
}

vec3 getSingularity(vec2 uv) {
  // A terrifyingly dense, high-energy spherical core
  float theta = hash(uv) * 6.2831853;
  float phi = acos((hash(uv + vec2(1.0)) * 2.0) - 1.0);
  
  // Wider, more intricate core to prevent blinding bloom overlap
  float r = 5.0 + sin(theta * 8.0) * 1.5;
  if(hash(uv + 4.0) > 0.95) {
      r += hash(uv + 5.0) * 8.0; // Majestic solar flares
  } else {
      r += hash(uv + 6.0) * 2.0; // Boiling plasma surface
  }

  return vec3(r * sin(phi) * cos(theta), r * sin(phi) * sin(theta), r * cos(phi));
}

void main() {
  vec3 currentPos = texture2D(positions, vUv).xyz;
  vec3 originPos = texture2D(origins, vUv).xyz; // Saved original pos for elasticity
  
  float scroll = clamp(uScroll, 0.0, 1.0);
  
  vec3 shape1 = getNebula(vUv);      // 0.0 - 0.2
  vec3 shape2 = getCosmicWeb(vUv);   // 0.2 - 0.4
  vec3 shape3 = getPulsar(vUv);      // 0.4 - 0.6
  vec3 shape4 = getBlackHole(vUv);   // 0.6 - 0.8
  vec3 shape5 = getSingularity(vUv); // 0.8 - 1.0
  
  vec3 fluidVel = curlNoise(currentPos * 0.2 + uTime * 0.15) * 4.5;
  
  vec3 finalTarget = shape1;
  float attractionForce = 0.08;
  float fluidAmount = 0.0;

  // 5-Act Cinematic Journey Transitions
  if (scroll < 0.1) {
      finalTarget = shape1;
      attractionForce = 0.06;
      fluidAmount = 0.05;
  } else if (scroll < 0.25) {
      // Transition 1 to 2
      float inf = smoothstep(0.1, 0.25, scroll);
      finalTarget = mix(shape1, shape2, inf);
      float burst = sin(inf * 3.14159);
      fluidAmount = mix(0.05, 1.0, burst);
      attractionForce = mix(0.06, 0.02, burst);
  } else if (scroll < 0.35) {
      // Shape 2 solid
      finalTarget = shape2;
      attractionForce = 0.04;
      fluidAmount = 0.1; 
  } else if (scroll < 0.5) {
      // Transition 2 to 3
      float inf = smoothstep(0.35, 0.5, scroll);
      finalTarget = mix(shape2, shape3, inf);
      float burst = sin(inf * 3.14159);
      fluidAmount = mix(0.1, 2.0, burst); // violent shift
      attractionForce = mix(0.04, 0.05, inf);
  } else if (scroll < 0.6) {
      // Shape 3 solid
      finalTarget = shape3;
      attractionForce = 0.15; // Pulled tight
      fluidAmount = 0.2;
      // Add intense spin for the pulsar
      vec3 tangent = normalize(cross(currentPos, vec3(0.0, 1.0, 0.0)));
      fluidVel += tangent * 15.0; 
  } else if (scroll < 0.75) {
      // Transition 3 to 4
      float inf = smoothstep(0.6, 0.75, scroll);
      finalTarget = mix(shape3, shape4, inf);
      fluidAmount = mix(0.2, 0.3, inf);
      attractionForce = mix(0.15, 0.04, inf);
  } else if (scroll < 0.85) {
      // Shape 4 solid
      finalTarget = shape4;
      attractionForce = 0.04;
      fluidAmount = 0.3;
      // Ambient spin for accretion disk
      vec3 tangent = normalize(cross(currentPos, vec3(0.0, 1.0, 0.0)));
      fluidVel += tangent * 5.0; 
  } else if (scroll < 0.95) {
      // Transition 4 to 5
      float inf = smoothstep(0.85, 0.95, scroll);
      finalTarget = mix(shape4, shape5, inf);
      float morphFlow = sin(inf * 3.14159);
      fluidAmount = mix(0.3, 0.8, morphFlow);
      attractionForce = mix(0.04, 0.09, inf);
  } else {
      // Shape 5 solid
      finalTarget = shape5;
      attractionForce = 0.12; 
      fluidAmount = 0.05; 
  }

  // Cinematic Mouse Interaction: Massive Gravity Spatial Distortion
  vec3 dir = currentPos - uMouse;
  float dist = length(dir);
  vec3 mouseForce = vec3(0.0);
  
  // Enormous gravity well effect (15 unit radius)
  if (dist < 15.0 && scroll > 0.02 && scroll < 0.98) {
      // 1. Extreme Pull: Yank particles intensely toward the cursor in X/Y
      // 2. Tear Depth: Push the pulled particles extremely far forward in Z to create a 3D bubble/dome
      
      float force = pow((15.0 - dist) / 15.0, 2.5); // Sharp, intense exponential curve
      
      // Pull XY in towards cursor center
      vec2 pullXY = -normalize(dir.xy) * force * 2.5;
      
      // Push Z out violently towards the camera to create a 3D distortion dome
      float pushZ = force * 6.0;
      
      // Fast, chaotic swirl around the edge of the crater
      vec3 tangent = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
      
      mouseForce += vec3(pullXY, pushZ);
      mouseForce += tangent * force * 3.0; // Fast vortex spin
  }

  // Velocity Calculation
  vec3 velocity = (finalTarget - currentPos) * attractionForce;
  velocity += fluidVel * fluidAmount * 0.04;
  velocity += mouseForce * 0.05;

  // Add subtle breathing to the system
  velocity += currentPos * sin(uTime * 2.0 + hash(vUv)*6.28) * 0.001;

  vec3 nextPos = currentPos + velocity;
  gl_FragColor = vec4(nextPos, 1.0);
}
`;

const renderVertexShader = `
uniform sampler2D positions;
uniform float uTime;
uniform float uScroll;

varying vec3 vColor;
varying float vDepth;
varying float vAlpha;

void main() {
  vec3 pos = texture2D(positions, position.xy).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // Extreme cinematic Depth of Field hack
  float depth = -mvPosition.z;
  vDepth = depth;
  
  // Prevent division by tiny numbers when passing directly through the camera
  float safeDepth = max(depth, 1.0);
  gl_PointSize = (60.0 / safeDepth); // Much larger scale for upfront particles
  
  // Occasional massive particles (the "Bokeh" specs)
  float h1 = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453);
  if(h1 > 0.98) {
      gl_PointSize *= mix(3.0, 9.0, fract(h1 * 123.456)); // Huge variety
  }

  gl_Position = projectionMatrix * mvPosition;
  
  // Dynamic color palette that evolves with scroll
  // 5-Act Color Palette evolution
  // ACT 1: Nebula (Teals, deep blues, soft starlight)
  vec3 colAct1A = vec3(0.0, 0.4, 0.8);
  vec3 colAct1B = vec3(0.1, 0.8, 1.0);
  vec3 colAct1C = vec3(0.9, 0.95, 1.0);

  // ACT 2: Cosmic Web (Emerald, Mint, and Deep Forest)
  vec3 colAct2A = vec3(0.0, 0.2, 0.1);
  vec3 colAct2B = vec3(0.0, 0.8, 0.4);
  vec3 colAct2C = vec3(0.5, 1.0, 0.8);

  // ACT 3: Pulsar Jet (Electric Blue, Shocking White, and Sapphire)
  vec3 colAct3A = vec3(0.0, 0.1, 0.6);
  vec3 colAct3B = vec3(0.2, 0.5, 1.0);
  vec3 colAct3C = vec3(1.0, 1.0, 1.0);

  // ACT 4: Black Hole / Gargantua (Intense cinematic orange, amber, and void/obsidian)
  vec3 colAct4A = vec3(0.05, 0.0, 0.1); 
  vec3 colAct4B = vec3(1.0, 0.3, 0.0);  
  vec3 colAct4C = vec3(1.0, 0.7, 0.2);  

  // ACT 5: Singularity Evolution (Bioluminescent Indigo, Plum, and soft Cyan)
  vec3 colAct5A = vec3(0.2, 0.0, 0.5);  
  vec3 colAct5B = vec3(0.6, 0.1, 0.8);  
  vec3 colAct5C = vec3(0.0, 1.0, 0.8);  

  float h = fract(pos.y * 0.01 + pos.x * 0.01 + uTime * 0.1 + h1);
  vec3 col1, col2, col3;

  if (uScroll < 0.2) {
      col1 = colAct1A; col2 = colAct1B; col3 = colAct1C;
  } else if (uScroll < 0.4) {
      float t = smoothstep(0.2, 0.4, uScroll);
      col1 = mix(colAct1A, colAct2A, t);
      col2 = mix(colAct1B, colAct2B, t);
      col3 = mix(colAct1C, colAct2C, t);
  } else if (uScroll < 0.6) {
      float t = smoothstep(0.4, 0.6, uScroll);
      col1 = mix(colAct2A, colAct3A, t);
      col2 = mix(colAct2B, colAct3B, t);
      col3 = mix(colAct2C, colAct3C, t);
  } else if (uScroll < 0.8) {
      float t = smoothstep(0.6, 0.8, uScroll);
      col1 = mix(colAct3A, colAct4A, t);
      col2 = mix(colAct3B, colAct4B, t);
      col3 = mix(colAct3C, colAct4C, t);
  } else {
      float t = smoothstep(0.8, 1.0, uScroll);
      col1 = mix(colAct4A, colAct5A, t);
      col2 = mix(colAct4B, colAct5B, t);
      col3 = mix(colAct4C, colAct5C, t * 0.7); // Soften final act peak brightness
  }

  if (h < 0.33) {
      vColor = mix(col1, col2, h * 3.0);
  } else if (h < 0.66) {
      vColor = mix(col2, col3, (h - 0.33) * 3.0);
  } else {
      vColor = mix(col3, col1, (h - 0.66) * 3.0);
  }
  
  // Blink effect on some particles
  vAlpha = 0.5 + 0.5 * sin(uTime * 3.0 + h1 * 100.0);
}
`;

const renderFragmentShader = `
varying vec3 vColor;
varying float vDepth;
varying float vAlpha;

void main() {
  vec2 coords = gl_PointCoord - vec2(0.5);
  float dist = length(coords);
  if (dist > 0.5) discard;
  
  // Custom painted bokeh dot (soft edge, bright core)
  float alpha = smoothstep(0.5, 0.1, dist);
  float core = smoothstep(0.15, 0.0, dist);
  
  vec3 coreColor = vec3(1.0); 
  vec3 finalColor = mix(vColor, coreColor, core * 0.9);
  
  // DoF fade out
  float depthFading = smoothstep(60.0, 15.0, vDepth);
  
  // Additive intense blending needs high base alpha multiplier
  gl_FragColor = vec4(finalColor, alpha * vAlpha * depthFading * 0.8);
}
`;

export function Particles({ scrollTracker }: { scrollTracker: React.MutableRefObject<{ progress: number }> }) {
  // 350x350 texture === 122,500 particles! (Optimized for perfectly smooth 60fps)
  const size = 350;

  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1));
  const [originsTexture] = useState(() => {
    const data = new Float32Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      // we could store original deterministic seed here if we want perfectly elastic resets
      data[i * 4] = 0; data[i * 4 + 1] = 0; data[i * 4 + 2] = 0; data[i * 4 + 3] = 1;
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return tex;
  });

  const positions = useMemo(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]), []);
  const uvs = useMemo(() => new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), []);

  const renderTargetA = useFBO(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType });
  const renderTargetB = useFBO(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType });

  const targetRef = useRef(renderTargetA);

  const simMaterial = useMemo(() => new THREE.ShaderMaterial({ vertexShader: simulationVertexShader, fragmentShader: simulationFragmentShader, uniforms: { positions: { value: null }, origins: { value: originsTexture }, uTime: { value: 0 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector3(999, 999, 999) } } }), [originsTexture]);
  const renderMaterial = useMemo(() => new THREE.ShaderMaterial({ vertexShader: renderVertexShader, fragmentShader: renderFragmentShader, uniforms: { positions: { value: null }, uTime: { value: 0 }, uScroll: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);

  const particlesGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(size * size * 3);
    const randomArray = new Float32Array(size * size);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 3;
        posArray[index] = (i / size);
        posArray[index + 1] = (j / size);
        posArray[index + 2] = 0;
        randomArray[i * size + j] = Math.random();
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomArray, 1));
    return geometry;
  }, [size]);

  const pointer = useRef(new THREE.Vector3(999, 999, 999));
  const vec = useRef(new THREE.Vector3());

  // Mouse entering/leaving tracking
  useEffect(() => {
    const resetMouse = () => pointer.current.set(999, 999, 999);
    window.addEventListener('mouseout', resetMouse);
    return () => window.removeEventListener('mouseout', resetMouse);
  }, []);

  useFrame((state) => {
    if (state.pointer.x === 0 && state.pointer.y === 0) {
      // initial hidden mouse
    } else {
      vec.current.set(state.pointer.x, state.pointer.y, 0.5);
      vec.current.unproject(state.camera);
      vec.current.sub(state.camera.position).normalize();
      const distance = -state.camera.position.z / vec.current.z;
      pointer.current.copy(state.camera.position).add(vec.current.multiplyScalar(distance));
    }

    const time = state.clock.elapsedTime;
    simMaterial.uniforms.uTime.value = time;
    simMaterial.uniforms.uScroll.value = scrollTracker.current.progress;

    simMaterial.uniforms.uMouse.value.lerp(pointer.current, 0.15); // Snappier mouse tracking

    const targetA = targetRef.current;
    const targetB = targetA === renderTargetA ? renderTargetB : renderTargetA;

    simMaterial.uniforms.positions.value = targetA.texture;
    state.gl.setRenderTarget(targetB);
    state.gl.clear();
    state.gl.render(scene, camera);
    state.gl.setRenderTarget(null);

    targetRef.current = targetB;
    renderMaterial.uniforms.positions.value = targetB.texture;
    renderMaterial.uniforms.uTime.value = time;
    renderMaterial.uniforms.uScroll.value = scrollTracker.current.progress;
  });

  return (
    <>
      {createPortal(
        <mesh>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
            <bufferAttribute attach="attributes-uv" count={uvs.length / 2} array={uvs} itemSize={2} />
          </bufferGeometry>
          <primitive object={simMaterial} attach="material" />
        </mesh>,
        scene
      )}
      <points geometry={particlesGeo} material={renderMaterial} />
    </>
  );
}

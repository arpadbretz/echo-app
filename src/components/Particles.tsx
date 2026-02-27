"use client";

import { useMemo, useRef, useState } from "react";
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

vec3 getSphere(vec2 uv) {
  float theta = hash(uv) * 6.2831853;
  float phi = acos((hash(uv + vec2(1.0)) * 2.0) - 1.0);
  // Layered glowing core sphere
  float r = 3.5 + hash(uv + vec2(2.0)) * 1.5; 
  
  float x = r * sin(phi) * cos(theta);
  float y = r * sin(phi) * sin(theta);
  float z = r * cos(phi);
  return vec3(x, y, z);
}

vec3 getHelix(vec2 uv) {
  float id = hash(uv);
  float t = id * 40.0 - 20.0; // Towering double helix
  float angle = t * 1.2; 
  float radius = 4.0 + sin(t * 0.4) * 0.8; 
  
  float strand = step(0.5, hash(uv + vec2(3.0))); 
  float offset = strand * 3.14159;
  
  float x = radius * cos(angle + offset);
  float z = radius * sin(angle + offset);
  
  // Dense particle cloud following the strand paths
  float nx = (hash(uv + vec2(4.0)) - 0.5) * 1.8;
  float ny = (hash(uv + vec2(5.0)) - 0.5) * 1.8;
  float nz = (hash(uv + vec2(6.0)) - 0.5) * 1.8;

  // Occasional connective bridges between strands
  if (hash(uv + vec2(7.0)) > 0.96) {
      x = x * 0.3; 
      z = z * 0.3;
  }

  return vec3(x + nx, t + ny, z + nz);
}

void main() {
  vec3 currentPos = texture2D(positions, vUv).xyz;
  
  float scroll = clamp(uScroll, 0.0, 1.0);
  vec3 spherePos = getSphere(vUv);
  vec3 helixPos = getHelix(vUv);
  
  // High-fidelity fluid turbulence
  vec3 fluidVel = curlNoise(currentPos * 0.25 + uTime * 0.1) * 3.5;

  vec3 finalTarget = spherePos;
  float attractionForce = 0.0; 
  
  if (scroll < 0.1) {
      finalTarget = spherePos;
      attractionForce = 0.1;
  } else if (scroll < 0.4) {
      float nScroll = (scroll - 0.1) / 0.3;
      float influence = smoothstep(0.0, 1.0, nScroll);
      finalTarget = spherePos;
      attractionForce = mix(0.1, 0.0, influence);
  } else if (scroll < 0.7) {
      attractionForce = 0.0;
  } else {
      float nScroll = (scroll - 0.7) / 0.3;
      float influence = smoothstep(0.0, 1.0, nScroll);
      finalTarget = helixPos;
      attractionForce = mix(0.0, 0.06, influence); // Snaps back into shape!
  }

  // Calculate destination velocity
  vec3 velocity = (finalTarget - currentPos) * attractionForce;

  // Very gentle gravity to center to keep infinite drift from escaping camera frustum
  if (attractionForce == 0.0) {
      velocity += -currentPos * 0.003;
  }

  // Fade fluid amount based on scroll state
  float fluidAmount = 0.0;
  if (scroll >= 0.1 && scroll <= 0.4) {
      fluidAmount = smoothstep(0.0, 1.0, (scroll - 0.1) / 0.3);
  } else if (scroll > 0.4 && scroll < 0.7) {
      fluidAmount = 1.0;
  } else if (scroll >= 0.7) {
      fluidAmount = 1.0 - smoothstep(0.0, 1.0, (scroll - 0.7) / 0.3);
  }

  // Apply fluid noise velocity
  velocity += fluidVel * fluidAmount * 0.025;

  // Beautiful Mouse Repulsion & Swirl
  vec3 dir = currentPos - uMouse;
  float dist = length(dir);
  if (dist < 4.0 && scroll > 0.1) {
      float force = (4.0 - dist) / 4.0;
      
      // Forcefield repel
      velocity += normalize(dir) * force * 0.15;
      
      // Liquid Swirl
      vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
      velocity += tangent * force * 0.2;
  }

  vec3 nextPos = currentPos + velocity;
  gl_FragColor = vec4(nextPos, 1.0);
}
`;

const renderVertexShader = `
uniform sampler2D positions;
uniform float uTime;

varying vec3 vColor;
varying float vDepth;

void main() {
  vec3 pos = texture2D(positions, position.xy).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // Point size scaling based on depth and massive canvas
  gl_PointSize = (20.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  
  vDepth = -mvPosition.z;
  
  // Complex iridescent particle coloring matching CSSglow
  float h = fract(pos.y * 0.02 + pos.x * 0.02 + uTime * 0.05);
  
  vec3 colSilver = vec3(0.88, 0.9, 0.13); // #E0E722
  vec3 colViolet = vec3(0.5, 0.0, 0.9);   // Intense violet
  vec3 colCyan = vec3(0.4, 0.9, 1.0);     // Sharp Bioluminescent core pop
  
  if (h < 0.33) {
      float mixVal = smoothstep(0.0, 0.33, h);
      vColor = mix(colViolet, colCyan, mixVal);
  } else if (h < 0.66) {
      float mixVal = smoothstep(0.33, 0.66, h);
      vColor = mix(colCyan, colSilver, mixVal);
  } else {
      float mixVal = smoothstep(0.66, 1.0, h);
      vColor = mix(colSilver, colViolet, mixVal);
  }
}
`;

const renderFragmentShader = `
varying vec3 vColor;
varying float vDepth;

void main() {
  vec2 coords = gl_PointCoord - vec2(0.5);
  float dist = length(coords);
  if (dist > 0.5) discard;
  
  // Smooth glowing fade out algorithms
  float alpha = smoothstep(0.5, 0.1, dist);
  float core = smoothstep(0.15, 0.0, dist);
  
  vec3 coreColor = vec3(1.0); // pure blinding white core
  vec3 finalColor = mix(vColor, coreColor, core * 0.9);
  
  // Depth fade (particles vanishing far into the void)
  float depthFading = smoothstep(50.0, 10.0, vDepth);
  
  gl_FragColor = vec4(finalColor, alpha * 0.8 * depthFading);
}
`;

export function Particles({ scrollTracker }: { scrollTracker: React.MutableRefObject<{ progress: number }> }) {
  // 768x768 texture === 589,824 active GPU particles! (Extremely dense)
  const size = 768;

  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1));
  const positions = useMemo(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]), []);
  const uvs = useMemo(() => new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), []);

  const renderTargetA = useFBO(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType });
  const renderTargetB = useFBO(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType });

  const targetRef = useRef(renderTargetA);

  const simMaterial = useMemo(() => new THREE.ShaderMaterial({ vertexShader: simulationVertexShader, fragmentShader: simulationFragmentShader, uniforms: { positions: { value: null }, uTime: { value: 0 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector3() } } }), []);
  const renderMaterial = useMemo(() => new THREE.ShaderMaterial({ vertexShader: renderVertexShader, fragmentShader: renderFragmentShader, uniforms: { positions: { value: null }, uTime: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);

  const particlesGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(size * size * 3);
    // Initializing UV mappings
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 3;
        posArray[index] = (i / size);
        posArray[index + 1] = (j / size);
        posArray[index + 2] = 0;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    return geometry;
  }, [size]);

  const pointer = useRef(new THREE.Vector3());
  const vec = useRef(new THREE.Vector3());

  useFrame((state) => {
    // Accurately map 2D mouse pointer into 3D world space depth for collision detection.
    vec.current.set(state.pointer.x, state.pointer.y, 0.5);
    vec.current.unproject(state.camera);
    vec.current.sub(state.camera.position).normalize();
    const distance = -state.camera.position.z / vec.current.z;
    pointer.current.copy(state.camera.position).add(vec.current.multiplyScalar(distance));

    const time = state.clock.elapsedTime;
    simMaterial.uniforms.uTime.value = time;
    simMaterial.uniforms.uScroll.value = scrollTracker.current.progress;

    simMaterial.uniforms.uMouse.value.lerp(pointer.current, 0.1);

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

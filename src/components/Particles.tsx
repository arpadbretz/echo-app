"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, createPortal } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";

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

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 getMonolith(vec2 uv) {
  float h1 = hash(uv); float h2 = hash(uv + vec2(1.0)); float h3 = hash(uv + vec2(2.0));
  return vec3((h1 - 0.5) * 4.0, (h2 - 0.5) * 8.0, (h3 - 0.5) * 4.0);
}

vec3 getTorusKnot(vec2 uv) {
  float h1 = hash(uv + vec2(3.0));
  float tOffset = h1 * 3.14159 * 2.0;

  float u = uv.x * 6.2831853;
  float v = uv.y * 6.2831853 + tOffset;

  float p = 2.0; float q = 3.0;

  float r = cos(q * v) + 2.0;
  float x = r * cos(p * v); float y = r * sin(p * v); float z = -sin(q * v);
  
  float nx = (hash(uv + vec2(4.0)) - 0.5) * 0.2;
  float ny = (hash(uv + vec2(5.0)) - 0.5) * 0.2;
  float nz = (hash(uv + vec2(6.0)) - 0.5) * 0.2;

  return vec3(x+nx, y+ny, z+nz) * 1.5;
}

void main() {
  vec3 currentPos = texture2D(positions, vUv).xyz;
  
  vec3 monolith = getMonolith(vUv);
  vec3 knot = getTorusKnot(vUv);

  vec3 target = monolith;
  float noiseAmt = 0.0;
  float scroll = clamp(uScroll, 0.0, 1.0);
  
  if (scroll < 0.25) { target = monolith; } 
  else if (scroll < 0.5) {
     float nScroll = (scroll - 0.25) / 0.25;
     noiseAmt = smoothstep(0.0, 1.0, nScroll) * 4.0;
     target = monolith;
  } else if (scroll < 0.75) {
     float nScroll = (scroll - 0.5) / 0.25;
     target = mix(monolith, knot, smoothstep(0.0, 1.0, nScroll));
     noiseAmt = mix(4.0, 0.5, nScroll);
  } else {
     target = knot; noiseAmt = 0.5;
  }

  vec3 noiseVec = vec3(
    snoise(vec3(target.x, target.y, uTime * 0.2)),
    snoise(vec3(target.y, target.z, uTime * 0.2)),
    snoise(vec3(target.z, target.x, uTime * 0.2))
  );

  vec3 finalTarget = target + noiseVec * noiseAmt;

  vec3 dir = finalTarget - uMouse;
  float dist = length(dir);
  if (dist < 2.0 && scroll > 0.4 && scroll < 0.8) {
      vec3 repel = normalize(dir) * (2.0 - dist) * 1.5;
      finalTarget += repel;
  }

  vec3 velocity = (finalTarget - currentPos) * 0.05;
  vec3 nextPos = currentPos + velocity;
  gl_FragColor = vec4(nextPos, 1.0);
}
`;

const renderVertexShader = `
uniform sampler2D positions;
uniform float uTime;
varying vec3 vColor;
void main() {
  vec3 pos = texture2D(positions, position.xy).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (10.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  
  float h = fract(pos.x * 0.1 + pos.y * 0.1 + uTime * 0.1);
  vec3 colSilver = vec3(0.88, 0.9, 0.13); // #E0E722
  vec3 colViolet = vec3(0.29, 0.0, 0.51); // #4B0082
  vec3 colWhite = vec3(1.0, 1.0, 1.0);

  if (h < 0.33) vColor = colSilver;
  else if (h < 0.66) vColor = colViolet;
  else vColor = mix(colWhite, colSilver, 0.5);
}
`;

const renderFragmentShader = `
varying vec3 vColor;
void main() {
  vec2 coords = gl_PointCoord - vec2(0.5);
  if (length(coords) > 0.5) discard;
  gl_FragColor = vec4(vColor, 0.8);
}
`;

export function Particles({ scrollTracker }: { scrollTracker: React.MutableRefObject<{ progress: number }> }) {
    const size = 512;
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
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const index = (i * size + j) * 3;
                posArray[index] = (i / size); posArray[index + 1] = (j / size); posArray[index + 2] = 0;
            }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        return geometry;
    }, [size]);

    const pointer = useRef(new THREE.Vector3());

    useFrame((state) => {
        pointer.current.set(state.pointer.x * 5.0, state.pointer.y * 5.0, 0);
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

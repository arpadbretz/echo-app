"use client";

import { useFrame } from "@react-three/fiber";
import { Particles } from "./Particles";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export function Scene() {
    const groupRef = useRef<THREE.Group>(null);
    const scrollTracker = useRef({ progress: 0 });

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.to(scrollTracker.current, {
            progress: 1,
            ease: "none",
            scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5, // Buttery smoothness without any forced auto-scrolling
            },
        });

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Breathtaking sweeping rotation
            groupRef.current.rotation.y += delta * 0.1;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.3;

            const p = scrollTracker.current.progress;

            // Extreme cinematic spatial camera flightpath
            let zPos = 12;
            let yPos = 0;

            if (p < 0.2) {
                // ACT 1: Fly backwards OUT of the massive deep space nebula
                zPos = THREE.MathUtils.lerp(1, 45, p / 0.2);
                yPos = THREE.MathUtils.lerp(0, 5, p / 0.2);
            } else if (p < 0.4) {
                // ACT 2: Dive fast and incredibly deep through the Cosmic Web
                zPos = THREE.MathUtils.lerp(45, 90, (p - 0.2) / 0.2);
                yPos = THREE.MathUtils.lerp(5, 10, (p - 0.2) / 0.2);
            } else if (p < 0.6) {
                // ACT 3: Pull back horizontally to orbit the towering Pulsar Jets
                zPos = THREE.MathUtils.lerp(90, 35, (p - 0.4) / 0.2);
                yPos = THREE.MathUtils.lerp(10, 20, (p - 0.4) / 0.2);
            } else if (p < 0.8) {
                // ACT 4: Rise up and view the immense Black Hole / Accretion Disk from above
                zPos = THREE.MathUtils.lerp(35, 15, (p - 0.6) / 0.2);
                yPos = THREE.MathUtils.lerp(20, 25, (p - 0.6) / 0.2);
            } else {
                // ACT 5: Divebomb toward the violent, concentrated Singularity
                zPos = THREE.MathUtils.lerp(15, 6, (p - 0.8) / 0.2);
                yPos = THREE.MathUtils.lerp(25, -5, (p - 0.8) / 0.2);
            }

            state.camera.position.z = zPos;
            state.camera.position.y = yPos;

            // Constantly stare at the absolute center of the universe
            state.camera.lookAt(0, 0, 0);
        }
    });

    return (
        <>
            <group ref={groupRef}>
                <Particles scrollTracker={scrollTracker} />
            </group>

            {/* Performance Optimized Post Processing - CSS handles Grain & Vignette */}
            <EffectComposer disableNormalPass multisampling={0}>
                <Bloom
                    luminanceThreshold={0.4} // Prevent entire simulation from glowing, only glow the brightest cores
                    luminanceSmoothing={0.9}
                    intensity={1.0} // Ethereal and subtle, not blinding
                    mipmapBlur={true}
                />
                <ChromaticAberration
                    blendFunction={BlendFunction.NORMAL}
                    offset={new THREE.Vector2(0.0015, 0.0015)} // Micro-subtle premium lens diffraction
                />
            </EffectComposer>
        </>
    );
}

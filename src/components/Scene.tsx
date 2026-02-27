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
                scrub: 1.0, // Buttery smooth lag-free interaction (standard for smooth scroll)
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

            // Extreme cinematic push in and pull out
            let zPos = 12;
            let yPos = 0;

            if (p < 0.3) {
                // Fly backwards OUT of the massive deep space nebula
                zPos = THREE.MathUtils.lerp(1, 35, p / 0.3);
                yPos = THREE.MathUtils.lerp(0, 5, p / 0.3);
            } else if (p < 0.7) {
                // Drift horizontally past floating ribbons
                zPos = THREE.MathUtils.lerp(35, 25, (p - 0.3) / 0.4);
                yPos = THREE.MathUtils.lerp(5, 3, (p - 0.3) / 0.4);
            } else {
                // Aggressively push forward into the final DNA Helix
                zPos = THREE.MathUtils.lerp(25, 14, (p - 0.7) / 0.3);
                yPos = THREE.MathUtils.lerp(3, -5, (p - 0.7) / 0.3);
            }

            state.camera.position.z = zPos;
            state.camera.position.y = yPos;
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
                    luminanceThreshold={0.2}
                    luminanceSmoothing={0.9}
                    intensity={1.5} // Stunning bioluminescence
                    mipmapBlur={true}
                />
            </EffectComposer>
        </>
    );
}

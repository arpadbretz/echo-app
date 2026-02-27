"use client";

import { useFrame } from "@react-three/fiber";
import { Particles } from "./Particles";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Scene() {
    const groupRef = useRef<THREE.Group>(null);
    const scrollTracker = useRef({ progress: 0 });

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.to(scrollTracker.current, {
            progress: 1,
            ease: "power1.inOut",
            scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
            },
        });

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Cinematic continuous rotation
            groupRef.current.rotation.y += delta * 0.15;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;

            const p = scrollTracker.current.progress;

            // Cinematic camera zoom and pan mapping to the scroll position
            // DNA sequence is massive, so we slowly zoom out 
            state.camera.position.z = THREE.MathUtils.lerp(12, 28, p);

            // Pan camera up to view the towering double helix
            state.camera.position.y = THREE.MathUtils.lerp(0, p > 0.8 ? -4 : 0, p);

            state.camera.lookAt(0, 0, 0);
        }
    });

    return (
        <group ref={groupRef}>
            <Particles scrollTracker={scrollTracker} />
        </group>
    );
}

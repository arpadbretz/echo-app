"use client";

import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { Overlay } from "./Overlay";

export default function EchoExperience() {
    return (
        <>
            <div className="fixed inset-0 z-0 pointer-events-auto">
                <Canvas
                    camera={{ position: [0, 0, 8], fov: 45 }}
                    dpr={[1, 2]}
                    gl={{ antialias: false, alpha: false }}
                >
                    <color attach="background" args={["#000000"]} />
                    <Scene />
                </Canvas>
            </div>
            <Overlay />
        </>
    );
}

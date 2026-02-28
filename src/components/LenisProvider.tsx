"use client";

import { ReactLenis } from "@studio-freight/react-lenis";

export default function LenisProvider({ children }: { children: React.ReactNode }) {
    return (
        <ReactLenis
            root
            options={{
                lerp: 0.05, // Super buttery smooth interpolation
                duration: 2.0, // Slows down the "snap" of trackpad scrolls
                smoothWheel: true,
            }}
        >
            {children}
        </ReactLenis>
    );
}

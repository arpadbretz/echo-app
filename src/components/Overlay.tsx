"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Overlay() {
    const anchorRef = useRef<HTMLDivElement>(null);
    const distortionRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<HTMLDivElement>(null);
    const rebirthRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        // Chapter 1: The Anchor
        gsap.to(anchorRef.current, {
            opacity: 0,
            filter: "blur(15px)",
            y: -100,
            scrollTrigger: {
                trigger: ".section-anchor",
                start: "top top",
                end: "bottom top",
                scrub: 1,
            },
        });

        // Chapter 2: The Void (Distortion)
        gsap.fromTo(distortionRef.current,
            { opacity: 0, y: 100, filter: "blur(20px)" },
            {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                scrollTrigger: { trigger: ".section-distortion", start: "top bottom", end: "top 30%", scrub: 1 }
            }
        );
        gsap.to(distortionRef.current, {
            opacity: 0,
            y: -100,
            filter: "blur(15px)",
            scrollTrigger: { trigger: ".section-distortion", start: "bottom 70%", end: "bottom top", scrub: 1 }
        });

        // Interaction Prompt
        gsap.fromTo(interactionRef.current,
            { opacity: 0, scale: 0.8 },
            {
                opacity: 1,
                scale: 1,
                scrollTrigger: { trigger: ".section-interaction", start: "top 60%", end: "top 30%", scrub: 1 }
            }
        );
        gsap.to(interactionRef.current, {
            opacity: 0,
            y: -50,
            filter: "blur(10px)",
            scrollTrigger: { trigger: ".section-interaction", start: "bottom 70%", end: "bottom top", scrub: 1 }
        });

        // Chapter 3: Rebirth
        gsap.fromTo(rebirthRef.current,
            { opacity: 0, scale: 1.1, filter: "blur(30px)" },
            {
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                scrollTrigger: { trigger: ".section-rebirth", start: "top 60%", end: "bottom bottom", scrub: 1.5 }
            }
        );

        return () => ScrollTrigger.getAll().forEach((t) => t.kill());
    }, []);

    return (
        <div className="relative z-10 w-full pointer-events-none">
            <div className="grain" />
            <div className="ambient-bg" />

            {/* Intro */}
            <section className="h-screen w-full flex items-center justify-center section-anchor mix-blend-difference">
                <div ref={anchorRef} className="flex flex-col items-center">
                    <p className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs mb-8 text-white/40">Chapter I. The Anchor</p>
                    <h1 className="font-serif text-[clamp(3rem,8vw,14rem)] leading-[0.8] text-center font-light tracking-tighter text-white text-glow">
                        What has passed <br />
                        <span className="italic opacity-80 pl-[15vw]">does not disappear.</span>
                    </h1>
                </div>
            </section>

            {/* Distortion */}
            <section className="h-[120vh] w-full flex items-center justify-start px-[8vw] section-distortion mix-blend-difference">
                <div ref={distortionRef}>
                    <p className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs mb-8 text-white/40">Chapter II. The Void</p>
                    <h2 className="font-serif text-[clamp(2.5rem,7vw,10rem)] italic font-light text-white text-glow opacity-0 leading-[0.9]">
                        Time only <br />
                        <span className="not-italic opacity-60 ml-[10vw]">distorts the form.</span>
                    </h2>
                </div>
            </section>

            {/* Interaction */}
            <section className="h-[120vh] w-full flex items-center justify-end px-[8vw] section-interaction mix-blend-difference">
                <div ref={interactionRef} className="text-right">
                    <p className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs mb-4 text-white/40">Awakening</p>
                    <p className="font-serif text-[clamp(1.5rem,4vw,4rem)] italic text-white/90 font-light text-glow">
                        Reach out.<br />Scatter the dust.
                    </p>
                </div>
            </section>

            {/* Rebirth */}
            <section className="h-screen w-full flex flex-col items-center justify-center section-rebirth mix-blend-difference">
                <div ref={rebirthRef} className="flex flex-col items-center">
                    <p className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs mb-8 text-white/40">Chapter III. The Evolution</p>
                    <h1 className="font-serif text-[clamp(4.5rem,12vw,18rem)] font-light tracking-widest text-white text-glow opacity-0">
                        A new <span className="italic">echo</span>.
                    </h1>
                </div>
            </section>
        </div>
    );
}

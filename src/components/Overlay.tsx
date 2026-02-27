"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Overlay() {
    const containerRef = useRef<HTMLDivElement>(null);

    // Custom magnetic cursor reference
    const cursorRef = useRef<HTMLDivElement>(null);
    const cursorOutlineRef = useRef<HTMLDivElement>(null);

    // Line refs for stagger animations
    const anchorLines = useRef<(HTMLSpanElement | null)[]>([]);
    const voidLines = useRef<(HTMLSpanElement | null)[]>([]);
    const interactionLines = useRef<(HTMLSpanElement | null)[]>([]);
    const rebirthLines = useRef<(HTMLSpanElement | null)[]>([]);

    const captureLine = (refsArray: React.MutableRefObject<(HTMLSpanElement | null)[]>, index: number) =>
        (el: HTMLSpanElement | null) => { refsArray.current[index] = el; };

    // Advanced Mouse Tracking
    useEffect(() => {
        let mouseX = 0, mouseY = 0;
        let outX = 0, outY = 0;

        const onMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Snappy inner dot
            if (cursorRef.current) {
                gsap.to(cursorRef.current, { x: mouseX, y: mouseY, duration: 0.1 });
            }
        };

        const animateOutline = () => {
            // Smooth spring lag for outline
            outX += (mouseX - outX) * 0.15;
            outY += (mouseY - outY) * 0.15;
            if (cursorOutlineRef.current) {
                cursorOutlineRef.current.style.transform = `translate3d(${outX}px, ${outY}px, 0)`;
            }
            requestAnimationFrame(animateOutline);
        };

        window.addEventListener("mousemove", onMouseMove);
        requestAnimationFrame(animateOutline);
        return () => window.removeEventListener("mousemove", onMouseMove);
    }, []);

    // Cinematic GSAP Scroll Routines
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        // Initial load in - Awwwards style slow stagger reveal
        const initTl = gsap.timeline();
        initTl.to(anchorLines.current, {
            y: 0,
            opacity: 1,
            stagger: 0.2,
            duration: 1.5,
            ease: "power3.out",
            delay: 0.5
        });

        // Chapter 1: The Anchor Scroll Out
        gsap.to(anchorLines.current, {
            opacity: 0,
            y: -50,
            stagger: 0.05,
            scrollTrigger: {
                trigger: ".section-anchor",
                start: "top top",
                end: "bottom top",
                scrub: 1,
            },
        });

        // Chapter 2: The Void (Distortion)
        gsap.fromTo(voidLines.current,
            { opacity: 0, y: 100 },
            {
                opacity: 1,
                y: 0,
                stagger: 0.15,
                scrollTrigger: { trigger: ".section-distortion", start: "top bottom", end: "top 30%", scrub: 1 }
            }
        );
        gsap.to(voidLines.current, {
            opacity: 0,
            y: -100,
            stagger: 0.05,
            scrollTrigger: { trigger: ".section-distortion", start: "bottom 70%", end: "bottom top", scrub: 1 }
        });

        // Interaction Prompt
        gsap.fromTo(interactionLines.current,
            { opacity: 0, scale: 0.8 },
            {
                opacity: 1,
                scale: 1,
                stagger: 0.1,
                scrollTrigger: { trigger: ".section-interaction", start: "top 60%", end: "top 30%", scrub: 1 }
            }
        );
        gsap.to(interactionLines.current, {
            opacity: 0,
            y: -50,
            stagger: 0.05,
            scrollTrigger: { trigger: ".section-interaction", start: "bottom 70%", end: "bottom top", scrub: 1 }
        });

        // Chapter 3: Rebirth
        gsap.fromTo(rebirthLines.current,
            { opacity: 0, scale: 1.1, y: 100 },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                stagger: 0.2,
                ease: "power2.out",
                scrollTrigger: { trigger: ".section-rebirth", start: "top 60%", end: "bottom bottom", scrub: 1.5 }
            }
        );

        return () => ScrollTrigger.getAll().forEach((t) => t.kill());
    }, []);

    return (
        <>
            <div className="vignette" />
            <div className="grain" />
            <div className="ambient-bg" />

            {/* Abstract Immersive Cursor */}
            <div
                ref={cursorRef}
                className="fixed top-0 left-0 w-2 h-2 rounded-full bg-white mix-blend-difference pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2"
            />
            <div
                ref={cursorOutlineRef}
                className="fixed top-0 left-0 w-10 h-10 rounded-full border border-white/40 mix-blend-difference pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
            />

            <div ref={containerRef} className="relative z-10 w-full pointer-events-none overflow-hidden">
                {/* Intro */}
                <section className="h-[120vh] w-full flex items-center justify-center section-anchor mix-blend-difference">
                    <div className="flex flex-col items-center">
                        <div className="overflow-hidden mb-8">
                            <p ref={captureLine(anchorLines, 0)} className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs text-white/40 translate-y-full opacity-0 inline-block">Chapter I. The Anchor</p>
                        </div>
                        <h1 className="font-serif text-[clamp(2.5rem,7vw,12rem)] leading-[0.8] text-center font-light tracking-tighter text-white text-glow text-gradient">
                            <div className="overflow-hidden p-2">
                                <span ref={captureLine(anchorLines, 1)} className="inline-block translate-y-[120%] opacity-0">What has passed</span>
                            </div>
                            <div className="overflow-hidden p-2">
                                <span ref={captureLine(anchorLines, 2)} className="inline-block italic opacity-80 pl-[15vw] translate-y-[120%] opacity-0">does not disappear.</span>
                            </div>
                        </h1>
                    </div>
                </section>

                {/* Distortion */}
                <section className="h-[150vh] w-full flex items-center justify-start px-[8vw] section-distortion mix-blend-difference">
                    <div>
                        <div className="overflow-hidden mb-8">
                            <p ref={captureLine(voidLines, 0)} className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs text-white/40 translate-y-full opacity-0 inline-block">Chapter II. The Void</p>
                        </div>
                        <h2 className="font-serif text-[clamp(2rem,6vw,9rem)] italic font-light text-white text-glow leading-[0.9] text-gradient">
                            <div className="overflow-hidden p-2">
                                <span ref={captureLine(voidLines, 1)} className="inline-block opacity-0 translate-y-[120%]">Time only</span>
                            </div>
                            <div className="overflow-hidden p-2">
                                <span ref={captureLine(voidLines, 2)} className="inline-block not-italic opacity-60 ml-[10vw] opacity-0 translate-y-[120%]">distorts the form.</span>
                            </div>
                        </h2>
                    </div>
                </section>

                {/* Interaction */}
                <section className="h-[150vh] w-full flex items-center justify-end px-[8vw] section-interaction mix-blend-difference">
                    <div className="text-right">
                        <div className="overflow-hidden mb-4">
                            <p ref={captureLine(interactionLines, 0)} className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs text-white/40 opacity-0 inline-block">Awakening</p>
                        </div>
                        <p className="font-serif text-[clamp(1.2rem,3vw,3.5rem)] italic text-white/90 font-light text-glow">
                            <span ref={captureLine(interactionLines, 1)} className="inline-block opacity-0">Reach out.</span><br />
                            <span ref={captureLine(interactionLines, 2)} className="inline-block opacity-0">Scatter the dust.</span>
                        </p>
                    </div>
                </section>

                {/* Rebirth */}
                <section className="h-[100vh] w-full flex flex-col items-center justify-center section-rebirth mix-blend-difference">
                    <div className="flex flex-col items-center">
                        <div className="overflow-hidden mb-8">
                            <p ref={captureLine(rebirthLines, 0)} className="font-sans uppercase tracking-[0.6em] text-[10px] md:text-xs text-white/40 opacity-0 translate-y-full inline-block">Chapter III. The Evolution</p>
                        </div>
                        <h1 className="font-serif text-[clamp(3.5rem,10vw,16rem)] font-light tracking-widest text-white text-glow text-gradient">
                            <div className="overflow-hidden p-4">
                                <span ref={captureLine(rebirthLines, 1)} className="inline-block opacity-0 translate-y-full">A new <span className="italic">echo</span>.</span>
                            </div>
                        </h1>
                    </div>
                </section>
            </div>
        </>
    );
}

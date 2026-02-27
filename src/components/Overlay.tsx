"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Overlay() {
    const anchorRef = useRef<HTMLHeadingElement>(null);
    const distortionRef = useRef<HTMLHeadingElement>(null);
    const rebirthRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        // Anchor fades out between 0% and 25% height
        gsap.to(anchorRef.current, {
            opacity: 0,
            y: -50,
            scrollTrigger: {
                trigger: ".section-anchor",
                start: "top top",
                end: "bottom top",
                scrub: true,
            },
        });

        // Distortion fades in then out (25% - 50%)
        gsap.fromTo(distortionRef.current,
            { opacity: 0, y: 50 },
            {
                opacity: 1,
                y: 0,
                scrollTrigger: {
                    trigger: ".section-distortion",
                    start: "top bottom",
                    end: "top 30%",
                    scrub: true,
                }
            }
        );
        gsap.to(distortionRef.current, {
            opacity: 0,
            y: -50,
            scrollTrigger: {
                trigger: ".section-distortion",
                start: "bottom 80%",
                end: "bottom top",
                scrub: true,
            }
        });

        // Rebirth fades in (75% - 100%)
        gsap.fromTo(rebirthRef.current,
            { opacity: 0, scale: 0.9 },
            {
                opacity: 1,
                scale: 1,
                scrollTrigger: {
                    trigger: ".section-rebirth",
                    start: "top 80%",
                    end: "bottom bottom",
                    scrub: true,
                }
            }
        );

        return () => {
            ScrollTrigger.getAll().forEach((t) => t.kill());
        };
    }, []);

    return (
        <div className="relative z-10 w-full pointer-events-none">
            <section className="h-screen w-full flex items-center justify-center section-anchor mix-blend-difference">
                <h1 ref={anchorRef} className="font-serif text-[clamp(2.5rem,7vw,10rem)] leading-none text-center font-light tracking-tighter text-white">
                    What has passed <br /><span className="italic">does not disappear.</span>
                </h1>
            </section>

            <section className="h-screen w-full flex items-center justify-center section-distortion mix-blend-difference">
                <h2 ref={distortionRef} className="font-serif text-[clamp(2rem,5vw,7rem)] text-center italic font-light text-white opacity-0">
                    Time only distorts <br /><span className="not-italic">the form.</span>
                </h2>
            </section>

            <section className="h-screen w-full flex items-center justify-center section-interaction">
            </section>

            <section className="h-screen w-full flex items-center justify-center section-rebirth mix-blend-difference">
                <h1 ref={rebirthRef} className="font-serif text-[clamp(3.5rem,9vw,12rem)] font-light tracking-widest text-white opacity-0">
                    A new echo.
                </h1>
            </section>
        </div>
    );
}

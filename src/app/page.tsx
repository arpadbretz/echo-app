"use client";

import dynamic from "next/dynamic";
const EchoExperience = dynamic(() => import("@/components/EchoExperience"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="w-full min-h-[400vh] bg-black selection:bg-white selection:text-black">
      <EchoExperience />
    </main>
  );
}

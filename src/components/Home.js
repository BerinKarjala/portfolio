import React from "react";
import image from "../drop-of-water.jpg";
import landingImage from "../underconstruction.jpg"

export default function Home() {
  return (
    <main>
      <div className="flex items-center justify-center h-screen"><img src={landingImage} alt="This page is under construction sorry for the inconvience" className="rounded-lg border shadow-lg p-10 w-2/4" /></div>
      <section className="relative flex justify-center men-h-screen pt-12 lg:pt-64 px-8">
      </section>
    </main>
  );
}

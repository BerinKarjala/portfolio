import React from "react";
import landingImage from "../drop-of-water.jpg"

export default function Home() {
  return (
    <main>
      <div>
        <img src={landingImage} alt="a drop of water creating ripples in a pool" className="absolute object-cover w-full h-full" />
        <section className="relative flex justify-center min-h-screen pt-6 lg:pt-30 px-8">
          <h1 className="text-6xl text-green-1000 font-bold cursive leading-none lg:leading-snug home-name">Tervetuola!</h1>
        </section>
      </div>
    </main>
  );
}

import React from "react";
import image from "../drop-of-water.jpg";

export default function Home() {
  return (
    <main>
      <img
        src={image}
        alt="A drip into a pool of water creates ripples."
        className="absolute object-cover w-full h-full"
      />
      <section className="relative flex justify-center men-h-screen pt-12 lg:pt-64 px-8">
        <h1 className="text-6xl text-green-100 font-bold cursive leading-none lg:leading-snug home-name">
          Tervetuloa!
        </h1>
      </section>
    </main>
  );
}

import React from "react";
import image from "../drop-of-water.jpg";
import landingImage from "../underconstruction.jpg"

export default function Home() {
  return (
    <main className="items-center justify-center h-screen p-10 lg:pt-0">
      <div className="container mx-auto px-14 relative">
        <img src={landingImage} alt="This page is under construction sorry for the inconvience" className="rounded-lg border shadow-lg p-10 w-2/4 " />
      </div>
    </main>
  );
}

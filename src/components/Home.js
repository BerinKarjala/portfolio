import React from "react";
import landingImage from "../drop-of-water.jpg"
import getYouTubeId from "get-youtube-id"
import YouTube from "react-youtube"

export default function Home() {
  const url = 'https://youtu.be/tU6smAf4N_o'
  const id = getYouTubeId(url)
  return (
    <main>
      <div>
        <img src={landingImage} alt="a drop of water creating ripples in a pool" className="absolute object-cover w-full h-full" />
        <section className="relative flex justify-center min-h-screen pt-6 lg:pt-30 px-8">
          <YouTube videoId={id} />
        </section>
      </div>
    </main>
  );
}

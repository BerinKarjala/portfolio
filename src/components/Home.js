import React from "react";
import getYouTubeId from "get-youtube-id"
import YouTube from "react-youtube"

export default function Home() {
  const url = 'https://youtu.be/tU6smAf4N_o'
  const id = getYouTubeId(url)
  return (
    <main  className="relative bg-gradient-to-r from-purple-700 to-pink-500 min-h-screen">
        <section className="container mx-auto relativer p-5">
        <div  className="bg-white rounded-lg shadow-2xl p-5 mx-0">
          <h1>Introductory Video</h1>
          <YouTube className="min-w-min w-fit" videoId={id} />
          <sub>This is a short indtroductory video about my website.</sub>
          </div>
        </section>
    </main>
  );
}

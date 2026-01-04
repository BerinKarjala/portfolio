import React from "react";
import getYouTubeId from "get-youtube-id"
import YouTube from "react-youtube"

export default function Home() {
  const url = 'https://youtu.be/tU6smAf4N_o'
  const id = getYouTubeId(url)
  return (
    <main  className="relative bg-gradient-to-br from-green-900 via-emerald-800 to-lime-600 min-h-screen text-emerald-50">
        <section className="container mx-auto relativer p-5">
        <div  className="bg-white bg-opacity-90 rounded-lg shadow-2xl p-5 mx-0">
          <h1 className="text-2xl font-semibold text-emerald-900">Introductory Video</h1>
          <YouTube className="min-w-min w-fit" videoId={id} />
          <sub className="text-gray-700">This is a short introductory video about my website.</sub>
          </div>
        </section>
    </main>
  );
}

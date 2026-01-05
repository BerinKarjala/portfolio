import React from "react";
import getYouTubeId from "get-youtube-id"
import YouTube from "react-youtube"

export default function Home() {
  const url = 'https://youtu.be/tU6smAf4N_o'
  const id = getYouTubeId(url)
  return (
    <main  className="relative forest-bg text-emerald-50">
        <section className="container mx-auto px-4 sm:px-6 md:px-8 py-10 flex justify-center">
        <div  className="bg-white bg-opacity-75 rounded-lg shadow-2xl p-6 sm:p-8 lg:p-10 w-auto max-w-3xl inline-block">
          <h1 className="text-2xl sm:text-3xl font-semibold text-emerald-900">Introductory Video</h1>
          <div className="mt-4 w-full">
            <YouTube className="w-full" videoId={id} opts={{ width: "100%", height: "315" }} />
          </div>
          <sub className="text-gray-700">This is a short introductory video about my website.</sub>
          </div>
        </section>
    </main>
  );
}

import React from "react";
import getYouTubeId from "get-youtube-id"
import YouTube from "react-youtube"

export default function Home() {
  const url = 'https://youtu.be/tU6smAf4N_o'
  const id = getYouTubeId(url)
  return (
    <main>
      <div className="container relative flex min-h-screen bg-gradient-to-r from-purple-500 to-pink-500">
        <section className="grow">
          <YouTube className="m-2 p-1 border-2 rounded min-w-auto lg:min-w-screen justify-left sm:justify-center" videoId={id} />
        </section>
      </div>
    </main>
  );
}

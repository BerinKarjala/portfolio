import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import sanityClient from "../client.js";

export default function Post() {
  const [postData, setPost] = useState(null);

  useEffect(() => {
    sanityClient
      .fetch(
        `*[_type == "post"]{
                title,
                slug,
                mainImage{
                    asset->{
                        _id,
                        url
                    },
                    alt
                }
            }`
      )
      .then((data) => setPost(data))
      .catch(console.error);
  }, []);

  return (
    <main className="forest-bg px-4 sm:px-6 md:px-10 lg:px-12 py-12 text-emerald-50">
      <section className="container mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl flex justify-center text-center cursive mb-10 sm:mb-16 lg:mb-20 text-emerald-100">
          Welcome to my developer's web log!
        </h1>
        <h2 className="text-base sm:text-lg text-emerald-50 flex justify-center text-center mb-8 sm:mb-12">
          You will find up-to-date information about the changes to my portfolio.
        </h2>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {postData &&
            postData.map((post, index) => (
              <article key={post.slug.current || index}>
                <Link to={"/post/" + post.slug.current}>
                  <span
                    className="block h-64 relative rounded shadow leading-snug bg-white bg-opacity-90 border-l-8 border-green-400"
                  >
                    <img
                      src={post.mainImage.asset.url}
                      alt={post.mainImage.alt}
                      className="w-full h-full rounded-r object-cover absolute"
                    />
                    <span className="block relative h-full flex justify-end items-end pr-4 pb-4">
                      <h3 className="text-gray-900 text-lg font-bold px-3 py-4 bg-emerald-800 text-emerald-50 bg-opacity-90 rounded">
                        {post.title}
                      </h3>
                    </span>
                  </span>
                </Link>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}

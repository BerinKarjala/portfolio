import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="forest-bg text-green-50">
      <section className="container mx-auto px-4 sm:px-6 md:px-8 py-12 flex justify-center">
        <div className="w-full max-w-3xl bg-green-900 bg-opacity-60 border border-green-700 border-opacity-40 rounded-2xl shadow-2xl backdrop-filter backdrop-blur-sm p-6 sm:p-8 lg:p-10 text-center">
          <p className="uppercase tracking-widest text-xs sm:text-sm text-green-200">
            Page Not Found
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3 text-green-50">
            404
          </h1>
          <p className="mt-4 text-green-100 leading-relaxed">
            The page you are looking for does not exist. Use the button below to
            return home.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="bg-green-400 text-gray-900 font-semibold text-base px-6 py-2 rounded-lg shadow-md inline-flex items-center justify-center transform transition duration-300 hover:bg-green-500 hover:shadow-lg active:scale-95"
            >
              Return Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

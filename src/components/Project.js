import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import sanityClient from "../client.js";

export default function Project() {
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
      sanityClient.fetch(
          `*[_type == "project"]{
            title,
            date,
            place,
            description,
            projectType,
            link,
            tags
        }`).then((data) => setProjectData(data)).catch(console.error);
    },[]);
  return (
    <main className="forest-bg px-4 sm:px-6 md:px-10 lg:px-12 py-12 text-emerald-50">
      <section className="container mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl flex justify-center text-center text-emerald-100 mb-6">My Projects</h1>
        <h2 className="text-base sm:text-lg text-emerald-50 flex justify-center text-center mb-8 sm:mb-12">
          Welcome to my projects page!
        </h2>
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {projectData && projectData.map((project, index) => {
              return (
                <article className="relative rounded-lg shadow-xl bg-white bg-opacity-90 p-8 sm:p-10 lg:p-12" key={project.title || index}>
                  <h3 className="text-gray-800 text-3xl font-bold mb-2 hover:text-emerald-700">
                    <Link
                      to={project.link}
                      alt={project.title}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.title}
                    </Link>
                  </h3>
                  <div className="text-gray-500 text-xs space-x-4">
                    <span>
                      <strong className="font-bold">Finished on</strong>:{" "}
                      {new Date(project.date).toLocaleDateString()}
                    </span>
                    <span>
                      <strong className="font-bold">Company</strong>:{" "}
                      {project.place}
                    </span>
                    <span>
                      <strong className="font-bold">Type</strong>:{" "}
                      {project.projectType}
                    </span>
                    <p className="my-6 txt-lg text-gray-700 leading-relaxed">
                      {project.description}
                    </p>
                    <Link to={project.link}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="text-emerald-700 font-bold hover:underline hover:text-emerald-600"
                    >
                    View The Project{" "}
                      <span role="img" aria-label="right pointer">
                        &#128073;
                      </span>
                    </Link>
                    
                  </div>
                </article>
              );
            })}
        </section>
      </section>
    </main>
  )
}

import React, { useEffect, useState } from "react";
import sanityClient from "../client.js";
import Seo, { SITE_NAME, SITE_URL } from "./Seo";
import { cancelIdle, runWhenIdle } from "../utils/idleCallback";

export default function Project() {
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
    let isActive = true;
    const handle = runWhenIdle(() => {
      sanityClient
        .fetch(
          `*[_type == "project"]{
            name,
            description,
            thumbnail{
              asset->{
                url
              },
              alt
            },
            link
          }`
        )
        .then((data) => {
          if (isActive) {
            setProjectData(data);
          }
        })
        .catch(console.error);
    });

    return () => {
      isActive = false;
      cancelIdle(handle);
    };
  }, []);

  const projects = Array.isArray(projectData) ? projectData : [];
  const projectNames = projects
    .map((project) => project?.name)
    .filter(Boolean)
    .slice(0, 3);
  const pageDescription = projectNames.length
    ? `Projects by ${SITE_NAME}, including ${projectNames.join(", ")}.`
    : "Selected projects focused on UI clarity, reliable behavior, and thoughtful technical execution.";
  const ogImage = projects.find((project) => project?.thumbnail?.asset?.url)
    ?.thumbnail?.asset?.url;
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Projects",
    url: `${SITE_URL}/project`,
    description: pageDescription,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Projects",
    itemListElement: projects
      .filter((project) => project?.name && project?.link)
      .map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: project.name,
        url: project.link,
      })),
  };

  return (
    <>
      <Seo
        title="Projects | Berin Karjala"
        description={pageDescription}
        path="/project"
        image={ogImage}
        jsonLd={[webPageSchema, listSchema]}
      />
      <main className="relative forest-bg text-green-50">
        <div className="absolute inset-0 pointer-events-none"></div>
        <section className="container mx-auto px-4 sm:px-6 md:px-8 py-10 flex justify-center relative z-10">
          <div className="w-full max-w-5xl bg-green-900 bg-opacity-40 border border-green-700 border-opacity-40 rounded-2xl shadow-2xl backdrop-filter backdrop-blur-sm p-6 sm:p-8 lg:p-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mt-3 text-green-50">
              My Projects
            </h1>
            <hr />
            <p className="uppercase tracking-widest text-xs sm:text-sm text-green-200 text-center">
              Selected work and experiments
            </p>
            <div className="mt-4 space-y-4 text-green-100 leading-relaxed max-w-3xl">
              <p>
                A curated set of projects focused on UI clarity, reliable behavior,
                and thoughtful technical execution.
              </p>
            </div>
            <div className="mt-8 border-t border-green-700 border-opacity-40 pt-6">
              <h2 className="text-lg sm:text-xl font-semibold text-green-50">
                Projects
              </h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => {
                  if (!project?.link || !project?.name) {
                    return null;
                  }
                  return (
                    <a
                      key={`${project.name}-${project.link}`}
                      href={project.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`View project: ${project.name}`}
                      className="block h-full border border-green-700 border-opacity-30 bg-green-900 bg-opacity-30 rounded-2xl p-5 shadow-lg backdrop-filter backdrop-blur-sm transition hover:bg-opacity-40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-green-900"
                    >
                      {project.thumbnail?.asset?.url ? (
                        <img
                          src={project.thumbnail.asset.url}
                          alt={project.thumbnail.alt || project.name}
                          className="w-full h-40 rounded-lg object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <h3 className="mt-4 text-base sm:text-lg font-semibold text-green-100">
                        {project.name}
                      </h3>
                      <p className="mt-2 text-green-100 text-sm leading-relaxed">
                        {project.description}
                      </p>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

import React, { useEffect, useState } from "react";
import sanityClient from "../client.js";
import Seo, { SITE_NAME, SITE_URL } from "./Seo";
import { cancelIdle, runWhenIdle } from "../utils/idleCallback";

const EMPTY_PROJECTS = [];
const EMPTY_PROJECT_DESCRIPTION =
  "Project details are temporarily unavailable. Please check back shortly.";

export default function Project() {
  const [projectData, setProjectData] = useState(EMPTY_PROJECTS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);

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
            setProjectData(Array.isArray(data) ? data : EMPTY_PROJECTS);
            setHasFetchError(false);
          }
        })
        .catch((error) => {
          console.error(error);
          if (isActive) {
            setProjectData(EMPTY_PROJECTS);
            setHasFetchError(true);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isActive = false;
      cancelIdle(handle);
    };
  }, []);

  if (isLoading) {
    return (
      <main className="relative forest-bg text-green-50">
        <section className="container mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 flex justify-center relative z-10">
          <div className="w-full max-w-5xl bg-green-900 bg-opacity-40 border border-green-700 border-opacity-40 rounded-2xl shadow-2xl backdrop-filter backdrop-blur-sm p-4 sm:p-8 lg:p-10">
            <p className="text-sm uppercase tracking-widest text-green-200">
              Loading...
            </p>
          </div>
        </section>
      </main>
    );
  }

  const projects = projectData.filter((project) => project?.name && project?.link);
  const projectNames = projects
    .map((project) => project?.name)
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
        <section className="container mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 flex justify-center relative z-10">
          <div className="w-full max-w-5xl bg-green-900 bg-opacity-40 border border-green-700 border-opacity-40 rounded-2xl shadow-2xl backdrop-filter backdrop-blur-sm p-4 sm:p-8 lg:p-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mt-3 text-green-50">
              My Projects
            </h1>
            <hr />
            <p className="uppercase tracking-widest text-xs sm:text-sm text-green-200 text-center">
              Selected work and experiments
            </p>
            {hasFetchError ? (
              <p className="mt-4 text-sm text-amber-200">
                Could not load the latest project content from Sanity. Showing
                fallback content.
              </p>
            ) : null}
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
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <a
                      key={`${project.name}-${project.link}`}
                      href={project.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`View project: ${project.name}`}
                      className="block h-full border border-green-700 border-opacity-30 bg-green-900 bg-opacity-30 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-filter backdrop-blur-sm transition hover:bg-opacity-40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-green-900"
                    >
                      <div
                        className="w-full overflow-hidden rounded-lg border border-green-700 border-opacity-30 bg-green-900 bg-opacity-40"
                        style={{ aspectRatio: "16 / 9" }}
                      >
                        {project.thumbnail?.asset?.url ? (
                          <img
                            src={project.thumbnail.asset.url}
                            alt={project.thumbnail.alt || project.name}
                            className="h-full w-full object-cover"
                            width="640"
                            height="360"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-semibold text-green-200">
                            Preview unavailable
                          </div>
                        )}
                      </div>
                      <h3 className="mt-4 text-base sm:text-lg font-semibold text-green-100">
                        {project.name}
                      </h3>
                      <p className="mt-2 text-green-100 text-sm leading-relaxed">
                        {project.description || EMPTY_PROJECT_DESCRIPTION}
                      </p>
                    </a>
                  ))
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-green-700 border-opacity-30 bg-green-900 bg-opacity-30 p-5 text-sm text-green-100 shadow-lg backdrop-filter backdrop-blur-sm">
                    No project entries are available right now.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

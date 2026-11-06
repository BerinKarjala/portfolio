export const PAGE_BUILDER_PATH = "/projects/page-builder";
export const PAGE_BUILDER_DOCUMENT_ID = "project-html-page-builder";
const DEFAULT_PROJECT = {
  name: "HTML Page Builder",
  description:
    "A visual React page builder with browser-local projects, starter templates, and portable JSON backups. Open the project to explore the code and launch the workspace.",
  link: PAGE_BUILDER_PATH,
  thumbnail: {
    asset: { url: "/page-builder-preview.svg" },
    alt: "Page Builder workspace illustration",
  },
};

// Keep the project discoverable without writing to the CMS. Prefer its CMS
// record when available, while preserving any other distinct project records.
export function includePageBuilder(projects) {
  const hasBuilderRoute = (link) => {
    try {
      const url = new URL(link, "https://berinkarjala.netlify.app");
      return (
        url.origin === "https://berinkarjala.netlify.app" &&
        url.pathname.toLowerCase().replace(/\/$/, "") === PAGE_BUILDER_PATH
      );
    } catch {
      return false;
    }
  };
  const isBuilder = (project) =>
    project._id === PAGE_BUILDER_DOCUMENT_ID || project.kind === "pageBuilder" || hasBuilderRoute(project.link);
  const cms = projects.find((project) => project._id === PAGE_BUILDER_DOCUMENT_ID) ||
    projects.find((project) => project.kind === "pageBuilder") || projects.find(isBuilder);
  let canonicalLink = cms ? cms.link : PAGE_BUILDER_PATH;
  if (cms && hasBuilderRoute(cms.link)) {
    const url = new URL(cms.link, "https://berinkarjala.netlify.app");
    canonicalLink = `${PAGE_BUILDER_PATH}${url.search}${url.hash}`;
  }
  const featured = cms
    ? {
        ...DEFAULT_PROJECT,
        ...cms,
        link: canonicalLink,
        thumbnail: cms.thumbnail?.asset?.url
          ? cms.thumbnail
          : DEFAULT_PROJECT.thumbnail,
      }
    : DEFAULT_PROJECT;
  return [featured, ...projects.filter((project) => project !== cms)];
}

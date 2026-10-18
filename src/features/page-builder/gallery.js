export const PAGE_BUILDER_PATH = "/projects/page-builder";
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

// Keep the project discoverable without writing to the CMS. Prefer CMS copy/art
// when available, and avoid creating a second card for the same local route.
export function includePageBuilder(projects) {
  const isBuilder = (project) => {
    try {
      const url = new URL(project.link, "https://berinkarjala.netlify.app");
      return (
        url.origin === "https://berinkarjala.netlify.app" &&
        url.pathname.toLowerCase().replace(/\/$/, "") === PAGE_BUILDER_PATH
      );
    } catch {
      return false;
    }
  };
  const cms = projects.find(isBuilder);
  const featured = cms
    ? {
        ...DEFAULT_PROJECT,
        ...cms,
        link: PAGE_BUILDER_PATH,
        thumbnail: cms.thumbnail?.asset?.url
          ? cms.thumbnail
          : DEFAULT_PROJECT.thumbnail,
      }
    : DEFAULT_PROJECT;
  return [featured, ...projects.filter((project) => !isBuilder(project))];
}

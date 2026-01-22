import React from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

export const SITE_NAME = "Berin Karjala";
export const SITE_URL = "https://berinkarjala.netlify.app";
export const DEFAULT_DESCRIPTION =
  "Portfolio of Berin Karjala, a full-stack developer focused on React, Sanity, and quality-driven web experiences.";
export const DEFAULT_IMAGE = `${SITE_URL}/logo512.png`;
export const SOCIAL_LINKS = [
  "https://www.linkedin.com/in/berin-karjala-90846842/",
  "https://github.com/BerinKarjala/portfolio",
];

const buildTitle = (title) => {
  if (!title) return SITE_NAME;
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
};

const toAbsoluteUrl = (url) => {
  if (!url) return DEFAULT_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${SITE_URL}${normalized}`;
};

export default function Seo({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
  jsonLd,
}) {
  const location = useLocation();
  const resolvedPath = path || location.pathname || "/";
  const canonical = new URL(resolvedPath, SITE_URL).toString();
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const fullTitle = buildTitle(title);
  const ogImage = toAbsoluteUrl(image || DEFAULT_IMAGE);
  const robotsContent = noIndex ? "noindex, nofollow" : "index, follow";
  const schemas = Array.isArray(jsonLd)
    ? jsonLd
    : jsonLd
    ? [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={robotsContent} />
      <meta name="author" content={SITE_NAME} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="preconnect" href="https://cdn.sanity.io" />
      <link rel="dns-prefetch" href="https://cdn.sanity.io" />

      {schemas.map((schema, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

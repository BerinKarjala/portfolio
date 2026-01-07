import React, { useEffect, useState } from "react";
import { getLandingPage } from "../client.js";

const fallbackContent = {
  title: "Berin Karjala",
  roleLabel: "Full-Stack Developer • QA-Minded Engineer • UX-Aware Builder",
  heroParagraph:
    "I design and build calm, reliable digital experiences rooted in clarity, structure, and long-term maintainability. My background spans software quality assurance, front-end development, and systems-focused problem solving, allowing me to bridge clean user interfaces with dependable technical foundations.",
  heroSupportingLine:
    "I focus on React-based front ends, content-driven platforms using Sanity, and thoughtful workflows that prioritize correctness, accessibility, and performance.",
  ctaLabel: "Contact Me",
  ctaSubtext: "Open to full-time and contract opportunities.",
  coreStrengthsHeading: "Core Strengths",
  strengthGroups: [
    {
      heading: "Frontend Engineering",
      bullets: [
        "React and modern JavaScript with a focus on clarity, consistency, and component reuse",
        "Layout systems that prioritize accessibility, responsiveness, and real-world usability",
      ],
    },
    {
      heading: "Quality-Driven Development",
      bullets: [
        "QA-informed development mindset focused on verification, edge cases, and reliability",
        "Strong documentation habits and structured testing workflows",
      ],
    },
    {
      heading: "Content & Systems Thinking",
      bullets: [
        "Sanity CMS modeling, content pipelines, and scalable page structures",
        "Experience translating business requirements into clean technical solutions",
      ],
    },
    {
      heading: "Delivery & Operations",
      bullets: [
        "Reliable build, deployment, and workflow coordination",
        "Comfortable working across development, operations, and support-oriented roles",
      ],
    },
  ],
  howIWorkHeading: "How I Work",
  howIWorkBody:
    "I bring a quality-first mindset shaped by years of working in structured, high-compliance environments. Whether I’m writing UI code, refining content models, or validating workflows, I focus on building systems that are calm, predictable, and easy to maintain.\n\nMy background in software QA, operations coordination, and technical support informs every development decision I make. I value clear communication, careful verification, and solutions that hold up over time.",
  currentlyOpenToHeading: "Currently Open To",
  currentlyOpenToBullets: [
    "Full-time frontend or full-stack roles",
    "Contract or project-based web development",
    "Teams that value clarity, quality, and thoughtful execution",
  ],
};

export default function Home() {
  const [showContact, setShowContact] = useState(false);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [landing, setLanding] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.length === 0 || emailPattern.test(email);

  useEffect(() => {
    getLandingPage()
      .then((data) => setLanding(data))
      .catch((error) => {
        console.error(error);
        setLoadError(true);
      });
  }, []);

  const content = landing || fallbackContent;
  const strengthGroups = Array.isArray(content.strengthGroups)
    ? content.strengthGroups
    : [];
  const howIWorkParagraphs = (content.howIWorkBody || "")
    .split("\n\n")
    .filter(Boolean);
  return (
    <main className="relative forest-bg text-green-50">
      <div className="absolute inset-0 pointer-events-none"></div>
      <section className="container mx-auto px-4 sm:px-6 md:px-8 py-10 flex justify-center relative z-10">
        <div className="w-full max-w-5xl bg-green-900 bg-opacity-40 border border-green-700 border-opacity-40 rounded-2xl shadow-2xl backdrop-filter backdrop-blur-sm p-6 sm:p-8 lg:p-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mt-3 text-green-50">
            {content.title}
          </h1>
          <hr />
          <p className="uppercase tracking-widest text-xs sm:text-sm text-green-200 text-center">
            {content.roleLabel}
          </p>
          <div className="mt-4 space-y-4 text-green-100 leading-relaxed max-w-3xl">
            <p>{content.heroParagraph}</p>
            <p>{content.heroSupportingLine}</p>
          </div>
          <div className="mt-8 border-t border-green-700 border-opacity-40 pt-6">
            <h2 className="text-lg sm:text-xl font-semibold text-green-50">
              {content.coreStrengthsHeading}
            </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {strengthGroups.map((strengthGroup) => (
                <div key={strengthGroup.heading}>
                  <h3 className="text-base sm:text-lg font-semibold text-green-100">
                    {strengthGroup.heading}
                  </h3>
                  <ul className="mt-2 space-y-2 text-green-100 text-sm">
                    {strengthGroup.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="text-green-300">✓</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              className="hidden bg-green-400 text-gray-900 font-semibold text-lg px-8 py-3 rounded-lg shadow-md transform transition duration-300 hover:bg-green-500 hover:shadow-lg active:scale-95"
              onClick={() => setShowContact((visible) => !visible)}
              aria-expanded={showContact}
            >
              {content.ctaLabel}
            </button>
            {showContact && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@domain.com"
                    className="w-56 sm:w-64 px-4 py-2 rounded border border-green-200 text-gray-900"
                    required
                    pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
                    aria-label="Your email address"
                    aria-invalid={!isEmailValid}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setEmailTouched(true)}
                  />
                  <button
                    type="button"
                    className="bg-green-400 text-gray-900 font-semibold px-4 py-2 rounded-lg shadow-md transform transition duration-300 hover:bg-green-500 hover:shadow-lg active:scale-95"
                  >
                    Submit
                  </button>
                </div>
                {emailTouched && !isEmailValid && (
                  <p className="text-xs text-green-200">
                    Enter a valid email address.
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-center text-green-100">
            {content.ctaSubtext}
          </p>
          <div className="mt-10 border-t border-green-700 border-opacity-40 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-green-50 text-left">
                {content.howIWorkHeading}
              </h2>
              {howIWorkParagraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-green-100 leading-relaxed text-sm text-left"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-green-50 text-center">
                {content.currentlyOpenToHeading}
              </h2>
              <ul className="mt-3 space-y-2 text-green-100 text-sm text-left">
                {content.currentlyOpenToBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="text-green-300">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

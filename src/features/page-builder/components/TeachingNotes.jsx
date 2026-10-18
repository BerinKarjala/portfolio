const topics = [
  [
    "Architecture",
    "React Context connects the workspace. The reducer holds editable project state; pure domain modules enforce layout, content and storage contracts.",
  ],
  [
    "Reducer and Undo",
    "Each editing command validates a new project before committing it. History groups one user action into one Undo step and stays in memory for the session.",
  ],
  [
    "Testing",
    "Vitest checks domain contracts and React workflows. Playwright exercises Chromium, Firefox and WebKit, including exported files, accessibility checks and visual comparisons.",
  ],
  [
    "HTML and CSS export",
    "A shared compiler turns structured project data into escaped semantic HTML and readable CSS. Preview uses that output in an isolated iframe; the ZIP contains exactly two files.",
  ],
];
export default function TeachingNotes() {
  return (
    <details className="mt-5 text-sm text-green-100 leading-relaxed">
      <summary className="cursor-pointer font-semibold">
        How this builder works
      </summary>
      {topics.map(([title, description]) => (
        <section className="mt-4" key={title}>
          <h2 className="font-semibold">{title}</h2>
          <p>{description}</p>
        </section>
      ))}
      <a
        className="mt-4 inline-block underline"
        href="https://github.com/BerinKarjala/portfolio/blob/main/docs/page-builder/tutorials.md"
      >
        Read the developer tutorials
      </a>
    </details>
  );
}

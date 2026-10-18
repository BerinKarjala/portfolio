function SourceListing({ files, className = "" }) {
  return (
    <div
      tabIndex={0}
      aria-label="Scrollable source code"
      className={`h-96 overflow-auto rounded-lg border border-green-700 bg-green-950 p-4 text-green-100 ${className}`}
    >
      {files.map(({ name, source }) => (
        <div key={name}>
          <h3 className="mb-2 text-xs tracking-widest text-green-200">{name}</h3>
          <pre className="mb-6 whitespace-pre-wrap break-words text-xs leading-relaxed">
            <code>{source}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}

export default function SourceCode({ title, files, fillHeight = false }) {
  return (
    <div className={`rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-4 shadow-2xl backdrop-filter backdrop-blur-sm ${fillHeight ? "lg:flex lg:min-h-0 lg:flex-col" : ""}`}>
      <h2 className="text-xs uppercase tracking-widest text-green-200">{title}</h2>
      <div className={`mt-3 hidden lg:block ${fillHeight ? "lg:relative lg:min-h-0 lg:flex-1" : ""}`}>
        <SourceListing files={files} className={fillHeight ? "lg:absolute lg:inset-0 lg:h-full" : ""} />
      </div>
      <details className="mt-3 lg:hidden">
        <summary className="cursor-pointer text-xs text-green-100 underline">Show code</summary>
        <SourceListing files={files} className="mt-3 h-80" />
      </details>
    </div>
  );
}

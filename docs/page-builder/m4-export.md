# M4 — Export, preview, validation and resilience

M4 implements one pure compiler for safe, deterministic standalone HTML/CSS and the isolated preview. The browser-local project schema stays at version 3. Materialized linked instances already satisfy the master contract; export validates those links and resolves preset inheritance before serializing an HTML AST and CSS rules. Preview applies only isolation changes to that document: inline the generated stylesheet, prevent external navigation, omit submission endpoints and add a restrictive CSP. The outer iframe has an empty sandbox: no scripts, same-origin access, submissions, popups or top navigation.

Tests are added before integration. Critical failures produce no output; warning acknowledgement is required by the shared download preparation function for ZIP and individual files. Downloads revalidate the current project. ZIP uses deterministic UTF-8 stored entries and CRC32, with exactly `index.html` and `styles.css`.

Milestone implementation and verification are in progress. No merge or release is authorized by this document.

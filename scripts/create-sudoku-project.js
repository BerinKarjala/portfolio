const { createClient } = require("@sanity/client");

const token =
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_TOKEN;

if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN (or SANITY_API_TOKEN).");
  process.exit(1);
}

const client = createClient({
  projectId: "umy7f73e",
  dataset: "production",
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

const projectDoc = {
  _type: "project",
  title: "Sudoku Solver",
  date: new Date().toISOString(),
  place: "Portfolio",
  description:
    "A responsive Sudoku solver with input validation and a clear, guided UI.",
  projectType: "personal",
  link: "/projects/SudokuSolver",
  tags: ["React", "Algorithms", "UI"],
};

async function run() {
  const existing = await client.fetch(
    '*[_type == "project" && link == $link][0]{_id, title}',
    { link: projectDoc.link }
  );

  if (existing?._id) {
    console.log(
      `Project already exists (${existing.title}). Skipping create. id=${existing._id}`
    );
    return;
  }

  const created = await client.create(projectDoc);
  console.log(`Created project: ${created._id}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

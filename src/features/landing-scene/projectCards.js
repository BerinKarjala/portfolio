import { SITE_URL } from '../../components/Seo';
import sudoku from '../../assets/sudoku-solver-preview.svg';
import minesweeper from '../../assets/minesweeper-preview.svg';
import { includePageBuilder, PAGE_BUILDER_DOCUMENT_ID, PAGE_BUILDER_PATH } from '../page-builder/gallery';

const games = [
  {
    _id: 'c0a1c1ee-3b33-4b80-b423-12f0ab0c8b6f',
    name: 'Sudoku Solver',
    link: '/projects/SudokuSolver',
    description: 'Solve Sudoku puzzles with clarity.',
    thumbnail: { asset: { url: sudoku }, alt: 'Sudoku Solver board with Solve and Reset controls' },
  },
  {
    _id: 'c3e9c324-e055-4146-9335-55e2d7e28e29',
    name: 'Minesweeper',
    link: '/projects/Minesweeper',
    description: 'A classic mine-finding puzzle.',
    thumbnail: { asset: { url: minesweeper }, alt: 'Minesweeper board with instructions, flags remaining, and reset controls' },
  },
];

function normalizeProject(project) {
  if (typeof project?.name !== 'string') return null;
  const withoutLink = { ...project, link: undefined };
  if (typeof project.link !== 'string' || !project.link.trim()) return withoutLink;
  if (/[\\\u0000-\u001f\u007f]/.test(project.link) || project.link.trimStart().startsWith('//')) return withoutLink;
  try {
    const url = new URL(project.link, SITE_URL);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? project : withoutLink;
  }
  catch { return withoutLink; }
}

function sameRoute(link, route) {
  if (typeof link !== 'string' || !link.trim()) return false;
  try {
    const url = new URL(link, SITE_URL);
    return url.origin === SITE_URL && url.pathname.replace(/\/$/, '').toLowerCase() === route.toLowerCase();
  } catch { return false; }
}

// Both surfaces consume these resolved cards. Bundled entries keep the apps
// available until their CMS records are published or if a request fails.
export function resolveProjectCards(data) {
  const records = Array.isArray(data) ? data : [];
  const studios = records.filter(project => project?.kind === 'cssStudio' && typeof project.name === 'string');
  const studio = studios.find(project => project._id === 'project-css-theme-studio') || studios[0] || null;
  const linked = records.filter(project => project?.kind !== 'cssStudio').map(normalizeProject).filter(Boolean);
  const reservedId = project => project.kind === 'pageBuilder' || project._id === PAGE_BUILDER_DOCUMENT_ID || games.some(game => project._id === game._id);
  const isGame = (project, game) => project._id === game._id || (!reservedId(project) && sameRoute(project.link, game.link));
  const remaining = [...linked];
  const resolvedGames = games.map(game => {
    const cms = remaining.find(project => project._id === game._id) ||
      remaining.find(project => isGame(project, game));
    if (cms) remaining.splice(remaining.indexOf(cms), 1);
    let canonicalLink = cms ? (cms.link?.trim() ? cms.link : undefined) : game.link;
    if (cms && sameRoute(cms.link, game.link)) {
      const url = new URL(cms.link, SITE_URL);
      canonicalLink = `${game.link}${url.search}${url.hash}`;
    }
    return {
      ...game,
      ...cms,
      cardKey: game.link,
      link: canonicalLink,
      thumbnail: cms?.thumbnail?.asset?.url ? cms.thumbnail : game.thumbnail,
    };
  });
  const builderAndRest = includePageBuilder(remaining);
  const builder = { ...builderAndRest[0], cardKey: PAGE_BUILDER_PATH };
  const otherCards = builderAndRest.slice(1).map((project, index) => ({
    ...project,
    cardKey: project._id ? `cms:${project._id}` : `legacy:${index}:${project.name}`,
  }));
  const otherStudios = studios.filter(project => project !== studio).map((project, index) => ({
    ...project,
    cardKey: project._id ? `cms:${project._id}` : `studio-extra:${index}`,
  }));
  return {
    studio,
    projectsPage: [builder, ...resolvedGames, ...otherCards, ...otherStudios],
    carousel: [...resolvedGames, builder, ...otherCards, ...otherStudios],
  };
}

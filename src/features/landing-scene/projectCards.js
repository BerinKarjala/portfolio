import { SITE_URL } from '../../components/Seo';
import sudoku from '../../assets/sudoku-solver-preview.svg';
import minesweeper from '../../assets/minesweeper-preview.svg';
import { includePageBuilder, PAGE_BUILDER_PATH } from '../page-builder/gallery';

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

function safeProject(project) {
  if (typeof project?.name !== 'string' || typeof project.link !== 'string') return false;
  try { return ['https:', 'http:'].includes(new URL(project.link, SITE_URL).protocol); }
  catch { return false; }
}

function sameRoute(link, route) {
  try {
    const url = new URL(link, SITE_URL);
    return url.origin === SITE_URL && url.pathname.replace(/\/$/, '').toLowerCase() === route.toLowerCase();
  } catch { return false; }
}

// Both surfaces consume these resolved cards. Bundled entries keep the apps
// available until their CMS records are published or if a request fails.
export function resolveProjectCards(data) {
  const records = Array.isArray(data) ? data : [];
  const studio = records.find(project => project?.kind === 'cssStudio' && typeof project.name === 'string') || null;
  const linked = records.filter(project => project?.kind !== 'cssStudio' && safeProject(project));
  const isGame = (project, game) => project._id === game._id || sameRoute(project.link, game.link);
  const resolvedGames = games.map(game => {
    const cms = linked.find(project => project._id === game._id) ||
      linked.find(project => sameRoute(project.link, game.link));
    return {
      ...game,
      ...cms,
      cardKey: game.link,
      link: cms && sameRoute(cms.link, game.link) ? game.link : cms?.link || game.link,
      thumbnail: cms?.thumbnail?.asset?.url ? cms.thumbnail : game.thumbnail,
    };
  });
  const extras = linked.filter(project => !games.some(game => isGame(project, game)));
  const builderAndRest = includePageBuilder([...resolvedGames, ...extras]);
  const builder = { ...builderAndRest[0], cardKey: PAGE_BUILDER_PATH };
  const otherCards = builderAndRest.slice(1);
  return {
    studio,
    projectsPage: [builder, ...otherCards],
    carousel: [...otherCards.slice(0, games.length), builder, ...otherCards.slice(games.length)],
  };
}

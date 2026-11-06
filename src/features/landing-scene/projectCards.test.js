import { describe, expect, it } from 'vitest';
import { resolveProjectCards } from './projectCards';

const sudokuId = 'c0a1c1ee-3b33-4b80-b423-12f0ab0c8b6f';
const builderId = 'project-html-page-builder';

describe('resolveProjectCards', () => {
  it.each([
    '//evil.example/project',
    '/\\evil.example/project',
    '\\\\evil.example/project',
    '/projects/unsafe\npath',
    'https://user:password@example.com/project',
    'javascript:alert(1)',
  ])('rejects the unsafe ordinary project destination %s', link => {
    const { projectsPage, carousel } = resolveProjectCards([{ _id: 'unsafe', name: 'Unsafe entry', link }]);
    expect(projectsPage.some(project => project.name === 'Unsafe entry')).toBe(false);
    expect(carousel.some(project => project.name === 'Unsafe entry')).toBe(false);
  });

  it.each([
    ['/projects/Minesweeper', 'Minesweeper', '/projects/Minesweeper'],
    ['/projects/page-builder', 'HTML Page Builder', '/projects/page-builder'],
  ])('keeps the %s fallback when the known Sudoku record points at that route', (link, fallbackName, fallbackLink) => {
    const { projectsPage, carousel } = resolveProjectCards([
      { _id: sudokuId, name: 'Edited Sudoku', link },
    ]);
    for (const projects of [projectsPage, carousel]) {
      expect(projects.filter(project => project.name === 'Edited Sudoku')).toHaveLength(1);
      expect(projects.find(project => project.name === 'Edited Sudoku').link).toBe(link);
      expect(projects.filter(project => project.name === fallbackName)).toHaveLength(1);
      expect(projects.find(project => project.name === fallbackName).link).toBe(fallbackLink);
      expect(projects).toHaveLength(3);
    }
  });

  it('normalizes canonical routes without dropping their query or fragment', () => {
    const { projectsPage, carousel } = resolveProjectCards([
      { _id: sudokuId, name: 'Sudoku with options', link: 'https://berinkarjala.netlify.app/projects/SudokuSolver/?view=compact#board' },
      { _id: builderId, name: 'Builder with options', link: './projects/page-builder?view=compact#editor' },
    ]);
    for (const projects of [projectsPage, carousel]) {
      expect(projects.find(project => project.name === 'Sudoku with options').link).toBe('/projects/SudokuSolver?view=compact#board');
      expect(projects.find(project => project.name === 'Builder with options').link).toBe('/projects/page-builder?view=compact#editor');
    }
  });

  it('gives extras with the same link unique keys that remain stable across reordering', () => {
    const extras = [
      { _id: 'extra-first', name: 'First extra', link: 'https://example.com/shared' },
      { _id: 'extra-second', name: 'Second extra', link: 'https://example.com/shared' },
    ];
    const keyMap = projects => Object.fromEntries(projects.filter(project => project._id?.startsWith('extra-')).map(project => [project._id, project.cardKey]));
    const keys = keyMap(resolveProjectCards(extras).carousel);
    const reorderedKeys = keyMap(resolveProjectCards([...extras].reverse()).carousel);
    expect(typeof keys['extra-first']).toBe('string');
    expect(typeof keys['extra-second']).toBe('string');
    expect(keys['extra-first']).not.toBe(keys['extra-second']);
    expect(reorderedKeys).toEqual(keys);
  });

  it('prefers the canonical Page Builder document over another record using its route', () => {
    const { projectsPage, carousel } = resolveProjectCards([
      { _id: 'other-builder', name: 'Other builder', link: '/projects/page-builder' },
      { _id: builderId, name: 'Canonical builder', description: 'Edited canonical copy', link: '/projects/page-builder' },
    ]);
    for (const projects of [projectsPage, carousel]) {
      const builders = projects.filter(project => project.link === '/projects/page-builder');
      expect(builders).toHaveLength(1);
      expect(builders[0].name).toBe('Canonical builder');
      expect(builders[0].description).toBe('Edited canonical copy');
    }
  });
});

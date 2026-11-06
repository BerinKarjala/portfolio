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

  it('recognizes a Page Builder record by its action after its link changes', () => {
    const { projectsPage, carousel } = resolveProjectCards([
      { _id: 'studio-generated-id', kind: 'pageBuilder', name: 'Edited Builder', link: '/new-builder' },
    ]);
    for (const projects of [projectsPage, carousel]) {
      expect(projects.filter(project => project.name === 'Edited Builder')).toHaveLength(1);
      expect(projects.find(project => project.name === 'Edited Builder').link).toBe('/new-builder');
      expect(projects.some(project => project.name === 'HTML Page Builder')).toBe(false);
    }
  });

  it.each([
    [sudokuId, 'Canonical Sudoku', 'Other Sudoku', '/projects/SudokuSolver', 'Sudoku Solver'],
    [builderId, 'Canonical builder', 'Other builder', '/projects/page-builder', 'HTML Page Builder'],
  ])('retains both documents when the canonical project and another share %s', (id, canonicalName, otherName, link, fallbackName) => {
    const { projectsPage, carousel } = resolveProjectCards([
      { _id: 'other-project', name: otherName, link },
      { _id: id, name: canonicalName, description: 'Edited canonical copy', link },
    ]);
    for (const projects of [projectsPage, carousel]) {
      expect(projects.filter(project => project.name === canonicalName)).toHaveLength(1);
      expect(projects.filter(project => project.name === otherName)).toHaveLength(1);
      expect(projects.find(project => project.name === canonicalName).description).toBe('Edited canonical copy');
      expect(projects.filter(project => project.name === fallbackName)).toHaveLength(0);
      expect(projects.filter(project => project.link === link)).toHaveLength(2);
    }
  });
});

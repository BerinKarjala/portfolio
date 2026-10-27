/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import MoonArtwork from './MoonArtwork';

afterEach(cleanup);
const date = new Date('2024-04-15T19:13:00Z');

describe('moon artwork rendering', () => {
  it('shows only a named moon when weather is unavailable', () => {
    const { container } = render(<MoonArtwork date={date} />);
    expect(screen.getByRole('img', { name: /first quarter.*approximate/i })).not.toBeNull();
    expect(container.querySelectorAll('picture')).toHaveLength(0);
    expect(container.querySelector('svg image').getAttribute('href')).toMatch(/moon-master-384-[a-f0-9]{12}\.webp$/);
  });

  it('renders only the selected weather layers in front of the moon', () => {
    const { container, rerender } = render(<MoonArtwork date={date} weather={{ code: 2, daytime: true }} />);
    expect([...container.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['sun', 'partly-cloudy']);
    rerender(<MoonArtwork date={date} weather={{ code: 95, rainMm: 1, intervalSeconds: 900, windSpeedKmh: 40 }} />);
    expect([...container.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['thunderstorm', 'rain', 'wind', 'lightning']);
    expect(screen.getByRole('img', { name: /first quarter.*thunderstorm.*rain.*wind.*lightning/i })).not.toBeNull();
  });

  it('describes provider-reported showers without claiming spatial coverage', () => {
    render(<MoonArtwork date={date} weather={{ code: 80 }} />);
    const artwork = screen.getByRole('img', { name: /rain showers/i });
    expect(artwork.getAttribute('aria-label')).not.toMatch(/scattered/i);
  });

  it('flips the lunar disk for a southern location without flipping weather layers', () => {
    const { container } = render(<MoonArtwork date={date} latitude={-33} weather={{ code: 3 }} />);
    expect(container.querySelector('[data-moon-orientation]').getAttribute('transform')).toBe('translate(32 0) scale(-1 1)');
    expect(container.querySelector('picture').getAttribute('transform')).toBeNull();
  });

  it('falls back to a small PNG and then a simple moon if the lunar image fails', () => {
    const { container } = render(<MoonArtwork date={date} />);
    fireEvent.error(container.querySelector('svg image'));
    expect(container.querySelector('svg image').getAttribute('href')).toMatch(/moon-master-256-[a-f0-9]{12}\.png$/);
    fireEvent.error(container.querySelector('svg image'));
    expect(container.querySelector('svg image')).toBeNull();
    expect(container.querySelector('[data-moon-fallback]')).not.toBeNull();
  });

  it('falls back to PNG for failed weather images and removes a broken overlay', () => {
    const { container } = render(<MoonArtwork date={date} weather={{ code: 3 }} />);
    const image = container.querySelector('picture img');
    expect(container.querySelector('picture source')).not.toBeNull();
    fireEvent.error(image);
    expect(container.querySelector('picture source')).toBeNull();
    expect(container.querySelector('picture img').getAttribute('src')).toMatch(/overcast-256-[a-f0-9]{12}\.png$/);
    fireEvent.error(container.querySelector('picture img'));
    expect(container.querySelector('picture')).toBeNull();
  });

  it('omits the larger sources when the caller requests reduced data', () => {
    const { container } = render(<MoonArtwork date={date} weather={{ code: 3 }} reducedData />);
    expect(container.querySelector('picture source').getAttribute('srcset')).not.toMatch(/-768-[a-f0-9]{12}\.webp/);
  });
});

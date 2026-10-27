/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import MoonArtworkReview from './MoonArtworkReview';

afterEach(cleanup);

it('shows the sun for partly cloudy daytime and removes it when daytime is unchecked', () => {
  render(<MoonArtworkReview />);
  const phone = screen.getByRole('figure', { name: /phone-size artwork/i });
  fireEvent.change(screen.getByLabelText('Weather sample'), { target: { value: '2' } });
  expect([...phone.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['sun', 'partly-cloudy']);
  fireEvent.click(screen.getByLabelText('Daytime'));
  expect([...phone.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['partly-cloudy']);
  expect(within(phone).getByRole('img', { name: /first quarter.*clouds/i }).getAttribute('aria-label')).not.toMatch(/sun/i);
  fireEvent.click(screen.getByLabelText('Daytime'));
  expect([...phone.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['sun', 'partly-cloudy']);
});

it.each([
  ['3', 'overcast'], ['45', 'fog'], ['51', 'rain'], ['61', 'rain'],
  ['80', 'scattered-showers'], ['71', 'snow'], ['sleet', 'sleet'],
  ['95', 'thunderstorm'], ['96', 'hail'],
])('shows daytime sun alongside weather sample %s and hides it at night', (value, layer) => {
  render(<MoonArtworkReview />);
  const phone = screen.getByRole('figure', { name: /phone-size artwork/i });
  fireEvent.change(screen.getByLabelText('Weather sample'), { target: { value } });
  expect(phone.querySelector('picture[data-weather-layer="sun"]')).not.toBeNull();
  expect(phone.querySelector(`picture[data-weather-layer="${layer}"]`)).not.toBeNull();
  fireEvent.click(screen.getByLabelText('Daytime'));
  expect(phone.querySelector('picture[data-weather-layer="sun"]')).toBeNull();
  expect(phone.querySelector(`picture[data-weather-layer="${layer}"]`)).not.toBeNull();
});

it('lets reviewers inspect the moon with supported weather and southern orientation', () => {
  render(<MoonArtworkReview />);
  expect(screen.getByText(/illustrated samples.*not live weather/i)).not.toBeNull();
  const phone = screen.getByRole('figure', { name: /phone-size artwork/i });
  expect(within(phone).getByRole('img', { name: /first quarter/i })).not.toBeNull();
  fireEvent.change(screen.getByLabelText('Preview background'), { target: { value: 'light' } });
  expect(phone.querySelector('.moon-review__scene').style.backgroundColor).toBe('rgb(245, 242, 232)');
  fireEvent.change(screen.getByLabelText('Weather sample'), { target: { value: 'sleet' } });
  expect([...phone.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['sun', 'sleet']);
  fireEvent.change(screen.getByLabelText('Weather sample'), { target: { value: '95' } });
  fireEvent.click(screen.getByLabelText('Add recent rain'));
  fireEvent.click(screen.getByLabelText('Add wind'));
  expect([...phone.querySelectorAll('picture')].map(el => el.dataset.weatherLayer)).toEqual(['sun', 'thunderstorm', 'rain', 'wind', 'lightning']);
  fireEvent.click(screen.getByLabelText('Southern Hemisphere'));
  expect(phone.querySelector('[data-moon-orientation]').getAttribute('transform')).toBe('translate(32 0) scale(-1 1)');
});

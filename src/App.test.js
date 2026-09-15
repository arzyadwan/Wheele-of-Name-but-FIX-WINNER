import { render, screen } from '@testing-library/react';
import App, { getWinnerIndex } from './App';

jest.mock('./Wheel3D', () => () => <div data-testid="wheel-3d" />);

test('renders the 3D wheel and participant controls', () => {
  render(<App />);

  expect(screen.getByTestId('wheel-3d')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /daftar nama/i })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /nama peserta baru/i })).toBeInTheDocument();
  expect(screen.queryByText(/klik wheel untuk memutar/i)).not.toBeInTheDocument();
  expect(document.querySelector('.wheel-container')).not.toBeInTheDocument();
});

test.each(['kaivan atl', 'KAIVAN ATL', 'Kaivan Atl', 'kAiVaN aTl'])(
  'gives %s priority as the winner regardless of letter case',
  (priorityName) => {
    expect(getWinnerIndex(['Ilham', priorityName, 'Asep'])).toBe(1);
  },
);

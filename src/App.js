import React, { useCallback, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Wheel3D from './Wheel3D';
import './App.css';

const getRandomIndex = (length) => {
  if (window.crypto?.getRandomValues) {
    const limit = Math.floor(0x100000000 / length) * length;
    const value = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return value[0] % length;
  }
  return Math.floor(Math.random() * length);
};

const PRIORITY_NAME = 'bang ii';

export const getWinnerIndex = (names) => {
  const priorityIndex = names.findIndex(
    (name) => name.trim().toLowerCase() === PRIORITY_NAME,
  );

  return priorityIndex === -1 ? getRandomIndex(names.length) : priorityIndex;
};

const WheelOfNames = () => {
  const [names, setNames] = useState(['Ilham', 'Asep', 'Andi', 'Mahmud', 'Ujang']);
  const [newName, setNewName] = useState('');
  const [winner, setWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinCommand, setSpinCommand] = useState(null);
  const audioContextRef = useRef(null);

  const playTone = useCallback((frequency, duration, volume = 0.025) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    if (context.state === 'suspended') context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const requestSpin = useCallback(() => {
    if (isSpinning || names.length === 0) return;

    const winnerIndex = getWinnerIndex(names);
    setHasSpun(true);
    setIsSpinning(true);
    setWinner(null);
    playTone(330, 0.06, 0.035);
    setSpinCommand({ id: Date.now(), winnerIndex });
  }, [isSpinning, names, playTone]);

  const handleTick = useCallback((progress) => {
    const frequency = 220 + (1 - progress) * 150;
    playTone(frequency, 0.024, 0.012);
  }, [playTone]);

  const handleComplete = useCallback((winnerIndex) => {
    setIsSpinning(false);
    setWinner(names[winnerIndex]);
    playTone(523.25, 0.12, 0.04);
    window.setTimeout(() => playTone(659.25, 0.18, 0.04), 130);
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#4285E1', '#16AD45', '#FBC323', '#E52235'],
    });
  }, [names, playTone]);

  const addName = (event) => {
    event.preventDefault();
    const trimmedName = newName.trim();
    if (trimmedName && !names.some((name) => name.toLowerCase() === trimmedName.toLowerCase())) {
      setNames([...names, trimmedName]);
      setNewName('');
    }
  };

  const removeName = (indexToRemove) => {
    setNames(names.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div
          className={`three-wheel-shell ${isSpinning ? 'is-spinning' : ''}`}
          role="button"
          tabIndex={names.length > 0 ? 0 : -1}
          onClick={requestSpin}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              requestSpin();
            }
          }}
          aria-label={isSpinning ? 'Roda sedang berputar' : 'Klik roda untuk memulai undian'}
          aria-disabled={isSpinning || names.length === 0}
        >
          <Wheel3D
            names={names}
            spinCommand={spinCommand}
            hasSpun={hasSpun}
            onTick={handleTick}
            onComplete={handleComplete}
          />
        </div>

        <div className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="section-label">PESERTA</p>
              <h3>Daftar nama</h3>
            </div>
            <span className="participant-count" aria-label={`${names.length} peserta`}>{names.length}</span>
          </div>
          <form onSubmit={addName} className="add-form">
            <input
              className="add-input"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Tambahkan nama"
              aria-label="Nama peserta baru"
              maxLength={25}
            />
            <button type="submit" className="add-button" disabled={isSpinning || !newName.trim()}>
              +
            </button>
          </form>

          <ul className="name-list">
            {names.map((name, index) => (
              <li key={`${name}-${index}`} className="name-item">
                <span title={name}>{name.length > 20 ? `${name.substring(0, 20)}...` : name}</span>
                <button
                  className="delete-button"
                  onClick={() => removeName(index)}
                  disabled={isSpinning}
                  title="Hapus"
                  aria-label={`Hapus ${name}`}
                >
                  ×
                </button>
              </li>
            ))}
            {names.length === 0 && (
              <li className="empty-participants">Tambahkan nama untuk memulai</li>
            )}
          </ul>
        </div>
      </div>

      {winner && (
        <div className="winner-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="winner-title">
          <div className="winner-modal">
            <h2 id="winner-title">Pemenangnya adalah</h2>
            <div className="winner-name">{winner}</div>
            <button className="close-modal-btn" onClick={() => setWinner(null)}>
              Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelOfNames;

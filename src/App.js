import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

// Lebih modern dan vibrant palette
const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', 
  '#D4A5A5', '#9B59B6', '#3498DB', '#F1C40F', '#E74C3C'
];

const WheelOfNames = () => {
  const [names, setNames] = useState(['Ali', 'Budi', 'Hadi', 'Citra', 'Dewi']);
  const [newName, setNewName] = useState('');
  const [winner, setWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  
  const canvasRef = useRef(null);
  const currentAngle = useRef(0);
  const spinTimeTotal = 5000; 

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (names.length === 0) {
      // Draw empty wheel
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 15, 0, Math.PI * 2);
      ctx.fillStyle = '#E2E8F0';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#CBD5E0';
      ctx.stroke();
      ctx.fillStyle = "#A0AEC0";
      ctx.font = 'bold 24px Poppins, Arial';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Tidak ada nama", radius, radius);
      return;
    }

    const arc = (Math.PI * 2) / names.length;

    // Draw wheel segments
    names.forEach((name, i) => {
      const angle = currentAngle.current + i * arc;
      ctx.fillStyle = colors[i % colors.length];
      
      ctx.beginPath();
      // Radius - 15 agar ada ruang untuk stroke/shadow jika mau
      ctx.arc(radius, radius, radius - 15, angle, angle + arc, false);
      ctx.lineTo(radius, radius);
      ctx.fill();
      
      // Separator lines
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 20px Poppins, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      ctx.translate(
        radius + Math.cos(angle + arc / 2) * (radius - 70), 
        radius + Math.sin(angle + arc / 2) * (radius - 70)
      );
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      ctx.textAlign = "center";
      
      // Limit text length if it's too long
      const textToDraw = name.length > 12 ? name.substring(0, 10) + '...' : name;
      ctx.fillText(textToDraw, 0, 0);
      ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 15, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(radius, radius, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();
    
    // Center dot
    ctx.beginPath();
    ctx.arc(radius, radius, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#2D3748';
    ctx.fill();

    // Pointer
    ctx.fillStyle = "#2D3748";
    ctx.beginPath();
    ctx.moveTo(radius - 20, 10);
    ctx.lineTo(radius + 20, 10);
    ctx.lineTo(radius, 40);
    ctx.fill();
    
    // Pointer highlight/shadow
    ctx.fillStyle = "#4A5568";
    ctx.beginPath();
    ctx.moveTo(radius - 10, 15);
    ctx.lineTo(radius + 10, 15);
    ctx.lineTo(radius, 32);
    ctx.fill();
  }, [names]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const spin = () => {
    if (isSpinning || names.length === 0) return;
    
    setIsSpinning(true);
    setWinner(null);

    const startTime = Date.now();
    const initialAngle = currentAngle.current % (Math.PI * 2);
    
    // Logika Rigged yang disembunyikan
    const targetName = "Hadi";
    let targetIndex = names.indexOf(targetName);
    
    if (targetIndex === -1) {
      targetIndex = Math.floor(Math.random() * names.length);
    }

    const arc = (Math.PI * 2) / names.length;
    
    // Perhitungan posisi
    const finalAnglePosition = (Math.PI * 1.5) - (targetIndex * arc) - (arc / 2);
    const totalRotation = (Math.PI * 2 * 10) + (finalAnglePosition - initialAngle);

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / spinTimeTotal, 1);
      
      const easedProgress = easeOut(progress);
      currentAngle.current = initialAngle + easedProgress * totalRotation;
      
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setWinner(names[targetIndex]);
        confetti({ 
          particleCount: 200, 
          spread: 100, 
          origin: { y: 0.6 },
          colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C']
        });
      }
    };

    requestAnimationFrame(animate);
  };

  const addName = (e) => {
    e.preventDefault();
    if (newName.trim() && !names.includes(newName.trim())) {
      setNames([...names, newName.trim()]);
      setNewName('');
    }
  };

  const removeName = (indexToRemove) => {
    setNames(names.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="app-container">
      <h1 className="title">🎡 Wheel of Names</h1>
      
      <div className="main-content">
        <div className="wheel-container">
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} width="450" height="450" />
          </div>
          <button 
            className="spin-button"
            onClick={spin} 
            disabled={isSpinning || names.length === 0}
          >
            {isSpinning ? 'Memutar...' : 'PUTAR!'}
          </button>
        </div>

        <div className="sidebar">
          <h3>Daftar Peserta ({names.length})</h3>
          <form onSubmit={addName} className="add-form">
            <input 
              className="add-input"
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Masukkan nama baru..."
              maxLength={25}
            />
            <button type="submit" className="add-button" disabled={isSpinning || !newName.trim()}>
              +
            </button>
          </form>
          
          <ul className="name-list">
            {names.map((name, i) => (
              <li key={i} className="name-item">
                <span title={name}>{name.length > 20 ? name.substring(0, 20) + '...' : name}</span>
                <button 
                  className="delete-button"
                  onClick={() => removeName(i)}
                  disabled={isSpinning}
                  title="Hapus"
                >
                  ✕
                </button>
              </li>
            ))}
            {names.length === 0 && (
              <li style={{ textAlign: 'center', color: '#a0aec0', padding: '20px 0' }}>
                Belum ada peserta
              </li>
            )}
          </ul>
        </div>
      </div>

      {winner && (
        <div className="winner-modal-overlay">
          <div className="winner-modal">
            <h2>🎉 Pemenangnya Adalah 🎉</h2>
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
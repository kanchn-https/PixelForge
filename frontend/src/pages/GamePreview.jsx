import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function GamePreview() {
  const { projectId } = useParams();
  
  // Logical game resolution
  const GAME_WIDTH = 128;
  const GAME_HEIGHT = 64;
  const CELL_SIZE = 8;

  const initialSnake = [
    { x: 32, y: 32 },
    { x: 24, y: 32 },
    { x: 16, y: 32 }
  ];

  // Game State
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const [snake, setSnake] = useState(initialSnake);
  const [direction, setDirection] = useState({ x: CELL_SIZE, y: 0 });
  const [nextDirection, setNextDirection] = useState({ x: CELL_SIZE, y: 0 }); // Prevent double turn suicide
  const [coinPos, setCoinPos] = useState({ x: 80, y: 32 });

  // Handle Input for Snake Movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      setNextDirection(prev => {
        if (e.key === 'ArrowUp' && direction.y === 0) return { x: 0, y: -CELL_SIZE };
        if (e.key === 'ArrowDown' && direction.y === 0) return { x: 0, y: CELL_SIZE };
        if (e.key === 'ArrowLeft' && direction.x === 0) return { x: -CELL_SIZE, y: 0 };
        if (e.key === 'ArrowRight' && direction.x === 0) return { x: CELL_SIZE, y: 0 };
        return prev;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Discrete Game Loop for Snake
  useEffect(() => {
    if (!isPlaying || gameOver || win) return;

    const moveSnake = () => {
      setDirection(nextDirection);
      
      setSnake(prevSnake => {
        const head = prevSnake[0];
        let newX = head.x + nextDirection.x;
        let newY = head.y + nextDirection.y;

        // Wall wrapping
        if (newX < 0) newX = GAME_WIDTH - CELL_SIZE;
        if (newX >= GAME_WIDTH) newX = 0;
        if (newY < 0) newY = GAME_HEIGHT - CELL_SIZE;
        if (newY >= GAME_HEIGHT) newY = 0;

        // Self-collision (Phase 5 logic update)
        const isSelfCollision = prevSnake.some(segment => segment.x === newX && segment.y === newY);
        
        if (isSelfCollision) {
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setIsPlaying(false);
            }
            return newLives;
          });
          setNextDirection({ x: CELL_SIZE, y: 0 });
          return initialSnake; // Respawn snake
        }

        const newHead = { x: newX, y: newY };
        const newSnake = [newHead, ...prevSnake];

        // Coin collision (Growth & Score)
        if (newX === coinPos.x && newY === coinPos.y) {
          setScore(s => {
            const newScore = s + 1;
            if (newScore >= 10) {
              setWin(true);
              setIsPlaying(false);
            }
            return newScore;
          });
          
          // Spawn new coin at a valid grid location
          setCoinPos({
            x: Math.floor(Math.random() * (GAME_WIDTH / CELL_SIZE)) * CELL_SIZE,
            y: Math.floor(Math.random() * (GAME_HEIGHT / CELL_SIZE)) * CELL_SIZE
          });
          
          // Do NOT pop the tail to allow the snake to grow
        } else {
          newSnake.pop(); // Remove tail segment to maintain length
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(moveSnake, 150);
    return () => clearInterval(intervalId);
  }, [isPlaying, gameOver, win, nextDirection, coinPos]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleRestart = () => {
    setIsPlaying(true);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWin(false);
    setSnake(initialSnake);
    setDirection({ x: CELL_SIZE, y: 0 });
    setNextDirection({ x: CELL_SIZE, y: 0 });
    setCoinPos({ x: 80, y: 32 });
  };

  return (
    <div className="relative z-10 flex flex-col h-screen w-screen overflow-hidden text-ink bg-parchment">
      {/* Title Block Wrapper (Double Border) */}
      <div className="m-4 border-2 border-ink p-[1px] flex-1 flex flex-col">
        <div className="border border-ink-light bg-parchment/80 backdrop-blur-sm relative flex-1 flex flex-col">
          
          <header className="flex border-b-2 border-ink">
            {/* Left Region: Title */}
            <div className="flex-1 p-4 border-r-2 border-ink flex flex-col justify-center">
              <h1 className="font-black text-3xl uppercase tracking-widest text-ink leading-none">
                PixelForge
              </h1>
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-light mt-1">
                Game Preview
              </div>
            </div>

            {/* Right Meta-box */}
            <div className="w-64 flex flex-col text-[0.7rem] uppercase tracking-[0.15em] font-bold">
              <div className="flex-1 border-b border-grid-line-major p-2 bg-ink/5 flex items-center justify-center gap-2">
                 <Link to={`/builder/${projectId || 1}`} className="flex-1 text-center bg-transparent border border-ink text-ink py-1 hover:bg-ink hover:text-parchment transition-colors shadow-sm">
                   BACK TO BUILDER
                 </Link>
              </div>
              <div className="flex-1 border-b border-grid-line-major px-3 py-1 flex justify-between items-center bg-ink/5">
                <span className="text-ink-light">Status</span>
                <span>{isPlaying ? 'RUNNING' : win ? 'VICTORY' : gameOver ? 'GAME OVER' : 'PAUSED'}</span>
              </div>
              <div className="flex-1 border-b border-grid-line-major px-3 py-1 flex justify-between items-center">
                <span className="text-ink-light">Speed</span>
                <span>Fast</span>
              </div>
            </div>
          </header>

          {/* Navigation Strip */}
          <div className="flex border-b-2 border-ink bg-ink/5 text-[0.65rem] font-bold uppercase tracking-widest">
            <Link to="/" className="px-4 py-2 border-r border-ink hover:bg-ink hover:text-parchment transition-colors text-ink-light">Dashboard</Link>
            <Link to="/editor" className="px-4 py-2 border-r border-ink hover:bg-ink hover:text-parchment transition-colors text-ink-light">Pixel Editor</Link>
            <Link to={`/builder/${projectId || 1}`} className="px-4 py-2 border-r border-ink hover:bg-ink hover:text-parchment transition-colors text-ink-light">Game Builder</Link>
            <div className="px-4 py-2 border-r border-ink bg-ink text-parchment">Preview</div>
          </div>

          {/* Main Runtime Content */}
          <div className="flex-1 flex flex-col items-center justify-center bg-parchment-dark/30 p-8 relative">
            
            {/* Top HUD */}
            <div className="w-[512px] flex justify-between font-black text-xl uppercase tracking-widest text-ink mb-4">
              <div>SCORE: {score} / 10</div>
              <div className="text-coral">LIVES: {lives}</div>
            </div>

            {/* Game Screen Wrapper */}
            <div className="w-[512px] h-[256px] border-4 border-ink bg-parchment relative shadow-[8px_8px_0_rgba(44,24,16,0.15)] overflow-hidden">
              
              {/* Background Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(var(--grid-line-major) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-major) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
              
              {/* The Snake Body (Scaled 4x) */}
              {snake.map((segment, index) => (
                <div 
                  key={index}
                  className={`absolute flex items-center justify-center ${index === 0 ? 'bg-ink' : 'bg-ink-light'} border-2 border-parchment`}
                  style={{ 
                    left: `${segment.x * 4}px`, 
                    top: `${segment.y * 4}px`,
                    width: `${CELL_SIZE * 4}px`,
                    height: `${CELL_SIZE * 4}px`
                  }}
                />
              ))}

              {/* The Coin */}
              <div 
                className="absolute bg-sand text-ink border-2 border-ink font-bold text-xs flex items-center justify-center rounded-full"
                style={{ 
                  left: `${coinPos.x * 4}px`, 
                  top: `${coinPos.y * 4}px`,
                  width: `${CELL_SIZE * 4}px`,
                  height: `${CELL_SIZE * 4}px`
                }}
              >
                C
              </div>

              {/* Overlays */}
              {!isPlaying && !win && !gameOver && (
                <div className="absolute inset-0 bg-parchment/60 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="font-black text-3xl uppercase tracking-widest text-ink">PAUSED</div>
                </div>
              )}
              {win && (
                <div className="absolute inset-0 bg-sand-light/80 backdrop-blur-[2px] flex items-center justify-center flex-col z-10">
                  <div className="font-black text-5xl uppercase tracking-widest text-ink mb-2">YOU WIN!</div>
                  <div className="font-bold text-sm uppercase tracking-widest text-ink">Target Reached</div>
                </div>
              )}
              {gameOver && (
                <div className="absolute inset-0 bg-coral/20 backdrop-blur-[2px] flex items-center justify-center flex-col z-10">
                  <div className="font-black text-5xl uppercase tracking-widest text-coral mb-2">GAME OVER</div>
                  <div className="font-bold text-sm uppercase tracking-widest text-ink">Zero Lives Remaining</div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-8 flex gap-4">
              <button onClick={handlePlay} disabled={isPlaying || win || gameOver} className="bg-ink text-parchment border-2 border-ink px-6 py-3 font-bold uppercase tracking-widest hover:bg-ink-light transition-colors disabled:opacity-50">
                PLAY
              </button>
              <button onClick={handlePause} disabled={!isPlaying} className="bg-transparent text-ink border-2 border-ink px-6 py-3 font-bold uppercase tracking-widest hover:bg-ink/5 transition-colors disabled:opacity-50">
                PAUSE
              </button>
              <button onClick={handleRestart} className="bg-coral/10 text-coral border-2 border-coral px-6 py-3 font-bold uppercase tracking-widest hover:bg-coral hover:text-white transition-colors">
                RESTART
              </button>
            </div>
            
            <div className="mt-6 text-[0.65rem] font-bold uppercase tracking-widest text-ink-light text-center">
              Use <span className="text-ink">Arrow Keys</span> to control the Snake. Don't bite yourself!
            </div>

          </div>
          
        </div>
      </div>
    </div>
  );
}

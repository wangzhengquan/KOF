import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Menu from './components/Menu';
import HUD from './components/HUD';
import { GameStatus, FighterStats } from './types';
import { MAX_HP } from './constants';
import { generateFightCommentary } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [p1Hp, setP1Hp] = useState(MAX_HP);
  const [p2Hp, setP2Hp] = useState(MAX_HP);
  const [timer, setTimer] = useState(99);
  const [commentary, setCommentary] = useState<string>("");
  const [lastStats, setLastStats] = useState<FighterStats | null>(null);
  const [isLoadingCommentary, setIsLoadingCommentary] = useState(false);

  const startGame = () => {
    setStatus(GameStatus.PLAYING);
    setCommentary("");
    setLastStats(null);
  };

  const handleGameOver = useCallback(async (stats: FighterStats) => {
    setStatus(GameStatus.GAME_OVER);
    setLastStats(stats);
    setIsLoadingCommentary(true);
    
    // Call Gemini API
    const text = await generateFightCommentary(stats, "Iori-Clone");
    setCommentary(text);
    setIsLoadingCommentary(false);
  }, []);

  const handleHealthUpdate = useCallback((hp1: number, hp2: number) => {
    setP1Hp(hp1);
    setP2Hp(hp2);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      
      <div className="relative w-full max-w-[800px] aspect-video bg-black shadow-2xl rounded-lg overflow-hidden border-4 border-gray-800">
        <GameCanvas 
          status={status} 
          onGameOver={handleGameOver} 
          setHealth={handleHealthUpdate}
          setTimer={setTimer}
        />
        
        {/* UI Overlay */}
        {status === GameStatus.PLAYING && (
          <HUD p1Hp={p1Hp} p2Hp={p2Hp} timer={timer} />
        )}

        {/* Menu Overlay */}
        {status === GameStatus.MENU && <Menu onStart={startGame} />}

        {/* Game Over Screen */}
        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 text-center p-8 animate-fade-in">
             <h2 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-t from-red-600 to-yellow-500 title-font mb-4">
               {lastStats?.result === 'WIN' ? 'K.O. - YOU WIN' : lastStats?.result === 'LOSE' ? 'YOU LOSE' : 'DRAW GAME'}
             </h2>
             
             {/* Stats Box */}
             <div className="grid grid-cols-2 gap-8 text-left mb-8 font-mono text-gray-300">
                <div>
                   <p>HITS LANDED: <span className="text-white">{lastStats?.hitsLanded}</span></p>
                   <p>DAMAGE DEALT: <span className="text-white">{lastStats?.damageDealt}</span></p>
                </div>
                <div>
                   <p>BLOCKS: <span className="text-white">{lastStats?.blocks}</span></p>
                   <p>TIME LEFT: <span className="text-white">{lastStats?.timeLeft}s</span></p>
                </div>
             </div>

             {/* Gemini Commentary Box */}
             <div className="max-w-xl w-full bg-gray-800 border-l-4 border-blue-500 p-4 mb-8 shadow-lg relative">
                <div className="absolute -top-3 left-3 bg-blue-600 text-xs px-2 py-1 font-bold uppercase">
                   AI ANNOUNCER
                </div>
                {isLoadingCommentary ? (
                  <p className="text-gray-400 animate-pulse italic">Analyzing fight data...</p>
                ) : (
                  <p className="text-white text-lg font-medium italic">"{commentary}"</p>
                )}
             </div>

             <button 
                onClick={startGame}
                className="px-8 py-3 bg-white text-black font-bold hover:bg-gray-200 transition-colors arcade-font pointer-events-auto cursor-pointer"
             >
                PLAY AGAIN
             </button>
          </div>
        )}

        {/* CRT Scanline Overlay - Placed on top of everything but non-blocking */}
        <div className="absolute inset-0 scanlines pointer-events-none z-[60]"></div>
      </div>
    </div>
  );
};

export default App;
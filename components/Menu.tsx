import React from 'react';

interface MenuProps {
  onStart: () => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
      <h1 className="text-6xl md:text-8xl mb-8 text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 title-font tracking-wider transform -skew-x-12">
        KOF: AI ARENA
      </h1>
      
      <div className="space-y-6 text-center">
        <button 
          onClick={onStart}
          className="px-12 py-4 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-all transform hover:scale-105 arcade-font"
        >
          INSERT COIN / START
        </button>
        
        <div className="mt-12 p-6 bg-gray-900/80 rounded border border-gray-700 max-w-md mx-auto">
          <h3 className="text-xl text-yellow-400 mb-4 arcade-font">HOW TO PLAY</h3>
          <ul className="text-left space-y-2 text-gray-300 font-mono text-sm">
            <li><span className="font-bold text-white">[A] [D]</span> Move Left / Right</li>
            <li><span className="font-bold text-white">[W]</span> Jump</li>
            <li><span className="font-bold text-white">[J]</span> Light Attack (Fast)</li>
            <li><span className="font-bold text-white">[K]</span> Heavy Attack (Slow, Strong)</li>
          </ul>
        </div>
        
        <p className="text-xs text-gray-500 mt-8">POWERED BY GOOGLE GEMINI</p>
      </div>
    </div>
  );
};

export default Menu;
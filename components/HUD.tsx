import React from 'react';
import { MAX_HP } from '../constants';

interface HUDProps {
  p1Hp: number;
  p2Hp: number;
  timer: number;
}

const HUD: React.FC<HUDProps> = ({ p1Hp, p2Hp, timer }) => {
  const p1Percent = Math.max(0, (p1Hp / MAX_HP) * 100);
  const p2Percent = Math.max(0, (p2Hp / MAX_HP) * 100);

  return (
    <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex flex-col">
      {/* Health Bars Row */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto gap-4">
        
        {/* P1 Bar */}
        <div className="flex-1 relative">
           <div className="flex justify-between text-xs text-yellow-400 font-bold mb-1 arcade-font">
              <span>KYO-CLONE</span>
           </div>
           <div className="h-6 w-full bg-red-900 border-2 border-yellow-600 skew-x-[-12deg] relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-100 ease-out"
                style={{ width: `${p1Percent}%` }}
              ></div>
           </div>
        </div>

        {/* Timer */}
        <div className="w-16 h-16 flex items-center justify-center bg-gray-800 border-4 border-gray-600 rounded-full z-10">
           <span className={`text-2xl font-bold arcade-font ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
             {timer}
           </span>
        </div>

        {/* P2 Bar */}
        <div className="flex-1 relative">
           <div className="flex justify-between text-xs text-purple-400 font-bold mb-1 arcade-font">
              <span></span>
              <span>IORI-CLONE</span>
           </div>
           <div className="h-6 w-full bg-purple-900 border-2 border-gray-400 skew-x-[12deg] relative overflow-hidden">
               {/* Float right trick for bar depletion */}
              <div 
                className="h-full bg-gradient-to-l from-purple-400 to-purple-600 transition-all duration-100 ease-out ml-auto"
                style={{ width: `${p2Percent}%` }}
              ></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
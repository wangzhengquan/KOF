import { ActionState } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GROUND_Y = 400; // Lower ground to give more vertical space
export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const MOVE_SPEED = 6;
export const JUMP_FORCE = -14;

export const FIGHTER_WIDTH = 50;
export const FIGHTER_HEIGHT = 100;

export const P1_COLOR = '#ef4444'; 
export const P2_COLOR = '#8b5cf6';

export const ATTACK_DATA = {
  [ActionState.ATTACK_LIGHT]: {
    damage: 12,
    startup: 5,
    active: 10,
    recovery: 8,
    width: 70, // Wider for visual impact
    height: 30,
    yOffset: 30,
    color: '#fbbf24', 
  },
  [ActionState.ATTACK_HEAVY]: {
    damage: 25,
    startup: 12,
    active: 15,
    recovery: 20,
    width: 90, // Wider
    height: 50,
    yOffset: 35,
    color: '#f97316', 
  },
};

export const MAX_HP = 200;
export const MAX_ENERGY = 100;

// Visual Constants - More Cyberpunk/City colors
export const CITY_BUILDINGS = [
  { x: 50, w: 80, h: 200, color: '#1a1a2e' },
  { x: 150, w: 60, h: 300, color: '#16213e' },
  { x: 220, w: 100, h: 150, color: '#0f3460' },
  { x: 350, w: 70, h: 250, color: '#1a1a2e' },
  { x: 450, w: 90, h: 180, color: '#16213e' },
  { x: 560, w: 80, h: 280, color: '#0f3460' },
  { x: 680, w: 120, h: 160, color: '#1a1a2e' },
  { x: 800, w: 90, h: 220, color: '#16213e' },
];
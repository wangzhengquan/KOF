import { ActionState } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GROUND_Y = 380;
export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const MOVE_SPEED = 6;
export const JUMP_FORCE = -14;

export const FIGHTER_WIDTH = 50;
export const FIGHTER_HEIGHT = 100;

export const P1_COLOR = '#ef4444'; // Red-500
export const P2_COLOR = '#8b5cf6'; // Violet-500

export const ATTACK_DATA = {
  [ActionState.ATTACK_LIGHT]: {
    damage: 12, // Increased from 8
    startup: 5,
    active: 10,
    recovery: 8,
    width: 60,
    height: 20,
    yOffset: 30,
    color: '#fbbf24', // Amber
  },
  [ActionState.ATTACK_HEAVY]: {
    damage: 25, // Increased from 18
    startup: 12,
    active: 15,
    recovery: 20,
    width: 80,
    height: 40,
    yOffset: 40,
    color: '#f97316', // Orange
  },
};

export const MAX_HP = 200;
export const MAX_ENERGY = 100;
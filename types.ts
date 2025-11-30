export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum Direction {
  LEFT = -1,
  RIGHT = 1,
}

export enum ActionState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  JUMP = 'JUMP',
  CROUCH = 'CROUCH',
  ATTACK_LIGHT = 'ATTACK_LIGHT',
  ATTACK_HEAVY = 'ATTACK_HEAVY',
  HIT = 'HIT',
  BLOCK = 'BLOCK',
  DEAD = 'DEAD',
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FighterStats {
  hitsLanded: number;
  damageDealt: number;
  specialMovesUsed: number;
  blocks: number;
  timeLeft: number;
  result: 'WIN' | 'LOSE' | 'DRAW';
}

export interface Fighter {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  direction: Direction;
  state: ActionState;
  stateTimer: number; // Frames in current state
  hitbox: Box;
  attackBox: Box | null;
  isGrounded: boolean;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shake: number;
}
import React, { useRef, useEffect } from 'react';
import { 
  GameStatus, Fighter, ActionState, Direction, Box, Particle, 
  FighterStats, CameraState
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, GRAVITY, FRICTION, 
  MOVE_SPEED, JUMP_FORCE, FIGHTER_WIDTH, FIGHTER_HEIGHT, 
  P1_COLOR, P2_COLOR, ATTACK_DATA, MAX_HP, CITY_BUILDINGS 
} from '../constants';

interface GameCanvasProps {
  status: GameStatus;
  onGameOver: (stats: FighterStats) => void;
  setHealth: (p1: number, p2: number) => void;
  setTimer: (time: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, onGameOver, setHealth, setTimer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Game State Refs
  const playerRef = useRef<Fighter>({
    id: 1, name: 'Kyo', x: 150, y: GROUND_Y - FIGHTER_HEIGHT, vx: 0, vy: 0,
    hp: MAX_HP, maxHp: MAX_HP, energy: 0, maxEnergy: 100,
    direction: Direction.RIGHT, state: ActionState.IDLE, stateTimer: 0,
    hitbox: { x: 0, y: 0, width: FIGHTER_WIDTH, height: FIGHTER_HEIGHT },
    attackBox: null, isGrounded: true, color: P1_COLOR
  });

  const enemyRef = useRef<Fighter>({
    id: 2, name: 'Iori', x: 550, y: GROUND_Y - FIGHTER_HEIGHT, vx: 0, vy: 0,
    hp: MAX_HP, maxHp: MAX_HP, energy: 0, maxEnergy: 100,
    direction: Direction.LEFT, state: ActionState.IDLE, stateTimer: 0,
    hitbox: { x: 0, y: 0, width: FIGHTER_WIDTH, height: FIGHTER_HEIGHT },
    attackBox: null, isGrounded: true, color: P2_COLOR
  });

  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 1, shake: 0 });
  const hitStopRef = useRef<number>(0); // Frames to freeze physics
  const comboRef = useRef<number>(0);
  const comboTimerRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const gameTimeRef = useRef<number>(99);
  const lastTimeRef = useRef<number>(0);
  const statsRef = useRef<FighterStats>({
    hitsLanded: 0, damageDealt: 0, specialMovesUsed: 0, blocks: 0, timeLeft: 0, result: 'DRAW'
  });

  const isGameOver = useRef(false);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Physics & Logic ---
  const checkCollision = (box1: Box, box2: Box) => {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  };

  const spawnParticles = (x: number, y: number, color: string, count: number = 5, type: 'hit' | 'dust' | 'fire' = 'hit') => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * (type === 'hit' ? 20 : type === 'fire' ? 5 : 5),
        vy: (Math.random() - 0.5) * (type === 'hit' ? 20 : type === 'fire' ? -5 : 5),
        life: 20 + Math.random() * 15,
        color: type === 'hit' ? '#ffff00' : type === 'fire' ? '#ef4444' : '#aaaaaa',
        size: Math.random() * (type === 'hit' ? 8 : 4) + 2
      });
    }
  };

  const updateCamera = () => {
    const p1 = playerRef.current;
    const p2 = enemyRef.current;
    const cam = cameraRef.current;

    // Midpoint
    const midX = (p1.x + p2.x + FIGHTER_WIDTH) / 2;
    const midY = (p1.y + p2.y + FIGHTER_HEIGHT) / 2;

    // Distance for zoom
    const dist = Math.abs(p1.x - p2.x);
    let targetZoom = 1.0;
    if (dist < 200) targetZoom = 1.3;
    else if (dist > 500) targetZoom = 0.9;
    else targetZoom = 1.1;

    // Smooth transition
    cam.zoom += (targetZoom - cam.zoom) * 0.05;
    
    // Clamp zoom
    cam.zoom = Math.max(0.8, Math.min(1.4, cam.zoom));

    // Target position (Center on midpoint, but don't go out of bounds)
    const targetX = midX - (CANVAS_WIDTH / 2) / cam.zoom;
    const targetY = midY - (CANVAS_HEIGHT / 2) / cam.zoom - 50; // Look slightly up

    cam.x += (targetX - cam.x) * 0.1;
    cam.y += (targetY - cam.y) * 0.1;

    // Shake decay
    if (cam.shake > 0) cam.shake *= 0.8;
    if (cam.shake < 0.5) cam.shake = 0;
  };

  const resetGame = () => {
    playerRef.current.hp = MAX_HP;
    playerRef.current.x = 150;
    playerRef.current.state = ActionState.IDLE;
    playerRef.current.direction = Direction.RIGHT;
    
    enemyRef.current.hp = MAX_HP;
    enemyRef.current.x = 550;
    enemyRef.current.state = ActionState.IDLE;
    enemyRef.current.direction = Direction.LEFT;

    gameTimeRef.current = 99;
    isGameOver.current = false;
    cameraRef.current = { x: 0, y: 0, zoom: 1, shake: 0 };
    hitStopRef.current = 0;
    comboRef.current = 0;
    comboTimerRef.current = 0;
    statsRef.current = { hitsLanded: 0, damageDealt: 0, specialMovesUsed: 0, blocks: 0, timeLeft: 0, result: 'DRAW' };
    setHealth(MAX_HP, MAX_HP);
  };

  const update = (dt: number) => {
    if (status !== GameStatus.PLAYING || isGameOver.current) return;

    // --- HIT STOP LOGIC ---
    if (hitStopRef.current > 0) {
      hitStopRef.current--;
      // During hit stop, update shake but SKIP physics
      updateCamera();
      return; 
    }

    if (frameCountRef.current % 60 === 0 && gameTimeRef.current > 0) {
      gameTimeRef.current -= 1;
      setTimer(gameTimeRef.current);
    }
    if (gameTimeRef.current <= 0) handleGameOver();

    // Combo Timer
    if (comboTimerRef.current > 0) {
      comboTimerRef.current--;
    } else {
      comboRef.current = 0;
    }

    const p1 = playerRef.current;
    const p2 = enemyRef.current;

    // --- P1 Logic ---
    if ([ActionState.HIT, ActionState.ATTACK_LIGHT, ActionState.ATTACK_HEAVY].includes(p1.state)) {
      p1.stateTimer--;
      if (p1.stateTimer <= 0) {
        p1.state = ActionState.IDLE;
        p1.attackBox = null;
      }
    } else {
      if (keysRef.current['KeyA']) {
        p1.vx = -MOVE_SPEED;
        p1.direction = Direction.LEFT;
        p1.state = ActionState.WALK;
      } else if (keysRef.current['KeyD']) {
        p1.vx = MOVE_SPEED;
        p1.direction = Direction.RIGHT;
        p1.state = ActionState.WALK;
      } else {
        p1.vx = 0;
        p1.state = ActionState.IDLE;
      }

      if (keysRef.current['KeyW'] && p1.isGrounded) {
        p1.vy = JUMP_FORCE;
        p1.isGrounded = false;
        p1.state = ActionState.JUMP;
      }

      if (keysRef.current['KeyJ']) {
        p1.state = ActionState.ATTACK_LIGHT;
        p1.stateTimer = ATTACK_DATA[ActionState.ATTACK_LIGHT].recovery + ATTACK_DATA[ActionState.ATTACK_LIGHT].active;
        p1.vx = 0;
      } else if (keysRef.current['KeyK']) {
        p1.state = ActionState.ATTACK_HEAVY;
        p1.stateTimer = ATTACK_DATA[ActionState.ATTACK_HEAVY].recovery + ATTACK_DATA[ActionState.ATTACK_HEAVY].active;
        p1.vx = 0;
      }
    }

    // --- P2 AI Logic ---
    if ([ActionState.HIT, ActionState.ATTACK_LIGHT, ActionState.ATTACK_HEAVY].includes(p2.state)) {
      p2.stateTimer--;
      if (p2.stateTimer <= 0) {
        p2.state = ActionState.IDLE;
        p2.attackBox = null;
      }
    } else {
      const dist = Math.abs(p1.x - p2.x);
      const isFacing = (p2.x > p1.x && p2.direction === Direction.LEFT) || (p2.x < p1.x && p2.direction === Direction.RIGHT);
      
      if (p2.x > p1.x) p2.direction = Direction.LEFT;
      else p2.direction = Direction.RIGHT;

      if (dist < 90 && isFacing) {
        if (Math.random() < 0.05) {
          p2.state = ActionState.ATTACK_LIGHT;
          p2.stateTimer = 20;
        } else if (Math.random() < 0.02) {
          p2.state = ActionState.ATTACK_HEAVY;
          p2.stateTimer = 30;
        }
      } else if (dist < 200) {
        if (Math.random() < 0.03) {
           p2.vx = p2.direction * MOVE_SPEED;
           p2.state = ActionState.WALK;
        } else {
           p2.vx = 0; 
           p2.state = ActionState.IDLE;
        }
      } else {
        p2.vx = p2.direction * (MOVE_SPEED * 0.8);
        p2.state = ActionState.WALK;
      }
    }

    // --- Physics ---
    [p1, p2].forEach(p => {
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;

      if (p.y + FIGHTER_HEIGHT >= GROUND_Y) {
        p.y = GROUND_Y - FIGHTER_HEIGHT;
        p.vy = 0;
        p.isGrounded = true;
        if (p.state === ActionState.JUMP) p.state = ActionState.IDLE;
      }

      // Walls
      if (p.x < -100) p.x = -100;
      if (p.x + FIGHTER_WIDTH > CANVAS_WIDTH + 100) p.x = CANVAS_WIDTH + 100 - FIGHTER_WIDTH;

      p.hitbox = { x: p.x, y: p.y, width: FIGHTER_WIDTH, height: FIGHTER_HEIGHT };
    });

    // Collision Push
    if (checkCollision(p1.hitbox, p2.hitbox)) {
      const overlap = (p1.hitbox.width + p2.hitbox.width) / 2 - Math.abs((p1.x + FIGHTER_WIDTH/2) - (p2.x + FIGHTER_WIDTH/2));
      if (overlap > 0) {
         if (p1.x < p2.x) { p1.x -= 3; p2.x += 3; }
         else { p1.x += 3; p2.x -= 3; }
      }
    }

    // Attacks & Hits
    [p1, p2].forEach(attacker => {
      const defender = attacker.id === 1 ? p2 : p1;
      if ((attacker.state === ActionState.ATTACK_LIGHT || attacker.state === ActionState.ATTACK_HEAVY)) {
        const totalFrames = ATTACK_DATA[attacker.state].active + ATTACK_DATA[attacker.state].recovery;
        const currentFrame = totalFrames - attacker.stateTimer;
        const startup = ATTACK_DATA[attacker.state].startup;
        const active = ATTACK_DATA[attacker.state].active;

        if (currentFrame >= startup && currentFrame < startup + active && !attacker.attackBox) {
          const data = ATTACK_DATA[attacker.state];
          const atkX = attacker.direction === Direction.RIGHT 
            ? attacker.x + FIGHTER_WIDTH - 20
            : attacker.x - data.width + 20;
          
          attacker.attackBox = { x: atkX, y: attacker.y + data.yOffset, width: data.width, height: data.height };

          if (checkCollision(attacker.attackBox, defender.hitbox) && defender.state !== ActionState.HIT && defender.state !== ActionState.DEAD) {
             defender.hp -= data.damage;
             defender.state = ActionState.HIT;
             defender.stateTimer = 18;
             defender.vx = attacker.direction * 10;
             
             // HIT STOP & SHAKE
             hitStopRef.current = data.hitStop; 
             cameraRef.current.shake = attacker.state === ActionState.ATTACK_HEAVY ? 20 : 10; 
             
             // COMBO LOGIC
             if (attacker.id === 1) {
                 comboRef.current += 1;
                 comboTimerRef.current = 60; // 1 second window to continue combo
                 statsRef.current.hitsLanded++;
                 statsRef.current.damageDealt += data.damage;
             } else {
                // If AI hits player, reset player combo
                comboRef.current = 0;
             }

             spawnParticles(defender.x + FIGHTER_WIDTH/2, defender.y + 40, '#fff', 15, 'hit');
             if (attacker.state === ActionState.ATTACK_HEAVY) {
                spawnParticles(defender.x + FIGHTER_WIDTH/2, defender.y + 40, '#f59e0b', 10, 'fire');
             }

             if (defender.hp <= 0) {
               defender.hp = 0;
               defender.state = ActionState.DEAD;
               handleGameOver();
             }
          }
        }
      }
    });

    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });

    updateCamera();

    if (frameCountRef.current % 5 === 0) setHealth(p1.hp, p2.hp);
    frameCountRef.current++;
  };

  const handleGameOver = () => {
    if (isGameOver.current) return;
    isGameOver.current = true;
    const p1 = playerRef.current;
    const p2 = enemyRef.current;
    let result: 'WIN' | 'LOSE' | 'DRAW' = 'DRAW';
    if (p1.hp > p2.hp) result = 'WIN';
    else if (p2.hp > p1.hp) result = 'LOSE';
    statsRef.current.result = result;
    statsRef.current.timeLeft = gameTimeRef.current;
    onGameOver(statsRef.current);
  };

  // --- HIGH FIDELITY RENDERER ---

  // Helper: Draw a shape with a gradient (Light to Dark)
  const drawBodyPart = (ctx: CanvasRenderingContext2D, points: number[][], baseColor: string, darkColor: string, xOff: number = 0, yOff: number = 0) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0][0] + xOff, points[0][1] + yOff);
      for(let i=1; i<points.length; i++) {
          ctx.lineTo(points[i][0] + xOff, points[i][1] + yOff);
      }
      ctx.closePath();

      // Create Gradient from top-left to bottom-right bounds
      // A simple linear gradient usually works best for body parts
      const grd = ctx.createLinearGradient(xOff, yOff, xOff + 20, yOff + 40);
      grd.addColorStop(0, baseColor);
      grd.addColorStop(1, darkColor);
      ctx.fillStyle = grd;
      ctx.fill();
      
      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
  };

  const drawKyoHighDef = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, state: ActionState, direction: number) => {
    const isHit = state === ActionState.HIT;
    const isAttacking = state === ActionState.ATTACK_LIGHT || state === ActionState.ATTACK_HEAVY;
    const breathe = Math.sin(t * 0.1) * 1.5;
    
    ctx.save();
    ctx.translate(x + FIGHTER_WIDTH/2, y + FIGHTER_HEIGHT);
    ctx.scale(direction, 1);

    // Dynamic lean
    const lean = isHit ? -0.4 : (isAttacking ? 0.3 : 0);
    ctx.rotate(lean);

    // --- LEGS ---
    // Back Leg
    drawBodyPart(ctx, [[-5, -50], [-25, 0], [-10, 0], [5, -50]], '#2563eb', '#1e3a8a');
    // Front Leg
    drawBodyPart(ctx, [[5, -50], [25, 0], [35, 0], [15, -50]], '#3b82f6', '#1d4ed8');
    
    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(-28, -5, 20, 5);
    ctx.fillRect(23, -5, 20, 5);
    // Shoe detail
    ctx.fillStyle = '#fff';
    ctx.fillRect(-25, -2, 10, 2);
    ctx.fillRect(26, -2, 10, 2);

    // --- TORSO ---
    const torsoY = -95 + breathe + (isHit ? 10 : 0);
    
    // White Shirt (Base)
    drawBodyPart(ctx, [[-15, torsoY], [15, torsoY], [12, torsoY+50], [-12, torsoY+50]], '#f3f4f6', '#d1d5db');
    
    // Jacket (Left/Right Panels)
    // Left
    drawBodyPart(ctx, [[-18, torsoY-2], [-10, torsoY+10], [-10, torsoY+50], [-20, torsoY+48]], '#1f2937', '#000000');
    // Right
    drawBodyPart(ctx, [[18, torsoY-2], [10, torsoY+10], [10, torsoY+50], [20, torsoY+48]], '#374151', '#111827');
    
    // Collar (High)
    drawBodyPart(ctx, [[-18, torsoY], [-22, torsoY-8], [22, torsoY-8], [18, torsoY]], '#111827', '#000000');

    // --- ARMS ---
    // Back Arm
    ctx.save();
    ctx.translate(15, torsoY + 5);
    const backArmRot = isAttacking ? -1 : Math.sin(t*0.1) * 0.1;
    ctx.rotate(backArmRot);
    drawBodyPart(ctx, [[-6,0], [6,0], [5,25], [-5,25]], '#1f2937', '#000'); // Sleeve
    drawBodyPart(ctx, [[-5,25], [5,25], [4,45], [-4,45]], '#fdba74', '#fb923c', 0, 0); // Forearm
    ctx.fillStyle = '#4b2518'; ctx.fillRect(-5, 45, 10, 10); // Glove
    ctx.restore();

    // --- HEAD ---
    const headY = torsoY - 22;
    // Neck
    ctx.fillStyle = '#fdba74';
    ctx.fillRect(-6, headY+10, 12, 10);
    
    // Face shape
    drawBodyPart(ctx, [[-10, headY], [10, headY], [8, headY+18], [0, headY+22], [-8, headY+18]], '#ffedd5', '#fdba74');
    
    // Face Features (Eyes)
    ctx.fillStyle = '#000';
    if (!isHit) {
        ctx.fillRect(2, headY+8, 4, 2); // Right eye
        ctx.fillRect(-2, headY+8, -4, 2); // Left eye
        // Eyebrows
        ctx.fillRect(2, headY+6, 5, 1); 
        ctx.fillRect(-2, headY+6, -5, 1); 
    } else {
        ctx.fillText(">", 2, headY+10);
        ctx.fillText("<", -6, headY+10);
    }
    
    // Hair (Spiky Brown Gradient)
    const hairGrad = ctx.createLinearGradient(0, headY-20, 0, headY);
    hairGrad.addColorStop(0, '#78350f');
    hairGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.moveTo(-12, headY+5);
    ctx.lineTo(-14, headY-10); // Side
    ctx.lineTo(-8, headY-18); // Top L
    ctx.lineTo(0, headY-22); // Top Mid
    ctx.lineTo(8, headY-18); // Top R
    ctx.lineTo(14, headY-10); // Side
    ctx.lineTo(12, headY+5);
    ctx.lineTo(0, headY-5); // Bangs
    ctx.fill();

    // White Headband
    ctx.fillStyle = '#fff';
    ctx.fillRect(-12, headY-8, 24, 4);
    // Headband Knot (Dynamic)
    const knotX = -12;
    const knotY = headY - 6;
    ctx.beginPath();
    ctx.moveTo(knotX, knotY);
    ctx.quadraticCurveTo(knotX - 10, knotY + breathe * 2, knotX - 15, knotY + 10);
    ctx.lineTo(knotX - 5, knotY + 10);
    ctx.fill();

    // --- FRONT ARM (Attack Arm) ---
    ctx.save();
    ctx.translate(-15, torsoY + 5);
    let frontArmRot = 0.5; // Guard
    let extend = 0;
    
    if (state === ActionState.ATTACK_LIGHT) {
        frontArmRot = -1.5; extend = 25;
    } else if (state === ActionState.ATTACK_HEAVY) {
        frontArmRot = -1.2; extend = 15; // Upper
    }
    
    ctx.rotate(frontArmRot);
    drawBodyPart(ctx, [[-7,0], [7,0], [6,25], [-6,25]], '#374151', '#111827'); // Sleeve
    drawBodyPart(ctx, [[-5,25], [5,25], [4,45+extend], [-4,45+extend]], '#fdba74', '#fb923c', 0, 0); // Forearm
    // Glove
    ctx.fillStyle = '#4b2518'; 
    ctx.beginPath(); ctx.arc(0, 50+extend, 8, 0, Math.PI*2); ctx.fill();
    
    // FIRE EFFECT
    if (isAttacking) {
        const fireGrad = ctx.createRadialGradient(0, 50+extend, 5, 0, 50+extend, 30);
        fireGrad.addColorStop(0, '#fff');
        fireGrad.addColorStop(0.3, '#facc15');
        fireGrad.addColorStop(0.7, '#ef4444');
        fireGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath(); ctx.arc(0, 50+extend, 35, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  };

  const drawIoriHighDef = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, state: ActionState, direction: number) => {
    const isHit = state === ActionState.HIT;
    const isAttacking = state === ActionState.ATTACK_LIGHT || state === ActionState.ATTACK_HEAVY;
    const breathe = Math.sin(t * 0.08) * 2;
    
    ctx.save();
    ctx.translate(x + FIGHTER_WIDTH/2, y + FIGHTER_HEIGHT);
    ctx.scale(direction, 1);
    
    const lean = 0.5 + (isHit ? -0.5 : 0);
    ctx.rotate(lean);

    // --- LEGS ---
    // Bondage Pants (Red)
    drawBodyPart(ctx, [[-10, -50], [-30, 0], [-10, 0], [0, -50]], '#ef4444', '#b91c1c'); // Back
    drawBodyPart(ctx, [[5, -50], [30, 0], [10, 0], [15, -50]], '#f87171', '#dc2626'); // Front
    
    // The Strap
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-15, -30);
    ctx.quadraticCurveTo(0 + Math.sin(t*0.2)*5, -10, 20, -30);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(-32, -5, 22, 5);
    ctx.fillRect(10, -5, 22, 5);

    // --- TORSO ---
    const torsoY = -75 + breathe;
    
    // Long White Shirt (Tail logic)
    // Back Tail
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(-15, torsoY + 40);
    ctx.quadraticCurveTo(-25, torsoY + 80 + breathe, -5, torsoY + 70);
    ctx.fill();
    
    // Main Torso
    drawBodyPart(ctx, [[-16, torsoY], [16, torsoY], [14, torsoY+45], [-14, torsoY+45]], '#ffffff', '#d1d5db');
    
    // --- HEAD ---
    const headY = torsoY - 18;
    // Choker
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, headY+12, 16, 5);
    
    // Face
    drawBodyPart(ctx, [[-10, headY], [10, headY], [8, headY+18], [0, headY+25], [-8, headY+18]], '#ffedd5', '#fdba74');
    
    // Iconic Red Hair
    const hairGrad = ctx.createLinearGradient(0, headY-10, 0, headY+20);
    hairGrad.addColorStop(0, '#ef4444');
    hairGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.moveTo(-12, headY-5);
    ctx.quadraticCurveTo(0, headY-25, 18, headY-5); // Top
    ctx.quadraticCurveTo(28, headY+15, 22, headY+25); // Bangs covering eye
    ctx.lineTo(8, headY+10);
    ctx.lineTo(-12, headY+10);
    ctx.fill();

    // Visible Eye (Left side only)
    if (!isHit) {
        ctx.fillStyle = '#000';
        ctx.fillRect(-4, headY+8, 4, 2);
    }

    // --- ARMS ---
    // Front Arm (The Claw)
    ctx.save();
    ctx.translate(-5, torsoY + 5);
    let armRot = 0.2 + Math.sin(t*0.1)*0.05;
    if (isAttacking) armRot = -1.5;
    ctx.rotate(armRot);
    
    drawBodyPart(ctx, [[-6,0], [6,0], [5,25], [-5,25]], '#fff', '#e5e7eb'); // Sleeve
    drawBodyPart(ctx, [[-5,25], [5,25], [4,50], [-4,50]], '#ffedd5', '#fdba74', 0, 0); // Arm
    
    // Claw Hand
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.moveTo(-6, 50);
    ctx.lineTo(0, 65); // Sharp finger
    ctx.lineTo(6, 50);
    ctx.fill();

    // PURPLE FIRE
    if (isAttacking) {
        const fireGrad = ctx.createRadialGradient(0, 60, 5, 0, 60, 35);
        fireGrad.addColorStop(0, '#fff');
        fireGrad.addColorStop(0.3, '#d8b4fe');
        fireGrad.addColorStop(0.6, '#9333ea');
        fireGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath(); ctx.arc(0, 60, 40, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cam = cameraRef.current;
    const shakeX = (Math.random() - 0.5) * cam.shake;
    const shakeY = (Math.random() - 0.5) * cam.shake;

    ctx.save();
    // Apply Camera
    ctx.translate(CANVAS_WIDTH/2 + shakeX, CANVAS_HEIGHT/2 + shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x - CANVAS_WIDTH/2, -cam.y - CANVAS_HEIGHT/2);

    // --- BACKGROUND ---
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#020617');
    sky.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = sky;
    ctx.fillRect(cam.x, cam.y - 100, CANVAS_WIDTH / cam.zoom + 200, CANVAS_HEIGHT / cam.zoom + 200);

    // Moon
    ctx.shadowBlur = 50;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fffce6';
    ctx.beginPath(); ctx.arc(150, 80, 50, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // City Layers (Parallax)
    CITY_BUILDINGS.forEach((b, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#0f172a' : '#1e293b';
        const h = b.h;
        const x = (b.x - cam.x * 0.2) % (CANVAS_WIDTH + 400) - 200;
        ctx.fillRect(x, GROUND_Y - h, b.w, h);
        
        // Lit Windows
        ctx.fillStyle = '#f59e0b'; 
        for(let wy = GROUND_Y - b.h + 10; wy < GROUND_Y - 10; wy += 30) {
            for(let wx = x + 5; wx < x + b.w - 5; wx += 15) {
                if (Math.random() > 0.4) ctx.fillRect(wx, wy, 6, 10);
            }
        }
    });

    // Floor
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    floorGrad.addColorStop(0, '#111');
    floorGrad.addColorStop(1, '#000');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(cam.x - 100, GROUND_Y, CANVAS_WIDTH / cam.zoom + 400, CANVAS_HEIGHT - GROUND_Y + 100);

    // Shadows
    [enemyRef.current, playerRef.current].forEach(f => {
       ctx.fillStyle = 'rgba(0,0,0,0.6)';
       ctx.beginPath();
       ctx.ellipse(f.x + FIGHTER_WIDTH/2, GROUND_Y - 5, 30, 8, 0, 0, Math.PI*2);
       ctx.fill();
    });

    // --- CHARACTERS ---
    const t = frameCountRef.current;
    
    // Draw Enemy (Iori)
    drawIoriHighDef(ctx, enemyRef.current.x, enemyRef.current.y, t, enemyRef.current.state, enemyRef.current.direction);
    
    // Draw Player (Kyo)
    drawKyoHighDef(ctx, playerRef.current.x, playerRef.current.y, t, playerRef.current.state, playerRef.current.direction);

    // --- PARTICLES ---
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life / 20;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // --- OVERLAY EFFECTS ---
    // Vignette
    const grad = ctx.createRadialGradient(cam.x + CANVAS_WIDTH/2, cam.y + CANVAS_HEIGHT/2, 300, cam.x + CANVAS_WIDTH/2, cam.y + CANVAS_HEIGHT/2, 600);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(cam.x, cam.y, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- UI IN WORLD (Combo Counter) ---
    if (comboRef.current > 1) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.font = 'italic 900 48px "Black Ops One", sans-serif';
        const text = `${comboRef.current} HITS`;
        const metrics = ctx.measureText(text);
        
        // Pulse effect
        const scale = 1 + Math.sin(t * 0.2) * 0.1;
        ctx.translate(100, 150);
        ctx.scale(scale, scale);
        
        ctx.fillText(text, 0, 0);
        ctx.strokeText(text, 0, 0);
        
        ctx.font = 'italic 700 24px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText("COMBO", 10, 30);
        
        ctx.restore();
    }

    ctx.restore();
  };

  const gameLoop = (time: number) => {
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      update(dt);
      draw(ctx);
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
       resetGame();
       requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status]);

  return (
    <div className="relative border-4 border-gray-800 shadow-2xl rounded-lg overflow-hidden bg-black w-full h-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block w-full h-full object-contain"
      />
      {status === GameStatus.PLAYING && frameCountRef.current < 120 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <h1 className="text-6xl text-yellow-400 arcade-font animate-pulse drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">
               READY... FIGHT!
            </h1>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;
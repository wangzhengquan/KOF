import React, { useRef, useEffect } from 'react';
import { 
  GameStatus, Fighter, ActionState, Direction, Box, Particle, 
  FighterStats 
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
    id: 1, name: 'Kyo-Clone', x: 100, y: GROUND_Y - FIGHTER_HEIGHT, vx: 0, vy: 0,
    hp: MAX_HP, maxHp: MAX_HP, energy: 0, maxEnergy: 100,
    direction: Direction.RIGHT, state: ActionState.IDLE, stateTimer: 0,
    hitbox: { x: 0, y: 0, width: FIGHTER_WIDTH, height: FIGHTER_HEIGHT },
    attackBox: null, isGrounded: true, color: P1_COLOR
  });

  const enemyRef = useRef<Fighter>({
    id: 2, name: 'Iori-Clone', x: 600, y: GROUND_Y - FIGHTER_HEIGHT, vx: 0, vy: 0,
    hp: MAX_HP, maxHp: MAX_HP, energy: 0, maxEnergy: 100,
    direction: Direction.LEFT, state: ActionState.IDLE, stateTimer: 0,
    hitbox: { x: 0, y: 0, width: FIGHTER_WIDTH, height: FIGHTER_HEIGHT },
    attackBox: null, isGrounded: true, color: P2_COLOR
  });

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

  const spawnParticles = (x: number, y: number, color: string, count: number = 5, type: 'hit' | 'dust' = 'hit') => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * (type === 'hit' ? 20 : 5),
        vy: (Math.random() - 0.5) * (type === 'hit' ? 20 : 5),
        life: 20 + Math.random() * 15,
        color: type === 'hit' ? (Math.random() > 0.5 ? '#ffff00' : '#ffaa00') : '#aaaaaa',
        size: Math.random() * (type === 'hit' ? 6 : 3) + 2
      });
    }
  };

  const resetGame = () => {
    playerRef.current.hp = MAX_HP;
    playerRef.current.x = 100;
    playerRef.current.state = ActionState.IDLE;
    playerRef.current.direction = Direction.RIGHT;
    
    enemyRef.current.hp = MAX_HP;
    enemyRef.current.x = 600;
    enemyRef.current.state = ActionState.IDLE;
    enemyRef.current.direction = Direction.LEFT;

    gameTimeRef.current = 99;
    isGameOver.current = false;
    statsRef.current = { hitsLanded: 0, damageDealt: 0, specialMovesUsed: 0, blocks: 0, timeLeft: 0, result: 'DRAW' };
    setHealth(MAX_HP, MAX_HP);
  };

  const update = (dt: number) => {
    if (status !== GameStatus.PLAYING || isGameOver.current) return;

    if (frameCountRef.current % 60 === 0 && gameTimeRef.current > 0) {
      gameTimeRef.current -= 1;
      setTimer(gameTimeRef.current);
    }
    if (gameTimeRef.current <= 0) handleGameOver();

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

      if (dist < 80 && isFacing) {
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
        p2.vx = p2.direction * (MOVE_SPEED * 0.8); // Aggressive approach
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
        
        // Landing dust
        if (p.vy > 5) spawnParticles(p.x + FIGHTER_WIDTH/2, GROUND_Y, '#888', 3, 'dust');
      }

      if (p.x < 0) p.x = 0;
      if (p.x + FIGHTER_WIDTH > CANVAS_WIDTH) p.x = CANVAS_WIDTH - FIGHTER_WIDTH;

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

    // Attacks
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
            ? attacker.x + FIGHTER_WIDTH - 20 // Overlap slightly
            : attacker.x - data.width + 20;
          
          attacker.attackBox = { x: atkX, y: attacker.y + data.yOffset, width: data.width, height: data.height };

          if (checkCollision(attacker.attackBox, defender.hitbox) && defender.state !== ActionState.HIT && defender.state !== ActionState.DEAD) {
             defender.hp -= data.damage;
             defender.state = ActionState.HIT;
             defender.stateTimer = 15;
             defender.vx = attacker.direction * 8; // Knockback
             spawnParticles(defender.x + FIGHTER_WIDTH/2, defender.y + 40, '#fff', 12, 'hit');
             if (attacker.id === 1) {
                statsRef.current.hitsLanded++;
                statsRef.current.damageDealt += data.damage;
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

  // --- RENDERING SYSTEM ---

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#0a0a1a');
    sky.addColorStop(1, '#2d2d5a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // Moon
    ctx.fillStyle = '#fffce6';
    ctx.beginPath();
    ctx.arc(120, 90, 45, 0, Math.PI * 2);
    ctx.fill();
    // Moon crater detail
    ctx.fillStyle = '#eeeacd';
    ctx.beginPath(); ctx.arc(140, 80, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(110, 100, 12, 0, Math.PI*2); ctx.fill();

    // City Layer 1 (Back)
    CITY_BUILDINGS.forEach((b, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#111122' : '#16162e';
        const h = b.h * 0.8;
        const x = (b.x - playerRef.current.x * 0.1) % (CANVAS_WIDTH + 200) - 100;
        ctx.fillRect(x, GROUND_Y - h, b.w, h);
    });

    // City Layer 2 (Front)
    CITY_BUILDINGS.forEach((b, i) => {
        ctx.fillStyle = b.color;
        const x = (b.x - playerRef.current.x * 0.3) % (CANVAS_WIDTH + 200) - 100;
        ctx.fillRect(x, GROUND_Y - b.h, b.w, b.h);
        
        // Windows
        ctx.fillStyle = '#ffeb3b'; 
        ctx.globalAlpha = 0.6;
        for(let wy = GROUND_Y - b.h + 10; wy < GROUND_Y - 10; wy += 20) {
            for(let wx = x + 5; wx < x + b.w - 5; wx += 15) {
                if ((i + Math.floor(wx) + wy) % 5 !== 0) { 
                    ctx.fillRect(wx, wy, 8, 12);
                }
            }
        }
        ctx.globalAlpha = 1.0;
    });

    // Floor
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    floorGrad.addColorStop(0, '#1a1a1a');
    floorGrad.addColorStop(1, '#000000');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  };

  // Helper for drawing organic shapes
  const drawPath = (ctx: CanvasRenderingContext2D, points: number[][], color: string, close = true) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for(let i=1; i<points.length; i++) {
          ctx.lineTo(points[i][0], points[i][1]);
      }
      if(close) ctx.closePath();
      ctx.fill();
  };

  const drawKyo = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, state: ActionState, direction: number, isP1: boolean) => {
    const breathe = Math.sin(t * 0.1) * 2;
    const isAttacking = state === ActionState.ATTACK_LIGHT || state === ActionState.ATTACK_HEAVY;
    const isHit = state === ActionState.HIT;
    
    // Scale X for direction
    ctx.save();
    ctx.translate(x + FIGHTER_WIDTH/2, y + FIGHTER_HEIGHT); // Pivot at feet
    ctx.scale(direction, 1);

    // --- LEGS ---
    const stanceW = isAttacking ? 25 : 20;
    // Back Leg
    ctx.fillStyle = '#1e3a8a'; // Dark Blue Jeans
    ctx.beginPath();
    ctx.moveTo(-5, -50); // Hip
    ctx.lineTo(-stanceW - 10, 0); // Foot
    ctx.lineTo(-stanceW, 0); 
    ctx.lineTo(5, -50);
    ctx.fill();
    // Shoe
    ctx.fillStyle = '#333';
    ctx.fillRect(-stanceW - 12, -5, 18, 5);

    // Front Leg
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(5, -50); // Hip
    ctx.lineTo(stanceW + 5, 0); // Foot
    ctx.lineTo(stanceW + 15, 0);
    ctx.lineTo(15, -50);
    ctx.fill();
    // Shoe
    ctx.fillStyle = '#333';
    ctx.fillRect(stanceW + 3, -5, 18, 5);

    // --- TORSO ---
    const torsoY = isHit ? -55 : -90 + breathe;
    const torsoRot = isHit ? -0.2 : (isAttacking ? 0.2 : 0);
    
    ctx.rotate(torsoRot);
    
    // White T-shirt
    ctx.fillStyle = '#fff';
    ctx.fillRect(-15, torsoY, 30, 45);
    
    // Jacket (Open)
    ctx.fillStyle = '#111'; // Black jacket
    ctx.beginPath();
    ctx.moveTo(-16, torsoY);
    ctx.lineTo(-16, torsoY + 45);
    ctx.lineTo(-8, torsoY + 45);
    ctx.lineTo(-8, torsoY); // Left flap
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(16, torsoY);
    ctx.lineTo(16, torsoY + 45);
    ctx.lineTo(8, torsoY + 45);
    ctx.lineTo(8, torsoY); // Right flap
    ctx.fill();

    // Collar
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(-16, torsoY);
    ctx.lineTo(-20, torsoY - 5);
    ctx.lineTo(20, torsoY - 5);
    ctx.lineTo(16, torsoY);
    ctx.fill();

    // --- HEAD ---
    const headY = torsoY - 18;
    ctx.fillStyle = '#ffdbac'; // Skin
    ctx.beginPath();
    ctx.arc(0, headY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair (Spiky Brown)
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(-14, headY - 5);
    ctx.lineTo(-18, headY - 15); // Spike 1
    ctx.lineTo(-5, headY - 10);
    ctx.lineTo(0, headY - 20); // Spike 2
    ctx.lineTo(5, headY - 10);
    ctx.lineTo(18, headY - 15); // Spike 3
    ctx.lineTo(14, headY - 5);
    ctx.fill();
    
    // Headband
    ctx.fillStyle = '#eee';
    ctx.fillRect(-13, headY - 12, 26, 4);
    // Tails
    ctx.beginPath();
    ctx.moveTo(12, headY - 10);
    ctx.quadraticCurveTo(25, headY - 5 + breathe, 28, headY + 5 + breathe);
    ctx.lineTo(24, headY + 5 + breathe);
    ctx.quadraticCurveTo(20, headY - 5, 12, headY - 8);
    ctx.fill();

    // --- ARMS ---
    // Back Arm
    ctx.fillStyle = '#111'; // Sleeve
    ctx.save();
    ctx.translate(10, torsoY + 5);
    ctx.rotate(state === ActionState.BLOCK ? -1.5 : (isAttacking ? -0.5 : 0.5 + Math.sin(t*0.1)*0.1));
    ctx.fillRect(-5, 0, 10, 20);
    // Forearm
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(-4, 20, 8, 15);
    // Glove
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-5, 35, 12, 12);
    ctx.restore();

    // Front Arm (Attack Arm)
    ctx.save();
    ctx.translate(-12, torsoY + 5);
    
    let armRot = -0.5 + Math.cos(t*0.1)*0.1; // Guard stance
    let extend = 0;
    
    if (state === ActionState.ATTACK_LIGHT) {
        armRot = -1.5;
        extend = 20;
    } else if (state === ActionState.ATTACK_HEAVY) {
        armRot = -1.2; // Uppercut angle
        extend = 15;
    }

    ctx.rotate(armRot);
    ctx.fillStyle = '#111'; // Sleeve
    ctx.fillRect(-6, 0, 12, 20);
    // Forearm
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(-5, 20 + extend, 10, 15);
    // Glove
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-6, 35 + extend, 14, 14); // Fist

    // Fire Effect
    if (isAttacking) {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(0, 45 + extend, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 45 + extend, 15, 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.restore();
    ctx.restore();
  };

  const drawIori = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, state: ActionState, direction: number, isP1: boolean) => {
    const breathe = Math.sin(t * 0.08) * 3;
    const isAttacking = state === ActionState.ATTACK_LIGHT || state === ActionState.ATTACK_HEAVY;
    const isHit = state === ActionState.HIT;

    ctx.save();
    ctx.translate(x + FIGHTER_WIDTH/2, y + FIGHTER_HEIGHT);
    ctx.scale(direction, 1);

    // --- LEGS (Bondage Pants - Connected knees visually) ---
    // They usually look like one mass in sprites until stepping
    ctx.fillStyle = '#b91c1c'; // Red pants
    
    // Back leg
    ctx.beginPath();
    ctx.moveTo(-5, -55);
    ctx.lineTo(-25, 0); // Wide stance
    ctx.lineTo(-10, 0);
    ctx.lineTo(0, -55);
    ctx.fill();
    
    // Front leg
    ctx.beginPath();
    ctx.moveTo(5, -55);
    ctx.lineTo(35, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, -55);
    ctx.fill();
    
    // Bondage strap between legs
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -25);
    ctx.quadraticCurveTo(0, -15, 20, -25);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(-28, -5, 20, 5);
    ctx.fillRect(15, -5, 20, 5);

    // --- TORSO (Slouching heavily) ---
    const torsoY = isHit ? -55 : -70 + breathe; // Lower than Kyo
    const lean = 0.4; // Forward lean
    
    ctx.rotate(lean);
    
    // White Shirt (Long tails)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-15, torsoY); 
    ctx.lineTo(-15, torsoY + 60); // Long tail back
    ctx.lineTo(15, torsoY + 50);
    ctx.lineTo(15, torsoY);
    ctx.fill();

    // --- HEAD (Buried in shoulders) ---
    const headY = torsoY - 12;
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(5, headY, 13, 0, Math.PI*2);
    ctx.fill();
    
    // Hair (Red, covering face)
    ctx.fillStyle = '#ef4444'; // Bright red
    ctx.beginPath();
    ctx.moveTo(-10, headY - 10);
    ctx.quadraticCurveTo(0, headY - 20, 15, headY - 5); // Top
    ctx.quadraticCurveTo(25, headY + 10, 20, headY + 20); // Bangs covering front
    ctx.lineTo(5, headY + 5);
    ctx.lineTo(-10, headY + 5); // Back
    ctx.fill();
    
    // Choker
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, headY + 10, 12, 4);

    // --- ARMS (Claws hanging low) ---
    
    // Front Arm
    ctx.save();
    ctx.translate(0, torsoY + 5);
    
    let armRot = 0.2 + Math.sin(t*0.1)*0.1; // Hanging
    let armLen = 35;

    if (state === ActionState.ATTACK_LIGHT) {
        armRot = -1.2; // Swipe up
    } else if (state === ActionState.ATTACK_HEAVY) {
        armRot = -1.8; // High claw
    }

    ctx.rotate(armRot);
    ctx.fillStyle = '#fff'; // Sleeve
    ctx.fillRect(-5, 0, 10, 25);
    ctx.fillStyle = '#ffdbac'; // Skin
    ctx.fillRect(-4, 25, 8, armLen); // Long arms

    // Hand/Claw
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.moveTo(-5, 25 + armLen);
    ctx.lineTo(0, 25 + armLen + 10); // Pointy
    ctx.lineTo(5, 25 + armLen);
    ctx.fill();

    // Purple Fire
    if (isAttacking) {
        ctx.fillStyle = 'rgba(147, 51, 234, 0.7)'; // Purple
        ctx.beginPath();
        ctx.arc(0, 35 + armLen, 30, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 150, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 35 + armLen, 15, 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.restore();

    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx);

    // Shadows
    [enemyRef.current, playerRef.current].forEach(f => {
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.beginPath();
       ctx.ellipse(f.x + FIGHTER_WIDTH/2, GROUND_Y - 5, 30, 8, 0, 0, Math.PI*2);
       ctx.fill();
    });

    const t = frameCountRef.current;
    
    // Draw Enemy (Iori Style)
    drawIori(ctx, enemyRef.current.x, enemyRef.current.y, t, enemyRef.current.state, enemyRef.current.direction, false);
    
    // Draw Player (Kyo Style)
    drawKyo(ctx, playerRef.current.x, playerRef.current.y, t, playerRef.current.state, playerRef.current.direction, true);

    // Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
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
    <div className="relative border-4 border-gray-800 shadow-2xl rounded-lg overflow-hidden bg-black">
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
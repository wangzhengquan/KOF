import React, { useRef, useEffect } from 'react';
import { 
  GameStatus, Fighter, ActionState, Direction, Box, Particle, 
  FighterStats 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, GRAVITY, FRICTION, 
  MOVE_SPEED, JUMP_FORCE, FIGHTER_WIDTH, FIGHTER_HEIGHT, 
  P1_COLOR, P2_COLOR, ATTACK_DATA, MAX_HP 
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
  
  // Game State Refs (Mutable for performance)
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

  // --- Utility Functions ---
  const checkCollision = (box1: Box, box2: Box) => {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  };

  const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 20 + Math.random() * 10,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const resetGame = () => {
    playerRef.current.hp = MAX_HP;
    playerRef.current.x = 100;
    playerRef.current.state = ActionState.IDLE;
    enemyRef.current.hp = MAX_HP;
    enemyRef.current.x = 600;
    enemyRef.current.state = ActionState.IDLE;
    gameTimeRef.current = 99;
    isGameOver.current = false;
    statsRef.current = { hitsLanded: 0, damageDealt: 0, specialMovesUsed: 0, blocks: 0, timeLeft: 0, result: 'DRAW' };
    setHealth(MAX_HP, MAX_HP);
  };

  // --- Main Update Loop ---
  const update = (dt: number) => {
    if (status !== GameStatus.PLAYING || isGameOver.current) return;

    // Timer
    if (frameCountRef.current % 60 === 0 && gameTimeRef.current > 0) {
      gameTimeRef.current -= 1;
      setTimer(gameTimeRef.current);
    }
    if (gameTimeRef.current <= 0) {
      handleGameOver();
    }

    const p1 = playerRef.current;
    const p2 = enemyRef.current;

    // --- Player 1 Logic ---
    // State Management
    if (p1.state === ActionState.HIT || p1.state === ActionState.ATTACK_LIGHT || p1.state === ActionState.ATTACK_HEAVY) {
      p1.stateTimer--;
      if (p1.stateTimer <= 0) {
        p1.state = ActionState.IDLE;
        p1.attackBox = null;
      }
    } else {
      // Movement
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

      // Jump
      if (keysRef.current['KeyW'] && p1.isGrounded) {
        p1.vy = JUMP_FORCE;
        p1.isGrounded = false;
        p1.state = ActionState.JUMP;
      }

      // Attacks
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

    // --- AI Logic (Player 2) ---
    if (p2.state === ActionState.HIT || p2.state === ActionState.ATTACK_LIGHT || p2.state === ActionState.ATTACK_HEAVY) {
      p2.stateTimer--;
      if (p2.stateTimer <= 0) {
        p2.state = ActionState.IDLE;
        p2.attackBox = null;
      }
    } else {
      const dist = Math.abs(p1.x - p2.x);
      const isFacing = (p2.x > p1.x && p2.direction === Direction.LEFT) || (p2.x < p1.x && p2.direction === Direction.RIGHT);
      
      // Face Player
      if (p2.x > p1.x) p2.direction = Direction.LEFT;
      else p2.direction = Direction.RIGHT;

      // Decision Tree
      if (dist < 80 && isFacing) {
        // Close range: Attack
        if (Math.random() < 0.05) {
          p2.state = ActionState.ATTACK_LIGHT;
          p2.stateTimer = 20;
        } else if (Math.random() < 0.02) {
          p2.state = ActionState.ATTACK_HEAVY;
          p2.stateTimer = 30;
        }
      } else if (dist < 200) {
        // Mid range: Move randomly or wait
        if (Math.random() < 0.02) {
           // Dash in
           p2.vx = p2.direction * MOVE_SPEED;
           p2.state = ActionState.WALK;
        } else {
           p2.vx = 0; 
           p2.state = ActionState.IDLE;
        }
      } else {
        // Far range: Move closer
        p2.vx = p2.direction * (MOVE_SPEED * 0.7);
        p2.state = ActionState.WALK;
      }
    }

    // --- Physics Apply ---
    [p1, p2].forEach(p => {
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;

      // Ground Collision
      if (p.y + FIGHTER_HEIGHT >= GROUND_Y) {
        p.y = GROUND_Y - FIGHTER_HEIGHT;
        p.vy = 0;
        p.isGrounded = true;
        if (p.state === ActionState.JUMP) p.state = ActionState.IDLE;
      }

      // Wall Collision
      if (p.x < 0) p.x = 0;
      if (p.x + FIGHTER_WIDTH > CANVAS_WIDTH) p.x = CANVAS_WIDTH - FIGHTER_WIDTH;

      // Update Hitbox
      p.hitbox = { x: p.x, y: p.y, width: FIGHTER_WIDTH, height: FIGHTER_HEIGHT };
    });

    // Pushing each other
    if (checkCollision(p1.hitbox, p2.hitbox)) {
      const overlap = (p1.hitbox.width + p2.hitbox.width) / 2 - Math.abs((p1.x + FIGHTER_WIDTH/2) - (p2.x + FIGHTER_WIDTH/2));
      if (overlap > 0) {
         if (p1.x < p2.x) { p1.x -= 2; p2.x += 2; }
         else { p1.x += 2; p2.x -= 2; }
      }
    }

    // --- Attack Detection ---
    [p1, p2].forEach(attacker => {
      const defender = attacker.id === 1 ? p2 : p1;
      
      if ((attacker.state === ActionState.ATTACK_LIGHT || attacker.state === ActionState.ATTACK_HEAVY)) {
        // Define Active Frames window (simplified)
        const totalFrames = ATTACK_DATA[attacker.state].active + ATTACK_DATA[attacker.state].recovery;
        const currentFrame = totalFrames - attacker.stateTimer;
        const startup = ATTACK_DATA[attacker.state].startup;
        const active = ATTACK_DATA[attacker.state].active;

        if (currentFrame >= startup && currentFrame < startup + active && !attacker.attackBox) {
          // Create Attack Box
          const data = ATTACK_DATA[attacker.state];
          const atkX = attacker.direction === Direction.RIGHT 
            ? attacker.x + FIGHTER_WIDTH 
            : attacker.x - data.width;
          
          attacker.attackBox = {
            x: atkX,
            y: attacker.y + data.yOffset,
            width: data.width,
            height: data.height
          };

          // Check Hit
          if (checkCollision(attacker.attackBox, defender.hitbox) && defender.state !== ActionState.HIT && defender.state !== ActionState.DEAD) {
             // HIT!
             defender.hp -= data.damage;
             defender.state = ActionState.HIT;
             defender.stateTimer = 15; // Stun time
             defender.vx = attacker.direction * 10; // Knockback
             
             spawnParticles(defender.x + FIGHTER_WIDTH/2, defender.y + FIGHTER_HEIGHT/3, '#fff');

             if (attacker.id === 1) {
                statsRef.current.hitsLanded++;
                statsRef.current.damageDealt += data.damage;
             }
             
             // Check Death
             if (defender.hp <= 0) {
               defender.hp = 0;
               defender.state = ActionState.DEAD;
               handleGameOver();
             }
          }
        }
      }
    });

    // Particles Update
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });

    // Sync React State for UI (throttled slightly in real apps, but here we just do it)
    if (frameCountRef.current % 5 === 0) {
      setHealth(p1.hp, p2.hp);
    }
    
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

  // --- Render Loop ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background Floor
    const grad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#333');
    grad.addColorStop(1, '#111');
    ctx.fillStyle = grad;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Draw Fighters
    [playerRef.current, enemyRef.current].forEach(p => {
       // Shadow
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.beginPath();
       ctx.ellipse(p.x + FIGHTER_WIDTH/2, GROUND_Y - 5, FIGHTER_WIDTH/1.5, 10, 0, 0, Math.PI*2);
       ctx.fill();

       // Body
       ctx.save();
       ctx.translate(p.x + FIGHTER_WIDTH/2, p.y + FIGHTER_HEIGHT/2);
       
       // Flip if facing left
       if (p.direction === Direction.LEFT) ctx.scale(-1, 1);
       
       // Shake if Hit
       if (p.state === ActionState.HIT) {
         ctx.translate((Math.random()-0.5)*5, (Math.random()-0.5)*5);
       }

       // Core Box
       ctx.fillStyle = p.state === ActionState.DEAD ? '#444' : p.color;
       ctx.fillRect(-FIGHTER_WIDTH/2, -FIGHTER_HEIGHT/2, FIGHTER_WIDTH, FIGHTER_HEIGHT);
       
       // Stylistic details based on state
       ctx.fillStyle = 'white';
       
       // Eyes/Headband (Abstract)
       ctx.fillRect(-15, -40, 40, 10); // Headband
       
       // Hands
       if (p.state === ActionState.ATTACK_LIGHT || p.state === ActionState.ATTACK_HEAVY) {
          ctx.fillStyle = ATTACK_DATA[p.state].color;
          ctx.fillRect(20, -10, 40, 20); // Punch extended
       } else {
          ctx.fillStyle = '#ddd';
          ctx.fillRect(10, 0, 15, 15); // Hand close
       }
       
       ctx.restore();

       // Debug Attack Box
       if (p.attackBox && (p.state === ActionState.ATTACK_LIGHT || p.state === ActionState.ATTACK_HEAVY)) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
          ctx.fillRect(p.attackBox.x, p.attackBox.y, p.attackBox.width, p.attackBox.height);
       }
    });

    // Draw Particles
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
    <div className="relative border-4 border-gray-700 shadow-2xl rounded-lg overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
      />
      {/* Intro Overlay */}
      {status === GameStatus.PLAYING && frameCountRef.current < 120 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-6xl text-yellow-400 arcade-font animate-pulse drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">
               READY... FIGHT!
            </h1>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;
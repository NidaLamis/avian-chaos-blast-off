
import React, { useRef, useEffect, useState } from 'react';
import { Engine, Render, World, Bodies, Body, Events, Vector } from 'matter-js';
import { RotateCcw, Target, Award, Volume2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface GameStats {
  score: number;
  birdsUsed: number;
  birdsRemaining: number;
  targetsDestroyed: number;
  totalTargets: number;
  level: number;
  stars: number;
}

interface Bird {
  body: Body;
  type: 'red' | 'blue' | 'yellow';
  used: boolean;
}

const AngryBirdsGame = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine>();
  const renderRef = useRef<Render>();
  const currentBirdRef = useRef<Body>();
  const [isDragging, setIsDragging] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    birdsUsed: 0,
    birdsRemaining: 3,
    targetsDestroyed: 0,
    totalTargets: 4,
    level: 1,
    stars: 0
  });
  const [gameOver, setGameOver] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  const [trajectoryPoints, setTrajectoryPoints] = useState<{x: number, y: number}[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [currentBirdIndex, setCurrentBirdIndex] = useState(0);
  const [showExplosion, setShowExplosion] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Create engine
    const engine = Engine.create();
    engine.world.gravity.y = 0.8;
    engineRef.current = engine;

    // Create renderer
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 900,
        height: 600,
        wireframes: false,
        background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 60%, #98FB98 60%, #8FBC8F 100%)',
        showAngleIndicator: false,
        showDebug: false,
      }
    });
    renderRef.current = render;

    // Create ground with grass texture
    const ground = Bodies.rectangle(450, 580, 900, 40, {
      isStatic: true,
      render: {
        fillStyle: '#228B22'
      }
    });

    // Create hills in background
    const hill1 = Bodies.circle(200, 520, 80, {
      isStatic: true,
      render: {
        fillStyle: '#90EE90'
      }
    });

    const hill2 = Bodies.circle(700, 540, 60, {
      isStatic: true,
      render: {
        fillStyle: '#90EE90'
      }
    });

    // Create slingshot
    const slingshotBase = Bodies.rectangle(120, 520, 20, 120, {
      isStatic: true,
      render: {
        fillStyle: '#8B4513'
      }
    });

    const slingshotLeft = Bodies.rectangle(105, 460, 8, 60, {
      isStatic: true,
      render: {
        fillStyle: '#654321'
      }
    });

    const slingshotRight = Bodies.rectangle(135, 460, 8, 60, {
      isStatic: true,
      render: {
        fillStyle: '#654321'
      }
    });

    // Create current bird
    const initialBird = Bodies.circle(120, 480, 18, {
      render: {
        fillStyle: '#FF4444',
        strokeStyle: '#CC0000',
        lineWidth: 3
      },
      frictionAir: 0.01,
      restitution: 0.4,
      density: 0.001
    });
    currentBirdRef.current = initialBird;

    // Initialize birds array
    const birdTypes: ('red' | 'blue' | 'yellow')[] = ['red', 'blue', 'yellow'];
    const initialBirds: Bird[] = birdTypes.map((type, index) => ({
      body: index === 0 ? initialBird : Bodies.circle(-50, 580, 15, { isStatic: true }),
      type,
      used: false
    }));
    setBirds(initialBirds);

    // Create structure with wooden blocks and pigs
    const structure = [
      // Base blocks
      Bodies.rectangle(650, 540, 20, 80, {
        render: { fillStyle: '#DEB887' },
        label: 'wood'
      }),
      Bodies.rectangle(750, 540, 20, 80, {
        render: { fillStyle: '#DEB887' },
        label: 'wood'
      }),
      Bodies.rectangle(700, 500, 120, 20, {
        render: { fillStyle: '#DEB887' },
        label: 'wood'
      }),
      
      // Second level
      Bodies.rectangle(675, 460, 20, 80, {
        render: { fillStyle: '#DEB887' },
        label: 'wood'
      }),
      Bodies.rectangle(725, 460, 20, 80, {
        render: { fillStyle: '#DEB887' },
        label: 'wood'
      }),
      Bodies.rectangle(700, 420, 70, 20, {
        render: { fillStyle: '#DEB887' },
        label: 'wood'
      }),

      // Stone blocks (harder to destroy)
      Bodies.rectangle(700, 380, 40, 40, {
        render: { fillStyle: '#808080' },
        label: 'stone',
        density: 0.002
      })
    ];

    // Create pigs in strategic positions
    const pigs = [
      Bodies.circle(630, 500, 25, {
        render: {
          fillStyle: '#90EE90',
          strokeStyle: '#228B22',
          lineWidth: 3
        },
        label: 'pig',
        density: 0.0005
      }),
      Bodies.circle(770, 500, 25, {
        render: {
          fillStyle: '#90EE90',
          strokeStyle: '#228B22',
          lineWidth: 3
        },
        label: 'pig',
        density: 0.0005
      }),
      Bodies.circle(700, 480, 25, {
        render: {
          fillStyle: '#90EE90',
          strokeStyle: '#228B22',
          lineWidth: 3
        },
        label: 'pig',
        density: 0.0005
      }),
      Bodies.circle(700, 360, 30, {
        render: {
          fillStyle: '#32CD32',
          strokeStyle: '#228B22',
          lineWidth: 3
        },
        label: 'king-pig',
        density: 0.0008
      })
    ];

    // Add all bodies to world
    World.add(engine.world, [
      ground, hill1, hill2, 
      slingshotBase, slingshotLeft, slingshotRight,
      initialBird, 
      ...structure, 
      ...pigs
    ]);

    // Collision detection with enhanced effects
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // Check if bird hits pig
        if ((bodyA.label?.includes('pig') && bodyB === currentBirdRef.current) || 
            (bodyB.label?.includes('pig') && bodyA === currentBirdRef.current)) {
          const pig = bodyA.label?.includes('pig') ? bodyA : bodyB;
          
          // Show explosion effect
          setShowExplosion({ x: pig.position.x, y: pig.position.y });
          setTimeout(() => setShowExplosion(null), 500);
          
          World.remove(engine.world, pig);
          
          const points = pig.label === 'king-pig' ? 500 : 100;
          setGameStats(prev => ({
            ...prev,
            score: prev.score + points,
            targetsDestroyed: prev.targetsDestroyed + 1
          }));
        }

        // Check velocity for destruction effects
        const velocity = Vector.magnitude(bodyA.velocity) + Vector.magnitude(bodyB.velocity);
        if (velocity > 3) {
          // High impact collision - could add particle effects here
          console.log('High impact collision!');
        }
      });
    });

    // Mouse events for enhanced slingshot mechanics
    const handleMouseDown = (event: MouseEvent) => {
      const rect = render.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      if (!isLaunched && currentBirdRef.current &&
          Math.abs(mouseX - currentBirdRef.current.position.x) < 40 && 
          Math.abs(mouseY - currentBirdRef.current.position.y) < 40) {
        setIsDragging(true);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !currentBirdRef.current || isLaunched) return;
      
      const rect = render.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Limit drag distance and calculate trajectory
      const maxDistance = 120;
      const deltaX = mouseX - 120;
      const deltaY = mouseY - 480;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      let finalX = mouseX;
      let finalY = mouseY;
      
      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        finalX = 120 + deltaX * ratio;
        finalY = 480 + deltaY * ratio;
      }
      
      // Only allow pulling back
      if (finalX > 120) {
        finalX = 120;
      }
      
      Body.setPosition(currentBirdRef.current, { x: finalX, y: finalY });
      
      // Calculate trajectory preview
      const forceMultiplier = 0.015;
      const trajectoryDeltaX = (120 - finalX) * forceMultiplier;
      const trajectoryDeltaY = (480 - finalY) * forceMultiplier;
      
      const points = [];
      for (let i = 0; i < 8; i++) {
        const t = i * 0.3;
        const x = finalX + trajectoryDeltaX * t * 60;
        const y = finalY + trajectoryDeltaY * t * 60 + 0.5 * engine.world.gravity.y * t * t * 60 * 60;
        if (x < 900 && y < 600) {
          points.push({ x, y });
        }
      }
      setTrajectoryPoints(points);
    };

    const handleMouseUp = () => {
      if (!isDragging || !currentBirdRef.current || isLaunched) return;
      
      setIsDragging(false);
      setIsLaunched(true);
      setTrajectoryPoints([]);
      
      // Calculate and apply launch force
      const forceMultiplier = 0.015;
      const deltaX = 120 - currentBirdRef.current.position.x;
      const deltaY = 480 - currentBirdRef.current.position.y;
      
      Body.applyForce(currentBirdRef.current, currentBirdRef.current.position, {
        x: deltaX * forceMultiplier,
        y: deltaY * forceMultiplier
      });
      
      setGameStats(prev => ({ 
        ...prev, 
        birdsUsed: prev.birdsUsed + 1,
        birdsRemaining: prev.birdsRemaining - 1
      }));

      // Auto switch to next bird after delay
      setTimeout(() => {
        if (currentBirdIndex < 2) {
          loadNextBird();
        }
      }, 3000);
    };

    render.canvas.addEventListener('mousedown', handleMouseDown);
    render.canvas.addEventListener('mousemove', handleMouseMove);
    render.canvas.addEventListener('mouseup', handleMouseUp);

    // Run the engine and renderer
    Engine.run(engine);
    Render.run(render);

    return () => {
      render.canvas.removeEventListener('mousedown', handleMouseDown);
      render.canvas.removeEventListener('mousemove', handleMouseMove);
      render.canvas.removeEventListener('mouseup', handleMouseUp);
      Render.stop(render);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [isDragging, isLaunched, currentBirdIndex]);

  const loadNextBird = () => {
    if (currentBirdIndex >= 2 || !engineRef.current) return;
    
    const nextIndex = currentBirdIndex + 1;
    const birdColors = {
      red: '#FF4444',
      blue: '#4444FF', 
      yellow: '#FFFF44'
    };
    
    const nextBirdType = birds[nextIndex].type;
    const nextBird = Bodies.circle(120, 480, 18, {
      render: {
        fillStyle: birdColors[nextBirdType],
        strokeStyle: nextBirdType === 'yellow' ? '#CCCC00' : nextBirdType === 'blue' ? '#0000CC' : '#CC0000',
        lineWidth: 3
      },
      frictionAir: 0.01,
      restitution: 0.4,
      density: 0.001
    });
    
    World.add(engineRef.current.world, nextBird);
    currentBirdRef.current = nextBird;
    setCurrentBirdIndex(nextIndex);
    setIsLaunched(false);
  };

  // Check win/lose conditions
  useEffect(() => {
    if (gameStats.targetsDestroyed >= gameStats.totalTargets) {
      const stars = gameStats.birdsUsed === 1 ? 3 : gameStats.birdsUsed === 2 ? 2 : 1;
      setGameStats(prev => ({ ...prev, stars }));
      setGameOver(true);
    } else if (gameStats.birdsRemaining === 0 && isLaunched) {
      // Game over - no more birds
      setTimeout(() => setGameOver(true), 2000);
    }
  }, [gameStats.targetsDestroyed, gameStats.totalTargets, gameStats.birdsRemaining, isLaunched]);

  const resetGame = () => {
    setGameStats({
      score: 0,
      birdsUsed: 0,
      birdsRemaining: 3,
      targetsDestroyed: 0,
      totalTargets: 4,
      level: 1,
      stars: 0
    });
    setGameOver(false);
    setIsLaunched(false);
    setIsDragging(false);
    setCurrentBirdIndex(0);
    setTrajectoryPoints([]);
    setShowExplosion(null);
    
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Enhanced UI Header */}
      <Card className="p-4 bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 border-2 border-orange-300">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-600" />
            <span className="font-bold text-lg">Score: {gameStats.score}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-red-600" />
            <span className="font-semibold">Pigs: {gameStats.targetsDestroyed}/{gameStats.totalTargets}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Level {gameStats.level}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Birds: {gameStats.birdsRemaining}</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    i < gameStats.birdsRemaining 
                      ? i === currentBirdIndex 
                        ? 'bg-red-500 border-red-700' 
                        : 'bg-red-300 border-red-500'
                      : 'bg-gray-300 border-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
          <Button 
            onClick={resetGame}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-orange-50"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </Button>
        </div>
      </Card>

      <div className="relative">
        <div 
          ref={sceneRef} 
          className="border-4 border-amber-600 rounded-lg shadow-2xl overflow-hidden bg-sky-200"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />

        {/* Trajectory visualization */}
        {trajectoryPoints.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" width="900" height="600">
            {trajectoryPoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="rgba(255, 255, 255, 0.8)"
                opacity={1 - index * 0.1}
              />
            ))}
          </svg>
        )}

        {/* Explosion effect */}
        {showExplosion && (
          <div 
            className="absolute w-16 h-16 pointer-events-none animate-ping"
            style={{ 
              left: showExplosion.x - 32, 
              top: showExplosion.y - 32,
              background: 'radial-gradient(circle, rgba(255,255,0,0.8) 0%, rgba(255,165,0,0.6) 50%, rgba(255,0,0,0.4) 100%)',
              borderRadius: '50%'
            }}
          />
        )}
        
        {!isLaunched && !gameOver && (
          <div className="absolute top-4 left-4 bg-white/95 p-4 rounded-lg shadow-lg border-2 border-yellow-400">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              🎯 <span>Drag the bird back and aim at the pigs!</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">Release to launch • Hit all pigs to win!</p>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
            <Card className="p-8 text-center bg-white border-4 border-yellow-400 max-w-sm">
              {gameStats.targetsDestroyed >= gameStats.totalTargets ? (
                <>
                  <h2 className="text-3xl font-bold text-green-600 mb-3">🎉 Level Complete!</h2>
                  <div className="flex justify-center mb-4">
                    {[1, 2, 3].map((star) => (
                      <span
                        key={star}
                        className={`text-4xl ${star <= gameStats.stars ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-2">
                    You destroyed all pigs with {gameStats.birdsUsed} bird{gameStats.birdsUsed !== 1 ? 's' : ''}!
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-red-600 mb-3">💥 Level Failed!</h2>
                  <p className="text-gray-700 mb-2">
                    No more birds left! Try again!
                  </p>
                </>
              )}
              <p className="text-xl font-bold mb-4 text-orange-600">Final Score: {gameStats.score}</p>
              <Button onClick={resetGame} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                <Play className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </Card>
          </div>
        )}
      </div>

      <div className="text-center max-w-lg bg-amber-50 p-4 rounded-lg border border-amber-200">
        <h3 className="font-bold mb-2 text-amber-800">🏹 How to Play Angry Birds:</h3>
        <p className="text-sm text-amber-700">
          Pull back the bird in the slingshot to aim, then release to launch! 
          Destroy all the green pigs using physics and strategy. 
          Use wooden blocks and structures to your advantage!
        </p>
      </div>
    </div>
  );
};

export default AngryBirdsGame;

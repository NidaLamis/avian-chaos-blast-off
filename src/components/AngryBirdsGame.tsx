
import React, { useRef, useEffect, useState } from 'react';
import { Engine, Render, World, Bodies, Body, Events, Vector } from 'matter-js';
import { RotateCcw, Target, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface GameStats {
  score: number;
  birdsUsed: number;
  targetsDestroyed: number;
  totalTargets: number;
}

const AngryBirdsGame = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine>();
  const renderRef = useRef<Render>();
  const birdRef = useRef<Body>();
  const [isDragging, setIsDragging] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    birdsUsed: 0,
    targetsDestroyed: 0,
    totalTargets: 3
  });
  const [gameOver, setGameOver] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);

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
        width: 800,
        height: 500,
        wireframes: false,
        background: 'linear-gradient(to bottom, #87CEEB, #98FB98)',
        showAngleIndicator: false,
        showDebug: false,
      }
    });
    renderRef.current = render;

    // Create ground
    const ground = Bodies.rectangle(400, 480, 800, 40, {
      isStatic: true,
      render: {
        fillStyle: '#8B4513'
      }
    });

    // Create cannon base
    const cannonBase = Bodies.rectangle(100, 430, 60, 100, {
      isStatic: true,
      render: {
        fillStyle: '#654321'
      }
    });

    // Create bird
    const bird = Bodies.circle(100, 400, 15, {
      render: {
        fillStyle: '#FF4444',
        strokeStyle: '#CC0000',
        lineWidth: 2
      },
      frictionAir: 0.01,
      restitution: 0.3
    });
    birdRef.current = bird;

    // Create targets (pigs)
    const targets = [
      Bodies.circle(600, 430, 20, {
        render: {
          fillStyle: '#90EE90',
          strokeStyle: '#228B22',
          lineWidth: 2
        },
        label: 'target'
      }),
      Bodies.circle(700, 430, 20, {
        render: {
          fillStyle: '#90EE90',
          strokeStyle: '#228B22',
          lineWidth: 2
        },
        label: 'target'
      }),
      Bodies.circle(650, 380, 20, {
        render: {
          fillStyle: '#90EE90',
          strokeStyle: '#228B22',
          lineWidth: 2
        },
        label: 'target'
      })
    ];

    // Create obstacles (wooden blocks)
    const obstacles = [
      Bodies.rectangle(580, 400, 20, 60, {
        render: {
          fillStyle: '#DEB887'
        },
        label: 'obstacle'
      }),
      Bodies.rectangle(620, 400, 20, 60, {
        render: {
          fillStyle: '#DEB887'
        },
        label: 'obstacle'
      }),
      Bodies.rectangle(720, 400, 20, 60, {
        render: {
          fillStyle: '#DEB887'
        },
        label: 'obstacle'
      }),
      Bodies.rectangle(650, 350, 60, 20, {
        render: {
          fillStyle: '#DEB887'
        },
        label: 'obstacle'
      })
    ];

    // Add all bodies to world
    World.add(engine.world, [ground, cannonBase, bird, ...targets, ...obstacles]);

    // Collision detection
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        
        // Check if bird hits target
        if ((bodyA.label === 'target' && bodyB === birdRef.current) || 
            (bodyB.label === 'target' && bodyA === birdRef.current)) {
          const target = bodyA.label === 'target' ? bodyA : bodyB;
          World.remove(engine.world, target);
          
          setGameStats(prev => ({
            ...prev,
            score: prev.score + 100,
            targetsDestroyed: prev.targetsDestroyed + 1
          }));
        }
      });
    });

    // Mouse events for bird launching
    const handleMouseDown = (event: MouseEvent) => {
      const rect = render.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Check if clicking near bird and bird hasn't been launched
      if (!isLaunched && 
          Math.abs(mouseX - bird.position.x) < 30 && 
          Math.abs(mouseY - bird.position.y) < 30) {
        setIsDragging(true);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !birdRef.current || isLaunched) return;
      
      const rect = render.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Limit drag distance
      const maxDistance = 100;
      const deltaX = mouseX - 100;
      const deltaY = mouseY - 400;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance <= maxDistance) {
        Body.setPosition(birdRef.current, { x: mouseX, y: mouseY });
      }
    };

    const handleMouseUp = () => {
      if (!isDragging || !birdRef.current || isLaunched) return;
      
      setIsDragging(false);
      setIsLaunched(true);
      
      // Calculate launch force
      const forceMultiplier = 0.01;
      const deltaX = 100 - birdRef.current.position.x;
      const deltaY = 400 - birdRef.current.position.y;
      
      Body.applyForce(birdRef.current, birdRef.current.position, {
        x: deltaX * forceMultiplier,
        y: deltaY * forceMultiplier
      });
      
      setGameStats(prev => ({ ...prev, birdsUsed: prev.birdsUsed + 1 }));
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
  }, [isDragging, isLaunched]);

  // Check win condition
  useEffect(() => {
    if (gameStats.targetsDestroyed >= gameStats.totalTargets) {
      setGameOver(true);
    }
  }, [gameStats.targetsDestroyed, gameStats.totalTargets]);

  const resetGame = () => {
    setGameStats({
      score: 0,
      birdsUsed: 0,
      targetsDestroyed: 0,
      totalTargets: 3
    });
    setGameOver(false);
    setIsLaunched(false);
    setIsDragging(false);
    
    // Force re-render by updating key
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Card className="p-4 bg-gradient-to-r from-blue-100 to-green-100">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            <span className="font-bold">Score: {gameStats.score}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-600" />
            <span>Targets: {gameStats.targetsDestroyed}/{gameStats.totalTargets}</span>
          </div>
          <div className="text-sm text-gray-600">
            Birds Used: {gameStats.birdsUsed}
          </div>
          <Button 
            onClick={resetGame}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </Card>

      <div className="relative">
        <div 
          ref={sceneRef} 
          className="border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        
        {!isLaunched && (
          <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-lg shadow-md">
            <p className="text-sm font-medium text-gray-700">
              🎯 Drag the red bird to aim and release to launch!
            </p>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <Card className="p-6 text-center bg-white">
              <h2 className="text-2xl font-bold text-green-600 mb-2">🎉 Victory!</h2>
              <p className="text-gray-600 mb-4">
                You destroyed all targets with {gameStats.birdsUsed} bird{gameStats.birdsUsed !== 1 ? 's' : ''}!
              </p>
              <p className="text-lg font-semibold mb-4">Final Score: {gameStats.score}</p>
              <Button onClick={resetGame} className="w-full">
                Play Again
              </Button>
            </Card>
          </div>
        )}
      </div>

      <div className="text-center max-w-md">
        <h3 className="font-semibold mb-2">How to Play:</h3>
        <p className="text-sm text-gray-600">
          Click and drag the red bird to aim, then release to launch it at the green pigs. 
          Destroy all pigs to win! Use the wooden blocks strategically.
        </p>
      </div>
    </div>
  );
};

export default AngryBirdsGame;

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const DEFAULT_DUCK_IMAGES = [
    '/mascot/holding_book_1.png',
    '/mascot/holding_book_2.png',
    '/mascot/holding_book_3.png',
    '/mascot/holding_book_4.png',
    '/mascot/holding_book_5.png',
    '/mascot/waving_hand_1.png',
    '/mascot/wink_1.png',
    '/mascot/smile_1.png',
];

const FALLBACK_DUCKS = [
    { image: '/mascot/holding_book_1.png', left: '6%', size: 112, delay: '0s', duration: '15s' },
    { image: '/mascot/holding_book_3.png', left: '24%', size: 96, delay: '2s', duration: '18s' },
    { image: '/mascot/waving_hand_1.png', left: '43%', size: 104, delay: '5s', duration: '16s' },
    { image: '/mascot/wink_1.png', left: '62%', size: 92, delay: '1s', duration: '19s' },
    { image: '/mascot/smile_1.png', left: '78%', size: 100, delay: '4s', duration: '17s' },
    { image: '/mascot/holding_book_5.png', left: '88%', size: 116, delay: '3s', duration: '20s' },
];

const Duckpit = ({
    count = 15, 
    interactive = true,
    className = '',
}) => {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);

    useEffect(() => {
        const container = sceneRef.current;
        if (!container) return undefined;

        const { Engine, Render, Runner, MouseConstraint, Mouse, Composite, Bodies, Events } = Matter;

        let render;
        let runner;
        let resizeFrame;

        const cleanupScene = () => {
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            if (render) Render.stop(render);
            if (runner) Runner.stop(runner);
            if (engineRef.current) {
                Events.off(engineRef.current); 
                Composite.clear(engineRef.current.world, false);
                Engine.clear(engineRef.current);
                engineRef.current = null;
            }
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        };

        const createScene = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (!width || !height) return;

            cleanupScene();

            const engine = Engine.create();
            // Zero gravity so they don't naturally fall
            engine.world.gravity.y = 0;
            engineRef.current = engine;

            render = Render.create({
                element: container,
                engine,
                options: {
                    width,
                    height,
                    wireframes: false,
                    background: 'transparent',
                    pixelRatio: window.devicePixelRatio || 1,
                },
            });

            // Boundary Walls
            const wallThickness = 80;
            const wallOptions = { isStatic: true, render: { visible: false } };
            Composite.add(engine.world, [
                Bodies.rectangle(width / 2, height + wallThickness / 2, width + wallThickness * 2, wallThickness, wallOptions), 
                Bodies.rectangle(width / 2, -wallThickness / 2, width + wallThickness * 2, wallThickness, wallOptions), 
                Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, wallOptions), 
                Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, wallOptions), 
            ]);

            const ducks = Array.from({ length: count }, () => {
                const radius = Math.random() * 18 + 30;
                const texturePath = DEFAULT_DUCK_IMAGES[Math.floor(Math.random() * DEFAULT_DUCK_IMAGES.length)];
                const texture = `${import.meta.env.BASE_URL}${texturePath.replace(/^\//, '')}`;

                return Bodies.circle(
                    Math.random() * (width - radius * 2) + radius,
                    Math.random() * (height - radius * 2) + radius, 
                    radius,
                    {
                        friction: 0.1,
                        frictionAir: 0.02, // Slightly reduced for better dragging feel
                        restitution: 0.8,   // Bouncy ducks!
                        render: {
                            sprite: {
                                texture,
                                xScale: (radius * 2) / 280,
                                yScale: (radius * 2) / 280,
                            },
                        },
                    }
                );
            });

            Composite.add(engine.world, ducks);

            // Apply constant floating/drifting force
            Events.on(engine, 'beforeUpdate', () => {
                const time = engine.timing.timestamp * 0.001; 
                ducks.forEach((duck, i) => {
                    // This force creates the "floating in water" effect
                    const forceMagnitude = 0.00003 * duck.mass; 
                    Matter.Body.applyForce(duck, duck.position, {
                        x: Math.cos(time * 0.5 + i) * forceMagnitude,
                        y: Math.sin(time * 0.7 + i * 1.5) * forceMagnitude,
                    });
                });
            });

            if (interactive) {
                const mouse = Mouse.create(render.canvas);
                const mouseConstraint = MouseConstraint.create(engine, {
                    mouse,
                    constraint: {
                        stiffness: 0.2, // Increased stiffness for more direct dragging
                        render: { visible: false },
                    },
                });

                // Prevents the mouse wheel from scrolling the page when interacting with ducks
                mouseConstraint.mouse.element.removeEventListener('mousewheel', mouseConstraint.mouse.mousewheel);
                mouseConstraint.mouse.element.removeEventListener('DOMMouseScroll', mouseConstraint.mouse.mousewheel);

                Composite.add(engine.world, mouseConstraint);
                render.mouse = mouse;
            }

            Render.run(render);
            runner = Runner.create();
            Runner.run(runner, engine);
        };

        const resizeObserver = new ResizeObserver(() => {
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => createScene());
        });

        createScene();
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            cleanupScene();
        };
    }, [count, interactive]);

    return (
        <div ref={sceneRef} className={className} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {/* Background elements remain the same */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_42%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_38%)]" />
        </div>
    );
};

export default Duckpit;

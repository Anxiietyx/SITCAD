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
	count = 36,
	gravity = 0.5,
	friction = 0.9975,
	wallBounce = 0.95,
	interactive = false,
	className = '',
}) => {
	const sceneRef = useRef(null);
	const engineRef = useRef(null);

	useEffect(() => {
		const container = sceneRef.current;

		if (!container) {
			return undefined;
		}

		const {
			Engine,
			Render,
			Runner,
			MouseConstraint,
			Mouse,
			Composite,
			Bodies,
		} = Matter;

		let render;
		let runner;
		let resizeFrame;

		const cleanupScene = () => {
			if (resizeFrame) {
				cancelAnimationFrame(resizeFrame);
				resizeFrame = undefined;
			}

			if (render) {
				Render.stop(render);
			}

			if (runner) {
				Runner.stop(runner);
			}

			if (engineRef.current) {
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

			if (!width || !height) {
				return;
			}

			cleanupScene();

			const engine = Engine.create();
			engine.world.gravity.y = gravity;
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

			render.canvas.style.position = 'absolute';
			render.canvas.style.inset = '0';
			render.canvas.style.width = '100%';
			render.canvas.style.height = '100%';
			render.canvas.style.pointerEvents = interactive ? 'auto' : 'none';
			render.canvas.style.opacity = '1';

			const wallThickness = 80;
			const wallOptions = {
				isStatic: true,
				restitution: wallBounce,
				render: { visible: false },
			};

			Composite.add(engine.world, [
				Bodies.rectangle(width / 2, height + wallThickness / 2, width + wallThickness * 2, wallThickness, wallOptions),
				Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, wallOptions),
				Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, wallOptions),
			]);

			const ducks = Array.from({ length: count }, () => {
				const radius = Math.random() * 18 + 30;
				const texturePath = DEFAULT_DUCK_IMAGES[Math.floor(Math.random() * DEFAULT_DUCK_IMAGES.length)];
				const texture = `${import.meta.env.BASE_URL}${texturePath.replace(/^\//, '')}`;

				return Bodies.circle(
					Math.random() * Math.max(width - radius * 2, radius * 2) + radius,
					Math.random() * (height * 0.35) - radius * 2,
					radius,
					{
						friction: 0.01,
						frictionAir: Math.max(0, 1 - friction),
						restitution: 0.75,
						render: {
							sprite: {
								texture,
								xScale: (radius * 2) / 280,
								yScale: (radius * 2) / 280,
							},
						},
					},
				);
			});

			Composite.add(engine.world, ducks);

			if (interactive) {
				const mouse = Mouse.create(render.canvas);
				const mouseConstraint = MouseConstraint.create(engine, {
					mouse,
					constraint: {
						stiffness: 0.2,
						render: { visible: false },
					},
				});

				Composite.add(engine.world, mouseConstraint);
				render.mouse = mouse;
			}

			Render.run(render);
			runner = Runner.create();
			Runner.run(runner, engine);
		};

		const resizeObserver = new ResizeObserver(() => {
			if (resizeFrame) {
				cancelAnimationFrame(resizeFrame);
			}

			resizeFrame = requestAnimationFrame(() => {
				createScene();
			});
		});

		createScene();
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			cleanupScene();
		};
	}, [count, friction, gravity, interactive, wallBounce]);

	return (
		<div
			ref={sceneRef}
			className={className}
			style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
		>
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_38%)]" />
			<div className="absolute inset-0 overflow-hidden opacity-55">
				{FALLBACK_DUCKS.map((duck, index) => (
					<img
						key={`${duck.image}-${index}`}
						src={`${import.meta.env.BASE_URL}${duck.image.replace(/^\//, '')}`}
						alt=""
						aria-hidden="true"
						className="absolute top-full select-none object-contain"
						style={{
							left: duck.left,
							width: `${duck.size}px`,
							height: `${duck.size}px`,
							animation: `duckpitFloat ${duck.duration} linear ${duck.delay} infinite`,
							filter: 'drop-shadow(0 18px 22px rgba(15, 23, 42, 0.12))',
						}}
					/>
				))}
			</div>
			<style>{`
				@keyframes duckpitFloat {
					0% {
						transform: translate3d(0, 18vh, 0) rotate(-8deg);
						opacity: 0;
					}
					12% {
						opacity: 0.75;
					}
					50% {
						transform: translate3d(18px, -36vh, 0) rotate(6deg);
						opacity: 0.9;
					}
					100% {
						transform: translate3d(-14px, -118vh, 0) rotate(-10deg);
						opacity: 0;
					}
				}
			`}</style>
		</div>
	);
};

export default Duckpit;

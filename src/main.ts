import { Game } from './core/game';
import { World } from './world/world';
import { WORLD } from './core/constants';

async function main() {
  console.log('🎮 EcoBox Ultimate starting...');

  const container = document.getElementById('app');
  if (!container) {
    throw new Error('App container not found!');
  }

  const game = Game.instance;
  await game.init(container);

  const world = new World({
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    islandMode: true,
    resourceDensity: 0.15,
  });

  world.addToStage(game.worldLayer);

  game.on('update', ({ delta }) => {
    world.update(delta);
  });

  game.on('render', () => {
    world.render(game.camera);
  });

  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }

  game.start();
  console.log('✅ EcoBox Ultimate ready!');
}

main().catch(console.error);

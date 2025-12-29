import { Game } from './core/game';
import { World } from './world/world';
import { EntityManager } from './entities/entitymanager';
import { WORLD } from './core/constants';

async function main() {
  console.log('🎮 EcoBox Ultimate starting...');

  const container = document.getElementById('app');
  if (!container) throw new Error('App container not found!');

  const game = Game.instance;
  await game.init(container);

  // Mundo
  const world = new World({
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    islandMode: true,
  });
  world.addToStage(game.worldLayer);

  // Entidades
  const entityManager = new EntityManager(game.entityLayer);
  entityManager.spawnInitialPopulation(WORLD.WIDTH, WORLD.HEIGHT);

  // Game loop
  game.on('update', ({ delta }) => {
    world.update(delta);
    entityManager.update(delta);
  });

  game.on('render', () => {
    world.render(game.camera);
    entityManager.render(game.camera);
  });

  // Esconde loading
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');

  game.start();
  console.log(`✅ EcoBox ready! ${entityManager.count} entities`);
}

main().catch(console.error);

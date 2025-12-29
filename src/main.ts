import { Game } from './core/game';
import { World } from './world/world';
import { EntityManager } from './entities/entitymanager';
import { FactionSystem } from './systems/factions';
import { HUD } from './ui/hud';
import { Minimap } from './ui/minimap';
import { WORLD, Era, Race } from './core/constants';

async function main() {
  console.log('🎮 EcoBox Ultimate starting...');

  const container = document.getElementById('app');
  if (!container) throw new Error('App container not found!');

  const game = Game.instance;
  await game.init(container);

  // === MUNDO ===
  const world = new World({
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    islandMode: true,
  });
  world.addToStage(game.worldLayer);

  // === FACÇÕES ===
  const factions = new FactionSystem();

  // === ENTIDADES ===
  const entityManager = new EntityManager(game.entityLayer);
  entityManager.spawnInitialPopulation(WORLD.WIDTH, WORLD.HEIGHT);

  // Cria algumas facções iniciais
  const creatures = entityManager.getCreatures();
  for (let i = 0; i < 3; i++) {
    const faction = factions.createFaction();
    // Adiciona algumas criaturas à facção
    for (let j = 0; j < 5 && i * 5 + j < creatures.length; j++) {
      factions.addMember(faction.id, creatures[i * 5 + j]);
    }
  }

  // === UI ===
  const hud = new HUD(game.uiLayer, game.width);
  const minimap = new Minimap(game.uiLayer, world, 120);
  minimap.setPosition(game.width, game.height);

  // === GAME LOOP ===
  let currentEra = Era.PRIMITIVE;

  game.on('update', ({ delta }) => {
    world.update(delta);
    entityManager.update(delta);
    factions.update(delta);
  });

  game.on('render', ({ delta }) => {
    world.render(game.camera);
    entityManager.render(game.camera);
    minimap.updateViewport(game.camera);

    // Atualiza HUD
    hud.update({
      era: currentEra,
      population: entityManager.creatureCount,
      hour: 12, // TODO: pegar do sistema de luz
      fps: game.fps,
      speed: game.speed,
      isPaused: game.isPaused,
    });
  });

  game.on('resize', ({ width, height }) => {
    hud.resize(width);
    minimap.setPosition(width, height);
  });

  // === ESCONDE LOADING ===
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');

  game.start();
  console.log(`✅ EcoBox ready!`);
  console.log(`   📊 ${entityManager.creatureCount} criaturas`);
  console.log(`   🐾 ${entityManager.animalCount} animais`);
  console.log(`   🏰 ${factions.getAll().length} facções`);
}

main().catch(console.error);

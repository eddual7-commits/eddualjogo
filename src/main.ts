/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - MAIN ENTRY POINT
 * Inicialização do jogo
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Game } from './core/game';
import { World } from './world/world';
import { WORLD } from './core/constants';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🎮 EcoBox Ultimate starting...');

  // Get container
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('App container not found!');
  }

  // Initialize game
  const game = Game.instance;
  await game.init(container);

  // Create world
  const world = new World({
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    islandMode: true,
    resourceDensity: 0.15,
  });

  // Add world to stage
  world.addToStage(game.worldLayer);

  // Print world stats
  const stats = world.getStatistics();
  console.log('🌍 World Statistics:', stats);

  // Game loop handlers
  game.on('update', ({ delta }) => {
    world.update(delta);
  });

  game.on('render', () => {
    world.render(game.camera);
  });

  // Hide loading screen
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 500);
  }

  // Start game
  game.start();

  // Debug: expose to window
  if (import.meta.env.DEV) {
    (window as any).game = game;
    (window as any).world = world;
  }

  console.log('✅ EcoBox Ultimate ready!');
  console.log('📋 Controls:');
  console.log('   - Drag to pan');
  console.log('   - Scroll/Pinch to zoom');
  console.log('   - Space to pause');
  console.log('   - 1-7 to change speed');
  console.log('   - R to reset camera');
}

// Start
main().catch(console.error);

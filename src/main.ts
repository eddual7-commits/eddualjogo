// ===== ECOBOX ULTIMATE - ENTRADA =====
import { Game } from './game';

const game = new Game();

document.addEventListener('DOMContentLoaded', async () => {
  await game.init();
  
  // Esconde loading
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
  
  game.start();
  
  // Debug
  (window as any).game = game;
});

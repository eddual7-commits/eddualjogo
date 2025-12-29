import { Container, Graphics } from 'pixi.js';
import { World } from '../world/world';
import { Camera } from '../core/camera';
import { WORLD, TILE_COLORS } from '../core/constants';

/**
 * Minimapa no canto da tela
 */
export class Minimap {
  private container: Container;
  private mapGraphics: Graphics;
  private viewportGraphics: Graphics;
  
  private size: number;
  private scale: number;
  private world: World;

  constructor(parent: Container, world: World, size: number = 150) {
    this.world = world;
    this.size = size;
    this.scale = size / Math.max(world.width, world.height);

    this.container = new Container();
    parent.addChild(this.container);

    // Fundo
    const bg = new Graphics();
    bg.rect(-2, -2, size + 4, size + 4);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    this.container.addChild(bg);

    // Mapa
    this.mapGraphics = new Graphics();
    this.container.addChild(this.mapGraphics);

    // Viewport indicator
    this.viewportGraphics = new Graphics();
    this.container.addChild(this.viewportGraphics);

    this.renderMap();
  }

  /**
   * Posiciona no canto
   */
  setPosition(screenWidth: number, screenHeight: number): void {
    this.container.x = screenWidth - this.size - 10;
    this.container.y = screenHeight - this.size - 10;
  }

  /**
   * Renderiza o mapa (só precisa fazer uma vez ou quando muda)
   */
  renderMap(): void {
    this.mapGraphics.clear();

    // Amostra a cada N tiles pra performance
    const step = Math.max(1, Math.floor(this.world.width / this.size));

    for (let x = 0; x < this.world.width; x += step) {
      for (let y = 0; y < this.world.height; y += step) {
        const tile = this.world.getTile(x, y);
        if (tile) {
          this.mapGraphics.rect(
            x * this.scale,
            y * this.scale,
            Math.max(1, step * this.scale),
            Math.max(1, step * this.scale)
          );
          this.mapGraphics.fill({ color: tile.color });
        }
      }
    }
  }

  /**
   * Atualiza indicador de viewport
   */
  updateViewport(camera: Camera): void {
    this.viewportGraphics.clear();

    const bounds = camera.visibleBounds;
    const tileSize = WORLD.TILE_SIZE;

    // Converte para coordenadas do minimapa
    const x = (bounds.x / tileSize) * this.scale;
    const y = (bounds.y / tileSize) * this.scale;
    const w = (bounds.width / tileSize) * this.scale;
    const h = (bounds.height / tileSize) * this.scale;

    this.viewportGraphics.rect(x, y, w, h);
    this.viewportGraphics.stroke({ color: 0xFFFFFF, width: 1 });
  }

  /**
   * Adiciona marcador de entidade
   */
  addEntityMarker(worldX: number, worldY: number, color: number): void {
    const x = (worldX / WORLD.TILE_SIZE) * this.scale;
    const y = (worldY / WORLD.TILE_SIZE) * this.scale;
    
    this.viewportGraphics.circle(x, y, 2);
    this.viewportGraphics.fill({ color });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

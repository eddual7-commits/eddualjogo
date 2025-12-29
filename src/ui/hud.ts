import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Era } from '../core/constants';

const ERA_NAMES = [
  'Primitiva', 'Pedra', 'Bronze', 'Ferro', 'Medieval', 'Renascimento',
  'Colonial', 'Industrial', 'Moderna', 'Digital', 'Espacial', 'Singularidade'
];

/**
 * HUD - Interface do usuário no topo da tela
 */
export class HUD {
  private container: Container;
  private background: Graphics;
  private texts: Map<string, Text> = new Map();
  
  private style: TextStyle;
  private width: number;

  constructor(parent: Container, screenWidth: number) {
    this.width = screenWidth;
    this.container = new Container();
    parent.addChild(this.container);

    this.style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xFFFFFF,
    });

    // Fundo semi-transparente
    this.background = new Graphics();
    this.background.rect(0, 0, screenWidth, 30);
    this.background.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(this.background);

    // Textos
    this.createText('era', 'Era: Primitiva', 10);
    this.createText('pop', 'Pop: 0', 150);
    this.createText('time', '12:00', 280);
    this.createText('fps', 'FPS: 60', 380);
    this.createText('speed', 'x1', 460);
    this.createText('paused', '', 520);
  }

  private createText(id: string, content: string, x: number): void {
    const text = new Text({ text: content, style: this.style });
    text.x = x;
    text.y = 7;
    this.container.addChild(text);
    this.texts.set(id, text);
  }

  /**
   * Atualiza informações do HUD
   */
  update(data: {
    era?: Era;
    population?: number;
    hour?: number;
    fps?: number;
    speed?: number;
    isPaused?: boolean;
  }): void {
    if (data.era !== undefined) {
      this.texts.get('era')!.text = `Era: ${ERA_NAMES[data.era]}`;
    }
    
    if (data.population !== undefined) {
      this.texts.get('pop')!.text = `Pop: ${data.population}`;
    }
    
    if (data.hour !== undefined) {
      const h = Math.floor(data.hour);
      const m = Math.floor((data.hour % 1) * 60);
      this.texts.get('time')!.text = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    if (data.fps !== undefined) {
      this.texts.get('fps')!.text = `FPS: ${data.fps}`;
    }
    
    if (data.speed !== undefined) {
      this.texts.get('speed')!.text = `x${data.speed}`;
    }
    
    if (data.isPaused !== undefined) {
      this.texts.get('paused')!.text = data.isPaused ? '⏸ PAUSADO' : '';
    }
  }

  resize(width: number): void {
    this.width = width;
    this.background.clear();
    this.background.rect(0, 0, width, 30);
    this.background.fill({ color: 0x000000, alpha: 0.7 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
        }

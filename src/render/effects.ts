import { Container, Graphics } from 'pixi.js';
import { lerp } from '../core/utils';
import { Camera } from '../core/camera';

interface ScreenEffect {
  type: 'flash' | 'fade' | 'vignette';
  color: number;
  alpha: number;
  duration: number;
  elapsed: number;
  fadeIn?: boolean;
}

/**
 * Sistema de efeitos visuais de tela
 */
export class EffectsSystem {
  private container: Container;
  private overlay: Graphics;
  private vignetteGraphics: Graphics;
  
  private effects: ScreenEffect[] = [];
  private slowMotion: { factor: number; duration: number; elapsed: number } | null = null;
  private screenWidth: number;
  private screenHeight: number;

  constructor(parent: Container, width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    
    this.container = new Container();
    this.overlay = new Graphics();
    this.vignetteGraphics = new Graphics();
    
    this.container.addChild(this.overlay);
    this.container.addChild(this.vignetteGraphics);
    parent.addChild(this.container);
    
    this.createVignette();
  }

  private createVignette(): void {
    // Vinheta permanente sutil
    const cx = this.screenWidth / 2;
    const cy = this.screenHeight / 2;
    const radius = Math.max(this.screenWidth, this.screenHeight) * 0.8;
    
    this.vignetteGraphics.clear();
    this.vignetteGraphics.ellipse(cx, cy, radius, radius);
    this.vignetteGraphics.fill({ color: 0x000000, alpha: 0 });
    this.vignetteGraphics.rect(0, 0, this.screenWidth, this.screenHeight);
    this.vignetteGraphics.fill({ color: 0x000000, alpha: 0.15 });
    // Nota: vinheta real precisaria de gradiente radial, simplificado aqui
  }

  /**
   * Flash branco/colorido na tela
   */
  flash(color: number = 0xFFFFFF, duration: number = 100): void {
    this.effects.push({
      type: 'flash',
      color,
      alpha: 0.8,
      duration,
      elapsed: 0,
    });
  }

  /**
   * Fade in/out
   */
  fade(color: number = 0x000000, duration: number = 500, fadeIn: boolean = true): void {
    this.effects.push({
      type: 'fade',
      color,
      alpha: fadeIn ? 1 : 0,
      duration,
      elapsed: 0,
      fadeIn,
    });
  }

  /**
   * Efeito de dano (flash vermelho)
   */
  damageFlash(): void {
    this.flash(0xFF0000, 150);
  }

  /**
   * Efeito de cura (flash verde)
   */
  healFlash(): void {
    this.flash(0x00FF00, 200);
  }

  /**
   * Efeito de level up
   */
  levelUpFlash(): void {
    this.flash(0xFFD700, 300);
  }

  /**
   * Ativa slow motion
   */
  slowMo(factor: number = 0.3, duration: number = 1000): void {
    this.slowMotion = { factor, duration, elapsed: 0 };
  }

  /**
   * Screen shake (delega pra câmera)
   */
  shake(camera: Camera, intensity: number = 10, duration: number = 300): void {
    camera.addShake(intensity, duration);
  }

  /**
   * Retorna fator de slow motion atual
   */
  getTimeScale(): number {
    return this.slowMotion ? this.slowMotion.factor : 1;
  }

  update(delta: number): void {
    // Atualiza slow motion
    if (this.slowMotion) {
      this.slowMotion.elapsed += delta;
      if (this.slowMotion.elapsed >= this.slowMotion.duration) {
        this.slowMotion = null;
      }
    }

    // Atualiza e renderiza efeitos
    this.overlay.clear();
    
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.elapsed += delta;
      
      const progress = effect.elapsed / effect.duration;
      
      if (progress >= 1) {
        this.effects.splice(i, 1);
        continue;
      }

      let alpha = effect.alpha;
      
      switch (effect.type) {
        case 'flash':
          alpha = effect.alpha * (1 - progress); // Fade out
          break;
        case 'fade':
          alpha = effect.fadeIn ? 
            lerp(effect.alpha, 0, progress) : 
            lerp(0, effect.alpha, progress);
          break;
      }

      this.overlay.rect(0, 0, this.screenWidth, this.screenHeight);
      this.overlay.fill({ color: effect.color, alpha });
    }
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.createVignette();
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
  }

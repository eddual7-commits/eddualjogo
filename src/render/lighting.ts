import { Graphics, Container, BlurFilter } from 'pixi.js';
import { lerp, lerpColor } from '../core/utils';

/**
 * Sistema de iluminação e ciclo dia/noite
 */
export class LightingSystem {
  private overlay: Graphics;
  private timeOfDay: number = 0.5; // 0 = meia-noite, 0.5 = meio-dia, 1 = meia-noite
  private dayDuration: number = 300000; // 5 minutos por dia
  private elapsed: number = 0;
  
  // Cores do céu em diferentes horários
  private readonly skyColors = {
    midnight: 0x0a0a1a,
    dawn: 0xff7f50,
    morning: 0x87ceeb,
    noon: 0x00bfff,
    afternoon: 0x87ceeb,
    dusk: 0xff6347,
    night: 0x191970,
  };

  private readonly ambientLevels = {
    midnight: 0.3,
    dawn: 0.6,
    morning: 0.9,
    noon: 1.0,
    afternoon: 0.9,
    dusk: 0.6,
    night: 0.35,
  };

  constructor(parent: Container, width: number, height: number) {
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, width, height);
    this.overlay.fill({ color: 0x000000, alpha: 0 });
    parent.addChild(this.overlay);
    
    // Começa ao meio-dia
    this.timeOfDay = 0.5;
  }

  /**
   * Define a hora do dia diretamente (0-1)
   */
  setTimeOfDay(time: number): void {
    this.timeOfDay = time % 1;
    this.updateOverlay();
  }

  /**
   * Define duração do ciclo dia/noite em ms
   */
  setDayDuration(duration: number): void {
    this.dayDuration = duration;
  }

  /**
   * Retorna hora atual (0-24)
   */
  getHour(): number {
    return this.timeOfDay * 24;
  }

  /**
   * Verifica se é dia
   */
  isDay(): boolean {
    const hour = this.getHour();
    return hour >= 6 && hour < 18;
  }

  /**
   * Verifica se é noite
   */
  isNight(): boolean {
    return !this.isDay();
  }

  /**
   * Retorna período do dia como string
   */
  getPeriod(): string {
    const hour = this.getHour();
    if (hour < 5) return 'midnight';
    if (hour < 7) return 'dawn';
    if (hour < 11) return 'morning';
    if (hour < 14) return 'noon';
    if (hour < 17) return 'afternoon';
    if (hour < 20) return 'dusk';
    return 'night';
  }

  /**
   * Retorna cor do céu atual
   */
  getSkyColor(): number {
    const hour = this.getHour();
    
    if (hour < 5) return this.skyColors.midnight;
    if (hour < 6) return lerpColor(this.skyColors.midnight, this.skyColors.dawn, (hour - 5));
    if (hour < 7) return lerpColor(this.skyColors.dawn, this.skyColors.morning, (hour - 6));
    if (hour < 11) return lerpColor(this.skyColors.morning, this.skyColors.noon, (hour - 7) / 4);
    if (hour < 14) return this.skyColors.noon;
    if (hour < 17) return lerpColor(this.skyColors.noon, this.skyColors.afternoon, (hour - 14) / 3);
    if (hour < 19) return lerpColor(this.skyColors.afternoon, this.skyColors.dusk, (hour - 17) / 2);
    if (hour < 21) return lerpColor(this.skyColors.dusk, this.skyColors.night, (hour - 19) / 2);
    return lerpColor(this.skyColors.night, this.skyColors.midnight, (hour - 21) / 3);
  }

  /**
   * Retorna nível de luz ambiente (0-1)
   */
  getAmbientLevel(): number {
    const hour = this.getHour();
    
    if (hour < 5) return this.ambientLevels.midnight;
    if (hour < 7) return lerp(this.ambientLevels.midnight, this.ambientLevels.dawn, (hour - 5) / 2);
    if (hour < 9) return lerp(this.ambientLevels.dawn, this.ambientLevels.morning, (hour - 7) / 2);
    if (hour < 12) return lerp(this.ambientLevels.morning, this.ambientLevels.noon, (hour - 9) / 3);
    if (hour < 15) return this.ambientLevels.noon;
    if (hour < 17) return lerp(this.ambientLevels.noon, this.ambientLevels.afternoon, (hour - 15) / 2);
    if (hour < 19) return lerp(this.ambientLevels.afternoon, this.ambientLevels.dusk, (hour - 17) / 2);
    if (hour < 21) return lerp(this.ambientLevels.dusk, this.ambientLevels.night, (hour - 19) / 2);
    return lerp(this.ambientLevels.night, this.ambientLevels.midnight, (hour - 21) / 3);
  }

  private updateOverlay(): void {
    const darkness = 1 - this.getAmbientLevel();
    const tintColor = this.getSkyColor();
    
    // Recria o overlay com nova opacidade
    this.overlay.clear();
    this.overlay.rect(
      -10000, -10000, // Cobre toda a área visível
      20000, 20000
    );
    this.overlay.fill({ color: tintColor, alpha: darkness * 0.5 });
  }

  /**
   * Atualiza o sistema
   */
  update(delta: number): void {
    this.elapsed += delta;
    this.timeOfDay = (this.elapsed / this.dayDuration) % 1;
    this.updateOverlay();
  }

  /**
   * Redimensiona o overlay
   */
  resize(width: number, height: number): void {
    this.updateOverlay();
  }

  destroy(): void {
    this.overlay.destroy();
  }
      }

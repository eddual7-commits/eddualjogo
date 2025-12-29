import { Container, Graphics } from 'pixi.js';
import { random } from '../core/utils';

export enum WeatherType {
  CLEAR = 0,
  RAIN = 1,
  STORM = 2,
  SNOW = 3,
  FOG = 4,
  SANDSTORM = 5,
}

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

/**
 * Sistema de clima
 */
export class WeatherSystem {
  private container: Container;
  private graphics: Graphics;
  private fogOverlay: Graphics;
  
  private particles: WeatherParticle[] = [];
  private currentWeather: WeatherType = WeatherType.CLEAR;
  private intensity: number = 1;
  private windX: number = 0;
  
  private screenWidth: number;
  private screenHeight: number;
  private maxParticles = 500;

  constructor(parent: Container, width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    
    this.container = new Container();
    this.graphics = new Graphics();
    this.fogOverlay = new Graphics();
    
    this.container.addChild(this.graphics);
    this.container.addChild(this.fogOverlay);
    parent.addChild(this.container);
  }

  get weather(): WeatherType { return this.currentWeather; }

  setWeather(type: WeatherType, intensity: number = 1): void {
    this.currentWeather = type;
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.particles = [];
    this.windX = type === WeatherType.STORM ? random(2, 5) : 
                 type === WeatherType.SANDSTORM ? random(4, 8) : 0;
  }

  private spawnParticles(): void {
    const targetCount = Math.floor(this.maxParticles * this.intensity);
    const toSpawn = Math.min(10, targetCount - this.particles.length);
    
    for (let i = 0; i < toSpawn; i++) {
      const p: WeatherParticle = {
        x: random(-50, this.screenWidth + 50),
        y: random(-50, 0),
        vx: this.windX + random(-0.5, 0.5),
        vy: 0,
        size: 1,
        alpha: 1,
      };

      switch (this.currentWeather) {
        case WeatherType.RAIN:
          p.vy = random(8, 12);
          p.size = random(1, 2);
          p.alpha = random(0.3, 0.6);
          break;
        case WeatherType.STORM:
          p.vy = random(12, 18);
          p.size = random(2, 3);
          p.alpha = random(0.4, 0.7);
          break;
        case WeatherType.SNOW:
          p.vy = random(1, 3);
          p.vx = random(-1, 1);
          p.size = random(2, 4);
          p.alpha = random(0.6, 1);
          break;
        case WeatherType.SANDSTORM:
          p.y = random(0, this.screenHeight);
          p.vy = random(-1, 1);
          p.size = random(1, 3);
          p.alpha = random(0.3, 0.5);
          break;
      }
      
      this.particles.push(p);
    }
  }

  update(delta: number): void {
    if (this.currentWeather === WeatherType.CLEAR) {
      this.fogOverlay.clear();
      return;
    }

    // Spawna novas partículas
    if (this.currentWeather !== WeatherType.FOG) {
      this.spawnParticles();
    }

    // Atualiza partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (delta / 16);
      p.y += p.vy * (delta / 16);

      // Remove se saiu da tela
      if (p.y > this.screenHeight + 50 || p.x > this.screenWidth + 100 || p.x < -100) {
        this.particles.splice(i, 1);
      }
    }

    // Renderiza
    this.render();
  }

  private render(): void {
    this.graphics.clear();
    this.fogOverlay.clear();

    switch (this.currentWeather) {
      case WeatherType.RAIN:
      case WeatherType.STORM:
        for (const p of this.particles) {
          this.graphics.moveTo(p.x, p.y);
          this.graphics.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
        }
        this.graphics.stroke({ 
          color: this.currentWeather === WeatherType.STORM ? 0x6699CC : 0x87CEEB, 
          width: 1, 
          alpha: 0.5 
        });
        
        // Overlay escuro para tempestade
        if (this.currentWeather === WeatherType.STORM) {
          this.fogOverlay.rect(0, 0, this.screenWidth, this.screenHeight);
          this.fogOverlay.fill({ color: 0x1a1a2e, alpha: 0.3 * this.intensity });
        }
        break;

      case WeatherType.SNOW:
        for (const p of this.particles) {
          this.graphics.circle(p.x, p.y, p.size);
        }
        this.graphics.fill({ color: 0xFFFFFF, alpha: 0.8 });
        break;

      case WeatherType.FOG:
        this.fogOverlay.rect(0, 0, this.screenWidth, this.screenHeight);
        this.fogOverlay.fill({ color: 0xCCCCCC, alpha: 0.4 * this.intensity });
        break;

      case WeatherType.SANDSTORM:
        for (const p of this.particles) {
          this.graphics.circle(p.x, p.y, p.size);
        }
        this.graphics.fill({ color: 0xD2B48C, alpha: 0.6 });
        this.fogOverlay.rect(0, 0, this.screenWidth, this.screenHeight);
        this.fogOverlay.fill({ color: 0xD2691E, alpha: 0.2 * this.intensity });
        break;
    }
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
      }

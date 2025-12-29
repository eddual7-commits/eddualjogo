// ===== RENDERIZAÇÃO + SPRITES + PARTÍCULAS =====
import { Container, Graphics } from 'pixi.js';
import { Game, TILE_SIZE } from './game';
import { Entity, EntityType } from './entities';

// ===== CORES =====
const SKIN_COLORS: Record<string, number> = {
  human: 0xfdbf6f,
  elf: 0xffeaa7,
  orc: 0x6b8e23,
  dwarf: 0xd4a574,
  wolf: 0x555555,
  sheep: 0xeeeeee,
  bear: 0x8B4513,
  dragon: 0x8B0000
};

const HAIR_COLORS = [0x4a3728, 0x1a1a1a, 0x8B4513, 0xffd700, 0xdc143c, 0xffffff];

// ===== PARTÍCULA =====
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Renderer {
  game: Game;
  sprites: Map<number, Graphics> = new Map();
  particles: Particle[] = [];
  particleGraphics: Graphics;
  
  // Screen shake
  shakeAmount = 0;
  shakeDecay = 0.9;
  
  constructor(game: Game) {
    this.game = game;
    this.particleGraphics = new Graphics();
    this.game.entityContainer.addChild(this.particleGraphics);
  }
  
  createSprite(e: Entity) {
    const g = new Graphics();
    this.sprites.set(e.id, g);
    this.game.entityContainer.addChild(g);
    this.drawEntity(g, e);
  }
  
  updateSprite(e: Entity) {
    const g = this.sprites.get(e.id);
    if (!g) return;
    
    g.x = e.x * TILE_SIZE;
    g.y = e.y * TILE_SIZE;
    g.scale.x = e.dir * e.scale;
    g.scale.y = e.scale;
    
    // Redesenha se flash
    if (e.flash > 0) {
      this.drawEntity(g, e);
    }
  }
  
  removeSprite(id: number) {
    const g = this.sprites.get(id);
    if (g) {
      this.game.entityContainer.removeChild(g);
      g.destroy();
      this.sprites.delete(id);
    }
  }
  
  drawEntity(g: Graphics, e: Entity) {
    g.clear();
    
    const s = TILE_SIZE * 0.8;
    const isWalking = Math.abs(e.vx) > 0.1 || Math.abs(e.vy) > 0.1;
    const bounce = isWalking ? Math.sin(e.animTime * 2) * 2 : 0;
    const legAnim = isWalking ? Math.sin(e.animTime * 4) * s * 0.15 : 0;
    const armAnim = isWalking ? Math.sin(e.animTime * 4) * 0.3 : 0;
    
    const skinColor = e.flash > 0 ? 0xff0000 : SKIN_COLORS[e.type] || 0xcccccc;
    const faction = this.game.entities.getFaction(e.factionId);
    const clothColor = faction?.color || 0x666666;
    
    // Sombra
    g.circle(0, s * 0.4, s * 0.35);
    g.fill({ color: 0x000000, alpha: 0.3 });
    
    if (e.type === 'wolf' || e.type === 'bear') {
      this.drawAnimal(g, e, s, skinColor, bounce, legAnim);
    } else if (e.type === 'sheep') {
      this.drawSheep(g, e, s, bounce, legAnim);
    } else if (e.type === 'dragon') {
      this.drawDragon(g, e, s, skinColor, bounce);
    } else {
      this.drawHumanoid(g, e, s, skinColor, clothColor, bounce, legAnim, armAnim);
    }
    
    // Barra de vida (se dano)
    if (e.hp < e.maxHp) {
      const barW = s * 1.5;
      const barH = 3;
      const barY = -s * 0.8 + bounce;
      
      // Fundo
      g.rect(-barW / 2, barY, barW, barH);
      g.fill({ color: 0x333333 });
      
      // Vida
      const hpPercent = e.hp / e.maxHp;
      const hpColor = hpPercent > 0.6 ? 0x00ff00 : hpPercent > 0.3 ? 0xffaa00 : 0xff0000;
      g.rect(-barW / 2, barY, barW * hpPercent, barH);
      g.fill({ color: hpColor });
    }
    
    // Indicador de seleção
    if (this.game.selectedId === e.id) {
      g.circle(0, 0, s * 0.9);
      g.stroke({ color: 0xffd700, width: 2 });
    }
  }
  
  drawHumanoid(g: Graphics, e: Entity, s: number, skinColor: number, clothColor: number, bounce: number, legAnim: number, armAnim: number) {
    const hairColor = HAIR_COLORS[Math.floor(e.id % HAIR_COLORS.length)];
    
    // Pernas
    g.rect(-s * 0.15, s * 0.15 + legAnim, s * 0.12, s * 0.3);
    g.rect(s * 0.03, s * 0.15 - legAnim, s * 0.12, s * 0.3);
    g.fill({ color: 0x2c3e50 });
    
    // Corpo
    g.roundRect(-s * 0.2, -s * 0.15 + bounce, s * 0.4, s * 0.35, 3);
    g.fill({ color: clothColor });
    
    // Braços
    g.save();
    g.translate(-s * 0.25, -s * 0.05 + bounce);
    g.rotate(armAnim);
    g.rect(-s * 0.06, 0, s * 0.1, s * 0.25);
    g.fill({ color: skinColor });
    g.restore();
    
    g.save();
    g.translate(s * 0.25, -s * 0.05 + bounce);
    g.rotate(-armAnim);
    g.rect(-s * 0.04, 0, s * 0.1, s * 0.25);
    g.fill({ color: skinColor });
    g.restore();
    
    // Cabeça
    g.circle(0, -s * 0.35 + bounce, s * 0.22);
    g.fill({ color: skinColor });
    
    // Cabelo
    g.circle(0, -s * 0.42 + bounce, s * 0.18);
    g.fill({ color: hairColor });
    
    // Olhos
    g.circle(-s * 0.07, -s * 0.35 + bounce, s * 0.04);
    g.circle(s * 0.07, -s * 0.35 + bounce, s * 0.04);
    g.fill({ color: 0x000000 });
    
    // Detalhes raciais
    if (e.type === 'elf') {
      // Orelhas pontudas
      g.moveTo(-s * 0.2, -s * 0.35 + bounce);
      g.lineTo(-s * 0.35, -s * 0.55 + bounce);
      g.lineTo(-s * 0.18, -s * 0.3 + bounce);
      g.fill({ color: skinColor });
    } else if (e.type === 'orc') {
      // Presas
      g.moveTo(-s * 0.08, -s * 0.18 + bounce);
      g.lineTo(-s * 0.05, -s * 0.08 + bounce);
      g.lineTo(-s * 0.11, -s * 0.12 + bounce);
      g.moveTo(s * 0.08, -s * 0.18 + bounce);
      g.lineTo(s * 0.05, -s * 0.08 + bounce);
      g.lineTo(s * 0.11, -s * 0.12 + bounce);
      g.fill({ color: 0xffffff });
    } else if (e.type === 'dwarf') {
      // Barba grande
      g.ellipse(0, -s * 0.15 + bounce, s * 0.2, s * 0.25);
      g.fill({ color: hairColor });
    }
    
    // Carregando recurso
    if (e.carrying) {
      const resColor = e.carrying === 'wood' ? 0x8B4513 : e.carrying === 'stone' ? 0x888888 : 0xaa66ff;
      g.rect(-s * 0.1, -s * 0.1 + bounce, s * 0.2, s * 0.15);
      g.fill({ color: resColor });
    }
  }
  
  drawAnimal(g: Graphics, e: Entity, s: number, color: number, bounce: number, legAnim: number) {
    const isWolf = e.type === 'wolf';
    const bodyScale = isWolf ? 1 : 1.3;
    
    // Patas
    g.rect(-s * 0.35, s * 0.1 + legAnim, s * 0.1, s * 0.2);
    g.rect(-s * 0.15, s * 0.1 - legAnim, s * 0.1, s * 0.2);
    g.rect(s * 0.05, s * 0.1 + legAnim, s * 0.1, s * 0.2);
    g.rect(s * 0.25, s * 0.1 - legAnim, s * 0.1, s * 0.2);
    g.fill({ color: color });
    
    // Corpo
    g.ellipse(0, bounce, s * 0.4 * bodyScale, s * 0.25 * bodyScale);
    g.fill({ color: color });
    
    // Cabeça
    g.ellipse(s * 0.35, -s * 0.05 + bounce, s * 0.2, s * 0.18);
    g.fill({ color: color });
    
    // Orelhas
    g.moveTo(s * 0.25, -s * 0.15 + bounce);
    g.lineTo(s * 0.3, -s * 0.35 + bounce);
    g.lineTo(s * 0.38, -s * 0.15 + bounce);
    g.moveTo(s * 0.38, -s * 0.15 + bounce);
    g.lineTo(s * 0.43, -s * 0.35 + bounce);
    g.lineTo(s * 0.5, -s * 0.15 + bounce);
    g.fill({ color: color });
    
    // Olho
    g.circle(s * 0.4, -s * 0.05 + bounce, s * 0.05);
    g.fill({ color: isWolf ? 0xff0000 : 0x000000 });
    
    // Rabo
    g.moveTo(-s * 0.4, bounce);
    g.lineTo(-s * 0.55, -s * 0.15 + bounce + Math.sin(e.animTime * 3) * 3);
    g.lineTo(-s * 0.45, s * 0.05 + bounce);
    g.fill({ color: color });
  }
  
  drawSheep(g: Graphics, e: Entity, s: number, bounce: number, legAnim: number) {
    // Patas pretas
    g.rect(-s * 0.25, s * 0.15 + legAnim, s * 0.08, s * 0.15);
    g.rect(-s * 0.05, s * 0.15 - legAnim, s * 0.08, s * 0.15);
    g.rect(s * 0.08, s * 0.15 + legAnim, s * 0.08, s * 0.15);
    g.rect(s * 0.2, s * 0.15 - legAnim, s * 0.08, s * 0.15);
    g.fill({ color: 0x333333 });
    
    // Corpo fofinho (vários círculos)
    g.circle(-s * 0.1, bounce, s * 0.22);
    g.circle(s * 0.1, bounce, s * 0.22);
    g.circle(0, -s * 0.08 + bounce, s * 0.2);
    g.circle(0, s * 0.08 + bounce, s * 0.2);
    g.fill({ color: 0xeeeeee });
    
    // Cabeça preta
    g.ellipse(s * 0.3, -s * 0.05 + bounce, s * 0.15, s * 0.12);
    g.fill({ color: 0x333333 });
    
    // Olhos
    g.circle(s * 0.33, -s * 0.08 + bounce, s * 0.03);
    g.fill({ color: 0xffffff });
  }
  
  drawDragon(g: Graphics, e: Entity, s: number, color: number, bounce: number) {
    // Corpo grande
    g.ellipse(0, bounce, s * 0.5, s * 0.3);
    g.fill({ color: color });
    
    // Cabeça
    g.ellipse(s * 0.45, -s * 0.1 + bounce, s * 0.25, s * 0.2);
    g.fill({ color: color });
    
    // Chifres
    g.moveTo(s * 0.35, -s * 0.25 + bounce);
    g.lineTo(s * 0.3, -s * 0.5 + bounce);
    g.lineTo(s * 0.4, -s * 0.25 + bounce);
    g.moveTo(s * 0.5, -s * 0.25 + bounce);
    g.lineTo(s * 0.55, -s * 0.5 + bounce);
    g.lineTo(s * 0.6, -s * 0.25 + bounce);
    g.fill({ color: 0x2c2c2c });
    
    // Asas
    const wingY = bounce + Math.sin(e.animTime * 2) * s * 0.1;
    g.moveTo(-s * 0.1, -s * 0.1 + wingY);
    g.lineTo(-s * 0.5, -s * 0.5 + wingY);
    g.lineTo(-s * 0.3, s * 0.1 + wingY);
    g.fill({ color: 0x660000 });
    
    // Olho
    g.circle(s * 0.5, -s * 0.15 + bounce, s * 0.06);
    g.fill({ color: 0xffff00 });
    
    // Fogo (se atacando)
    if (e.state === 'attack' || e.state === 'hunt') {
      g.moveTo(s * 0.65, -s * 0.1 + bounce);
      g.lineTo(s * 0.9, -s * 0.15 + bounce);
      g.lineTo(s * 0.85, -s * 0.05 + bounce);
      g.lineTo(s * 0.95, 0 + bounce);
      g.lineTo(s * 0.65, s * 0.05 + bounce);
      g.fill({ color: 0xff6600 });
    }
  }
  
  // ===== PARTÍCULAS =====
  spawnParticles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 100,
        vy: -Math.random() * 80 - 20,
        color,
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 3
      });
    }
  }
  
  update(dt: number) {
    // Atualiza partículas
    this.particleGraphics.clear();
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt; // gravidade
      p.life -= dt * 2;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      this.particleGraphics.circle(p.x, p.y, p.size * p.life);
      this.particleGraphics.fill({ color: p.color, alpha: p.life });
    }
    
    // Screen shake
    if (this.shakeAmount > 0.1) {
      this.game.worldContainer.x += (Math.random() - 0.5) * this.shakeAmount;
      this.game.worldContainer.y += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= this.shakeDecay;
    }
  }
  
  shake(amount: number) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }
  }

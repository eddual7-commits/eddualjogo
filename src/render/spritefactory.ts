import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { Race, AnimalType, BossType, Era, RACE_SKIN_COLORS } from '../core/constants';
import { randomChoice, random } from '../core/utils';

/**
 * Factory para criar sprites procedurais usando apenas Graphics
 * NENHUM emoji ou imagem externa - tudo desenhado programaticamente
 */
export class SpriteFactory {
  private static instance: SpriteFactory | null = null;
  
  static getInstance(): SpriteFactory {
    if (!SpriteFactory.instance) {
      SpriteFactory.instance = new SpriteFactory();
    }
    return SpriteFactory.instance;
  }

  /**
   * Cria sprite de criatura (humanoide)
   */
  createCreature(race: Race, era: Era, size: number = 16): Container {
    const container = new Container();
    const g = new Graphics();
    
    const skinColor = randomChoice(RACE_SKIN_COLORS[race]);
    const halfSize = size / 2;
    
    // Corpo principal (elipse)
    g.ellipse(0, halfSize * 0.3, halfSize * 0.4, halfSize * 0.5);
    g.fill({ color: this.getBodyColor(race, era) });
    
    // Cabeça
    g.circle(0, -halfSize * 0.3, halfSize * 0.35);
    g.fill({ color: skinColor });
    
    // Olhos
    const eyeOffset = halfSize * 0.12;
    const eyeY = -halfSize * 0.35;
    g.circle(-eyeOffset, eyeY, halfSize * 0.08);
    g.circle(eyeOffset, eyeY, halfSize * 0.08);
    g.fill({ color: this.getEyeColor(race) });
    
    // Pupilas
    g.circle(-eyeOffset, eyeY, halfSize * 0.04);
    g.circle(eyeOffset, eyeY, halfSize * 0.04);
    g.fill({ color: 0x000000 });
    
    // Características específicas da raça
    this.addRaceFeatures(g, race, size, skinColor);
    
    // Acessórios baseados na era
    this.addEraAccessories(g, era, size);
    
    container.addChild(g);
    return container;
  }

  private getBodyColor(race: Race, era: Era): number {
    // Cor da roupa baseada na era
    const eraColors: Record<number, number[]> = {
      [Era.PRIMITIVE]: [0x8B4513, 0x654321, 0x5C4033],
      [Era.STONE]: [0x8B7355, 0x6B4423, 0x8B6914],
      [Era.BRONZE]: [0xCD7F32, 0x8B6914, 0xA0522D],
      [Era.IRON]: [0x708090, 0x4A4A4A, 0x2F4F4F],
      [Era.MEDIEVAL]: [0x8B0000, 0x00008B, 0x006400],
      [Era.RENAISSANCE]: [0x800080, 0x4B0082, 0x8B008B],
      [Era.COLONIAL]: [0x191970, 0x8B0000, 0xDAA520],
      [Era.INDUSTRIAL]: [0x2F4F4F, 0x696969, 0x36454F],
      [Era.MODERN]: [0x1E90FF, 0x228B22, 0xDC143C],
      [Era.DIGITAL]: [0x00CED1, 0x9400D3, 0x00FF00],
      [Era.SPACE]: [0x4169E1, 0xFFFFFF, 0xC0C0C0],
      [Era.SINGULARITY]: [0x00FFFF, 0xFF00FF, 0xFFFF00],
    };
    return randomChoice(eraColors[era] || eraColors[Era.PRIMITIVE]);
  }

  private getEyeColor(race: Race): number {
    const eyeColors: Record<Race, number[]> = {
      [Race.HUMAN]: [0x8B4513, 0x006400, 0x4169E1, 0x808080],
      [Race.ELF]: [0x00FF7F, 0x7FFFD4, 0xADFF2F],
      [Race.ORC]: [0xFF0000, 0xFF4500, 0x8B0000],
      [Race.DWARF]: [0x8B4513, 0x654321, 0x000000],
      [Race.VAMPIRE]: [0xFF0000, 0x8B0000, 0xDC143C],
      [Race.UNDEAD]: [0x00FF00, 0x7CFC00, 0xADFF2F],
      [Race.ANGEL]: [0xFFD700, 0xFFFFFF, 0x87CEEB],
      [Race.DEMON]: [0xFF0000, 0xFF4500, 0xFFD700],
    };
    return randomChoice(eyeColors[race]);
  }

  private addRaceFeatures(g: Graphics, race: Race, size: number, skinColor: number): void {
    const halfSize = size / 2;
    
    switch (race) {
      case Race.ELF:
        // Orelhas pontudas
        g.moveTo(-halfSize * 0.35, -halfSize * 0.4);
        g.lineTo(-halfSize * 0.5, -halfSize * 0.7);
        g.lineTo(-halfSize * 0.25, -halfSize * 0.35);
        g.fill({ color: skinColor });
        g.moveTo(halfSize * 0.35, -halfSize * 0.4);
        g.lineTo(halfSize * 0.5, -halfSize * 0.7);
        g.lineTo(halfSize * 0.25, -halfSize * 0.35);
        g.fill({ color: skinColor });
        break;
        
      case Race.ORC:
        // Presas
        g.moveTo(-halfSize * 0.15, -halfSize * 0.05);
        g.lineTo(-halfSize * 0.1, halfSize * 0.1);
        g.lineTo(-halfSize * 0.05, -halfSize * 0.05);
        g.fill({ color: 0xFFFFF0 });
        g.moveTo(halfSize * 0.15, -halfSize * 0.05);
        g.lineTo(halfSize * 0.1, halfSize * 0.1);
        g.lineTo(halfSize * 0.05, -halfSize * 0.05);
        g.fill({ color: 0xFFFFF0 });
        break;
        
      case Race.DWARF:
        // Barba grande
        g.moveTo(-halfSize * 0.3, -halfSize * 0.1);
        g.lineTo(0, halfSize * 0.5);
        g.lineTo(halfSize * 0.3, -halfSize * 0.1);
        g.fill({ color: 0x8B4513 });
        break;
        
      case Race.VAMPIRE:
        // Caninos
        g.rect(-halfSize * 0.12, -halfSize * 0.05, halfSize * 0.06, halfSize * 0.15);
        g.rect(halfSize * 0.06, -halfSize * 0.05, halfSize * 0.06, halfSize * 0.15);
        g.fill({ color: 0xFFFFFF });
        break;
        
      case Race.UNDEAD:
        // Crânio rachado
        g.moveTo(-halfSize * 0.2, -halfSize * 0.6);
        g.lineTo(0, -halfSize * 0.3);
        g.lineTo(halfSize * 0.1, -halfSize * 0.55);
        g.stroke({ color: 0x2F4F4F, width: 1 });
        break;
        
      case Race.ANGEL:
        // Auréola
        g.circle(0, -halfSize * 0.7, halfSize * 0.2);
        g.stroke({ color: 0xFFD700, width: 2 });
        // Asas
        this.drawWings(g, size, 0xFFFFFF, 0.3);
        break;
        
      case Race.DEMON:
        // Chifres
        g.moveTo(-halfSize * 0.25, -halfSize * 0.5);
        g.lineTo(-halfSize * 0.35, -halfSize * 0.9);
        g.lineTo(-halfSize * 0.15, -halfSize * 0.6);
        g.fill({ color: 0x2F2F2F });
        g.moveTo(halfSize * 0.25, -halfSize * 0.5);
        g.lineTo(halfSize * 0.35, -halfSize * 0.9);
        g.lineTo(halfSize * 0.15, -halfSize * 0.6);
        g.fill({ color: 0x2F2F2F });
        break;
    }
  }

  private drawWings(g: Graphics, size: number, color: number, alpha: number): void {
    const halfSize = size / 2;
    // Asa esquerda
    g.moveTo(-halfSize * 0.3, 0);
    g.bezierCurveTo(
      -halfSize * 1.2, -halfSize * 0.5,
      -halfSize * 1.2, halfSize * 0.5,
      -halfSize * 0.3, halfSize * 0.3
    );
    g.fill({ color, alpha });
    // Asa direita
    g.moveTo(halfSize * 0.3, 0);
    g.bezierCurveTo(
      halfSize * 1.2, -halfSize * 0.5,
      halfSize * 1.2, halfSize * 0.5,
      halfSize * 0.3, halfSize * 0.3
    );
    g.fill({ color, alpha });
  }

  private addEraAccessories(g: Graphics, era: Era, size: number): void {
    const halfSize = size / 2;
    
    switch (era) {
      case Era.PRIMITIVE:
        // Osso no cabelo
        g.rect(-halfSize * 0.3, -halfSize * 0.8, halfSize * 0.6, halfSize * 0.1);
        g.fill({ color: 0xFFFFF0 });
        break;
        
      case Era.STONE:
      case Era.BRONZE:
        // Capacete simples
        g.arc(0, -halfSize * 0.35, halfSize * 0.38, Math.PI, 0);
        g.fill({ color: era === Era.BRONZE ? 0xCD7F32 : 0x808080 });
        break;
        
      case Era.MEDIEVAL:
        // Capacete com penacho
        g.arc(0, -halfSize * 0.35, halfSize * 0.4, Math.PI, 0);
        g.fill({ color: 0x708090 });
        g.rect(-halfSize * 0.05, -halfSize * 0.9, halfSize * 0.1, halfSize * 0.4);
        g.fill({ color: 0xFF0000 });
        break;
        
      case Era.SPACE:
      case Era.SINGULARITY:
        // Capacete espacial
        g.circle(0, -halfSize * 0.3, halfSize * 0.45);
        g.stroke({ color: 0xFFFFFF, width: 2 });
        g.circle(0, -halfSize * 0.3, halfSize * 0.35);
        g.fill({ color: 0x87CEEB, alpha: 0.3 });
        break;
    }
  }

  /**
   * Cria sprite de animal
   */
  createAnimal(type: AnimalType, size: number = 14): Container {
    const container = new Container();
    const g = new Graphics();
    const halfSize = size / 2;

    switch (type) {
      case AnimalType.WOLF:
        this.drawWolf(g, size);
        break;
      case AnimalType.BEAR:
        this.drawBear(g, size);
        break;
      case AnimalType.SHEEP:
        this.drawSheep(g, size);
        break;
      case AnimalType.COW:
        this.drawCow(g, size);
        break;
      case AnimalType.CHICKEN:
        this.drawChicken(g, size);
        break;
      case AnimalType.FISH:
        this.drawFish(g, size);
        break;
      case AnimalType.DEER:
        this.drawDeer(g, size);
        break;
      case AnimalType.RABBIT:
        this.drawRabbit(g, size);
        break;
      case AnimalType.BOAR:
        this.drawBoar(g, size);
        break;
      case AnimalType.HORSE:
        this.drawHorse(g, size);
        break;
    }

    container.addChild(g);
    return container;
  }

  private drawWolf(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.7, h * 0.4);
    g.fill({ color: 0x696969 });
    // Cabeça
    g.ellipse(-h * 0.5, -h * 0.1, h * 0.35, h * 0.3);
    g.fill({ color: 0x696969 });
    // Focinho
    g.ellipse(-h * 0.75, 0, h * 0.15, h * 0.1);
    g.fill({ color: 0x2F2F2F });
    // Orelhas
    g.poly([-h * 0.4, -h * 0.35, -h * 0.5, -h * 0.6, -h * 0.3, -h * 0.35]);
    g.poly([-h * 0.6, -h * 0.35, -h * 0.7, -h * 0.6, -h * 0.5, -h * 0.35]);
    g.fill({ color: 0x696969 });
    // Olho
    g.circle(-h * 0.45, -h * 0.15, h * 0.08);
    g.fill({ color: 0xFFD700 });
    // Rabo
    g.ellipse(h * 0.6, -h * 0.1, h * 0.25, h * 0.1);
    g.fill({ color: 0x696969 });
  }

  private drawBear(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo grande
    g.ellipse(0, 0, h * 0.8, h * 0.6);
    g.fill({ color: 0x8B4513 });
    // Cabeça
    g.circle(-h * 0.6, -h * 0.2, h * 0.4);
    g.fill({ color: 0x8B4513 });
    // Focinho
    g.ellipse(-h * 0.8, -h * 0.1, h * 0.15, h * 0.12);
    g.fill({ color: 0xDEB887 });
    // Orelhas
    g.circle(-h * 0.45, -h * 0.55, h * 0.15);
    g.circle(-h * 0.75, -h * 0.55, h * 0.15);
    g.fill({ color: 0x8B4513 });
    // Olhos
    g.circle(-h * 0.5, -h * 0.25, h * 0.08);
    g.fill({ color: 0x000000 });
  }

  private drawSheep(g: Graphics, size: number): void {
    const h = size / 2;
    // Lã (corpo)
    for (let i = 0; i < 5; i++) {
      const x = random(-h * 0.3, h * 0.3);
      const y = random(-h * 0.2, h * 0.2);
      g.circle(x, y, h * 0.25);
    }
    g.fill({ color: 0xFFFAF0 });
    // Cabeça
    g.ellipse(-h * 0.5, 0, h * 0.25, h * 0.2);
    g.fill({ color: 0x2F2F2F });
    // Orelhas
    g.ellipse(-h * 0.4, -h * 0.25, h * 0.12, h * 0.08);
    g.ellipse(-h * 0.6, -h * 0.25, h * 0.12, h * 0.08);
    g.fill({ color: 0x2F2F2F });
    // Pernas
    g.rect(-h * 0.3, h * 0.3, h * 0.1, h * 0.3);
    g.rect(h * 0.2, h * 0.3, h * 0.1, h * 0.3);
    g.fill({ color: 0x2F2F2F });
  }

  private drawCow(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.8, h * 0.5);
    g.fill({ color: 0xFFFFFF });
    // Manchas
    g.circle(-h * 0.2, h * 0.1, h * 0.2);
    g.circle(h * 0.3, -h * 0.1, h * 0.15);
    g.fill({ color: 0x2F2F2F });
    // Cabeça
    g.ellipse(-h * 0.7, 0, h * 0.3, h * 0.25);
    g.fill({ color: 0xFFFFFF });
    // Focinho
    g.ellipse(-h * 0.85, h * 0.05, h * 0.12, h * 0.1);
    g.fill({ color: 0xFFB6C1 });
    // Chifres
    g.moveTo(-h * 0.6, -h * 0.2);
    g.lineTo(-h * 0.5, -h * 0.4);
    g.moveTo(-h * 0.8, -h * 0.2);
    g.lineTo(-h * 0.9, -h * 0.4);
    g.stroke({ color: 0xFFFFF0, width: 2 });
  }

  private drawChicken(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.5, h * 0.4);
    g.fill({ color: 0xFFFFFF });
    // Cabeça
    g.circle(-h * 0.4, -h * 0.2, h * 0.25);
    g.fill({ color: 0xFFFFFF });
    // Crista
    g.poly([-h * 0.35, -h * 0.4, -h * 0.45, -h * 0.6, -h * 0.25, -h * 0.5, -h * 0.35, -h * 0.65, -h * 0.15, -h * 0.45]);
    g.fill({ color: 0xFF0000 });
    // Bico
    g.poly([-h * 0.6, -h * 0.2, -h * 0.75, -h * 0.15, -h * 0.6, -h * 0.1]);
    g.fill({ color: 0xFFA500 });
    // Olho
    g.circle(-h * 0.35, -h * 0.25, h * 0.06);
    g.fill({ color: 0x000000 });
    // Rabo
    g.poly([h * 0.4, 0, h * 0.7, -h * 0.3, h * 0.5, 0, h * 0.7, 0, h * 0.4, h * 0.1]);
    g.fill({ color: 0xFFFFFF });
  }

  private drawFish(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.7, h * 0.35);
    g.fill({ color: 0x4169E1 });
    // Cauda
    g.poly([h * 0.5, 0, h * 0.9, -h * 0.3, h * 0.9, h * 0.3]);
    g.fill({ color: 0x4169E1 });
    // Barbatana dorsal
    g.poly([0, -h * 0.3, h * 0.2, -h * 0.5, h * 0.3, -h * 0.3]);
    g.fill({ color: 0x6495ED });
    // Olho
    g.circle(-h * 0.35, -h * 0.05, h * 0.1);
    g.fill({ color: 0xFFFFFF });
    g.circle(-h * 0.35, -h * 0.05, h * 0.05);
    g.fill({ color: 0x000000 });
  }

  private drawDeer(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.7, h * 0.4);
    g.fill({ color: 0xD2691E });
    // Cabeça
    g.ellipse(-h * 0.6, -h * 0.2, h * 0.25, h * 0.2);
    g.fill({ color: 0xD2691E });
    // Chifres
    g.moveTo(-h * 0.55, -h * 0.35);
    g.lineTo(-h * 0.4, -h * 0.7);
    g.lineTo(-h * 0.3, -h * 0.5);
    g.moveTo(-h * 0.4, -h * 0.55);
    g.lineTo(-h * 0.2, -h * 0.6);
    g.moveTo(-h * 0.7, -h * 0.35);
    g.lineTo(-h * 0.85, -h * 0.7);
    g.lineTo(-h * 0.95, -h * 0.5);
    g.moveTo(-h * 0.85, -h * 0.55);
    g.lineTo(-h * 1.05, -h * 0.6);
    g.stroke({ color: 0x8B4513, width: 2 });
    // Olho
    g.circle(-h * 0.5, -h * 0.2, h * 0.06);
    g.fill({ color: 0x000000 });
    // Rabo branco
    g.circle(h * 0.6, 0, h * 0.12);
    g.fill({ color: 0xFFFFFF });
  }

  private drawRabbit(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.5, h * 0.4);
    g.fill({ color: 0xD2B48C });
    // Cabeça
    g.circle(-h * 0.4, -h * 0.1, h * 0.3);
    g.fill({ color: 0xD2B48C });
    // Orelhas longas
    g.ellipse(-h * 0.3, -h * 0.55, h * 0.08, h * 0.3);
    g.ellipse(-h * 0.5, -h * 0.55, h * 0.08, h * 0.3);
    g.fill({ color: 0xD2B48C });
    // Interior das orelhas
    g.ellipse(-h * 0.3, -h * 0.55, h * 0.04, h * 0.2);
    g.ellipse(-h * 0.5, -h * 0.55, h * 0.04, h * 0.2);
    g.fill({ color: 0xFFB6C1 });
    // Olho
    g.circle(-h * 0.35, -h * 0.15, h * 0.08);
    g.fill({ color: 0x000000 });
    // Rabo pompom
    g.circle(h * 0.45, 0, h * 0.15);
    g.fill({ color: 0xFFFFFF });
  }

  private drawBoar(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.7, h * 0.45);
    g.fill({ color: 0x4A2C2A });
    // Cabeça
    g.ellipse(-h * 0.6, 0, h * 0.35, h * 0.3);
    g.fill({ color: 0x4A2C2A });
    // Focinho
    g.ellipse(-h * 0.85, h * 0.05, h * 0.15, h * 0.12);
    g.fill({ color: 0xFFB6C1 });
    // Presas
    g.arc(-h * 0.7, h * 0.1, h * 0.12, 0.5, Math.PI - 0.5);
    g.stroke({ color: 0xFFFFF0, width: 2 });
    // Olho
    g.circle(-h * 0.5, -h * 0.05, h * 0.08);
    g.fill({ color: 0xFF0000 });
    // Pelos dorsais
    g.moveTo(-h * 0.2, -h * 0.4);
    g.lineTo(0, -h * 0.55);
    g.lineTo(h * 0.2, -h * 0.4);
    g.lineTo(h * 0.4, -h * 0.5);
    g.lineTo(h * 0.5, -h * 0.35);
    g.stroke({ color: 0x2F1F1F, width: 2 });
  }

  private drawHorse(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.8, h * 0.45);
    g.fill({ color: 0x8B4513 });
    // Pescoço/Cabeça
    g.ellipse(-h * 0.7, -h * 0.2, h * 0.35, h * 0.25);
    g.fill({ color: 0x8B4513 });
    // Focinho
    g.ellipse(-h * 0.95, -h * 0.15, h * 0.15, h * 0.12);
    g.fill({ color: 0x8B4513 });
    // Crina
    g.moveTo(-h * 0.5, -h * 0.4);
    for (let i = 0; i < 5; i++) {
      g.lineTo(-h * 0.3 + i * h * 0.15, -h * 0.55 + (i % 2) * h * 0.1);
    }
    g.stroke({ color: 0x2F1F1F, width: 3 });
    // Olho
    g.circle(-h * 0.6, -h * 0.25, h * 0.08);
    g.fill({ color: 0x000000 });
    // Rabo
    g.moveTo(h * 0.7, 0);
    g.bezierCurveTo(h, h * 0.3, h * 1.1, h * 0.5, h * 0.9, h * 0.6);
    g.stroke({ color: 0x2F1F1F, width: 3 });
  }

  /**
   * Cria sprite de boss
   */
  createBoss(type: BossType, size: number = 64): Container {
    const container = new Container();
    const g = new Graphics();

    switch (type) {
      case BossType.DRAGON:
        this.drawDragon(g, size);
        break;
      case BossType.DEMON_LORD:
        this.drawDemonLord(g, size);
        break;
      case BossType.TITAN:
        this.drawTitan(g, size);
        break;
      case BossType.ALIEN_QUEEN:
        this.drawAlienQueen(g, size);
        break;
      case BossType.LICH_KING:
        this.drawLichKing(g, size);
        break;
      case BossType.KRAKEN:
        this.drawKraken(g, size);
        break;
    }

    container.addChild(g);
    return container;
  }

  private drawDragon(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo
    g.ellipse(0, 0, h * 0.7, h * 0.4);
    g.fill({ color: 0x8B0000 });
    // Pescoço longo
    g.ellipse(-h * 0.6, -h * 0.3, h * 0.3, h * 0.2);
    g.fill({ color: 0x8B0000 });
    // Cabeça
    g.ellipse(-h * 0.85, -h * 0.45, h * 0.25, h * 0.2);
    g.fill({ color: 0x8B0000 });
    // Chifres
    g.poly([-h * 0.75, -h * 0.6, -h * 0.65, -h * 0.85, -h * 0.6, -h * 0.55]);
    g.poly([-h * 0.95, -h * 0.6, -h * 1.05, -h * 0.85, -h, -h * 0.55]);
    g.fill({ color: 0x2F2F2F });
    // Asas
    g.moveTo(-h * 0.2, -h * 0.3);
    g.lineTo(-h * 0.5, -h * 0.9);
    g.lineTo(h * 0.1, -h * 0.7);
    g.lineTo(h * 0.3, -h * 0.3);
    g.fill({ color: 0x8B0000, alpha: 0.7 });
    g.moveTo(h * 0.2, -h * 0.3);
    g.lineTo(h * 0.5, -h * 0.9);
    g.lineTo(h * 0.8, -h * 0.7);
    g.lineTo(h * 0.6, -h * 0.3);
    g.fill({ color: 0x8B0000, alpha: 0.7 });
    // Olho
    g.circle(-h * 0.8, -h * 0.5, h * 0.08);
    g.fill({ color: 0xFFD700 });
    // Escamas na barriga
    g.ellipse(0, h * 0.15, h * 0.5, h * 0.2);
    g.fill({ color: 0xFFD700 });
    // Rabo
    g.moveTo(h * 0.6, 0);
    g.bezierCurveTo(h, 0, h * 1.2, -h * 0.2, h * 1.1, -h * 0.4);
    g.lineTo(h * 1.25, -h * 0.35);
    g.stroke({ color: 0x8B0000, width: 8 });
  }

  private drawDemonLord(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo musculoso
    g.ellipse(0, 0, h * 0.5, h * 0.6);
    g.fill({ color: 0x8B0000 });
    // Cabeça
    g.circle(0, -h * 0.5, h * 0.35);
    g.fill({ color: 0x8B0000 });
    // Chifres grandes
    g.moveTo(-h * 0.2, -h * 0.7);
    g.bezierCurveTo(-h * 0.4, -h, -h * 0.6, -h * 1.1, -h * 0.5, -h * 1.3);
    g.stroke({ color: 0x2F2F2F, width: 6 });
    g.moveTo(h * 0.2, -h * 0.7);
    g.bezierCurveTo(h * 0.4, -h, h * 0.6, -h * 1.1, h * 0.5, -h * 1.3);
    g.stroke({ color: 0x2F2F2F, width: 6 });
    // Olhos flamejantes
    g.circle(-h * 0.12, -h * 0.55, h * 0.1);
    g.circle(h * 0.12, -h * 0.55, h * 0.1);
    g.fill({ color: 0xFF4500 });
    // Asas de morcego
    this.drawWings(g, size * 1.5, 0x4A0000, 0.8);
    // Aura de fogo
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * h * 0.8;
      const y = Math.sin(angle) * h * 0.8;
      g.circle(x, y, h * 0.1);
    }
    g.fill({ color: 0xFF4500, alpha: 0.5 });
  }

  private drawTitan(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo enorme
    g.roundRect(-h * 0.5, -h * 0.3, h, h * 0.8, h * 0.1);
    g.fill({ color: 0x4A4A4A });
    // Cabeça
    g.roundRect(-h * 0.3, -h * 0.7, h * 0.6, h * 0.45, h * 0.1);
    g.fill({ color: 0x4A4A4A });
    // Olhos (múltiplos)
    for (let i = 0; i < 3; i++) {
      g.circle(-h * 0.15 + i * h * 0.15, -h * 0.5, h * 0.08);
    }
    g.fill({ color: 0x00FFFF });
    // Braços gigantes
    g.roundRect(-h * 0.9, -h * 0.2, h * 0.35, h * 0.7, h * 0.1);
    g.roundRect(h * 0.55, -h * 0.2, h * 0.35, h * 0.7, h * 0.1);
    g.fill({ color: 0x4A4A4A });
    // Detalhes de pedra
    g.circle(-h * 0.3, 0, h * 0.15);
    g.circle(h * 0.2, h * 0.1, h * 0.12);
    g.fill({ color: 0x696969 });
  }

  private drawAlienQueen(g: Graphics, size: number): void {
    const h = size / 2;
    // Abdômen alongado
    g.ellipse(h * 0.2, h * 0.2, h * 0.6, h * 0.35);
    g.fill({ color: 0x2F4F4F });
    // Tórax
    g.ellipse(-h * 0.1, -h * 0.1, h * 0.4, h * 0.35);
    g.fill({ color: 0x2F4F4F });
    // Cabeça alongada
    g.ellipse(-h * 0.5, -h * 0.3, h * 0.45, h * 0.25);
    g.fill({ color: 0x1C1C1C });
    // Crista
    g.moveTo(-h * 0.3, -h * 0.5);
    g.lineTo(-h * 0.8, -h * 0.8);
    g.lineTo(-h * 0.5, -h * 0.45);
    g.fill({ color: 0x1C1C1C });
    // Múltiplos braços
    for (let i = 0; i < 3; i++) {
      const y = -h * 0.2 + i * h * 0.2;
      g.moveTo(-h * 0.4, y);
      g.lineTo(-h * 0.9, y - h * 0.2);
      g.moveTo(h * 0.1, y);
      g.lineTo(h * 0.6, y - h * 0.2);
    }
    g.stroke({ color: 0x2F4F4F, width: 4 });
    // Dentes
    g.poly([-h * 0.75, -h * 0.2, -h * 0.85, -h * 0.35, -h * 0.7, -h * 0.25]);
    g.fill({ color: 0xFFFFFF });
  }

  private drawLichKing(g: Graphics, size: number): void {
    const h = size / 2;
    // Manto
    g.moveTo(-h * 0.4, -h * 0.3);
    g.lineTo(-h * 0.6, h * 0.6);
    g.lineTo(h * 0.6, h * 0.6);
    g.lineTo(h * 0.4, -h * 0.3);
    g.fill({ color: 0x1C1C1C });
    // Crânio
    g.circle(0, -h * 0.45, h * 0.35);
    g.fill({ color: 0xFFFAF0 });
    // Olhos vazios com brilho
    g.circle(-h * 0.12, -h * 0.5, h * 0.1);
    g.circle(h * 0.12, -h * 0.5, h * 0.1);
    g.fill({ color: 0x00FF00 });
    // Coroa
    g.moveTo(-h * 0.3, -h * 0.7);
    g.lineTo(-h * 0.25, -h * 0.95);
    g.lineTo(-h * 0.1, -h * 0.75);
    g.lineTo(0, -h);
    g.lineTo(h * 0.1, -h * 0.75);
    g.lineTo(h * 0.25, -h * 0.95);
    g.lineTo(h * 0.3, -h * 0.7);
    g.fill({ color: 0x4169E1 });
    // Cajado
    g.rect(h * 0.5, -h * 0.8, h * 0.08, h * 1.2);
    g.fill({ color: 0x2F2F2F });
    g.circle(h * 0.54, -h * 0.9, h * 0.15);
    g.fill({ color: 0x9400D3 });
    // Aura fantasmagórica
    g.circle(0, 0, h * 0.9);
    g.fill({ color: 0x00FF00, alpha: 0.1 });
  }

  private drawKraken(g: Graphics, size: number): void {
    const h = size / 2;
    // Corpo principal
    g.ellipse(0, 0, h * 0.5, h * 0.6);
    g.fill({ color: 0x4A0E4E });
    // Olhos grandes
    g.circle(-h * 0.2, -h * 0.2, h * 0.18);
    g.circle(h * 0.2, -h * 0.2, h * 0.18);
    g.fill({ color: 0xFFD700 });
    g.circle(-h * 0.2, -h * 0.2, h * 0.08);
    g.circle(h * 0.2, -h * 0.2, h * 0.08);
    g.fill({ color: 0x000000 });
    // Tentáculos (8)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI + Math.PI / 2;
      const startX = Math.cos(angle) * h * 0.4;
      const startY = h * 0.3 + Math.abs(Math.sin(angle)) * h * 0.2;
      const endX = Math.cos(angle) * h * 1.2;
      const endY = h * 0.5 + Math.sin(angle + 0.5) * h * 0.3;
      const midX = (startX + endX) / 2 + Math.sin(i) * h * 0.2;
      const midY = (startY + endY) / 2;
      
      g.moveTo(startX, startY);
      g.bezierCurveTo(midX, midY, endX - h * 0.1, endY, endX, endY);
      g.stroke({ color: 0x4A0E4E, width: 8 - i * 0.5 });
      
      // Ventosas
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 4;
        const vx = startX + (endX - startX) * t;
        const vy = startY + (endY - startY) * t;
        g.circle(vx, vy, h * 0.06);
      }
    }
    g.fill({ color: 0xFFB6C1 });
    // Bico
    g.poly([0, h * 0.1, -h * 0.1, h * 0.25, h * 0.1, h * 0.25]);
    g.fill({ color: 0x2F2F2F });
  }

  /**
   * Cria indicador de seleção
   */
  createSelectionIndicator(size: number = 20): Graphics {
    const g = new Graphics();
    const h = size / 2;
    
    // Círculo pontilhado
    g.circle(0, 0, h + 4);
    g.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.8 });
    
    // Cantos de destaque
    const corner = h * 0.4;
    // Superior esquerdo
    g.moveTo(-h - 2, -h + corner);
    g.lineTo(-h - 2, -h - 2);
    g.lineTo(-h + corner, -h - 2);
    // Superior direito
    g.moveTo(h - corner, -h - 2);
    g.lineTo(h + 2, -h - 2);
    g.lineTo(h + 2, -h + corner);
    // Inferior direito
    g.moveTo(h + 2, h - corner);
    g.lineTo(h + 2, h + 2);
    g.lineTo(h - corner, h + 2);
    // Inferior esquerdo
    g.moveTo(-h + corner, h + 2);
    g.lineTo(-h - 2, h + 2);
    g.lineTo(-h - 2, h - corner);
    g.stroke({ color: 0x00FF00, width: 2 });
    
    return g;
  }

  /**
   * Cria barra de vida
   */
  createHealthBar(width: number = 20, height: number = 4): Container {
    const container = new Container();
    
    // Fundo
    const bg = new Graphics();
    bg.roundRect(-width / 2, 0, width, height, 2);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    container.addChild(bg);
    
    // Barra de vida (será atualizada dinamicamente)
    const bar = new Graphics();
    bar.roundRect(-width / 2 + 1, 1, width - 2, height - 2, 1);
    bar.fill({ color: 0x00FF00 });
    bar.label = 'healthFill';
    container.addChild(bar);
    
    return container;
  }

  /**
   * Atualiza barra de vida
   */
  updateHealthBar(container: Container, percent: number, width: number = 20, height: number = 4): void {
    const bar = container.getChildByLabel('healthFill') as Graphics;
    if (bar) {
      bar.clear();
      const fillWidth = (width - 2) * Math.max(0, Math.min(1, percent));
      const color = percent > 0.6 ? 0x00FF00 : percent > 0.3 ? 0xFFFF00 : 0xFF0000;
      bar.roundRect(-width / 2 + 1, 1, fillWidth, height - 2, 1);
      bar.fill({ color });
    }
  }

  /**
   * Cria marcador de facção
   */
  createFactionMarker(color: number, size: number = 6): Graphics {
    const g = new Graphics();
    // Bandeirinha triangular
    g.moveTo(0, 0);
    g.lineTo(size, -size / 2);
    g.lineTo(0, -size);
    g.lineTo(0, 0);
    g.fill({ color });
    g.stroke({ color: 0x000000, width: 1 });
    // Mastro
    g.rect(-1, -size, 2, size + 4);
    g.fill({ color: 0x8B4513 });
    return g;
  }
}

// Singleton export
export const spriteFactory = SpriteFactory.getInstance();

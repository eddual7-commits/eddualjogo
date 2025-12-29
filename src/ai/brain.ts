import { NeedsSystem, NeedType } from './needs';
import { Vector2, random, randomChoice } from '../core/utils';

export enum ActionType {
  IDLE = 'idle',
  WANDER = 'wander',
  SEEK_FOOD = 'seek_food',
  SEEK_WATER = 'seek_water',
  REST = 'rest',
  SOCIALIZE = 'socialize',
  FLEE = 'flee',
  ATTACK = 'attack',
  WORK = 'work',
  BUILD = 'build',
  GATHER = 'gather',
  EXPLORE = 'explore',
  FOLLOW = 'follow',
  GUARD = 'guard',
}

export enum EmotionType {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SCARED = 'scared',
  EXCITED = 'excited',
  LOVING = 'loving',
}

interface Action {
  type: ActionType;
  priority: number;
  target?: { x: number; y: number } | null;
  targetId?: number;
  duration: number;
  elapsed: number;
}

interface Memory {
  type: string;
  x: number;
  y: number;
  timestamp: number;
  data?: unknown;
}

/**
 * Cérebro da IA - controla decisões, emoções e memória
 */
export class Brain {
  private needs: NeedsSystem;
  private currentAction: Action;
  private actionQueue: Action[] = [];
  
  // Personalidade Big Five (OCEAN) - 0 a 1
  public personality = {
    openness: 0.5,      // Curiosidade, exploração
    conscientiousness: 0.5, // Organização, trabalho
    extraversion: 0.5,  // Sociabilidade
    agreeableness: 0.5, // Cooperação vs agressão
    neuroticism: 0.5,   // Ansiedade, medo
  };

  // Estado emocional atual
  public emotion: EmotionType = EmotionType.NEUTRAL;
  public emotionIntensity: number = 0;
  
  // Memória de longo prazo
  private memories: Memory[] = [];
  private maxMemories = 50;
  
  // Relacionamentos (id -> afinidade de -100 a 100)
  private relationships: Map<number, number> = new Map();
  
  // Inimigos detectados por perto
  private nearbyThreats: number[] = [];

  constructor(needs: NeedsSystem) {
    this.needs = needs;
    this.currentAction = {
      type: ActionType.IDLE,
      priority: 0,
      duration: 1000,
      elapsed: 0,
    };
    
    // Randomiza personalidade
    this.randomizePersonality();
  }

  /**
   * Randomiza traços de personalidade
   */
  randomizePersonality(): void {
    this.personality.openness = random(0.2, 0.8);
    this.personality.conscientiousness = random(0.2, 0.8);
    this.personality.extraversion = random(0.2, 0.8);
    this.personality.agreeableness = random(0.2, 0.8);
    this.personality.neuroticism = random(0.2, 0.8);
  }

  /**
   * Retorna ação atual
   */
  getCurrentAction(): Action {
    return this.currentAction;
  }

  /**
   * Define ameaças próximas
   */
  setNearbyThreats(threatIds: number[]): void {
    this.nearbyThreats = threatIds;
  }

  /**
   * Adiciona memória
   */
  remember(type: string, x: number, y: number, data?: unknown): void {
    this.memories.push({
      type,
      x,
      y,
      timestamp: Date.now(),
      data,
    });
    
    // Remove memórias antigas
    if (this.memories.length > this.maxMemories) {
      this.memories.shift();
    }
  }

  /**
   * Busca memória por tipo
   */
  recall(type: string): Memory | null {
    return this.memories.filter(m => m.type === type).pop() || null;
  }

  /**
   * Modifica relacionamento
   */
  modifyRelationship(entityId: number, amount: number): void {
    const current = this.relationships.get(entityId) || 0;
    this.relationships.set(entityId, Math.max(-100, Math.min(100, current + amount)));
  }

  /**
   * Retorna afinidade com entidade
   */
  getRelationship(entityId: number): number {
    return this.relationships.get(entityId) || 0;
  }

  /**
   * Define emoção
   */
  setEmotion(emotion: EmotionType, intensity: number = 0.5): void {
    this.emotion = emotion;
    this.emotionIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Decide próxima ação baseado em necessidades, personalidade e contexto
   */
  think(): Action {
    const actions: Action[] = [];
    
    // 1. SOBREVIVÊNCIA - Prioridade máxima
    if (this.nearbyThreats.length > 0) {
      const fleeChance = 0.5 + this.personality.neuroticism * 0.3 - this.personality.agreeableness * 0.2;
      
      if (random() < fleeChance) {
        actions.push({
          type: ActionType.FLEE,
          priority: 100,
          targetId: this.nearbyThreats[0],
          duration: 3000,
          elapsed: 0,
        });
        this.setEmotion(EmotionType.SCARED, 0.8);
      } else {
        actions.push({
          type: ActionType.ATTACK,
          priority: 95,
          targetId: this.nearbyThreats[0],
          duration: 5000,
          elapsed: 0,
        });
        this.setEmotion(EmotionType.ANGRY, 0.7);
      }
    }

    // 2. NECESSIDADES CRÍTICAS
    const urgentNeed = this.needs.getMostUrgent();
    
    if (urgentNeed.value < 30) {
      switch (urgentNeed.need) {
        case 'hunger':
          const foodMemory = this.recall('food_source');
          actions.push({
            type: ActionType.SEEK_FOOD,
            priority: 80 - urgentNeed.value,
            target: foodMemory ? { x: foodMemory.x, y: foodMemory.y } : null,
            duration: 10000,
            elapsed: 0,
          });
          break;
          
        case 'thirst':
          const waterMemory = this.recall('water_source');
          actions.push({
            type: ActionType.SEEK_WATER,
            priority: 85 - urgentNeed.value,
            target: waterMemory ? { x: waterMemory.x, y: waterMemory.y } : null,
            duration: 10000,
            elapsed: 0,
          });
          break;
          
        case 'energy':
          actions.push({
            type: ActionType.REST,
            priority: 70 - urgentNeed.value,
            duration: 15000,
            elapsed: 0,
          });
          break;
          
        case 'social':
          if (this.personality.extraversion > 0.4) {
            actions.push({
              type: ActionType.SOCIALIZE,
              priority: 40 - urgentNeed.value * 0.3,
              duration: 8000,
              elapsed: 0,
            });
          }
          break;
      }
    }

    // 3. COMPORTAMENTOS BASEADOS EM PERSONALIDADE
    
    // Exploradores (alta abertura)
    if (this.personality.openness > 0.6 && random() < 0.3) {
      actions.push({
        type: ActionType.EXPLORE,
        priority: 20 + this.personality.openness * 10,
        duration: 15000,
        elapsed: 0,
      });
    }
    
    // Trabalhadores (alta conscienciosidade)
    if (this.personality.conscientiousness > 0.6 && random() < 0.4) {
      actions.push({
        type: ActionType.GATHER,
        priority: 25 + this.personality.conscientiousness * 10,
        duration: 12000,
        elapsed: 0,
      });
    }
    
    // Sociáveis (alta extroversão)
    if (this.personality.extraversion > 0.6 && this.needs.get('social') < 70) {
      actions.push({
        type: ActionType.SOCIALIZE,
        priority: 15 + this.personality.extraversion * 10,
        duration: 8000,
        elapsed: 0,
      });
    }

    // 4. COMPORTAMENTO PADRÃO
    actions.push({
      type: ActionType.WANDER,
      priority: 5,
      duration: 5000,
      elapsed: 0,
    });
    
    actions.push({
      type: ActionType.IDLE,
      priority: 1,
      duration: 2000,
      elapsed: 0,
    });

    // Escolhe ação de maior prioridade
    actions.sort((a, b) => b.priority - a.priority);
    return actions[0];
  }

  /**
   * Atualiza o cérebro
   */
  update(delta: number): ActionType {
    this.currentAction.elapsed += delta;
    
    // Emoções decaem com o tempo
    this.emotionIntensity = Math.max(0, this.emotionIntensity - delta * 0.0001);
    if (this.emotionIntensity < 0.1) {
      this.emotion = EmotionType.NEUTRAL;
    }

    // Verifica se ação atual terminou ou precisa repensar
    const shouldRethink = 
      this.currentAction.elapsed >= this.currentAction.duration ||
      (this.nearbyThreats.length > 0 && this.currentAction.type !== ActionType.FLEE && this.currentAction.type !== ActionType.ATTACK) ||
      (this.needs.isCritical('hunger') && this.currentAction.type !== ActionType.SEEK_FOOD) ||
      (this.needs.isCritical('thirst') && this.currentAction.type !== ActionType.SEEK_WATER);

    if (shouldRethink) {
      this.currentAction = this.think();
    }

    return this.currentAction.type;
  }

  /**
   * Força uma nova ação
   */
  setAction(type: ActionType, duration: number = 5000, target?: { x: number; y: number }): void {
    this.currentAction = {
      type,
      priority: 50,
      target,
      duration,
      elapsed: 0,
    };
  }

  /**
   * Retorna cor da emoção atual (para feedback visual)
   */
  getEmotionColor(): number {
    switch (this.emotion) {
      case EmotionType.HAPPY: return 0xFFFF00;
      case EmotionType.SAD: return 0x0000FF;
      case EmotionType.ANGRY: return 0xFF0000;
      case EmotionType.SCARED: return 0x800080;
      case EmotionType.EXCITED: return 0xFF8C00;
      case EmotionType.LOVING: return 0xFF69B4;
      default: return 0xFFFFFF;
    }
  }

  /**
   * Serializa para save
   */
  serialize(): object {
    return {
      personality: { ...this.personality },
      emotion: this.emotion,
      emotionIntensity: this.emotionIntensity,
      memories: this.memories.slice(-20), // Últimas 20 memórias
      relationships: Array.from(this.relationships.entries()),
    };
  }

  /**
   * Carrega de save
   */
  deserialize(data: any): void {
    if (data.personality) this.personality = { ...data.personality };
    if (data.emotion) this.emotion = data.emotion;
    if (data.emotionIntensity) this.emotionIntensity = data.emotionIntensity;
    if (data.memories) this.memories = data.memories;
    if (data.relationships) {
      this.relationships = new Map(data.relationships);
    }
  }
      }

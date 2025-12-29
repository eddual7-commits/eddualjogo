import { Container } from 'pixi.js';
import { Entity } from './entity';
import { Creature } from './creature';
import { Animal } from './animal';
import { Race, AnimalType, WORLD } from '../core/constants';
import { SpatialHash, random } from '../core/utils';
import { Camera } from '../core/camera';

export class EntityManager {
  private entities: Map<number, Entity> = new Map();
  private creatures: Creature[] = [];
  private animals: Animal[] = [];
  
  private container: Container;
  private spatialHash: SpatialHash<Entity>;

  constructor(parent: Container) {
    this.container = new Container();
    parent.addChild(this.container);
    this.spatialHash = new SpatialHash(64);
  }

  spawnCreature(x: number, y: number, race: Race): Creature {
    const creature = new Creature(x, y, race);
    this.addEntity(creature);
    this.creatures.push(creature);
    return creature;
  }

  spawnAnimal(x: number, y: number, type: AnimalType): Animal {
    const animal = new Animal(x, y, type);
    this.addEntity(animal);
    this.animals.push(animal);
    return animal;
  }

  private addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.container.addChild(entity.getContainer());
    this.spatialHash.insert(entity);
  }

  removeEntity(id: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.destroy();
      this.entities.delete(id);
      this.spatialHash.remove(entity);
      
      // Remove das listas específicas
      const cIdx = this.creatures.findIndex(c => c.id === id);
      if (cIdx >= 0) this.creatures.splice(cIdx, 1);
      
      const aIdx = this.animals.findIndex(a => a.id === id);
      if (aIdx >= 0) this.animals.splice(aIdx, 1);
    }
  }

  getEntity(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  getCreatures(): Creature[] { return this.creatures; }
  getAnimals(): Animal[] { return this.animals; }
  
  getNearby(x: number, y: number, radius: number): Entity[] {
    return this.spatialHash.query(x, y, radius);
  }

  update(delta: number): void {
    // Atualiza todas as entidades
    for (const entity of this.entities.values()) {
      if (entity.isAlive) {
        entity.update(delta);
        this.spatialHash.update(entity);
      }
    }
    
    // Remove mortos
    for (const [id, entity] of this.entities) {
      if (!entity.isAlive) {
        this.removeEntity(id);
      }
    }
    
    // Interações predador/presa básicas
    this.processInteractions();
  }

  private processInteractions(): void {
    // Predadores perseguem presas, presas fogem
    for (const animal of this.animals) {
      if (animal.isPredator && animal.isAlive) {
        const nearby = this.getNearby(animal.x, animal.y, 100);
        for (const target of nearby) {
          if (target instanceof Animal && !target.isHostile && target.isAlive) {
            target.flee(animal);
          }
        }
      }
    }
  }

  render(camera: Camera): void {
    // Y-sorting para profundidade
    this.container.children.sort((a, b) => a.y - b.y);
    
    // Re-renderiza entidades visíveis
    for (const entity of this.entities.values()) {
      const visible = camera.isInView(entity.x, entity.y, 50);
      entity.getContainer().visible = visible;
      if (visible && entity.isAlive) {
        entity.render();
      }
    }
  }

  get count(): number { return this.entities.size; }
  get creatureCount(): number { return this.creatures.length; }
  get animalCount(): number { return this.animals.length; }

  // Spawna população inicial
  spawnInitialPopulation(worldWidth: number, worldHeight: number): void {
    const tileSize = WORLD.TILE_SIZE;
    const centerX = (worldWidth * tileSize) / 2;
    const centerY = (worldHeight * tileSize) / 2;
    
    // Algumas criaturas de cada raça
    const races = [Race.HUMAN, Race.ELF, Race.ORC, Race.DWARF];
    for (const race of races) {
      for (let i = 0; i < 5; i++) {
        const x = centerX + random(-300, 300);
        const y = centerY + random(-300, 300);
        this.spawnCreature(x, y, race);
      }
    }
    
    // Alguns animais
    const animalTypes = [
      AnimalType.SHEEP, AnimalType.COW, AnimalType.DEER,
      AnimalType.RABBIT, AnimalType.WOLF, AnimalType.BOAR
    ];
    for (const type of animalTypes) {
      for (let i = 0; i < 3; i++) {
        const x = random(100, worldWidth * tileSize - 100);
        const y = random(100, worldHeight * tileSize - 100);
        this.spawnAnimal(x, y, type);
      }
    }
  }

  destroy(): void {
    for (const entity of this.entities.values()) {
      entity.destroy();
    }
    this.entities.clear();
    this.creatures = [];
    this.animals = [];
    this.container.destroy();
  }
  }

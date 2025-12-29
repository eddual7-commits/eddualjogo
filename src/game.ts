// ===== GAME + CAMERA + INPUT =====
import { Application, Container } from 'pixi.js';
import { World } from './world';
import { EntityManager, EntityType } from './entities';
import { Renderer } from './render';
import { UI } from './ui';

// ===== CONSTANTES =====
export const TILE_SIZE = 12;
export const CONFIG = {
  WORLD_SIZE: 150,
  WORLD_RADIUS: 60,
  MAX_ENTITIES: 1500,
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 5
};

// ===== CAMERA =====
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  targetX = 0;
  targetY = 0;
  targetZoom = 1;
  following: number | null = null;
  
  update(dt: number) {
    this.x += (this.targetX - this.x) * dt * 8;
    this.y += (this.targetY - this.y) * dt * 8;
    this.zoom += (this.targetZoom - this.zoom) * dt * 8;
  }
  
  moveTo(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }
  
  setZoom(z: number) {
    this.targetZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, z));
  }
  
  screenToWorld(sx: number, sy: number, screenW: number, screenH: number): { x: number; y: number } {
    return {
      x: (sx - screenW / 2) / this.zoom / TILE_SIZE + this.x,
      y: (sy - screenH / 2) / this.zoom / TILE_SIZE + this.y
    };
  }
  
  worldToScreen(wx: number, wy: number, screenW: number, screenH: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * TILE_SIZE * this.zoom + screenW / 2,
      y: (wy - this.y) * TILE_SIZE * this.zoom + screenH / 2
    };
  }
}

// ===== INPUT =====
export class Input {
  game: Game;
  isDown = false;
  startX = 0;
  startY = 0;
  lastX = 0;
  lastY = 0;
  moved = false;
  
  constructor(game: Game) {
    this.game = game;
  }
  
  setup(canvas: HTMLCanvasElement) {
    // Mouse
    canvas.addEventListener('mousedown', (e) => this.onDown(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', () => this.onUp());
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.game.camera.setZoom(this.game.camera.zoom * delta);
    }, { passive: false });
    
    // Touch
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onDown(t.clientX, t.clientY);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMove(t.clientX, t.clientY);
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => this.onUp());
  }
  
  onDown(x: number, y: number) {
    this.isDown = true;
    this.startX = x;
    this.startY = y;
    this.lastX = x;
    this.lastY = y;
    this.moved = false;
    
    // Se ferramenta não é mover/selecionar, usa
    const tool = this.game.ui.currentTool;
    if (tool !== 'select' && tool !== 'move') {
      this.useTool(x, y);
    }
  }
  
  onMove(x: number, y: number) {
    if (!this.isDown) return;
    
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    
    if (Math.abs(x - this.startX) > 10 || Math.abs(y - this.startY) > 10) {
      this.moved = true;
    }
    
    const tool = this.game.ui.currentTool;
    
    if (tool === 'move' || (tool === 'select' && this.moved)) {
      // Arrasta câmera
      this.game.camera.targetX -= dx / this.game.camera.zoom / TILE_SIZE;
      this.game.camera.targetY -= dy / this.game.camera.zoom / TILE_SIZE;
      this.game.camera.following = null;
    } else if (tool !== 'select') {
      // Usa ferramenta arrastando
      this.useTool(x, y);
    }
    
    this.lastX = x;
    this.lastY = y;
  }
  
  onUp() {
    const tool = this.game.ui.currentTool;
    
    if (tool === 'select' && !this.moved) {
      // Clique para selecionar
      const world = this.game.camera.screenToWorld(
        this.startX, this.startY,
        this.game.app.screen.width,
        this.game.app.screen.height
      );
      this.game.selectAt(world.x, world.y);
    }
    
    this.isDown = false;
  }
  
  useTool(sx: number, sy: number) {
    const world = this.game.camera.screenToWorld(
      sx, sy,
      this.game.app.screen.width,
      this.game.app.screen.height
    );
    this.game.useTool(world.x, world.y);
  }
}

// ===== GAME =====
export class Game {
  app!: Application;
  world!: World;
  entities!: EntityManager;
  renderer!: Renderer;
  ui!: UI;
  camera!: Camera;
  input!: Input;
  
  worldContainer!: Container;
  entityContainer!: Container;
  uiContainer!: Container;
  
  // Estado
  speed = 1;
  paused = false;
  year = 0;
  era = 0;
  xp = 0;
  selectedId: number | null = null;
  
  // Eras
  static ERAS = [
    { name: 'Era Primitiva', icon: '🦴', xp: 0 },
    { name: 'Idade da Pedra', icon: '🪨', xp: 100 },
    { name: 'Idade do Bronze', icon: '🏺', xp: 500 },
    { name: 'Idade do Ferro', icon: '⚔️', xp: 1500 },
    { name: 'Era Medieval', icon: '🏰', xp: 4000 },
    { name: 'Renascimento', icon: '🎨', xp: 10000 },
    { name: 'Era Industrial', icon: '🏭', xp: 25000 },
    { name: 'Era Moderna', icon: '🏙️', xp: 60000 },
    { name: 'Era Digital', icon: '📱', xp: 150000 },
    { name: 'Era Espacial', icon: '🚀', xp: 400000 }
  ];
  
  async init() {
    console.log('🎮 Iniciando EcoBox Ultimate...');
    
    // Cria app Pixi
    this.app = new Application();
    await this.app.init({
      background: 0x0a0a1a,
      resizeTo: window,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    document.getElementById('app')!.appendChild(this.app.canvas);
    
    // Containers
    this.worldContainer = new Container();
    this.entityContainer = new Container();
    this.uiContainer = new Container();
    
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.uiContainer);
    
    // Sistemas
    this.camera = new Camera();
    this.input = new Input(this);
    this.world = new World(this);
    this.entities = new EntityManager(this);
    this.renderer = new Renderer(this);
    this.ui = new UI(this);
    
    // Setup
    this.input.setup(this.app.canvas);
    this.worldContainer.addChild(this.world.container);
    
    // Centraliza câmera
    this.camera.x = CONFIG.WORLD_SIZE / 2;
    this.camera.y = CONFIG.WORLD_SIZE / 2;
    this.camera.targetX = this.camera.x;
    this.camera.targetY = this.camera.y;
    
    console.log('✅ Jogo inicializado!');
  }
  
  start() {
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
  }
  
  update(dt: number) {
    const gameDt = this.paused ? 0 : dt * this.speed;
    
    // Atualiza tempo
    if (!this.paused) {
      this.year += gameDt * 0.1;
      this.updateEra();
    }
    
    // Câmera segue entidade
    if (this.camera.following !== null) {
      const e = this.entities.get(this.camera.following);
      if (e) {
        this.camera.targetX = e.x;
        this.camera.targetY = e.y;
      }
    }
    
    this.camera.update(dt);
    this.entities.update(gameDt);
    this.renderer.update(dt);
    this.render();
    this.ui.update();
  }
  
  render() {
    const cam = this.camera;
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    
    // Posiciona mundo
    this.worldContainer.x = w / 2 - cam.x * TILE_SIZE * cam.zoom;
    this.worldContainer.y = h / 2 - cam.y * TILE_SIZE * cam.zoom;
    this.worldContainer.scale.set(cam.zoom);
    
    // Entidades
    this.entityContainer.x = this.worldContainer.x;
    this.entityContainer.y = this.worldContainer.y;
    this.entityContainer.scale.set(cam.zoom);
  }
  
  updateEra() {
    for (let i = Game.ERAS.length - 1; i >= 0; i--) {
      if (this.xp >= Game.ERAS[i].xp) {
        if (this.era !== i) {
          this.era = i;
          this.ui.showMessage(`🌟 ${Game.ERAS[i].name}!`);
        }
        break;
      }
    }
  }
  
  useTool(x: number, y: number) {
    const tool = this.ui.currentTool;
    
    switch (tool) {
      case 'human':
        this.entities.spawn(EntityType.HUMAN, x, y);
        break;
      case 'elf':
        this.entities.spawn(EntityType.ELF, x, y);
        break;
      case 'orc':
        this.entities.spawn(EntityType.ORC, x, y);
        break;
      case 'dwarf':
        this.entities.spawn(EntityType.DWARF, x, y);
        break;
      case 'wolf':
        this.entities.spawn(EntityType.WOLF, x, y);
        break;
      case 'sheep':
        this.entities.spawn(EntityType.SHEEP, x, y);
        break;
      case 'tree':
        this.world.setTile(x, y, 'forest');
        break;
      case 'rock':
        this.world.setTile(x, y, 'rock');
        break;
      case 'water':
        this.world.setTile(x, y, 'water');
        break;
      case 'wall':
        this.world.setTile(x, y, 'wall');
        break;
      case 'erase':
        this.world.setTile(x, y, 'grass');
        this.entities.killAt(x, y, 1.5);
        break;
      case 'zap':
        this.entities.killAt(x, y, 3);
        this.renderer.spawnParticles(x * TILE_SIZE, y * TILE_SIZE, 0xffff00, 20);
        break;
      case 'meteor':
        this.entities.killAt(x, y, 6);
        this.world.crater(x, y, 4);
        this.renderer.spawnParticles(x * TILE_SIZE, y * TILE_SIZE, 0xff4400, 50);
        this.renderer.shake(20);
        break;
    }
  }
  
  selectAt(x: number, y: number) {
    const e = this.entities.findAt(x, y, 1.5);
    if (e) {
      this.selectedId = e.id;
      this.ui.showInspector(e);
    } else {
      this.selectedId = null;
      this.ui.hideInspector();
    }
  }
  
  addXP(amount: number) {
    this.xp += amount;
  }
  }

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - GAME
 * Loop principal, estado global e gerenciamento do jogo
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Application, Container } from 'pixi.js';
import { GAME, WORLD, SPEEDS, Era, ToolType } from './Constants';
import { Camera } from './Camera';
import { Input } from './Input';
import { EventEmitter, Timer } from './Utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GameState {
  isPaused: boolean;
  speedIndex: number;
  speed: number;
  currentEra: Era;
  totalPopulation: number;
  totalFactions: number;
  gameTime: number;
  dayTime: number;
  day: number;
  year: number;
}

export interface GameEvents {
  init: void;
  ready: void;
  update: { delta: number; time: number };
  render: { delta: number };
  resize: { width: number; height: number };
  pause: void;
  resume: void;
  speedchange: { speed: number; index: number };
  toolchange: { tool: ToolType; subType?: number };
  erachange: { era: Era; previousEra: Era };
  daychange: { day: number; year: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Game extends EventEmitter<GameEvents> {
  // Singleton
  private static _instance: Game | null = null;

  // PixiJS
  public app!: Application;
  public stage!: Container;

  // Core systems
  public camera!: Camera;
  public input!: Input;

  // Layers
  public worldLayer!: Container;
  public entityLayer!: Container;
  public effectLayer!: Container;
  public uiWorldLayer!: Container;
  public uiLayer!: Container;

  // State
  private _state: GameState = {
    isPaused: false,
    speedIndex: 1,
    speed: 1,
    currentEra: Era.PRIMITIVE,
    totalPopulation: 0,
    totalFactions: 0,
    gameTime: 0,
    dayTime: 0,
    day: 1,
    year: 1,
  };

  // Tools
  private _currentTool: ToolType = ToolType.SELECT;
  private _currentSubType: number = 0;

  // Timing
  private timer: Timer = new Timer();
  private lastTime: number = 0;
  private accumulator: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private _fps: number = 0;

  // Day/Night cycle
  private readonly DAY_LENGTH: number = 60000; // 1 minute real = 1 day
  private readonly DAYS_PER_YEAR: number = 365;

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLETON
  // ═══════════════════════════════════════════════════════════════════════════

  static get instance(): Game {
    if (!Game._instance) {
      Game._instance = new Game();
    }
    return Game._instance;
  }

  private constructor() {
    super();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async init(container: HTMLElement): Promise<void> {
    console.log(`🎮 ${GAME.NAME} v${GAME.VERSION} initializing...`);

    // Create PixiJS Application
    this.app = new Application();
    
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: false,
      powerPreference: 'high-performance',
    });

    // Add canvas to DOM
    container.appendChild(this.app.canvas);
    this.app.canvas.style.display = 'block';

    // Setup stage
    this.stage = this.app.stage;
    this.stage.eventMode = 'static';
    this.stage.hitArea = this.app.screen;

    // Create layers
    this.createLayers();

    // Setup camera
    this.camera = new Camera(this.worldLayer);
    this.camera.setViewport(this.app.screen.width, this.app.screen.height);
    this.camera.setBounds(
      0,
      0,
      WORLD.WIDTH * WORLD.TILE_SIZE,
      WORLD.HEIGHT * WORLD.TILE_SIZE
    );
    this.camera.centerOn(
      (WORLD.WIDTH * WORLD.TILE_SIZE) / 2,
      (WORLD.HEIGHT * WORLD.TILE_SIZE) / 2,
      true
    );

    // Setup input
    this.input = new Input(this.app.canvas as HTMLCanvasElement);
    this.input.setCamera(this.camera);
    this.setupInputHandlers();

    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();

    // Emit init event
    this.emit('init', undefined);

    console.log('✅ Game initialized');
  }

  private createLayers(): void {
    // World layer (terrain, resources) - affected by camera
    this.worldLayer = new Container();
    this.worldLayer.label = 'worldLayer';
    this.stage.addChild(this.worldLayer);

    // Entity layer (creatures, buildings) - affected by camera
    this.entityLayer = new Container();
    this.entityLayer.label = 'entityLayer';
    this.worldLayer.addChild(this.entityLayer);

    // Effect layer (particles, effects) - affected by camera
    this.effectLayer = new Container();
    this.effectLayer.label = 'effectLayer';
    this.worldLayer.addChild(this.effectLayer);

    // UI World layer (selection, health bars) - affected by camera
    this.uiWorldLayer = new Container();
    this.uiWorldLayer.label = 'uiWorldLayer';
    this.worldLayer.addChild(this.uiWorldLayer);

    // UI layer (HUD, toolbar) - NOT affected by camera
    this.uiLayer = new Container();
    this.uiLayer.label = 'uiLayer';
    this.stage.addChild(this.uiLayer);
  }

  private setupInputHandlers(): void {
    // Drag to pan camera
    this.input.on('drag', (data) => {
      if (!this._state.isPaused) {
        this.camera.move(-data.deltaX + (data.currentX - data.startX - data.deltaX), 
                         -data.deltaY + (data.currentY - data.startY - data.deltaY));
      }
      // Actually, let's fix the pan:
      this.camera.move(
        -(data.currentX - data.startX) / this.camera.zoom * 0.1,
        -(data.currentY - data.startY) / this.camera.zoom * 0.1
      );
    });

    // Let's fix drag properly
    let lastDragX = 0;
    let lastDragY = 0;

    this.input.on('dragstart', (data) => {
      lastDragX = data.currentX;
      lastDragY = data.currentY;
    });

    this.input.on('drag', (data) => {
      const dx = data.currentX - lastDragX;
      const dy = data.currentY - lastDragY;
      this.camera.move(-dx, -dy);
      lastDragX = data.currentX;
      lastDragY = data.currentY;
    });

    // Wheel to zoom
    this.input.on('wheel', (data) => {
      const worldPos = this.camera.screenToWorld(data.x, data.y);
      const zoomDelta = data.delta > 0 ? 0.9 : 1.1;
      this.camera.zoomToPoint(this.camera.zoom * zoomDelta, worldPos.x, worldPos.y);
    });

    // Pinch to zoom
    let initialPinchZoom = 1;
    
    this.input.on('pinchstart', () => {
      initialPinchZoom = this.camera.zoom;
    });

    this.input.on('pinch', (data) => {
      const worldPos = this.camera.screenToWorld(data.centerX, data.centerY);
      this.camera.zoomToPoint(initialPinchZoom * data.scale, worldPos.x, worldPos.y);
    });

    // Keyboard controls
    this.input.on('keydown', (data) => {
      switch (data.code) {
        case 'Space':
          this.togglePause();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
          const speedIndex = parseInt(data.code.replace('Digit', '')) - 1;
          if (speedIndex >= 0 && speedIndex < SPEEDS.length) {
            this.setSpeed(speedIndex);
          }
          break;
        case 'KeyR':
          this.camera.reset();
          break;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  start(): void {
    console.log('🚀 Starting game loop...');
    this.timer.start();
    this.lastTime = performance.now();
    this.app.ticker.add(this.gameLoop.bind(this));
    this.emit('ready', undefined);
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    let delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Clamp delta
    if (delta > GAME.MAX_DELTA) {
      delta = GAME.MAX_DELTA;
    }

    // FPS counter
    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1000) {
      this._fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    // Apply game speed
    const scaledDelta = delta * this._state.speed;

    // Update if not paused
    if (!this._state.isPaused && this._state.speed > 0) {
      this.update(scaledDelta);
    }

    // Always update camera (for smooth transitions even when paused)
    this.camera.update(delta);

    // Emit render event
    this.emit('render', { delta });
  }

  private update(delta: number): void {
    // Update game time
    this._state.gameTime += delta;

    // Update day/night cycle
    this.updateDayNightCycle(delta);

    // Emit update event
    this.emit('update', { delta, time: this._state.gameTime });
  }

  private updateDayNightCycle(delta: number): void {
    this._state.dayTime += delta;

    if (this._state.dayTime >= this.DAY_LENGTH) {
      this._state.dayTime -= this.DAY_LENGTH;
      this._state.day++;

      if (this._state.day > this.DAYS_PER_YEAR) {
        this._state.day = 1;
        this._state.year++;
      }

      this.emit('daychange', { day: this._state.day, year: this._state.year });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  pause(): void {
    if (!this._state.isPaused) {
      this._state.isPaused = true;
      this.emit('pause', undefined);
    }
  }

  resume(): void {
    if (this._state.isPaused) {
      this._state.isPaused = false;
      this.emit('resume', undefined);
    }
  }

  togglePause(): void {
    if (this._state.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  setSpeed(index: number): void {
    if (index >= 0 && index < SPEEDS.length) {
      this._state.speedIndex = index;
      this._state.speed = SPEEDS[index];
      
      if (index === 0) {
        this.pause();
      } else if (this._state.isPaused) {
        this.resume();
      }

      this.emit('speedchange', { speed: this._state.speed, index });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  setTool(tool: ToolType, subType: number = 0): void {
    this._currentTool = tool;
    this._currentSubType = subType;
    this.emit('toolchange', { tool, subType });
  }

  get currentTool(): ToolType {
    return this._currentTool;
  }

  get currentSubType(): number {
    return this._currentSubType;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  setEra(era: Era): void {
    if (era !== this._state.currentEra) {
      const previousEra = this._state.currentEra;
      this._state.currentEra = era;
      this.emit('erachange', { era, previousEra });
    }
  }

  advanceEra(): void {
    if (this._state.currentEra < Era.SINGULARITY) {
      this.setEra(this._state.currentEra + 1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════

  updatePopulation(count: number): void {
    this._state.totalPopulation = count;
  }

  updateFactions(count: number): void {
    this._state.totalFactions = count;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESIZE
  // ═══════════════════════════════════════════════════════════════════════════

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.app.renderer.resize(width, height);
    this.camera.setViewport(width, height);

    this.emit('resize', { width, height });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  get state(): Readonly<GameState> {
    return this._state;
  }

  get isPaused(): boolean {
    return this._state.isPaused;
  }

  get speed(): number {
    return this._state.speed;
  }

  get speedIndex(): number {
    return this._state.speedIndex;
  }

  get currentEra(): Era {
    return this._state.currentEra;
  }

  get gameTime(): number {
    return this._state.gameTime;
  }

  get fps(): number {
    return this._fps;
  }

  get width(): number {
    return this.app.screen.width;
  }

  get height(): number {
    return this.app.screen.height;
  }

  // Time of day (0-1, 0 = midnight, 0.5 = noon)
  get timeOfDay(): number {
    return this._state.dayTime / this.DAY_LENGTH;
  }

  // Is it night? (before 6am or after 8pm)
  get isNight(): boolean {
    const time = this.timeOfDay;
    return time < 0.25 || time > 0.83;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  shake(intensity: number = 5, duration: number = 200): void {
    this.camera.addShake(intensity, duration);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  destroy(): void {
    this.input.destroy();
    this.app.destroy(true, { children: true, texture: true });
    Game._instance = null;
  }
}

// Export singleton instance getter
export const game = Game.instance;

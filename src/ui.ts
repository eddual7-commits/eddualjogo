// ===== INTERFACE DO USUÁRIO =====
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Game } from './game';
import { Entity } from './entities';

type Tool = 'select' | 'move' | 'human' | 'elf' | 'orc' | 'dwarf' | 'wolf' | 'sheep' | 'tree' | 'rock' | 'water' | 'wall' | 'erase' | 'zap' | 'meteor';

interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  icon: string;
  action: () => void;
  isActive?: () => boolean;
}

export class UI {
  game: Game;
  container: Container;
  currentTool: Tool = 'select';
  
  buttons: Button[] = [];
  toolButtons: Button[] = [];
  speedButtons: Button[] = [];
  
  // Elementos
  topBar!: Graphics;
  toolbar!: Graphics;
  inspector!: Graphics;
  inspectorVisible = false;
  selectedEntity: Entity | null = null;
  
  // Textos
  eraText!: Text;
  statsText!: Text;
  messageText!: Text;
  messageTimer = 0;
  
  constructor(game: Game) {
    this.game = game;
    this.container = new Container();
    game.uiContainer.addChild(this.container);
    
    this.createUI();
  }
  
  createUI() {
    const w = this.game.app.screen.width;
    const h = this.game.app.screen.height;
    
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xffffff
    });
    
    // ===== TOP BAR =====
    this.topBar = new Graphics();
    this.topBar.roundRect(10, 10, w - 20, 70, 10);
    this.topBar.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(this.topBar);
    
    this.eraText = new Text({ text: '🪨 Idade da Pedra - Ano 0', style: { ...style, fontSize: 16, fill: 0xffd700 } });
    this.eraText.x = 20;
    this.eraText.y = 18;
    this.container.addChild(this.eraText);
    
    this.statsText = new Text({ text: '👤 0 | 🧝 0 | 👹 0 | 🐺 0', style });
    this.statsText.x = 20;
    this.statsText.y = 45;
    this.container.addChild(this.statsText);
    
    // Mensagem central
    this.messageText = new Text({ text: '', style: { ...style, fontSize: 18, fill: 0xffd700 } });
    this.messageText.anchor.set(0.5);
    this.messageText.x = w / 2;
    this.messageText.y = 100;
    this.messageText.alpha = 0;
    this.container.addChild(this.messageText);
    
    // ===== SPEED BUTTONS =====
    const speeds = [
      { label: '1x', speed: 1 },
      { label: '2x', speed: 2 },
      { label: '5x', speed: 5 },
      { label: '⏸', speed: 0 }
    ];
    
    speeds.forEach((s, i) => {
      this.speedButtons.push({
        x: w - 55,
        y: 90 + i * 40,
        w: 45,
        h: 35,
        label: s.label,
        icon: '',
        action: () => {
          if (s.speed === 0) {
            this.game.paused = !this.game.paused;
          } else {
            this.game.speed = s.speed;
            this.game.paused = false;
          }
        },
        isActive: () => s.speed === 0 ? this.game.paused : (!this.game.paused && this.game.speed === s.speed)
      });
    });
    
    // ===== TOOLBAR =====
    const tools: { id: Tool; icon: string; label: string }[] = [
      { id: 'select', icon: '👆', label: 'Sel' },
      { id: 'move', icon: '✋', label: 'Mov' },
      { id: 'human', icon: '👤', label: 'Hum' },
      { id: 'elf', icon: '🧝', label: 'Elf' },
      { id: 'orc', icon: '👹', label: 'Orc' },
      { id: 'dwarf', icon: '🧔', label: 'Anão' },
      { id: 'wolf', icon: '🐺', label: 'Lobo' },
      { id: 'sheep', icon: '🐑', label: 'Ovlh' },
      { id: 'tree', icon: '🌲', label: 'Árv' },
      { id: 'rock', icon: '🪨', label: 'Ped' },
      { id: 'water', icon: '💧', label: 'Água' },
      { id: 'wall', icon: '🧱', label: 'Muro' },
      { id: 'erase', icon: '🗑️', label: 'Apag' },
      { id: 'zap', icon: '⚡', label: 'Raio' },
      { id: 'meteor', icon: '☄️', label: 'Mete' }
    ];
    
    const cols = 5;
    const btnW = (w - 30) / cols;
    const btnH = 50;
    const rows = Math.ceil(tools.length / cols);
    const toolbarH = rows * btnH + 20;
    
    this.toolbar = new Graphics();
    this.toolbar.roundRect(10, h - toolbarH - 10, w - 20, toolbarH, 10);
    this.toolbar.fill({ color: 0x1a1a2e, alpha: 0.95 });
    this.toolbar.stroke({ color: 0x333355, width: 2 });
    this.container.addChild(this.toolbar);
    
    tools.forEach((tool, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.toolButtons.push({
        x: 15 + col * btnW,
        y: h - toolbarH - 5 + row * btnH + 10,
        w: btnW - 5,
        h: btnH - 5,
        label: tool.label,
        icon: tool.icon,
        action: () => { this.currentTool = tool.id; },
        isActive: () => this.currentTool === tool.id
      });
    });
    
    // ===== INSPECTOR =====
    this.inspector = new Graphics();
    this.inspector.roundRect(10, h - toolbarH - 180, w - 20, 160, 10);
    this.inspector.fill({ color: 0x16213e, alpha: 0.95 });
    this.inspector.stroke({ color: 0x4a9eff, width: 2 });
    this.inspector.visible = false;
    this.container.addChild(this.inspector);
    
    // ===== EVENT LISTENERS =====
    this.game.app.canvas.addEventListener('click', (e) => this.onClick(e));
    this.game.app.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.onClick({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    });
  }
  
  onClick(e: MouseEvent) {
    const rect = this.game.app.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Checa botões de velocidade
    for (const btn of this.speedButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        btn.action();
        return;
      }
    }
    
    // Checa ferramentas
    for (const btn of this.toolButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        btn.action();
        return;
      }
    }
    
    // Checa fechar inspector
    if (this.inspectorVisible) {
      const h = this.game.app.screen.height;
      const inspY = h - 180 - 160;
      if (y >= inspY && y <= inspY + 160) {
        // Clicou no inspector, checa botões
        this.handleInspectorClick(x, y);
        return;
      }
    }
  }
  
  handleInspectorClick(x: number, y: number) {
    const w = this.game.app.screen.width;
    const h = this.game.app.screen.height;
    const toolbarH = 130;
    const baseY = h - toolbarH - 180;
    
    // Botões do inspector
    const btnW = (w - 40) / 4;
    const btnY = baseY + 120;
    
    const buttons = [
      { label: 'Seguir', action: () => this.followEntity() },
      { label: 'Curar', action: () => this.healEntity() },
      { label: 'Matar', action: () => this.killEntity() },
      { label: 'Fechar', action: () => this.hideInspector() }
    ];
    
    buttons.forEach((btn, i) => {
      const bx = 15 + i * btnW;
      if (x >= bx && x <= bx + btnW - 5 && y >= btnY && y <= btnY + 30) {
        btn.action();
      }
    });
  }
  
  followEntity() {
    if (this.selectedEntity) {
      this.game.camera.following = this.selectedEntity.id;
    }
  }
  
  healEntity() {
    if (this.selectedEntity) {
      this.selectedEntity.hp = this.selectedEntity.maxHp;
      this.selectedEntity.hunger = 100;
      this.selectedEntity.energy = 100;
      this.game.renderer.spawnParticles(
        this.selectedEntity.x * 12,
        this.selectedEntity.y * 12,
        0x00ff00, 15
      );
    }
  }
  
  killEntity() {
    if (this.selectedEntity) {
      this.game.entities.kill(this.selectedEntity);
      this.hideInspector();
    }
  }
  
  showInspector(e: Entity) {
    this.selectedEntity = e;
    this.inspectorVisible = true;
    this.inspector.visible = true;
  }
  
  hideInspector() {
    this.selectedEntity = null;
    this.inspectorVisible = false;
    this.inspector.visible = false;
    this.game.selectedId = null;
    this.game.camera.following = null;
  }
  
  showMessage(text: string) {
    this.messageText.text = text;
    this.messageText.alpha = 1;
    this.messageTimer = 3;
  }
  
  update() {
    const w = this.game.app.screen.width;
    const h = this.game.app.screen.height;
    const dt = 1 / 60;
    
    // Atualiza era/ano
    const era = Game.ERAS[this.game.era];
    this.eraText.text = `${era.icon} ${era.name} - Ano ${Math.floor(this.game.year)}`;
    
    // Stats
    const em = this.game.entities;
    this.statsText.text = `👤 ${em.count('human')} | 🧝 ${em.count('elf')} | 👹 ${em.count('orc')} | 🧔 ${em.count('dwarf')} | 🐺 ${em.count('wolf')} | 🐑 ${em.count('sheep')} | Total: ${em.count()}`;
    
    // Mensagem fade out
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.messageText.alpha = 0;
      } else if (this.messageTimer < 1) {
        this.messageText.alpha = this.messageTimer;
      }
    }
    
    // Redesenha botões
    this.redrawButtons();
    
    // Atualiza inspector
    if (this.inspectorVisible && this.selectedEntity) {
      this.updateInspector();
    }
  }
  
  redrawButtons() {
    // Limpa e redesenha toolbar e speed buttons
    // (Simplificado - em produção usaria sprites)
    
    const g = new Graphics();
    this.container.addChild(g);
    
    // Speed buttons
    for (const btn of this.speedButtons) {
      const active = btn.isActive?.() || false;
      g.roundRect(btn.x, btn.y, btn.w, btn.h, 5);
      g.fill({ color: active ? 0x27ae60 : 0x2c3e50 });
      g.stroke({ color: active ? 0x2ecc71 : 0x444466, width: 2 });
    }
    
    // Tool buttons
    for (const btn of this.toolButtons) {
      const active = btn.isActive?.() || false;
      g.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
      g.fill({ color: active ? 0x3a5a8a : 0x2a2a4a });
      g.stroke({ color: active ? 0x4a9eff : 0x444466, width: 2 });
    }
    
    // Remove gráfico antigo após desenhar (hack para não acumular)
    setTimeout(() => {
      if (g.parent) g.parent.removeChild(g);
      g.destroy();
    }, 0);
  }
  
  updateInspector() {
    const e = this.selectedEntity!;
    const w = this.game.app.screen.width;
    const h = this.game.app.screen.height;
    const toolbarH = 130;
    const baseY = h - toolbarH - 180;
    
    // Redesenha inspector
    this.inspector.clear();
    this.inspector.roundRect(10, baseY, w - 20, 160, 10);
    this.inspector.fill({ color: 0x16213e, alpha: 0.95 });
    this.inspector.stroke({ color: 0x4a9eff, width: 2 });
    
    // Nome e tipo
    const nameStyle = new TextStyle({ fontSize: 14, fill: 0xffffff, fontFamily: 'Arial' });
    
    // Remove textos antigos
    this.inspector.removeChildren();
    
    const nameText = new Text({ text: `${e.name} (${e.type}) - ${Math.floor(e.age)} anos`, style: nameStyle });
    nameText.x = 10;
    nameText.y = 5;
    this.inspector.addChild(nameText);
    
    // Barras
    const barY = 30;
    const barW = w - 60;
    
    // HP
    this.drawBar(this.inspector, 10, barY, barW, 12, e.hp / e.maxHp, 0xe74c3c, `❤️ ${Math.floor(e.hp)}%`);
    
    // Fome
    this.drawBar(this.inspector, 10, barY + 20, barW, 12, e.hunger / 100, 0xf39c12, `🍖 ${Math.floor(e.hunger)}%`);
    
    // Energia
    this.drawBar(this.inspector, 10, barY + 40, barW, 12, e.energy / 100, 0x3498db, `⚡ ${Math.floor(e.energy)}%`);
    
    // Pensamento
    const thoughtText = new Text({ 
      text: `💭 "${e.thought}"`, 
      style: { fontSize: 12, fill: 0xffd700, fontFamily: 'Arial', fontStyle: 'italic' } 
    });
    thoughtText.x = 10;
    thoughtText.y = 90;
    this.inspector.addChild(thoughtText);
    
    // Botões
    const btnW = (w - 40) / 4;
    const btnY = 120;
    const btnLabels = ['👁️ Seguir', '💚 Curar', '💀 Matar', '✖️ Fechar'];
    
    btnLabels.forEach((label, i) => {
      this.inspector.roundRect(10 + i * btnW, btnY, btnW - 5, 30, 5);
      this.inspector.fill({ color: 0x333355 });
      this.inspector.stroke({ color: 0x555577, width: 1 });
      
      const btnText = new Text({ text: label, style: { fontSize: 11, fill: 0xffffff, fontFamily: 'Arial' } });
      btnText.x = 15 + i * btnW;
      btnText.y = btnY + 7;
      this.inspector.addChild(btnText);
    });
  }
  
  drawBar(g: Graphics, x: number, y: number, w: number, h: number, percent: number, color: number, label: string) {
    // Fundo
    g.roundRect(x, y, w, h, 3);
    g.fill({ color: 0x222233 });
    
    // Preenchimento
    g.roundRect(x, y, w * Math.max(0, Math.min(1, percent)), h, 3);
    g.fill({ color });
    
    // Label
    const text = new Text({ text: label, style: { fontSize: 10, fill: 0xffffff, fontFamily: 'Arial' } });
    text.x = x + 5;
    text.y = y;
    g.addChild(text);
  }
      }

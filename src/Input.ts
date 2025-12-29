import { Vector2, EventEmitter } from './utils';
import { Camera } from './camera';

export interface PointerData {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
}

export interface InputEvents {
  click: PointerData;
  dragstart: { startX: number; startY: number };
  drag: { deltaX: number; deltaY: number; currentX: number; currentY: number };
  dragend: void;
  wheel: { delta: number; x: number; y: number };
  pinch: { scale: number; centerX: number; centerY: number };
  keydown: { code: string };
  keyup: { code: string };
}

export class Input extends EventEmitter<InputEvents> {
  private element: HTMLElement;
  private camera: Camera | null = null;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private pointers: Map<number, { x: number; y: number }> = new Map();
  private initialPinchDist = 0;

  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.setupEvents();
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  private setupEvents(): void {
    this.element.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.element.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.element.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.element.addEventListener('pointercancel', this.onPointerUp.bind(this));
    this.element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.element.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private getWorldPos(x: number, y: number): { worldX: number; worldY: number } {
    if (this.camera) {
      const pos = this.camera.screenToWorld(x, y);
      return { worldX: pos.x, worldY: pos.y };
    }
    return { worldX: x, worldY: y };
  }

  private onPointerDown(e: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.pointers.set(e.pointerId, { x, y });
    
    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      this.initialPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
    
    this.isDragging = true;
    this.lastX = x;
    this.lastY = y;
    this.emit('dragstart', { startX: x, startY: y });
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.pointers.set(e.pointerId, { x, y });
    
    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scale = dist / this.initialPinchDist;
      const centerX = (pts[0].x + pts[1].x) / 2;
      const centerY = (pts[0].y + pts[1].y) / 2;
      this.emit('pinch', { scale, centerX, centerY });
      this.initialPinchDist = dist;
      return;
    }
    
    if (this.isDragging) {
      const deltaX = x - this.lastX;
      const deltaY = y - this.lastY;
      this.lastX = x;
      this.lastY = y;
      this.emit('drag', { deltaX, deltaY, currentX: x, currentY: y });
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const wasClick = this.isDragging && this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    
    if (this.pointers.size === 0) {
      this.isDragging = false;
      this.emit('dragend', undefined);
    }
    
    if (wasClick) {
      const rect = this.element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { worldX, worldY } = this.getWorldPos(x, y);
      this.emit('click', { x, y, worldX, worldY });
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.element.getBoundingClientRect();
    this.emit('wheel', {
      delta: e.deltaY,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.emit('keydown', { code: e.code });
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.emit('keyup', { code: e.code });
  }

  destroy(): void {}
}

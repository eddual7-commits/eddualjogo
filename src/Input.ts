/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - INPUT SYSTEM
 * Sistema de input com suporte a mouse, touch e gestos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { INPUT } from './Constants';
import { Vector2, EventEmitter } from './Utils';
import { Camera } from './Camera';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PointerData {
  id: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  button: number;
  isTouch: boolean;
}

export interface DragData {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  worldStartX: number;
  worldStartY: number;
}

export interface PinchData {
  centerX: number;
  centerY: number;
  scale: number;
  initialDistance: number;
  currentDistance: number;
}

export interface InputEvents {
  pointerdown: PointerData;
  pointerup: PointerData;
  pointermove: PointerData;
  click: PointerData;
  doubleclick: PointerData;
  rightclick: PointerData;
  longpress: PointerData;
  dragstart: DragData;
  drag: DragData;
  dragend: DragData;
  pinchstart: PinchData;
  pinch: PinchData;
  pinchend: PinchData;
  wheel: { delta: number; x: number; y: number };
  keydown: { key: string; code: string; shift: boolean; ctrl: boolean; alt: boolean };
  keyup: { key: string; code: string };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Input extends EventEmitter<InputEvents> {
  // State
  private pointers: Map<number, PointerData> = new Map();
  private keys: Set<string> = new Set();
  
  // Mouse position
  private _mouseX: number = 0;
  private _mouseY: number = 0;
  private _mouseWorldX: number = 0;
  private _mouseWorldY: number = 0;
  
  // Drag state
  private isDragging: boolean = false;
  private dragStartPos: Vector2 = new Vector2();
  private dragWorldStartPos: Vector2 = new Vector2();
  private dragPointerId: number = -1;
  
  // Pinch state
  private isPinching: boolean = false;
  private pinchInitialDistance: number = 0;
  private pinchCenter: Vector2 = new Vector2();
  
  // Click detection
  private lastClickTime: number = 0;
  private lastClickPos: Vector2 = new Vector2();
  private longPressTimer: number | null = null;
  private longPressTriggered: boolean = false;
  
  // References
  private element: HTMLElement;
  private camera: Camera | null = null;
  
  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  private setupEventListeners(): void {
    // Pointer events (unified mouse + touch)
    this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.element.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    this.element.addEventListener('pointerleave', this.handlePointerUp.bind(this));
    
    // Wheel
    this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    // Context menu (right click)
    this.element.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keyboard
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Prevent default touch behaviors
    this.element.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.element.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POINTER HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private handlePointerDown(e: PointerEvent): void {
    const data = this.createPointerData(e);
    this.pointers.set(e.pointerId, data);
    
    this._mouseX = data.x;
    this._mouseY = data.y;
    this._mouseWorldX = data.worldX;
    this._mouseWorldY = data.worldY;
    
    this.emit('pointerdown', data);
    
    // Check for pinch (2 fingers)
    if (this.pointers.size === 2) {
      this.startPinch();
      return;
    }
    
    // Single pointer handling
    if (this.pointers.size === 1) {
      // Store for drag detection
      this.dragStartPos.set(data.x, data.y);
      this.dragWorldStartPos.set(data.worldX, data.worldY);
      this.dragPointerId = e.pointerId;
      
      // Start long press timer
      this.longPressTriggered = false;
      this.longPressTimer = window.setTimeout(() => {
        if (!this.isDragging && this.pointers.has(e.pointerId)) {
          this.longPressTriggered = true;
          this.emit('longpress', data);
        }
      }, INPUT.LONG_PRESS_TIME);
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    const data = this.createPointerData(e);
    this.pointers.set(e.pointerId, data);
    
    this._mouseX = data.x;
    this._mouseY = data.y;
    this._mouseWorldX = data.worldX;
    this._mouseWorldY = data.worldY;
    
    this.emit('pointermove', data);
    
    // Handle pinch
    if (this.isPinching && this.pointers.size === 2) {
      this.updatePinch();
      return;
    }
    
    // Handle drag
    if (this.pointers.size === 1 && e.pointerId === this.dragPointerId) {
      const dx = data.x - this.dragStartPos.x;
      const dy = data.y - this.dragStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (!this.isDragging && distance > INPUT.DRAG_THRESHOLD) {
        this.isDragging = true;
        this.clearLongPressTimer();
        
        this.emit('dragstart', {
          startX: this.dragStartPos.x,
          startY: this.dragStartPos.y,
          currentX: data.x,
          currentY: data.y,
          deltaX: dx,
          deltaY: dy,
          worldStartX: this.dragWorldStartPos.x,
          worldStartY: this.dragWorldStartPos.y,
        });
      }
      
      if (this.isDragging) {
        this.emit('drag', {
          startX: this.dragStartPos.x,
          startY: this.dragStartPos.y,
          currentX: data.x,
          currentY: data.y,
          deltaX: dx,
          deltaY: dy,
          worldStartX: this.dragWorldStartPos.x,
          worldStartY: this.dragWorldStartPos.y,
        });
      }
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    const data = this.createPointerData(e);
    
    this.clearLongPressTimer();
    
    // Handle pinch end
    if (this.isPinching) {
      this.endPinch();
    }
    
    // Handle drag end
    if (this.isDragging && e.pointerId === this.dragPointerId) {
      this.emit('dragend', {
        startX: this.dragStartPos.x,
        startY: this.dragStartPos.y,
        currentX: data.x,
        currentY: data.y,
        deltaX: data.x - this.dragStartPos.x,
        deltaY: data.y - this.dragStartPos.y,
        worldStartX: this.dragWorldStartPos.x,
        worldStartY: this.dragWorldStartPos.y,
      });
      this.isDragging = false;
    }
    
    // Handle click (if not dragged or long pressed)
    if (!this.isDragging && !this.longPressTriggered && this.pointers.has(e.pointerId)) {
      const now = performance.now();
      const timeSinceLastClick = now - this.lastClickTime;
      const dx = data.x - this.lastClickPos.x;
      const dy = data.y - this.lastClickPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (e.button === 2) {
        this.emit('rightclick', data);
      } else if (timeSinceLastClick < INPUT.DOUBLE_CLICK_TIME && distance < INPUT.DRAG_THRESHOLD) {
        this.emit('doubleclick', data);
        this.lastClickTime = 0;
      } else {
        this.emit('click', data);
        this.lastClickTime = now;
        this.lastClickPos.set(data.x, data.y);
      }
    }
    
    this.pointers.delete(e.pointerId);
    this.emit('pointerup', data);
    
    if (this.pointers.size === 0) {
      this.isDragging = false;
      this.dragPointerId = -1;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PINCH HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  private startPinch(): void {
    const pointers = Array.from(this.pointers.values());
    const p1 = pointers[0];
    const p2 = pointers[1];
    
    this.pinchInitialDistance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );
    
    this.pinchCenter.set(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2
    );
    
    this.isPinching = true;
    this.isDragging = false;
    this.clearLongPressTimer();
    
    this.emit('pinchstart', {
      centerX: this.pinchCenter.x,
      centerY: this.pinchCenter.y,
      scale: 1,
      initialDistance: this.pinchInitialDistance,
      currentDistance: this.pinchInitialDistance,
    });
  }

  private updatePinch(): void {
    const pointers = Array.from(this.pointers.values());
    if (pointers.length < 2) return;
    
    const p1 = pointers[0];
    const p2 = pointers[1];
    
    const currentDistance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );
    
    const scale = currentDistance / this.pinchInitialDistance;
    
    this.pinchCenter.set(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2
    );
    
    this.emit('pinch', {
      centerX: this.pinchCenter.x,
      centerY: this.pinchCenter.y,
      scale,
      initialDistance: this.pinchInitialDistance,
      currentDistance,
    });
  }

  private endPinch(): void {
    const pointers = Array.from(this.pointers.values());
    const currentDistance = pointers.length >= 2
      ? Math.sqrt(Math.pow(pointers[1].x - pointers[0].x, 2) + Math.pow(pointers[1].y - pointers[0].y, 2))
      : this.pinchInitialDistance;
    
    this.emit('pinchend', {
      centerX: this.pinchCenter.x,
      centerY: this.pinchCenter.y,
      scale: currentDistance / this.pinchInitialDistance,
      initialDistance: this.pinchInitialDistance,
      currentDistance,
    });
    
    this.isPinching = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WHEEL HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize wheel delta
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 40; // Lines
    if (e.deltaMode === 2) delta *= 800; // Pages
    
    this.emit('wheel', { delta, x, y });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  private handleKeyDown(e: KeyboardEvent): void {
    // Don't capture if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    this.keys.add(e.code);
    
    this.emit('keydown', {
      key: e.key,
      code: e.code,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
    });
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
    
    this.emit('keyup', {
      key: e.key,
      code: e.code,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private createPointerData(e: PointerEvent): PointerData {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let worldX = x;
    let worldY = y;
    
    if (this.camera) {
      const worldPos = this.camera.screenToWorld(x, y);
      worldX = worldPos.x;
      worldY = worldPos.y;
    }
    
    return {
      id: e.pointerId,
      x,
      y,
      worldX,
      worldY,
      button: e.button,
      isTouch: e.pointerType === 'touch',
    };
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  get mouseX(): number {
    return this._mouseX;
  }

  get mouseY(): number {
    return this._mouseY;
  }

  get mouseWorldX(): number {
    return this._mouseWorldX;
  }

  get mouseWorldY(): number {
    return this._mouseWorldY;
  }

  get mousePosition(): Vector2 {
    return new Vector2(this._mouseX, this._mouseY);
  }

  get mouseWorldPosition(): Vector2 {
    return new Vector2(this._mouseWorldX, this._mouseWorldY);
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isAnyKeyDown(...codes: string[]): boolean {
    return codes.some(code => this.keys.has(code));
  }

  areAllKeysDown(...codes: string[]): boolean {
    return codes.every(code => this.keys.has(code));
  }

  getPointerCount(): number {
    return this.pointers.size;
  }

  getPointers(): PointerData[] {
    return Array.from(this.pointers.values());
  }

  isPointerDown(): boolean {
    return this.pointers.size > 0;
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  getIsPinching(): boolean {
    return this.isPinching;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  destroy(): void {
    this.clearLongPressTimer();
    this.pointers.clear();
    this.keys.clear();
    this.clear();
  }
      }

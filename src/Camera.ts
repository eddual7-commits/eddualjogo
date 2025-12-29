/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECOBOX ULTIMATE - CAMERA
 * Sistema de câmera com zoom suave, pan, seguir entidade e limites
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Container } from 'pixi.js';
import { CAMERA, WORLD } from './Constants';
import { Vector2, clamp, lerp, easeOutElastic } from './Utils';

interface CameraTarget {
  x: number;
  y: number;
}

interface ShakeConfig {
  intensity: number;
  duration: number;
  elapsed: number;
}

export class Camera {
  // Position and zoom
  private _position: Vector2 = new Vector2();
  private _targetPosition: Vector2 = new Vector2();
  private _zoom: number = CAMERA.DEFAULT_ZOOM;
  private _targetZoom: number = CAMERA.DEFAULT_ZOOM;
  
  // Viewport
  private _viewportWidth: number = 0;
  private _viewportHeight: number = 0;
  
  // Following
  private followTarget: CameraTarget | null = null;
  private followOffset: Vector2 = new Vector2();
  private followSmoothness: number = 0.1;
  
  // Shake effect
  private shake: ShakeConfig | null = null;
  private shakeOffset: Vector2 = new Vector2();
  
  // Bounds
  private minX: number = 0;
  private minY: number = 0;
  private maxX: number = WORLD.WIDTH * WORLD.TILE_SIZE;
  private maxY: number = WORLD.HEIGHT * WORLD.TILE_SIZE;
  
  // Container to transform
  private container: Container;
  
  constructor(container: Container) {
    this.container = container;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  get x(): number {
    return this._position.x;
  }

  get y(): number {
    return this._position.y;
  }

  get zoom(): number {
    return this._zoom;
  }

  get position(): Vector2 {
    return this._position.clone();
  }

  get viewportWidth(): number {
    return this._viewportWidth / this._zoom;
  }

  get viewportHeight(): number {
    return this._viewportHeight / this._zoom;
  }

  // Visible bounds in world coordinates
  get visibleBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this._position.x - this.viewportWidth / 2,
      y: this._position.y - this.viewportHeight / 2,
      width: this.viewportWidth,
      height: this.viewportHeight,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  setPosition(x: number, y: number, instant: boolean = false): void {
    this._targetPosition.set(x, y);
    if (instant) {
      this._position.set(x, y);
    }
  }

  setZoom(zoom: number, instant: boolean = false): void {
    this._targetZoom = clamp(zoom, CAMERA.MIN_ZOOM, CAMERA.MAX_ZOOM);
    if (instant) {
      this._zoom = this._targetZoom;
    }
  }

  setViewport(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;
  }

  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  move(dx: number, dy: number): void {
    this._targetPosition.x += dx / this._zoom;
    this._targetPosition.y += dy / this._zoom;
  }

  moveTo(x: number, y: number): void {
    this._targetPosition.set(x, y);
  }

  centerOn(x: number, y: number, instant: boolean = false): void {
    this.setPosition(x, y, instant);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZOOM
  // ═══════════════════════════════════════════════════════════════════════════

  zoomIn(factor: number = CAMERA.ZOOM_SPEED): void {
    this._targetZoom = clamp(
      this._targetZoom * (1 + factor),
      CAMERA.MIN_ZOOM,
      CAMERA.MAX_ZOOM
    );
  }

  zoomOut(factor: number = CAMERA.ZOOM_SPEED): void {
    this._targetZoom = clamp(
      this._targetZoom * (1 - factor),
      CAMERA.MIN_ZOOM,
      CAMERA.MAX_ZOOM
    );
  }

  zoomToPoint(zoom: number, worldX: number, worldY: number): void {
    const oldZoom = this._zoom;
    const newZoom = clamp(zoom, CAMERA.MIN_ZOOM, CAMERA.MAX_ZOOM);
    
    // Calculate offset to keep the point stationary
    const zoomRatio = newZoom / oldZoom;
    const dx = (worldX - this._position.x) * (1 - 1 / zoomRatio);
    const dy = (worldY - this._position.y) * (1 - 1 / zoomRatio);
    
    this._targetZoom = newZoom;
    this._targetPosition.x += dx;
    this._targetPosition.y += dy;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOLLOWING
  // ═══════════════════════════════════════════════════════════════════════════

  follow(target: CameraTarget | null, offsetX: number = 0, offsetY: number = 0, smoothness: number = 0.1): void {
    this.followTarget = target;
    this.followOffset.set(offsetX, offsetY);
    this.followSmoothness = smoothness;
  }

  stopFollowing(): void {
    this.followTarget = null;
  }

  isFollowing(): boolean {
    return this.followTarget !== null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN SHAKE
  // ═══════════════════════════════════════════════════════════════════════════

  addShake(intensity: number, duration: number): void {
    // Add to existing shake or start new one
    if (this.shake) {
      this.shake.intensity = Math.max(this.shake.intensity, intensity);
      this.shake.duration = Math.max(this.shake.duration - this.shake.elapsed, duration);
      this.shake.elapsed = 0;
    } else {
      this.shake = {
        intensity,
        duration,
        elapsed: 0,
      };
    }
  }

  private updateShake(delta: number): void {
    if (!this.shake) {
      this.shakeOffset.set(0, 0);
      return;
    }

    this.shake.elapsed += delta;
    
    if (this.shake.elapsed >= this.shake.duration) {
      this.shake = null;
      this.shakeOffset.set(0, 0);
      return;
    }

    // Decay intensity over time
    const progress = this.shake.elapsed / this.shake.duration;
    const currentIntensity = this.shake.intensity * (1 - progress);
    
    // Random offset
    this.shakeOffset.set(
      (Math.random() * 2 - 1) * currentIntensity,
      (Math.random() * 2 - 1) * currentIntensity
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COORDINATE CONVERSION
  // ═══════════════════════════════════════════════════════════════════════════

  screenToWorld(screenX: number, screenY: number): Vector2 {
    const centerX = this._viewportWidth / 2;
    const centerY = this._viewportHeight / 2;
    
    return new Vector2(
      (screenX - centerX) / this._zoom + this._position.x,
      (screenY - centerY) / this._zoom + this._position.y
    );
  }

  worldToScreen(worldX: number, worldY: number): Vector2 {
    const centerX = this._viewportWidth / 2;
    const centerY = this._viewportHeight / 2;
    
    return new Vector2(
      (worldX - this._position.x) * this._zoom + centerX,
      (worldY - this._position.y) * this._zoom + centerY
    );
  }

  isInView(x: number, y: number, margin: number = 0): boolean {
    const bounds = this.visibleBounds;
    return x >= bounds.x - margin &&
           x <= bounds.x + bounds.width + margin &&
           y >= bounds.y - margin &&
           y <= bounds.y + bounds.height + margin;
  }

  isRectInView(x: number, y: number, width: number, height: number, margin: number = 0): boolean {
    const bounds = this.visibleBounds;
    return x + width >= bounds.x - margin &&
           x <= bounds.x + bounds.width + margin &&
           y + height >= bounds.y - margin &&
           y <= bounds.y + bounds.height + margin;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  update(delta: number): void {
    // Update following target
    if (this.followTarget) {
      this._targetPosition.set(
        this.followTarget.x + this.followOffset.x,
        this.followTarget.y + this.followOffset.y
      );
    }

    // Smooth position interpolation
    this._position.x = lerp(this._position.x, this._targetPosition.x, CAMERA.SMOOTHING);
    this._position.y = lerp(this._position.y, this._targetPosition.y, CAMERA.SMOOTHING);

    // Smooth zoom interpolation
    this._zoom = lerp(this._zoom, this._targetZoom, CAMERA.SMOOTHING);

    // Clamp position to bounds
    const halfViewportW = this.viewportWidth / 2;
    const halfViewportH = this.viewportHeight / 2;
    
    this._position.x = clamp(
      this._position.x,
      this.minX + halfViewportW,
      this.maxX - halfViewportW
    );
    this._position.y = clamp(
      this._position.y,
      this.minY + halfViewportH,
      this.maxY - halfViewportH
    );

    // Update shake
    this.updateShake(delta);

    // Apply to container
    this.applyToContainer();
  }

  private applyToContainer(): void {
    const centerX = this._viewportWidth / 2;
    const centerY = this._viewportHeight / 2;

    // Calculate final position with shake
    const finalX = this._position.x + this.shakeOffset.x;
    const finalY = this._position.y + this.shakeOffset.y;

    // Apply transformation
    this.container.x = centerX - finalX * this._zoom;
    this.container.y = centerY - finalY * this._zoom;
    this.container.scale.set(this._zoom);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  reset(): void {
    const centerX = (this.minX + this.maxX) / 2;
    const centerY = (this.minY + this.maxY) / 2;
    
    this.setPosition(centerX, centerY, true);
    this.setZoom(CAMERA.DEFAULT_ZOOM, true);
    this.stopFollowing();
    this.shake = null;
    this.shakeOffset.set(0, 0);
  }

  getState(): {
    x: number;
    y: number;
    zoom: number;
    following: boolean;
  } {
    return {
      x: this._position.x,
      y: this._position.y,
      zoom: this._zoom,
      following: this.followTarget !== null,
    };
  }

  // Get tile coordinates from screen position
  getTileAt(screenX: number, screenY: number): { tileX: number; tileY: number } {
    const world = this.screenToWorld(screenX, screenY);
    return {
      tileX: Math.floor(world.x / WORLD.TILE_SIZE),
      tileY: Math.floor(world.y / WORLD.TILE_SIZE),
    };
  }
        }

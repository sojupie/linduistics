/**
 * Canvas3D: Pure TypeScript 3D Vector Math & Perspective Projection Engine.
 * Lightweight, zero-dependency, and styled for 19th-century naturalist charts.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x2d: number;
  y2d: number;
  scale: number;
  depth: number; // For painter's algorithm Z-sorting
  visible: boolean;
}

export interface CameraState {
  yaw: number;       // Rotation around Y axis in radians
  pitch: number;     // Rotation around X axis in radians
  zoom: number;      // Scaling multiplier
  focalLength: number; // Perspective distance
}

export const DEFAULT_CAMERA: CameraState = {
  yaw: 0.5,
  pitch: 0.35,
  zoom: 1.0,
  focalLength: 480,
};

/**
 * Converts celestial spherical coordinates (RA in degrees, Dec in degrees, radius)
 * to 3D Cartesian coordinates.
 */
export function celestialToCartesian(raDeg: number, decDeg: number, radius: number): Vec3 {
  const raRad = (raDeg * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;

  return {
    x: radius * Math.cos(decRad) * Math.cos(raRad),
    y: -radius * Math.sin(decRad), // Invert Y for screen coordinates (up is negative Y)
    z: radius * Math.cos(decRad) * Math.sin(raRad),
  };
}

/**
 * Rotates a 3D point using yaw (Y-axis) and pitch (X-axis).
 */
export function rotateVec3(p: Vec3, yaw: number, pitch: number): Vec3 {
  // Rotate around Y axis (yaw)
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = p.x * cosY + p.z * sinY;
  const y1 = p.y;
  const z1 = -p.x * sinY + p.z * cosY;

  // Rotate around X axis (pitch)
  const cosX = Math.cos(pitch);
  const sinX = Math.sin(pitch);
  const x2 = x1;
  const y2 = y1 * cosX - z1 * sinX;
  const z2 = y1 * sinX + z1 * cosX;

  return { x: x2, y: y2, z: z2 };
}

/**
 * Projects a rotated 3D point onto a 2D canvas with perspective division.
 */
export function project3D(
  p: Vec3,
  width: number,
  height: number,
  camera: CameraState,
  viewDistance = 550,
): ProjectedPoint {
  const rotated = rotateVec3(p, camera.yaw, camera.pitch);

  const zEffective = rotated.z * camera.zoom + viewDistance;
  const visible = zEffective > 20;

  const perspective = camera.focalLength / Math.max(zEffective, 20);
  const scale = perspective * camera.zoom;

  const x2d = width / 2 + rotated.x * scale;
  const y2d = height / 2 + rotated.y * scale;

  return {
    x2d,
    y2d,
    scale,
    depth: rotated.z,
    visible,
  };
}

/**
 * Helper to render celestial graticules (latitude / longitude coordinate circles)
 * in 19th-century naturalist engraved style.
 */
export function renderCelestialGraticules(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: CameraState,
  radius: number,
  strokeColor = 'rgba(216, 209, 198, 0.45)',
  equatorColor = 'rgba(158, 42, 43, 0.35)',
) {
  ctx.save();
  ctx.lineWidth = 1;

  // Render 3 latitude parallels (-45, 0 equator, +45)
  const latitudes = [-50, -25, 0, 25, 50];
  latitudes.forEach((lat) => {
    const latRad = (lat * Math.PI) / 180;
    const rParallel = radius * Math.cos(latRad);
    const yParallel = -radius * Math.sin(latRad);

    ctx.strokeStyle = lat === 0 ? equatorColor : strokeColor;
    ctx.setLineDash(lat === 0 ? [] : [3, 4]);

    ctx.beginPath();
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const pt: Vec3 = {
        x: rParallel * Math.cos(theta),
        y: yParallel,
        z: rParallel * Math.sin(theta),
      };
      const proj = project3D(pt, width, height, camera);
      if (i === 0) {
        ctx.moveTo(proj.x2d, proj.y2d);
      } else {
        ctx.lineTo(proj.x2d, proj.y2d);
      }
    }
    ctx.stroke();
  });

  // Render 6 longitude meridians
  const meridians = [0, 45, 90, 135, 180, 225, 270, 315];
  ctx.strokeStyle = strokeColor;
  ctx.setLineDash([2, 4]);

  meridians.forEach((lon) => {
    ctx.beginPath();
    const segments = 36;
    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * Math.PI - Math.PI / 2; // -pi/2 to +pi/2
      const pt = celestialToCartesian(lon, (phi * 180) / Math.PI, radius);
      const proj = project3D(pt, width, height, camera);
      if (i === 0) {
        ctx.moveTo(proj.x2d, proj.y2d);
      } else {
        ctx.lineTo(proj.x2d, proj.y2d);
      }
    }
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Hook or class to manage smooth orbit interaction (drag, pinch, wheel).
 */
export class OrbitController {
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private onChange: (camera: CameraState) => void;
  public camera: CameraState;

  constructor(initialCamera: CameraState, onChange: (camera: CameraState) => void) {
    this.camera = { ...initialCamera };
    this.onChange = onChange;
  }

  public handlePointerDown(e: React.PointerEvent) {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  public handlePointerMove(e: React.PointerEvent) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    // Adjust yaw (left/right drag) and pitch (up/down drag)
    this.camera.yaw += dx * 0.007;
    this.camera.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.camera.pitch + dy * 0.007));

    this.onChange({ ...this.camera });
  }

  public handlePointerUp(e: React.PointerEvent) {
    this.isDragging = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  }

  public handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0012;
    this.camera.zoom = Math.max(0.45, Math.min(2.5, this.camera.zoom + zoomDelta));
    this.onChange({ ...this.camera });
  }

  public reset() {
    this.camera = { ...DEFAULT_CAMERA };
    this.onChange({ ...this.camera });
  }
}

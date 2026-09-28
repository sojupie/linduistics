import { classicalMDS, type MDSPoint } from './mds';
import { LANGUAGE_MAP } from './languageComparison';

export type MapView = '2d' | '3d';
export type ProjectedPoint = MDSPoint & { depth: number; scale: number };
export type PositionedPoint = ProjectedPoint & { x: number; y: number };
export type MapLabel = { code: string; x: number; y: number };
export type Graticule = { key: string; points: Array<{ x: number; y: number; depth: number }>; equator: boolean };

export function projectCoordinates(x: number, y: number, z: number, view: MapView, yaw: number, pitch: number, zoom: number) {
  const { plot } = LANGUAGE_MAP;
  if (view === '2d') return { x: plot.centerX + x * plot.scaleX, y: plot.centerY + y * plot.scaleY, depth: 0, scale: 1 };
  const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw), cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const rotatedX = x * cosYaw + z * sinYaw;
  const rotatedZ = -x * sinYaw + z * cosYaw;
  const rotatedY = y * cosPitch - rotatedZ * sinPitch;
  const depth = y * sinPitch + rotatedZ * cosPitch;
  const scale = zoom * plot.perspective / (plot.perspective + depth);
  return {
    x: plot.centerX + rotatedX * plot.perspectiveScaleX * scale,
    y: plot.centerY + rotatedY * plot.perspectiveScaleY * scale,
    depth,
    scale,
  };
}

export function calculateMapPoints(languages: string[], scoreFor: (source: string, target: string) => number) {
  if (languages.length < 2) return [];
  const distances = languages.map((source) => languages.map((target) => source === target ? 0 : 1 - scoreFor(source, target)));
  return classicalMDS(languages, distances);
}

export function layoutPoints(points: MDSPoint[], view: MapView, yaw: number, pitch: number, zoom: number, width: number): PositionedPoint[] {
  const { plot } = LANGUAGE_MAP;
  const scaleX = Math.min(1, (width - plot.marginX * 2) / (plot.centerX * 2 - plot.marginX * 2));
  return points.map((point) => {
    const projected = projectCoordinates(point.x, point.y, point.z, view, yaw, pitch, zoom);
    return { ...point, ...projected, x: width / 2 + (projected.x - plot.centerX) * scaleX };
  });
}

export function layoutLabels(points: PositionedPoint[], width: number): MapLabel[] {
  const { labels, plot } = LANGUAGE_MAP;
  return points.map((point, index) => {
    const neighbors = points.filter((other) => other.code !== point.code && Math.hypot(other.x - point.x, other.y - point.y) < labels.neighborDistance);
    if (!neighbors.length) return { code: point.code, x: point.x, y: point.y };
    const center = neighbors.reduce((sum, other) => ({
      x: sum.x + other.x / neighbors.length,
      y: sum.y + other.y / neighbors.length,
    }), { x: 0, y: 0 });
    let dx = point.x - center.x, dy = point.y - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
      const angle = index * Math.PI * 2 / points.length;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    } else {
      dx /= distance;
      dy /= distance;
    }
    return {
      code: point.code,
      x: Math.max(labels.edgeInsetX, Math.min(width - labels.edgeInsetX, point.x + dx * labels.offset)),
      y: Math.max(labels.edgeInsetY, Math.min(plot.height - labels.edgeInsetY, point.y + dy * labels.offset)),
    };
  });
}

export function screenPoint(x: number, y: number, z: number, yaw: number, pitch: number, zoom: number, width: number) {
  const { plot } = LANGUAGE_MAP;
  const point = projectCoordinates(x, y, z, '3d', yaw, pitch, zoom);
  const scaleX = Math.min(1, (width - plot.marginX * 2) / (plot.centerX * 2 - plot.marginX * 2));
  return { x: width / 2 + (point.x - plot.centerX) * scaleX, y: point.y, depth: point.depth };
}

export function createGraticules(yaw: number, pitch: number, zoom: number, width: number): Graticule[] {
  const { plot, graticule } = LANGUAGE_MAP;
  const projectPath = (points: Array<[number, number, number]>) => points.map(([x, y, z]) => screenPoint(x, y, z, yaw, pitch, zoom, width));
  const latitudes = graticule.latitudeDegrees.map((latitude) => {
    const angle = latitude * Math.PI / 180;
    return {
      key: `latitude-${latitude}`,
      points: projectPath(Array.from({ length: graticule.circleSegments + 1 }, (_, index) => {
        const longitude = index / graticule.circleSegments * Math.PI * 2;
        return [plot.radius * Math.cos(angle) * Math.cos(longitude), plot.radius * Math.sin(angle), plot.radius * Math.cos(angle) * Math.sin(longitude)];
      })),
      equator: latitude === 0,
    };
  });
  const longitudes = graticule.longitudeDegrees.map((longitude) => {
    const angle = longitude * Math.PI / 180;
    return {
      key: `longitude-${longitude}`,
      equator: false,
      points: projectPath(Array.from({ length: graticule.meridianSegments + 1 }, (_, index) => {
        const latitude = index / graticule.meridianSegments * Math.PI * 2;
        return [plot.radius * Math.cos(latitude) * Math.cos(angle), plot.radius * Math.sin(latitude), plot.radius * Math.cos(latitude) * Math.sin(angle)];
      })),
    };
  });
  return [...latitudes, ...longitudes];
}

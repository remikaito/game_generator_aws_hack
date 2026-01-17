/**
 * SceneConfig - Output of the Assembly Agent
 * Final configuration for the Three.js scene
 */

export interface LightConfig {
  /** Light color (hex string) */
  color: string;
  /** Light intensity (0-1) */
  intensity: number;
}

export interface DirectionalLightConfig extends LightConfig {
  /** Light position [x, y, z] */
  position: [number, number, number];
}

export interface GeometryRoom {
  /** Room ID reference */
  id: string;
  /** Position [x, y, z] */
  position: [number, number, number];
  /** Dimensions [width, height, depth] */
  size: [number, number, number];
  /** Floor color (hex) */
  color: string;
  /** Room tags for styling */
  tags: string[];
  /** Texture type for floor (optional, for procedural generation) */
  floorTexture?: string;
  /** Texture type for walls (optional, for procedural generation) */
  wallTexture?: string;
  /** Wall color (hex, optional) */
  wallColor?: string;
}

/**
 * Un segment de corridor en coordonnées 3D
 */
export interface GeometryCorridorSegment {
  /** Start position [x, y, z] */
  start: [number, number, number];
  /** End position [x, y, z] */
  end: [number, number, number];
}

export interface GeometryCorridor {
  /** Corridor ID reference */
  id: string;
  /** 
   * Liste des segments formant le corridor
   * - 1 segment = corridor droit
   * - 2 segments = corridor en L
   */
  segments: GeometryCorridorSegment[];
  /** Corridor width */
  width: number;
  /** Floor color (hex) */
  color: string;
  /** Texture type for floor (optional) */
  floorTexture?: string;
  
  // Legacy fields (pour compatibilité avec l'ancien code)
  /** @deprecated Utiliser segments[0].start */
  start?: [number, number, number];
  /** @deprecated Utiliser segments[last].end */
  end?: [number, number, number];
  /** @deprecated Plus utilisé */
  elevation?: number;
  /** @deprecated Plus utilisé */
  hasRamp?: boolean;
  /** @deprecated Plus utilisé */
  elevationChange?: number;
}

export interface GeometryWall {
  /** Wall ID */
  id: string;
  /** Start position [x, y, z] */
  start: [number, number, number];
  /** End position [x, y, z] */
  end: [number, number, number];
  /** Wall height */
  height: number;
  /** Wall color (hex) */
  color: string;
}

export interface GeometryPOI {
  /** POI ID reference */
  id: string;
  /** POI type */
  type: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
  /** Position [x, y, z] */
  position: [number, number, number];
  /** Marker color (hex) */
  color: string;
  /** Label text */
  label: string;
  /** Room ID associated with this POI */
  roomId: string;
}

export interface SceneGeometry {
  /** All room geometries */
  rooms: GeometryRoom[];
  /** All corridor geometries */
  corridors: GeometryCorridor[];
  /** All wall geometries */
  walls: GeometryWall[];
  /** POI markers */
  poi_markers: GeometryPOI[];
}

export interface SceneObject {
  /** Object ID */
  id: string;
  /** Character/prop ID reference */
  reference_id: string;
  /** Object name */
  name: string;
  /** Path to GLB model file */
  model_path: string;
  /** Position [x, y, z] */
  position: [number, number, number];
  /** Rotation [x, y, z] in radians */
  rotation: [number, number, number];
  /** Scale [x, y, z] */
  scale: [number, number, number];
  /** Associated POI ID (if any) */
  poi_id?: string;
}

export interface CameraConfig {
  /** Default camera settings */
  default: {
    position: [number, number, number];
    look_at: [number, number, number];
    fov: number;
  };
  /** Orbit controls target */
  orbit_target: [number, number, number];
  /** Minimum orbit distance */
  min_distance: number;
  /** Maximum orbit distance */
  max_distance: number;
}

export interface SceneConfig {
  /** Path to skybox image */
  skybox_path: string;
  /** Ambient light configuration */
  ambient_light: LightConfig;
  /** Directional light configuration */
  directional_light: DirectionalLightConfig;
  /** Scene geometry (rooms, corridors, walls, POIs) */
  geometry: SceneGeometry;
  /** 3D objects (characters, props) */
  objects: SceneObject[];
  /** Camera configuration */
  camera: CameraConfig;
}

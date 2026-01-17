import { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import type { SceneConfig, GeometryRoom, GeometryCorridor, GeometryWall, GeometryPOI, GeometryCorridorSegment } from '../types';

interface LevelGeometryProps {
  geometry: SceneConfig['geometry'];
}

/**
 * Renders level geometry (rooms, corridors, walls, POIs)
 */
export function LevelGeometry({ geometry }: LevelGeometryProps) {
  const { rooms, corridors, walls, poi_markers } = geometry;

  // Créer une map des rooms pour accès rapide
  const roomsMap = useMemo(() => {
    const map = new Map<string, GeometryRoom>();
    rooms.forEach(room => map.set(room.id, room));
    return map;
  }, [rooms]);

  return (
    <group>
      {/* Room floors */}
      {rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}

      {/* Corridors */}
      {corridors.map((corridor) => (
        <CorridorFloor key={corridor.id} corridor={corridor} />
      ))}

      {/* Walls */}
      {walls.map((wall) => (
        <WallMesh key={wall.id} wall={wall} />
      ))}

      {/* POI Markers - position recalculée depuis la room */}
      {poi_markers.map((poi) => {
        // Trouver la room correspondante pour centrer le POI
        const room = poi.roomId ? roomsMap.get(poi.roomId) : null;
        const position: [number, number, number] = room 
          ? [room.position[0], 0.1, room.position[2]]
          : poi.position;
        
        return <POIMarker key={poi.id} poi={{ ...poi, position }} />;
      })}
    </group>
  );
}

/**
 * Room floor component - design épuré et visible
 * Utilise les couleurs personnalisées si définies dans les données de la room
 */
function RoomFloor({ room }: { room: GeometryRoom }) {
  // Couleur du sol: priorité aux données de la room, sinon couleur par défaut basée sur les tags
  const floorColor = useMemo(() => {
    // Si la room a une couleur définie (depuis le backend), l'utiliser
    if (room.color) {
      return new THREE.Color(room.color);
    }
    // Fallback: couleur basée sur les tags
    if (room.tags.includes('entry')) return new THREE.Color('#2d4a2d');
    if (room.tags.includes('goal')) return new THREE.Color('#4a2d2d');
    if (room.tags.includes('secret')) return new THREE.Color('#4a3d2d');
    return new THREE.Color('#3a3a4a');
  }, [room.color, room.tags]);

  // Couleur de bordure (basée sur la couleur du sol pour une cohérence visuelle)
  const borderColor = useMemo(() => {
    // Si une couleur personnalisée est définie, créer une bordure complémentaire
    if (room.color) {
      const base = new THREE.Color(room.color);
      // Éclaircir la couleur pour la bordure
      const hsl = { h: 0, s: 0, l: 0 };
      base.getHSL(hsl);
      return new THREE.Color().setHSL(hsl.h, Math.min(hsl.s + 0.2, 1), Math.min(hsl.l + 0.3, 1)).getStyle();
    }
    // Fallback: couleur basée sur les tags
    if (room.tags.includes('entry')) return '#44ff44';
    if (room.tags.includes('goal')) return '#ff4444';
    if (room.tags.includes('secret')) return '#ffaa00';
    return '#6666aa';
  }, [room.color, room.tags]);

  const halfW = room.size[0] / 2;
  const halfD = room.size[2] / 2;

  return (
    <group position={room.position}>
      {/* Main floor - couleur unie et propre */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[room.size[0], room.size[2]]} />
        <meshStandardMaterial 
          color={floorColor}
          roughness={0.9} 
          metalness={0.05}
        />
      </mesh>

      {/* Bordure lumineuse - rectangle outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[
          Math.max(halfW, halfD) * 0.95,
          Math.max(halfW, halfD) * 1.0,
          4
        ]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.4} />
      </mesh>

      {/* Floor edge lines - 4 côtés */}
      {/* Top edge */}
      <mesh position={[0, 0.03, -halfD + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.size[0], 0.15]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.6} />
      </mesh>
      {/* Bottom edge */}
      <mesh position={[0, 0.03, halfD - 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.size[0], 0.15]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.6} />
      </mesh>
      {/* Left edge */}
      <mesh position={[-halfW + 0.1, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, room.size[2]]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.6} />
      </mesh>
      {/* Right edge */}
      <mesh position={[halfW - 0.1, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, room.size[2]]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.6} />
      </mesh>

      {/* Room name label */}
      <Billboard position={[0, 0.5, 0]}>
        <Text
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
          font={undefined}
        >
          {room.id.replace('room_', 'Room ')}
        </Text>
      </Billboard>
    </group>
  );
}

/**
 * Corridor floor component - supporte corridors droits et en L
 * Rend chaque segment du corridor séparément
 */
function CorridorFloor({ corridor }: { corridor: GeometryCorridor }) {
  const { width, color } = corridor;

  // Obtenir les segments (utiliser segments ou créer depuis legacy start/end)
  const segments: GeometryCorridorSegment[] = useMemo(() => {
    if (corridor.segments && corridor.segments.length > 0) {
      return corridor.segments;
    }
    // Fallback pour les anciens corridors avec start/end
    if (corridor.start && corridor.end) {
      return [{ start: corridor.start, end: corridor.end }];
    }
    return [];
  }, [corridor]);

  const meshColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group>
      {/* Rendre chaque segment du corridor */}
      {segments.map((segment, index) => (
        <CorridorSegmentFloor
          key={`${corridor.id}_seg_${index}`}
          segment={segment}
          width={width}
          color={meshColor}
          floorTexture={corridor.floorTexture}
        />
      ))}
      
      {/* Jonction pour les corridors en L (2+ segments) */}
      {segments.length > 1 && segments.slice(0, -1).map((segment, index) => (
        <CorridorJunction
          key={`${corridor.id}_junction_${index}`}
          position={segment.end}
          width={width}
          color={meshColor}
          floorTexture={corridor.floorTexture}
        />
      ))}
    </group>
  );
}

/**
 * Render a single corridor segment (straight line)
 */
function CorridorSegmentFloor({
  segment,
  width,
}: {
  segment: GeometryCorridorSegment;
  width: number;
  color?: THREE.Color;
  floorTexture?: string;
}) {
  const { start, end } = segment;

  // Calculate segment geometry
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  
  // Skip zero-length segments
  if (length < 0.1) return null;

  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const angle = Math.atan2(dz, dx);

  // Couleur du corridor - légèrement plus claire que les rooms
  const corridorColor = useMemo(() => new THREE.Color('#3d3d4d'), []);

  return (
    <group>
      {/* Segment floor - couleur unie */}
      <mesh
        position={[midX, midY + 0.02, midZ]}
        rotation={[-Math.PI / 2, 0, angle + Math.PI / 2]}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={corridorColor}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Center line guide */}
      <mesh
        position={[midX, midY + 0.03, midZ]}
        rotation={[-Math.PI / 2, 0, angle + Math.PI / 2]}
      >
        <planeGeometry args={[0.15, length]} />
        <meshBasicMaterial color="#5555aa" transparent opacity={0.4} />
      </mesh>

      {/* Side walls for this segment */}
      <CorridorWalls
        start={start}
        end={end}
        width={width}
        angle={angle}
        length={length}
        elevationChange={0}
      />
    </group>
  );
}

/**
 * Render a junction piece where two corridor segments meet (corner of L-shape)
 */
function CorridorJunction({
  position,
  width,
  color,
}: {
  position: [number, number, number];
  width: number;
  color: THREE.Color;
  floorTexture?: string;
}) {
  // La jonction est un carré de la largeur du corridor
  return (
    <mesh
      position={[position[0], position[1] + 0.02, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width * 1.2, width * 1.2]} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * Small walls on the sides of corridors - design simplifié
 */
function CorridorWalls({ 
  start, 
  end, 
  width, 
  angle, 
  length,
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  width: number; 
  angle: number;
  length: number;
  elevationChange: number;
}) {
  const wallHeight = 1.2;
  const wallThickness = 0.12;
  
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const midY = (start[1] + end[1]) / 2;

  // Offset perpendiculaire pour les murs latéraux
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpZ = Math.sin(angle + Math.PI / 2);
  const halfWidth = width / 2;

  return (
    <group>
      {/* Left wall - simple et propre */}
      <mesh
        position={[
          midX + perpX * halfWidth,
          midY + wallHeight / 2,
          midZ + perpZ * halfWidth,
        ]}
        rotation={[0, -angle, 0]}
        castShadow
      >
        <boxGeometry args={[length, wallHeight, wallThickness]} />
        <meshStandardMaterial
          color="#454555"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[
          midX - perpX * halfWidth,
          midY + wallHeight / 2,
          midZ - perpZ * halfWidth,
        ]}
        rotation={[0, -angle, 0]}
        castShadow
      >
        <boxGeometry args={[length, wallHeight, wallThickness]} />
        <meshStandardMaterial
          color="#454555"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

/**
 * Wall mesh component - design propre et visible
 * Utilise la couleur définie dans les données du mur
 */
function WallMesh({ wall }: { wall: GeometryWall }) {
  const { start, end, height, color } = wall;

  // Calculate wall geometry
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  
  // Skip very short walls (artifacts from corridor openings)
  if (length < 0.5) return null;
  
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const angle = Math.atan2(dz, dx);

  // Couleur du mur: utilise la couleur définie ou une couleur par défaut
  const wallColor = useMemo(() => new THREE.Color(color || '#555566'), [color]);
  
  // Couleur du highlight (légèrement plus claire)
  const highlightColor = useMemo(() => {
    const base = new THREE.Color(color || '#555566');
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(hsl.l + 0.15, 1));
  }, [color]);

  return (
    <group>
      {/* Main wall - uses wall color */}
      <mesh
        position={[midX, midY + height / 2, midZ]}
        rotation={[0, -angle, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[length, height, 0.25]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>
      
      {/* Wall top edge highlight */}
      <mesh
        position={[midX, midY + height, midZ]}
        rotation={[0, -angle, 0]}
      >
        <boxGeometry args={[length, 0.1, 0.3]} />
        <meshStandardMaterial
          color={highlightColor}
          roughness={0.7}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}

/**
 * POI marker component - design simplifié et plus visible
 * Utilise un billboard text pour être toujours lisible
 */
function POIMarker({ poi }: { poi: GeometryPOI }) {
  const markerColor = useMemo(() => new THREE.Color(poi.color), [poi.color]);

  // Configuration par type de POI
  const config = useMemo(() => {
    switch (poi.type) {
      case 'spawn':
        return { icon: '▶', label: 'SPAWN', scale: 1.0, glowSize: 2.5 };
      case 'goal':
        return { icon: '★', label: 'GOAL', scale: 1.2, glowSize: 3.0 };
      case 'treasure':
        return { icon: '◆', label: 'TREASURE', scale: 0.9, glowSize: 2.0 };
      case 'checkpoint':
        return { icon: '◉', label: 'CHECKPOINT', scale: 0.8, glowSize: 1.8 };
      default:
        return { icon: '●', label: poi.label, scale: 0.8, glowSize: 1.5 };
    }
  }, [poi.type, poi.label]);

  return (
    <group position={poi.position}>
      {/* Ground glow - cercle lumineux au sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[config.glowSize * config.scale, 32]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.15} />
      </mesh>

      {/* Inner solid circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[1.0 * config.scale, 32]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.5} />
      </mesh>

      {/* Center dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <circleGeometry args={[0.3 * config.scale, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Vertical pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
        <meshStandardMaterial color={markerColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Top marker sphere */}
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.4 * config.scale, 16, 16]} />
        <meshStandardMaterial 
          color={markerColor} 
          emissive={markerColor}
          emissiveIntensity={0.3}
          metalness={0.2} 
          roughness={0.5} 
        />
      </mesh>

      {/* Billboard label - always faces camera */}
      <Billboard position={[0, 4.2, 0]}>
        <Text
          fontSize={0.6}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#000000"
          font={undefined}
        >
          {config.icon} {config.label}
        </Text>
      </Billboard>
    </group>
  );
}

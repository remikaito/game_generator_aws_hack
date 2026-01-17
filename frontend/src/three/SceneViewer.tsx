import { Suspense, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, Html, Grid } from '@react-three/drei';
import type { SceneConfig } from '../types';
import { LevelGeometry } from './LevelGeometry';
import { ModelLoader } from './ModelLoader';
import { FirstPersonControls, GameModeOverlay, FPSRaycaster } from './FirstPersonControls';
import { TransformToolbar } from '../components/TransformToolbar';
import { useTransformStore } from '../store/transformStore';

interface SceneViewerProps {
  sceneConfig: SceneConfig;
  isGameMode?: boolean;
  onExitGameMode?: () => void;
  /** Callback quand un objet est transformé (pour sync avec backend) */
  onObjectTransform?: (objectId: string, transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }) => void;
}

/**
 * Main Three.js scene viewer component
 * Supporte deux modes:
 * - Mode Editor (défaut): OrbitControls pour naviguer autour de la scène
 * - Mode Game: FirstPersonControls pour naviguer en FPS depuis le spawn
 * 
 * Nouvelles fonctionnalités:
 * - Sélection d'objets avec clic
 * - Transformation avec gizmos (translate, rotate, scale)
 * - Raccourcis clavier (G, R, S, Tab, Escape)
 */
export function SceneViewer({ 
  sceneConfig, 
  isGameMode = false, 
  onExitGameMode,
  onObjectTransform,
}: SceneViewerProps) {
  const { camera, ambient_light, directional_light, skybox_path, geometry, objects } = sceneConfig;
  
  const { 
    selectObject, 
    clearAllPendingTransforms,
    isTransforming,
    selectedObjectId,
  } = useTransformStore();
  
  // Désactiver les contrôles de caméra quand un objet est sélectionné ou en cours de transformation
  const shouldDisableCameraControls = isTransforming || selectedObjectId !== null;
  
  // Callback pour gérer la transformation d'un objet
  const handleTransformEnd = useCallback((
    objectId: string, 
    transform: { 
      position: [number, number, number]; 
      rotation: [number, number, number]; 
      scale: [number, number, number]; 
    }
  ) => {
    // Appeler le callback parent si fourni
    if (onObjectTransform) {
      onObjectTransform(objectId, transform);
    }
  }, [onObjectTransform]);


  // Calculer le centre du niveau pour positionner la grille
  const levelCenter = useMemo(() => {
    if (!geometry.rooms || geometry.rooms.length === 0) {
      return [0, 0] as [number, number];
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (const room of geometry.rooms) {
      const [x, , z] = room.position;
      const [w, , d] = room.size;
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minZ = Math.min(minZ, z - d / 2);
      maxZ = Math.max(maxZ, z + d / 2);
    }
    
    return [(minX + maxX) / 2, (minZ + maxZ) / 2] as [number, number];
  }, [geometry.rooms]);

  // Trouver la position du spawn pour le mode Game
  const spawnPosition = useMemo((): [number, number, number] => {
    // Chercher le POI de type spawn
    const spawnPOI = geometry.poi_markers?.find(poi => poi.type === 'spawn');
    if (spawnPOI) {
      return spawnPOI.position;
    }
    
    // Fallback: utiliser la première room avec tag 'entry'
    const entryRoom = geometry.rooms?.find(room => room.tags?.includes('entry'));
    if (entryRoom) {
      return entryRoom.position;
    }
    
    // Fallback: première room
    if (geometry.rooms?.length > 0) {
      return geometry.rooms[0].position;
    }
    
    // Fallback ultime: origine
    return [0, 0, 0];
  }, [geometry.poi_markers, geometry.rooms]);

  return (
    <div className="w-full h-full relative">
      {/* Transform Toolbar - visible dans les deux modes */}
      <TransformToolbar 
        onCancel={clearAllPendingTransforms}
      />
      
      <Canvas
        camera={{
          position: isGameMode ? spawnPosition : camera.default.position,
          fov: isGameMode ? 75 : camera.default.fov,
          near: 0.1,
          far: 1000,
        }}
        shadows
        onPointerMissed={() => selectObject(null)}
      >
        {/* Lighting */}
        <ambientLight color={ambient_light.color} intensity={ambient_light.intensity} />
        <directionalLight
          color={directional_light.color}
          intensity={directional_light.intensity}
          position={directional_light.position}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        {/* Skybox */}
        {skybox_path ? (
          <Suspense fallback={null}>
            <Environment files={skybox_path} background />
          </Suspense>
        ) : (
          <Sky sunPosition={[100, 20, 100]} />
        )}

        {/* Level Geometry */}
        <LevelGeometry geometry={geometry} />

        {/* 3D Models with transformation support */}
        <Suspense
          fallback={
            <Html center>
              <div className="text-white bg-black/50 px-4 py-2 rounded">
                Loading models...
              </div>
            </Html>
          }
        >
          {objects.map((obj) => (
            <ModelLoader 
              key={obj.id} 
              object={obj} 
              onTransformEnd={handleTransformEnd}
            />
          ))}
        </Suspense>

        {/* Controls - Mode Editor ou Mode Game */}
        {/* Les contrôles de caméra sont désactivés quand un objet est sélectionné pour éviter les conflits avec TransformControls */}
        {isGameMode ? (
          <>
            <FirstPersonControls
              spawnPosition={spawnPosition}
              moveSpeed={10}
              mouseSensitivity={0.002}
              eyeHeight={1.7}
              onExit={onExitGameMode}
              disabled={shouldDisableCameraControls}
            />
            {/* Raycaster pour sélectionner les objets depuis le crosshair */}
            <FPSRaycaster />
          </>
        ) : (
          <OrbitControls
            target={camera.orbit_target}
            minDistance={camera.min_distance}
            maxDistance={camera.max_distance}
            enablePan={!shouldDisableCameraControls}
            enableZoom={!shouldDisableCameraControls}
            enableRotate={!shouldDisableCameraControls}
            maxPolarAngle={Math.PI / 2.1}
          />
        )}

        {/* Infinite grid centered on level */}
        <Grid
          position={[levelCenter[0], -0.02, levelCenter[1]]}
          args={[500, 500]}
          cellSize={4}
          cellThickness={0.8}
          cellColor="#404040"
          sectionSize={20}
          sectionThickness={1.2}
          sectionColor="#606060"
          fadeDistance={400}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      </Canvas>

      {/* Game Mode Overlay (UI) */}
      {isGameMode && onExitGameMode && (
        <GameModeOverlay onExit={onExitGameMode} />
      )}
    </div>
  );
}

import { useRef, useState, useEffect, useCallback, Suspense, Component, ReactNode } from 'react';
import { useGLTF, TransformControls, Html } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneObject } from '../types';
import { useTransformStore } from '../store/transformStore';

interface ModelLoaderProps {
  object: SceneObject;
  /** Callback quand la transformation est terminée */
  onTransformEnd?: (objectId: string, transform: { 
    position: [number, number, number]; 
    rotation: [number, number, number]; 
    scale: [number, number, number]; 
  }) => void;
}

/**
 * Simple ErrorBoundary pour capturer les erreurs de chargement de modèles
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Loads and displays a GLB 3D model with transformation controls
 * Utilise ErrorBoundary pour gérer les erreurs de chargement
 */
export function ModelLoader({ object, onTransformEnd }: ModelLoaderProps) {
  // Skip if no model path
  if (!object.model_path) {
    return <PlaceholderCube object={object} onTransformEnd={onTransformEnd} />;
  }

  return (
    <ModelErrorBoundary
      fallback={<PlaceholderCube object={object} onTransformEnd={onTransformEnd} />}
      onError={(error) => {
        console.error(`Failed to load model: ${object.model_path}`, error);
      }}
    >
      <Suspense fallback={<PlaceholderCube object={object} onTransformEnd={onTransformEnd} />}>
        <ModelMesh object={object} onTransformEnd={onTransformEnd} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/**
 * Actual model mesh component with transformation support
 * 
 * Features:
 * - Calcule la bounding box du modèle pour le positionner sur le sol
 * - Sélectionnable avec clic
 * - TransformControls quand sélectionné
 */
function ModelMesh({ 
  object, 
  onTransformEnd,
}: { 
  object: SceneObject; 
  onTransformEnd?: ModelLoaderProps['onTransformEnd'];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<THREE.Group>(null);
  const [yOffset, setYOffset] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Store de transformation
  const { 
    selectedObjectId, 
    selectObject, 
    transformMode,
    getObjectTransform,
    updateObjectTransform,
    setTransforming,
  } = useTransformStore();
  
  const isSelected = selectedObjectId === object.id;
  const pendingTransform = getObjectTransform(object.id);

  // Load GLTF model - les erreurs sont capturées par ErrorBoundary
  const { scene } = useGLTF(object.model_path!);

  useEffect(() => {
    if (scene && groupRef.current) {
      // Clone the scene to avoid sharing issues
      const clonedScene = scene.clone();

      // Enable shadows on all meshes
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Calculer la bounding box pour positionner le modèle correctement sur le sol
      const boundingBox = new THREE.Box3().setFromObject(clonedScene);
      const modelMinY = boundingBox.min.y;
      
      // Ajuster le Y offset pour que la base soit au niveau du sol
      if (modelMinY < 0) {
        setYOffset(-modelMinY);
      } else if (modelMinY > 0.1) {
        setYOffset(-modelMinY);
      }

      // Clear previous children and add new scene
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }
      groupRef.current.add(clonedScene);
    }
  }, [scene]);

  // Position et transformations (pending ou originales)
  const currentPosition: [number, number, number] = pendingTransform?.position || [
    object.position[0],
    object.position[1] + yOffset,
    object.position[2],
  ];
  
  const currentRotation: [number, number, number] = pendingTransform?.rotation || object.rotation;
  const currentScale: [number, number, number] = pendingTransform?.scale || object.scale;

  // Gestion du clic pour sélectionner
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectObject(object.id);
  }, [object.id, selectObject]);

  // Gestion de la fin de transformation
  const handleTransformEnd = useCallback(() => {
    if (transformRef.current && onTransformEnd) {
      const pos = transformRef.current.position;
      const rot = transformRef.current.rotation;
      const scl = transformRef.current.scale;
      
      onTransformEnd(object.id, {
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [scl.x, scl.y, scl.z],
      });
    }
    setTransforming(false);
  }, [object.id, onTransformEnd, setTransforming]);

  // Mise à jour pendant la transformation
  const handleTransformChange = useCallback(() => {
    if (transformRef.current) {
      const pos = transformRef.current.position;
      const rot = transformRef.current.rotation;
      const scl = transformRef.current.scale;
      
      updateObjectTransform(object.id, {
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [scl.x, scl.y, scl.z],
      });
    }
  }, [object.id, updateObjectTransform]);

  return (
    <>
      {/* Groupe principal avec le modèle */}
      <group
        ref={transformRef}
        position={currentPosition}
        rotation={currentRotation}
        scale={currentScale}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        userData={{ objectId: object.id }}
      >
        {/* Le modèle 3D */}
        <group ref={groupRef} />
        
        {/* Outline de sélection/hover */}
        {(isSelected || hovered) && (
          <mesh>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshBasicMaterial 
              color={isSelected ? '#00ff00' : '#ffff00'} 
              wireframe 
              transparent 
              opacity={0.5} 
            />
          </mesh>
        )}
        
        {/* Label avec le nom */}
        {(isSelected || hovered) && (
          <Html
            position={[0, 2, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {object.name}
              {isSelected && (
                <span className="ml-2 text-green-400">
                  [{transformMode === 'translate' ? 'G' : transformMode === 'rotate' ? 'R' : 'S'}]
                </span>
              )}
            </div>
          </Html>
        )}
      </group>

      {/* TransformControls quand sélectionné */}
      {isSelected && transformRef.current && (
        <TransformControls
          object={transformRef.current}
          mode={transformMode}
          onMouseDown={() => setTransforming(true)}
          onMouseUp={handleTransformEnd}
          onChange={handleTransformChange}
          size={0.8}
        />
      )}
    </>
  );
}

/**
 * Placeholder cube for failed/missing models (with transformation support)
 */
function PlaceholderCube({ 
  object,
  onTransformEnd,
}: { 
  object: SceneObject;
  onTransformEnd?: ModelLoaderProps['onTransformEnd'];
}) {
  const transformRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const { 
    selectedObjectId, 
    selectObject, 
    transformMode,
    getObjectTransform,
    updateObjectTransform,
    setTransforming,
  } = useTransformStore();
  
  const isSelected = selectedObjectId === object.id;
  const pendingTransform = getObjectTransform(object.id);

  // Determine color based on reference_id
  const color = object.reference_id.startsWith('char')
    ? '#6366f1' // Purple for characters
    : '#f59e0b'; // Yellow for props

  // Position et transformations
  const currentPosition: [number, number, number] = pendingTransform?.position || object.position;
  const currentRotation: [number, number, number] = pendingTransform?.rotation || object.rotation;
  const currentScale: [number, number, number] = pendingTransform?.scale || object.scale;

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectObject(object.id);
  }, [object.id, selectObject]);

  const handleTransformEnd = useCallback(() => {
    if (transformRef.current && onTransformEnd) {
      const pos = transformRef.current.position;
      const rot = transformRef.current.rotation;
      const scl = transformRef.current.scale;
      
      onTransformEnd(object.id, {
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [scl.x, scl.y, scl.z],
      });
    }
    setTransforming(false);
  }, [object.id, onTransformEnd, setTransforming]);

  const handleTransformChange = useCallback(() => {
    if (transformRef.current) {
      const pos = transformRef.current.position;
      const rot = transformRef.current.rotation;
      const scl = transformRef.current.scale;
      
      updateObjectTransform(object.id, {
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [scl.x, scl.y, scl.z],
      });
    }
  }, [object.id, updateObjectTransform]);

  return (
    <>
      <group 
        ref={transformRef}
        position={currentPosition} 
        rotation={currentRotation}
        scale={currentScale}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        userData={{ objectId: object.id }}
      >
        {/* Cube placeholder */}
        <mesh castShadow>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial
            color={isSelected ? '#00ff00' : hovered ? '#ffff00' : color}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Solid inner cube */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 1.8, 0.8]} />
          <meshStandardMaterial color={color} transparent opacity={0.3} />
        </mesh>

        {/* Label */}
        {(isSelected || hovered) && (
          <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {object.name} (loading...)
            </div>
          </Html>
        )}
      </group>

      {/* TransformControls */}
      {isSelected && transformRef.current && (
        <TransformControls
          object={transformRef.current}
          mode={transformMode}
          onMouseDown={() => setTransforming(true)}
          onMouseUp={handleTransformEnd}
          onChange={handleTransformChange}
          size={0.8}
        />
      )}
    </>
  );
}

// Preload cleanup
useGLTF.preload;

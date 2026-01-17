import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTransformStore } from '../store/transformStore';

interface FirstPersonControlsProps {
  /** Position de spawn (où le joueur commence) */
  spawnPosition: [number, number, number];
  /** Vitesse de déplacement */
  moveSpeed?: number;
  /** Sensibilité de la souris */
  mouseSensitivity?: number;
  /** Hauteur des yeux du joueur */
  eyeHeight?: number;
  /** Callback quand on quitte le mode (Escape) */
  onExit?: () => void;
  /** Désactive les contrôles (pour permettre la transformation d'objets) */
  disabled?: boolean;
}

/**
 * Contrôles première personne (FPS)
 * - WASD / ZQSD pour se déplacer
 * - Souris pour regarder autour
 * - Escape pour quitter le mode
 * - Peut être désactivé pour permettre la transformation d'objets
 */
export function FirstPersonControls({
  spawnPosition,
  moveSpeed = 8,
  mouseSensitivity = 0.002,
  eyeHeight = 1.7,
  onExit,
  disabled = false,
}: FirstPersonControlsProps) {
  const { camera, gl } = useThree();
  
  // État des touches pressées
  const keysPressed = useRef<Set<string>>(new Set());
  
  // Direction du regard (angles)
  const rotation = useRef({ yaw: 0, pitch: 0 });
  
  // Position actuelle
  const position = useRef(new THREE.Vector3(
    spawnPosition[0],
    spawnPosition[1] + eyeHeight,
    spawnPosition[2]
  ));
  
  // Pointer lock state
  const isLocked = useRef(false);

  // Initialiser la position de la caméra au spawn
  useEffect(() => {
    position.current.set(
      spawnPosition[0],
      spawnPosition[1] + eyeHeight,
      spawnPosition[2]
    );
    camera.position.copy(position.current);
    
    // Reset rotation
    rotation.current = { yaw: 0, pitch: 0 };
    camera.rotation.set(0, 0, 0);
  }, [spawnPosition, eyeHeight, camera]);

  // Gestion du Pointer Lock
  const requestPointerLock = useCallback(() => {
    gl.domElement.requestPointerLock();
  }, [gl]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      isLocked.current = document.pointerLockElement === gl.domElement;
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    // Request pointer lock on mount
    requestPointerLock();

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      // Release pointer lock on unmount
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    };
  }, [gl, requestPointerLock]);

  // Gestion des touches clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape pour quitter le mode
      if (e.code === 'Escape') {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        onExit?.();
        return;
      }
      
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onExit]);

  // Gestion de la souris
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Ne pas traiter les mouvements si désactivé ou pas locked
      if (disabled || !isLocked.current) return;

      // Rotation horizontale (yaw)
      rotation.current.yaw -= e.movementX * mouseSensitivity;
      
      // Rotation verticale (pitch) avec limites
      rotation.current.pitch -= e.movementY * mouseSensitivity;
      rotation.current.pitch = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, rotation.current.pitch)
      );
    };

    // Click pour re-lock si on a perdu le focus (seulement si pas désactivé)
    const handleClick = () => {
      if (!disabled && !isLocked.current) {
        requestPointerLock();
      }
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleClick);

    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [gl, mouseSensitivity, requestPointerLock, disabled]);
  
  // Libérer le pointer lock quand on passe en mode transformation
  useEffect(() => {
    if (disabled && document.pointerLockElement === gl.domElement) {
      document.exitPointerLock();
    }
  }, [disabled, gl.domElement]);

  // Boucle de mise à jour (chaque frame)
  useFrame((_, delta) => {
    // Ne pas traiter si désactivé (mode transformation d'objet)
    if (disabled) return;
    
    const keys = keysPressed.current;
    
    // Calculer la direction de mouvement
    const moveDirection = new THREE.Vector3();

    // WASD / ZQSD support
    if (keys.has('KeyW') || keys.has('ArrowUp')) {
      moveDirection.z -= 1;
    }
    if (keys.has('KeyS') || keys.has('ArrowDown')) {
      moveDirection.z += 1;
    }
    if (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft')) {
      moveDirection.x -= 1;
    }
    if (keys.has('KeyD') || keys.has('ArrowRight')) {
      moveDirection.x += 1;
    }

    // Normaliser pour éviter le mouvement plus rapide en diagonale
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }

    // Appliquer la rotation yaw au mouvement (pas le pitch)
    const yawQuat = new THREE.Quaternion();
    yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);
    moveDirection.applyQuaternion(yawQuat);

    // Mettre à jour la position
    position.current.x += moveDirection.x * moveSpeed * delta;
    position.current.z += moveDirection.z * moveSpeed * delta;
    
    // Garder la hauteur constante (pas de gravité pour l'instant)
    position.current.y = spawnPosition[1] + eyeHeight;

    // Appliquer la position à la caméra
    camera.position.copy(position.current);

    // Appliquer la rotation à la caméra
    camera.rotation.order = 'YXZ';
    camera.rotation.y = rotation.current.yaw;
    camera.rotation.x = rotation.current.pitch;
  });

  return null;
}

/**
 * Raycaster pour sélectionner les objets depuis le crosshair en mode FPS
 * Détecte les objets au centre de l'écran quand le joueur clique
 */
export function FPSRaycaster() {
  const { camera, scene, gl } = useThree();
  const { selectObject, selectedObjectId } = useTransformStore();
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Seulement bouton gauche
      if (e.button !== 0) return;
      // Ne raycast que si on a le pointer lock
      if (document.pointerLockElement !== gl.domElement) return;

      // Raycast depuis le centre de l'écran (0, 0 = crosshair)
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      // Chercher le premier objet avec un objectId dans sa hiérarchie
      for (const hit of intersects) {
        let current: THREE.Object3D | null = hit.object;
        let depth = 0;
        while (current && depth < 30) {
          if (current.userData?.objectId) {
            selectObject(current.userData.objectId);
            return;
          }
          current = current.parent;
          depth++;
        }
      }
      // Rien touché -> désélectionner
      if (selectedObjectId) selectObject(null);
    };

    // mousedown est plus fiable que click avec pointer lock
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    return () => gl.domElement.removeEventListener('mousedown', handleMouseDown);
  }, [camera, scene, gl, selectObject, selectedObjectId]);

  return null;
}

/**
 * Overlay UI pour le mode Game
 * Affiche les instructions et le crosshair
 */
export function GameModeOverlay({ onExit }: { onExit: () => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="absolute w-4 h-0.5 bg-white/70" />
          <div className="absolute w-0.5 h-4 bg-white/70" />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
          <div className="flex items-center gap-4">
            <span className="opacity-70">Move:</span>
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded">WASD</span>
            <span className="opacity-70">Look:</span>
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded">Mouse</span>
            <span className="opacity-70">Exit:</span>
            <button 
              onClick={onExit}
              className="font-mono bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-0.5 rounded pointer-events-auto transition-colors"
            >
              ESC
            </button>
          </div>
        </div>
      </div>

      {/* Game Mode indicator */}
      <div className="absolute top-4 left-4">
        <div className="bg-game-accent/20 backdrop-blur-sm border border-game-accent/50 rounded-lg px-3 py-1.5 text-game-accent text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 bg-game-accent rounded-full animate-pulse" />
          GAME MODE
        </div>
      </div>
    </div>
  );
}

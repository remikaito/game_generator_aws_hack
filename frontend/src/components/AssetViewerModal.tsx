import { Suspense, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { GeneratedAsset } from '../types';

interface AssetViewerModalProps {
  asset: GeneratedAsset;
  onClose: () => void;
}

/**
 * Modal component for viewing a single asset in detail
 * Features: 3D preview with orbit controls, export functionality
 */
export function AssetViewerModal({ asset, onClose }: AssetViewerModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'glb' | 'gltf'>('glb');
  const sceneRef = useRef<THREE.Group>(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Export the model
  const handleExport = useCallback(async () => {
    if (!sceneRef.current) return;

    setIsExporting(true);

    try {
      const exporter = new GLTFExporter();
      const options = {
        binary: exportFormat === 'glb',
        onlyVisible: true,
      };

      exporter.parse(
        sceneRef.current,
        (result) => {
          let blob: Blob;
          let filename: string;

          if (result instanceof ArrayBuffer) {
            // GLB binary format
            blob = new Blob([result], { type: 'application/octet-stream' });
            filename = `${asset.name.replace(/\s+/g, '_')}.glb`;
          } else {
            // GLTF JSON format
            const jsonString = JSON.stringify(result, null, 2);
            blob = new Blob([jsonString], { type: 'application/json' });
            filename = `${asset.name.replace(/\s+/g, '_')}.gltf`;
          }

          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setIsExporting(false);
        },
        (error) => {
          console.error('Export failed:', error);
          setIsExporting(false);
        },
        options,
      );
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
    }
  }, [asset.name, exportFormat]);

  // Icon based on asset type
  const icon = asset.type === 'character' ? '🎭' : '🏺';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[90vw] max-w-4xl h-[80vh] bg-game-dark rounded-xl border border-white/20 overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h2 className="text-lg font-semibold">{asset.name}</h2>
              <p className="text-sm text-gray-400">
                {asset.type === 'character' ? 'Character' : 'Prop'} • 3D Preview
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [3, 2, 3], fov: 50 }}
            shadows
          >
            <Suspense fallback={<LoadingIndicator />}>
              <AssetModel 
                modelPath={asset.path} 
                sceneRef={sceneRef} 
              />
            </Suspense>

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={1}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />

            {/* Environment */}
            <Environment preset="studio" background={false} />

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <circleGeometry args={[3, 64]} />
              <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
            </mesh>

            {/* Grid */}
            <gridHelper args={[6, 12, '#333', '#222']} position={[0, 0, 0]} />

            {/* Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={10}
              target={[0, 0.5, 0]}
            />
          </Canvas>

          {/* Controls hint */}
          <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg px-3 py-2 text-xs text-gray-400">
            <span className="mr-3">🖱️ Drag to rotate</span>
            <span className="mr-3">📜 Scroll to zoom</span>
            <span>⇧+Drag to pan</span>
          </div>
        </div>

        {/* Footer with export options */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          {/* Asset info */}
          <div className="text-sm text-gray-400">
            <p className="truncate max-w-md" title={asset.prompt}>
              <span className="text-gray-500">Prompt:</span> {asset.prompt}
            </p>
          </div>

          {/* Export controls */}
          <div className="flex items-center gap-3">
            {/* Format selector */}
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setExportFormat('glb')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  exportFormat === 'glb' 
                    ? 'bg-game-accent text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                GLB
              </button>
              <button
                onClick={() => setExportFormat('gltf')}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  exportFormat === 'gltf' 
                    ? 'bg-game-accent text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                GLTF
              </button>
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-game-accent hover:bg-game-accent-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3D model component that loads and displays the asset
 */
function AssetModel({ 
  modelPath, 
  sceneRef 
}: { 
  modelPath: string; 
  sceneRef: React.RefObject<THREE.Group>; 
}) {
  const { scene } = useGLTF(modelPath);
  const { camera } = useThree();

  useEffect(() => {
    if (scene) {
      // Clone the scene
      const clonedScene = scene.clone();

      // Calculate bounding box to center and scale
      const box = new THREE.Box3().setFromObject(clonedScene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Scale to fit in view (max dimension = 2 units)
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      clonedScene.scale.setScalar(scale);

      // Recalculate center after scaling
      box.setFromObject(clonedScene);
      box.getCenter(center);

      // Center the model
      clonedScene.position.sub(center);
      clonedScene.position.y += size.y * scale / 2;

      // Enable shadows
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Add to ref group
      if (sceneRef.current) {
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
        sceneRef.current.add(clonedScene);
      }
    }
  }, [scene, sceneRef, camera]);

  return (
    <Center>
      <group ref={sceneRef} />
    </Center>
  );
}

/**
 * Loading indicator shown while model is loading
 */
function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 text-white">
        <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading model...</span>
      </div>
    </Html>
  );
}

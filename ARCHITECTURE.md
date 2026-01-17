# Architecture Documentation

> Complete technical documentation for the Game Prototype Generator

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Agent Architecture](#agent-architecture)
3. [Data Flow](#data-flow)
4. [TypeScript Interfaces](#typescript-interfaces)
5. [API Integrations](#api-integrations)
6. [WebSocket Protocol](#websocket-protocol)
7. [Frontend Architecture](#frontend-architecture)
8. [Error Handling](#error-handling)
9. [Performance Considerations](#performance-considerations)

---

## System Overview

The Game Prototype Generator is a full-stack application that transforms natural language prompts into interactive 3D game level prototypes. It uses a **multi-agent AI architecture** where specialized agents handle different aspects of the generation pipeline.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │PromptInput  │  │SceneViewer  │  │  EditChat   │  │ Dashboard   │    │
│  │             │  │ (Three.js)  │  │             │  │             │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘    │
│         │                │                │                             │
│         └────────────────┴────────────────┘                             │
│                          │                                              │
│                    WebSocket (Socket.io)                                │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────────────┐
│                           BACKEND (NestJS)                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SESSION GATEWAY (WebSocket)                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│         │                                                               │
│  ┌──────┴──────────────────────────────────────────────────────────┐    │
│  │                      ORCHESTRATOR AGENT                          │    │
│  │   Coordinates pipeline: Context → Layout → Assets → Assembly    │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│         │                                                               │
│  ┌──────┴──────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Context   │  │   Layout    │  │    Asset    │  │ Environment │    │
│  │    Agent    │  │    Agent    │  │    Agent    │  │    Agent    │    │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └──────┬──────┘    │
│                                           │                │            │
│                                    ┌──────┴────────────────┴──────┐    │
│                                    │      EXTERNAL APIs           │    │
│                                    │  TRIPO 3D  │  Blockade Labs  │    │
│                                    └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Architecture

### Overview

The system uses 7 specialized AI agents, each with a specific responsibility:

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Orchestrator** | Coordinates pipeline | User prompt | Complete session |
| **Context** | Extracts game context | User prompt | GameContext |
| **Level Layout** | Generates spatial layout | GameContext | LevelLayout |
| **Asset** | Generates 3D models | GameContext | GeneratedAsset[] |
| **Environment** | Generates skybox | GameContext | GeneratedSkybox |
| **Assembly** | Composes final scene | All data | SceneConfig |
| **Edit** | Processes edit commands | Instruction + State | EditResult |

### Agent Details

#### 1. Orchestrator Agent

**Location:** `backend/src/agents/orchestrator/orchestrator.service.ts`

**Responsibility:** Coordinates the entire generation pipeline, managing agent execution order and handling errors.

```typescript
async executePipeline(prompt: string, callbacks: PipelineCallbacks): Promise<PipelineResult> {
  // Step 1: Context extraction
  const gameContext = await this.contextService.extractContext(prompt);
  
  // Step 2: Layout generation
  const levelLayout = await this.levelLayoutService.generateLayout(gameContext);
  
  // Step 3: Parallel asset + skybox generation
  const [assets, skybox] = await Promise.all([
    this.assetService.generateAssets(gameContext, progressCallback),
    this.environmentService.generateSkybox(gameContext, progressCallback),
  ]);
  
  // Step 4: Scene assembly
  const sceneConfig = this.assemblyService.assemble(gameContext, levelLayout, assets, skybox);
  
  return { success: true, gameContext, levelLayout, assets, skybox, sceneConfig };
}
```

#### 2. Context Agent

**Location:** `backend/src/agents/context/context.service.ts`

**Responsibility:** Analyzes the user prompt and extracts structured game context.

**System Prompt (excerpt):**
```
You are a Game Context and Level Intent Extractor. Analyze the user's game idea 
and extract structured information including:
- game_title, genre, mood, style
- characters with roles and TRIPO prompts
- environment with skybox prompt
- level type, scale, and layout style
```

#### 3. Level Layout Agent

**Location:** `backend/src/agents/level-layout/level-layout.service.ts`

**Responsibility:** Generates the spatial architecture using a grid-based coordinate system.

**Key Concepts:**
- Grid cell size: 2 meters
- Rooms defined by gridX, gridY, width, height (all integers)
- Corridors connect room edges
- POIs (Points of Interest): spawn, goal, treasure, checkpoint

#### 4. Asset Agent

**Location:** `backend/src/agents/asset/asset.service.ts`

**Responsibility:** Generates 3D models via the TRIPO 3D API.

**Flow:**
1. Extract characters and props from GameContext
2. For each asset (in parallel):
   - Create TRIPO task with optimized prompt
   - Poll for completion (~30-60s)
   - Download GLB file
3. Return array of GeneratedAsset

#### 5. Environment Agent

**Location:** `backend/src/agents/environment/environment.service.ts`

**Responsibility:** Generates 360° skybox via Blockade Labs.

**Style Selection:**
- Fantasy → FANTASY_LANDSCAPE (57)
- Sci-Fi → SCI_FI (59)
- Anime → ANIME (43)
- Realistic → PHOTOREAL (67)

#### 6. Assembly Agent

**Location:** `backend/src/agents/assembly/assembly.service.ts`

**Responsibility:** Composes the final scene configuration.

**Positioning Logic:**
- Protagonist → spawn POI (scale 1.0)
- Antagonist → goal POI (scale 1.5-2.0)
- NPCs → secondary rooms
- Props → according to room tags

#### 7. Edit Agent

**Location:** `backend/src/agents/edit/edit.service.ts`

**Responsibility:** Interprets natural language edit commands and generates scene modifications.

**Supported Actions:**
- `add`: Add rooms, corridors, objects, POIs
- `remove`: Remove elements from scene
- `modify`: Change position, scale, rotation, materials
- `regenerate`: Regenerate assets with new prompts

---

## Data Flow

### Generation Pipeline

```
User Prompt
    │
    ▼
┌─────────────────┐
│ Context Agent   │ ───► GameContext
└────────┬────────┘      {
         │                 game_title,
         ▼                 genre,
┌─────────────────┐        characters[],
│ Layout Agent    │ ───► } environment
└────────┬────────┘      
         │               LevelLayout
         │               {
         ├───────────┐     rooms[],
         │           │     corridors[],
         ▼           ▼     pois[]
┌──────────────┐ ┌──────────────┐   }
│ Asset Agent  │ │ Environment  │
│   (TRIPO)    │ │   (Blockade) │
└──────┬───────┘ └──────┬───────┘
       │                │
       │    ┌───────────┘
       ▼    ▼
┌─────────────────┐
│ Assembly Agent  │ ───► SceneConfig
└────────┬────────┘      {
         │                 skybox_path,
         ▼                 lighting,
    3D Scene               geometry,
                           objects[]
                         }
```

### Edit Flow

```
User Edit Instruction
        │
        ▼
┌─────────────────┐
│   Edit Agent    │ ───► EditResult
│   (Claude AI)   │      {
└────────┬────────┘        action,
         │                 target_type,
         ├──────────────►  changes,
         │   Simple        requires_api_call
         │   Change        }
         │      │
         │      ▼
         │  Apply to SceneConfig
         │      │
         │      ▼
         │  Emit 'scene_updated'
         │
         └──────────────►
             Requires API
                 │
                 ▼
         Asset/Environment Agent
                 │
                 ▼
         Apply to SceneConfig
                 │
                 ▼
         Emit 'scene_updated'
```

---

## TypeScript Interfaces

### GameContext

```typescript
interface GameContext {
  game_title: string;
  genre: string;              // RPG, platformer, shooter, etc.
  mood: string;               // dark, cheerful, epic, etc.
  style: string;              // medieval, sci-fi, cartoon, etc.
  
  level: {
    type: string;             // dungeon, arena, castle, etc.
    scale: string;            // small, medium, large
    layout_style: string;     // linear, hub-and-spoke, branching
    constraints: string[];
  };
  
  characters: Character[];
  environment: Environment;
  props?: Prop[];
}

interface Character {
  id: string;                 // e.g., "char_001"
  name: string;
  role: 'protagonist' | 'antagonist' | 'npc';
  description: string;
  tripo_prompt: string;       // Optimized for TRIPO 3D
}

interface Environment {
  name: string;
  description: string;
  skybox_prompt: string;      // For Blockade Labs
  lighting: string;
  time_of_day: string;
}
```

### LevelLayout (Grid-Based)

```typescript
interface LevelLayout {
  level: GridLevelData;
}

interface GridLevelData {
  name: string;
  type: string;
  theme: string;
  
  rooms: GridRoom[];
  corridors: GridCorridor[];
  pois: GridPOI[];
  
  flow: {
    critical_path: string[];  // Ordered room IDs
    loops: number;
    dead_ends: number;
  };
}

interface GridRoom {
  id: string;                 // e.g., "room_001"
  name: string;
  gridX: number;              // Grid position (integer)
  gridY: number;              // Grid position (integer)
  width: number;              // Width in cells
  height: number;             // Depth in cells
  tags: string[];             // ["entry"], ["goal"], ["mid"]
  material?: {
    floorColor?: string;      // Hex color
    wallColor?: string;
    floorTexture?: string;    // stone, wood, lava, etc.
    wallTexture?: string;
  };
}

interface GridCorridor {
  id: string;
  fromRoom: string;
  toRoom: string;
  startX: number;             // Start grid position
  startY: number;
  endX: number;               // End grid position
  endY: number;
  widthCells: number;
}

interface GridPOI {
  id: string;
  type: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
  roomId: string;
  offsetX?: number;
  offsetY?: number;
}

// Grid constants
const GRID_CELL_SIZE = 2;     // 2 meters per cell
```

### SceneConfig

```typescript
interface SceneConfig {
  skybox_path: string;
  
  ambient_light: {
    color: string;
    intensity: number;
  };
  
  directional_light: {
    color: string;
    intensity: number;
    position: [number, number, number];
  };
  
  geometry: {
    rooms: GeometryRoom[];
    corridors: GeometryCorridor[];
    walls: GeometryWall[];
    poi_markers: GeometryPOI[];
  };
  
  objects: SceneObject[];
  
  camera: {
    default: {
      position: [number, number, number];
      look_at: [number, number, number];
      fov: number;
    };
    orbit_target: [number, number, number];
    min_distance: number;
    max_distance: number;
  };
}

interface SceneObject {
  id: string;                 // e.g., "obj_char_001"
  reference_id: string;       // Original asset ID
  name: string;
  model_path: string;         // "/assets/char_001.glb"
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  poi_id?: string;
}
```

### EditResult

```typescript
interface EditResult {
  id: string;
  action: 'add' | 'remove' | 'modify' | 'regenerate';
  target_type: 'room' | 'corridor' | 'asset' | 'prop' | 'poi' | 'skybox' | 'lighting' | 'material';
  
  changes: {
    new_rooms?: GridRoom[];
    new_corridors?: GridCorridor[];
    new_objects?: SceneObject[];
    removed_room_ids?: string[];
    removed_object_ids?: string[];
    modified_objects?: Partial<SceneObject>[];
    modified_rooms?: Partial<GridRoom>[];
    skybox_prompt?: string;
    ambient_light_changes?: Partial<AmbientLight>;
    directional_light_changes?: Partial<DirectionalLight>;
  };
  
  requires_api_call: boolean;
  api_params?: {
    type: 'tripo' | 'blockade';
    prompt: string;
    target_id: string;
  };
  
  explanation: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

---

## API Integrations

### Claude API (Anthropic)

**Service:** `backend/src/shared/claude/claude.service.ts`

**Model:** `claude-sonnet-4-20250514`

**Features:**
- JSON repair for malformed LLM responses
- Context-aware conversations
- Streaming support (future)

```typescript
// Example usage
const response = await claudeService.chatJSON<GameContext>(
  SYSTEM_PROMPT,
  userMessage
);
```

### TRIPO 3D API

**Service:** `backend/src/tools/tripo/tripo.service.ts`

**Base URL:** `https://api.tripo3d.ai/v2/openapi`

**Endpoints:**
```
POST /task
  Body: { "type": "text_to_model", "prompt": "..." }
  Response: { "data": { "task_id": "..." } }

GET /task/{task_id}
  Response: { "data": { "status": "success", "output": { "model": "url" } } }
```

**Configuration:**
- Poll interval: 3 seconds
- Max poll time: 5 minutes
- Output format: GLB

### Blockade Labs Skybox AI

**Service:** `backend/src/tools/skybox/skybox.service.ts`

**Base URL:** `https://backend.blockadelabs.com/api/v1`

**Endpoints:**
```
POST /skybox
  Body: { "prompt": "...", "skybox_style_id": 57 }
  Response: { "id": 12345 }

GET /imagine/requests/{id}
  Response: { "status": "complete", "file_url": "..." }
```

**Style IDs (Model 3):**
| ID | Style |
|----|-------|
| 67 | Photoreal |
| 43 | Anime |
| 57 | Fantasy Landscape |
| 58 | Digital Painting |
| 59 | Sci-Fi |
| 60 | Dreamlike |
| 61 | Low Poly |

---

## WebSocket Protocol

### Connection

```typescript
// Frontend connection
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
});
```

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `session_created` | `{ session_id: string }` | New session initialized |
| `progress` | `{ step: string, status: string }` | Pipeline step update |
| `log` | `string` | Generation log message |
| `complete` | `SessionState` | Generation finished |
| `scene_updated` | `SceneConfig` | Scene modified |
| `chat_message` | `ChatMessage` | Assistant response |
| `edit_started` | `{ instruction, edit_id }` | Edit processing started |
| `edit_preview` | `EditResult` | Edit analysis complete |
| `edit_applied` | `{ edit_id, scene_config }` | Edit fully applied |
| `error` | `{ message: string }` | Error occurred |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `generate` | `{ prompt: string }` | Start generation |
| `edit` | `{ instruction: string }` | Send edit command |
| `init_chat` | `{ session_id: string }` | Initialize chat |

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Header (session info, controls)
├── MainContent
│   ├── PromptInput (initial state)
│   ├── ProgressIndicator (generating state)
│   └── SceneViewer (ready state)
│       ├── Canvas (Three.js)
│       │   ├── LevelGeometry
│       │   ├── ModelLoader (per object)
│       │   ├── OrbitControls / FirstPersonControls
│       │   └── Environment (skybox)
│       └── AssetPanel
├── EditChat (side panel)
│   ├── ChatMessageList
│   ├── EditPreview
│   └── ChatInput
└── Dashboard (bottom panel)
```

### State Management (Zustand)

```typescript
// appStore.ts - Application state
interface AppState {
  session: SessionState | null;
  isGenerating: boolean;
  sceneConfig: SceneConfig | null;
  logs: string[];
  isGameMode: boolean;
}

// chatStore.ts - Chat state
interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isProcessing: boolean;
  currentEdit: EditResult | null;
}

// levelsStore.ts - Saved levels
interface LevelsState {
  savedLevels: SavedLevel[];
  saveLevel: (session: SessionState) => Promise<void>;
  loadLevel: (id: string) => Promise<SessionState | null>;
}
```

### Three.js Integration

**Library:** @react-three/fiber + @react-three/drei

```tsx
// SceneViewer.tsx
<Canvas camera={{ fov: 60, position: [0, 30, 50] }}>
  <ambientLight intensity={sceneConfig.ambient_light.intensity} />
  <directionalLight position={sceneConfig.directional_light.position} />
  
  <Environment files={sceneConfig.skybox_path} background />
  
  <LevelGeometry level={sceneConfig.geometry} />
  
  {sceneConfig.objects.map(obj => (
    <ModelLoader key={obj.id} {...obj} />
  ))}
  
  {isGameMode ? (
    <FirstPersonControls />
  ) : (
    <OrbitControls target={sceneConfig.camera.orbit_target} />
  )}
</Canvas>
```

---

## Error Handling

### Agent Error Strategy

| Agent | Error | Recovery |
|-------|-------|----------|
| Context | Parse failure | Return minimal context |
| Layout | Invalid geometry | Use default layout |
| Asset | TRIPO timeout | Use placeholder cube |
| Environment | Skybox failure | Use gradient fallback |
| Assembly | Missing data | Skip invalid objects |
| Edit | Invalid instruction | Return explanation |

### API Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 429 | Rate limited | Retry with backoff |
| 500 | Server error | Retry or fallback |

---

## Performance Considerations

### Generation Optimization

1. **Parallel Execution**: Asset and Environment agents run concurrently
2. **Polling Intervals**: Optimized to reduce API calls (3s for TRIPO, 2s for Blockade)
3. **Asset Caching**: Generated models cached in `assets/` directory

### Frontend Optimization

1. **GLB Loading**: Models loaded asynchronously with Suspense
2. **Geometry Batching**: Rooms rendered as instanced meshes
3. **Lazy Components**: Edit chat loaded on demand
4. **State Splitting**: Separate stores prevent unnecessary re-renders

### Recommended Timeouts

| Operation | Timeout |
|-----------|---------|
| Claude API | 30s |
| TRIPO task | 5 min |
| Blockade skybox | 1 min |
| WebSocket heartbeat | 25s |

---

## Development Guidelines

### Adding a New Agent

1. Create service in `backend/src/agents/[name]/[name].service.ts`
2. Define system prompt for Claude
3. Add to `agents.module.ts`
4. Integrate in `orchestrator.service.ts`

### Adding a New Edit Command

1. Update `edit.service.ts` system prompt
2. Add change type to `EditResult.changes`
3. Implement in `applyEdit()` method
4. Update frontend to handle new change type

### Environment Setup

```bash
# Required environment variables
ANTHROPIC_API_KEY=sk-ant-xxx
TRIPO_API_KEY=xxx
BLOCKADE_API_KEY=xxx
PORT=3001
ASSETS_PATH=../assets
```

---

## Appendix: Timeline

| Phase | Duration |
|-------|----------|
| Context extraction | ~2s |
| Layout generation | ~1s |
| TRIPO model (per asset) | ~30-60s |
| Blockade skybox | ~20-30s |
| Scene assembly | ~1s |
| **Total (2 assets + skybox)** | **~45-75s** |

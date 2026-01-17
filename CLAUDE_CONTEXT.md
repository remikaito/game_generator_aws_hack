# Full Context - Game Prototype Generator

## 🎯 Project Objective

Create a web application that transforms a simple text prompt into a complete 3D game level prototype, with automatic generation of 3D models, skybox, and spatial level layout.

**Usage Example:**
> Input: "A medieval fantasy RPG with a dragon boss and a knight hero in a dark castle"
> Output: Interactive 3D scene with the level, generated 3D characters, an ambient skybox, and a summary dashboard.

---

## 🏗️ General Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend** | NestJS (Node.js) + WebSocket (Socket.io) |
| **Frontend** | React + TypeScript + Vite |
| **3D Visualization** | Three.js via @react-three/fiber + @react-three/drei |
| **Artificial Intelligence** | Claude API (Anthropic) |
| **3D Generation** | TRIPO 3D API |
| **Skybox Generation** | Blockade Labs Skybox AI |
| **Real-time Communication** | WebSocket for progress tracking |

### Flow Diagram

```
USER PROMPT
     │
     ▼
ORCHESTRATOR AGENT (coordinates the entire pipeline)
     │
     ▼
CONTEXT AGENT ──────────────────► GameContext (structured extraction)
     │
     ▼
LEVEL LAYOUT AGENT ─────────────► LevelLayout (spatial architecture)
     │
     ├──────────────────────────────────────┐
     │                                      │
     ▼                                      ▼
ASSET AGENT (TRIPO 3D)          ENVIRONMENT AGENT (Skybox)
     │     [IN PARALLEL]                    │
     └──────────────────────────────────────┘
                    │
                    ▼
            ASSEMBLY AGENT
                    │
                    ▼
    SCENE CONFIG + DASHBOARD + LEVEL LAYOUT
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │         INTERACTIVE EDIT LOOP         │
    │                                       │
    │   User ◄──── Side Chat ────► Edit     │
    │     │                        Agent    │
    │     │                          │      │
    │     └──── Updated Scene ◄──────┘      │
    └───────────────────────────────────────┘
```

---

## 📁 Project Structure

```
aws_hack_gameAI/
├── backend/
│   └── src/
│       ├── app.module.ts                    # Main NestJS module
│       ├── main.ts                          # Entry point
│       │
│       ├── agents/                          # AI Agents
│       │   ├── agents.module.ts
│       │   ├── orchestrator/
│       │   │   ├── orchestrator.service.ts  # Coordinates all agents
│       │   │   └── orchestrator.controller.ts
│       │   ├── context/
│       │   │   └── context.service.ts       # Extracts context from prompt
│       │   ├── level-layout/
│       │   │   └── level-layout.service.ts  # Generates level architecture
│       │   ├── asset/
│       │   │   └── asset.service.ts         # Generates 3D models
│       │   ├── environment/
│       │   │   └── environment.service.ts   # Generates skybox
│       │   ├── assembly/
│       │   │   └── assembly.service.ts      # Assembles final scene
│       │   └── edit/
│       │       └── edit.service.ts          # Interprets edit commands
│       │
│       ├── tools/                           # External API integrations
│       │   ├── tools.module.ts
│       │   ├── tripo/
│       │   │   └── tripo.service.ts         # TRIPO 3D API
│       │   ├── skybox/
│       │   │   └── skybox.service.ts        # Blockade Labs API
│       │   └── cache/
│       │       └── cache.service.ts         # Asset cache
│       │
│       ├── session/                         # Session management
│       │   ├── session.module.ts
│       │   ├── session.service.ts           # Session state
│       │   └── session.gateway.ts           # WebSocket Gateway
│       │
│       ├── chat/                            # Edit Chat management
│       │   ├── chat.module.ts
│       │   ├── chat.service.ts              # Chat history & processing
│       │   └── chat.gateway.ts              # Chat WebSocket events
│       │
│       └── shared/                          # Shared code
│           ├── claude/
│           │   └── claude.service.ts        # Claude API client
│           └── interfaces/
│               ├── game-context.interface.ts
│               ├── level-layout.interface.ts
│               ├── scene-config.interface.ts
│               ├── session.interface.ts
│               ├── edit.interface.ts        # Edit command/result types
│               └── chat.interface.ts        # Chat message types
│
├── frontend/
│   └── src/
│       ├── App.tsx                          # Main component
│       ├── components/
│       │   ├── PromptInput.tsx              # Prompt input area
│       │   ├── ProgressIndicator.tsx        # Progress indicator
│       │   ├── Dashboard.tsx                # Project summary
│       │   └── AgentDialogue.tsx            # Agent dialogue display
│       ├── chat/
│       │   ├── EditChat.tsx                 # Side chat panel component
│       │   ├── ChatMessage.tsx              # Individual message component
│       │   ├── ChatInput.tsx                # Message input with send
│       │   └── EditPreview.tsx              # Preview of pending changes
│       ├── three/
│       │   ├── SceneViewer.tsx              # Three.js container
│       │   ├── LevelGeometry.tsx            # Room/corridor rendering
│       │   ├── ModelLoader.tsx              # GLB model loading
│       │   ├── WallMesh.tsx                 # Wall rendering
│       │   └── HighlightOverlay.tsx         # Highlights edited elements
│       ├── hooks/
│       │   ├── useSocket.ts                 # WebSocket hook
│       │   ├── useChat.ts                   # Chat state management
│       │   └── useScene.ts                  # Scene state management
│       ├── store/
│       │   ├── index.ts                     # Zustand store setup
│       │   ├── sceneStore.ts                # Scene state (SceneConfig)
│       │   └── chatStore.ts                 # Chat state (messages, processing)
│       └── types/
│           └── index.ts                     # TypeScript types
│
└── assets/                                  # Generated files (GLB, JPG)
```

---

## 📋 Key TypeScript Interfaces

### GameContext (Context Agent output)

```typescript
interface GameContext {
  game_title: string;
  genre: string;              // RPG, platformer, shooter, etc.
  mood: string;               // dark, cheerful, epic, etc.
  style: string;              // medieval, sci-fi, cartoon, etc.
  
  level: {
    type: string;             // dungeon, arena, castle, etc.
    scale: string;            // small, medium, large
    layout_style: string;     // linear, hub-and-spoke, branching, looped
    constraints: string[];    // e.g., ["narrow corridors", "verticality"]
  };
  
  characters: Character[];
  environment: Environment;
  props: Prop[];
}

interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'npc';
  description: string;
  tripo_prompt: string;       // Optimized prompt for TRIPO 3D
}

interface Environment {
  name: string;
  description: string;
  skybox_prompt: string;      // Prompt for Blockade Labs
  lighting: string;
  time_of_day: string;
}
```

### LevelLayout (Level Layout Agent output)

```typescript
interface LevelLayout {
  level: {
    name: string;
    type: string;
    theme: string;
    layout_style: string;
    
    metrics: {
      unit: string;           // "m"
      grid_size: number;
      player_height: number;
      corridor_width: number;
      door_width: number;
      door_height: number;
    };
    
    rooms: Room[];
    corridors: Corridor[];
    points_of_interest: POI[];
    
    flow: {
      critical_path: string[];  // Ordered list of room_ids
      loops: number;
      dead_ends: number;
    };
  };
}

interface Room {
  id: string;
  name: string;
  shape: 'rectangle' | 'L-shape' | 'circle';
  size: [number, number];     // [width, depth]
  elevation: number;
  tags: string[];             // e.g., ["entry", "safe"], ["goal"]
  connections: string[];      // IDs of connected corridors
}

interface Corridor {
  id: string;
  from: string;               // source room_id
  to: string;                 // destination room_id
  width: number;
  length: number;
  elevation_change: number;
}

interface POI {
  id: string;
  type: 'spawn' | 'goal' | 'treasure' | 'checkpoint';
  room_id: string;
  position_hint: string;      // "center", "corner", etc.
}
```

### SceneConfig (Assembly Agent output)

```typescript
interface SceneConfig {
  skybox_path: string;
  
  ambient_light: { color: string; intensity: number };
  directional_light: { color: string; intensity: number; position: [number, number, number] };
  
  geometry: {
    rooms: GeometryRoom[];
    corridors: GeometryCorridor[];
    walls: GeometryWall[];
    poi_markers: GeometryPOI[];
  };
  
  objects: SceneObject[];     // Positioned 3D models
  
  camera: {
    default: { position: [number, number, number]; look_at: [number, number, number]; fov: number };
    orbit_target: [number, number, number];
    min_distance: number;
    max_distance: number;
  };
}

interface SceneObject {
  id: string;
  model_path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  poi_id?: string;
}
```

---

## 🤖 Agent Details

### 1. Context Agent

**Role:** Analyze the user prompt and extract structured context.

**System Prompt:**
```
You are a Game Context and Level Intent Extractor. Analyze the user's game idea and extract structured information.

You must output valid JSON with:
- game_title: A fitting name for the game
- genre: Game genre (RPG, platformer, shooter, etc.)
- mood: Emotional tone (dark, cheerful, epic, etc.)
- style: Visual style (medieval, sci-fi, cartoon, etc.)
- level: Layout intent with type, scale, layout_style, constraints
- characters: Array with id, name, role, description, tripo_prompt
- environment: Scene setting with skybox_prompt, lighting, time_of_day
- props: Optional array of scene objects

Be specific and visual in descriptions. Optimize prompts for AI generation.
Include "game character, low poly stylized" in character tripo_prompts.
```

### 2. Level Layout Agent

**Role:** Generate the spatial architecture of the level (rooms, corridors, POIs).

**System Prompt:**
```
You are a Level Layout Generator. Using the GameContext, output valid JSON with:
- level: Object with name, type, theme, layout_style
- metrics: unit, grid_size, corridor_width, door_width, door_height, player_height
- rooms: list with id, name, shape, size [x, y], elevation, tags, connections
- corridors: list with id, from, to, width, length, elevation_change
- points_of_interest: spawn, goal, and notable landmarks
- flow: critical_path list, loops count, dead_ends count

Focus on spatial layout, scale, and connectivity. Do not invent gameplay mechanics.
```

### 3. Asset Agent

**Role:** Generate 3D models via the TRIPO API.

**Execution Flow:**
1. For each asset (in parallel):
   - `POST /task` with the tripo_prompt → task_id
   - Poll `GET /task/{task_id}` every 2s until completion
   - Download the GLB file

### 4. Environment Agent

**Role:** Generate the 360° skybox via Blockade Labs.

**Execution Flow:**
1. `POST /skybox` with the prompt and style_id → skybox_id
2. Poll until completion
3. Download the equirectangular image

**Available Style IDs:**
- 2 = Digital Painting
- 16 = Fantasy Landscape
- 27 = Sci-Fi
- 10 = Realistic

### 5. Assembly Agent

**Role:** Compose the final scene configuration.

**Positioning Logic:**
- Protagonist → spawn point
- Antagonist → goal point (scale 1.5-2x)
- NPCs → secondary rooms
- Props → according to room tags

**Geometry Logic:**
1. Room 001 at origin (0, 0, 0)
2. Following rooms positioned along the critical_path
3. Z axis = depth (negative = further from spawn)
4. Corridors connect room edges

### 6. Edit Agent (Post-Generation)

**Role:** Interpret natural language edit commands and modify the scene in real-time.

**System Prompt:**
```
You are a Level Editor Assistant. You receive the current scene state (GameContext, LevelLayout, SceneConfig) and a user instruction in natural language.

Analyze the instruction and determine what changes to make. You can:
1. ADD rooms, corridors, assets, props, POIs
2. REMOVE elements from the scene
3. MODIFY existing elements (position, scale, properties)
4. REGENERATE assets with new prompts

Output valid JSON with:
- action: "add" | "remove" | "modify" | "regenerate"
- target_type: "room" | "corridor" | "asset" | "prop" | "poi" | "skybox" | "lighting"
- changes: detailed changes to apply
- requires_api_call: boolean (true if TRIPO/Blockade needed)
- api_params: { type, prompt } if requires_api_call
- explanation: brief explanation of what you did

Be precise with coordinates. Maintain spatial coherence with existing elements.
When adding a room, automatically create a corridor to connect it.
```

**Supported Edit Commands (examples):**
- "Add a secret room behind the throne room"
- "Make the dragon bigger"
- "Add a treasure chest in the entry hall"
- "Change the skybox to a stormy night"
- "Add torches along the corridor"
- "Remove the middle room"
- "Move the knight closer to the entrance"
- "Add a balcony overlooking the main hall"

**Edit Flow:**
```
User Instruction
       │
       ▼
  Edit Agent (Claude)
       │
       ├─── Simple change ──► Apply directly to SceneConfig
       │                              │
       │                              ▼
       │                      Emit 'scene_updated'
       │
       └─── Requires generation ──► Asset Agent / Environment Agent
                                           │
                                           ▼
                                   Emit 'asset_ready'
                                           │
                                           ▼
                                   Apply to SceneConfig
                                           │
                                           ▼
                                   Emit 'scene_updated'
```

---

## 💬 Edit Chat Interface

### EditCommand Interface

```typescript
interface EditCommand {
  session_id: string;
  instruction: string;           // Natural language command
  timestamp: number;
}

interface EditContext {
  game_context: GameContext;
  level_layout: LevelLayout;
  scene_config: SceneConfig;
}
```

### EditResult Interface

```typescript
interface EditResult {
  id: string;
  action: 'add' | 'remove' | 'modify' | 'regenerate';
  target_type: 'room' | 'corridor' | 'asset' | 'prop' | 'poi' | 'skybox' | 'lighting';
  
  changes: {
    // For room/corridor additions
    new_rooms?: Room[];
    new_corridors?: Corridor[];
    
    // For asset operations
    new_objects?: SceneObject[];
    removed_object_ids?: string[];
    modified_objects?: Partial<SceneObject>[];
    
    // For layout modifications
    layout_changes?: Partial<LevelLayout>;
    
    // For environment changes
    skybox_prompt?: string;
    lighting_changes?: Partial<SceneConfig['ambient_light'] | SceneConfig['directional_light']>;
  };
  
  requires_api_call: boolean;
  api_params?: {
    type: 'tripo' | 'blockade';
    prompt: string;
    target_id: string;
  };
  
  explanation: string;            // What the agent did (shown in chat)
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

### Chat Message Interface

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  edit_result?: EditResult;       // Attached if this is an edit response
}

interface ChatState {
  session_id: string;
  messages: ChatMessage[];
  is_processing: boolean;
  current_edit?: EditResult;
}
```

---

## 🔌 External APIs

### TRIPO 3D API

```
Base URL: https://api.tripo3d.ai/v2/openapi

POST /task
  Headers: Authorization: Bearer {TRIPO_API_KEY}
  Body: { "type": "text_to_model", "prompt": "..." }
  Response: { "task_id": "..." }

GET /task/{task_id}
  Response: { "status": "success|running|failed", "output": { "model": "https://..." } }
```

**Generation Time:** ~30-60 seconds per model

### Blockade Labs Skybox AI

```
Base URL: https://backend.blockadelabs.com/api/v1

POST /skybox
  Headers: x-api-key: {BLOCKADE_API_KEY}
  Body: { "prompt": "...", "skybox_style_id": 16 }
  Response: { "id": "..." }

GET /skybox/{id}
  Response: { "status": "complete|pending", "file_url": "..." }
```

**Generation Time:** ~20-30 seconds

---

## 🔄 WebSocket Communication

### Events Emitted by the Server

```typescript
// Session creation
{ event: 'session_created', data: { session_id: string } }

// Step progression
{ event: 'progress', data: { step: 'context' | 'layout' | 'generation' | 'assembly', status: 'running' | 'done' } }

// Generation logs
{ event: 'log', data: string }  // e.g., "Generating Knight Hero..."

// Completion
{ event: 'complete', data: SessionState }

// Error
{ event: 'error', data: { message: string } }
```

### Events Received by the Server

```typescript
// Start a generation
{ event: 'generate', data: { prompt: string } }

// Edit command from chat
{ event: 'edit', data: { instruction: string } }
```

### Edit Chat WebSocket Events

```typescript
// Server → Client: Edit processing started
{ event: 'edit_started', data: { instruction: string, edit_id: string } }

// Server → Client: Edit analysis complete (preview)
{ event: 'edit_preview', data: EditResult }

// Server → Client: Asset generation progress (if needed)
{ event: 'edit_asset_progress', data: { edit_id: string, status: string, progress: number } }

// Server → Client: Edit fully applied
{ event: 'edit_applied', data: { edit_id: string, scene_config: SceneConfig, explanation: string } }

// Server → Client: Scene updated (triggers re-render)
{ event: 'scene_updated', data: SceneConfig }

// Server → Client: Chat message from assistant
{ event: 'chat_message', data: ChatMessage }

// Server → Client: Edit failed
{ event: 'edit_error', data: { edit_id: string, message: string } }
```

---

## 🎨 Frontend UI Layout

### Main Application Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header: Game Title + Session Info                                      │
├────────────────────────────────────────────────────────┬────────────────┤
│                                                        │                │
│                                                        │  EDIT CHAT     │
│                                                        │  ────────────  │
│                                                        │                │
│                 3D SCENE VIEWER                        │  [Assistant]   │
│                 (Three.js Canvas)                      │  "Level ready! │
│                                                        │   What would   │
│                                                        │   you like to  │
│                                                        │   modify?"     │
│                                                        │                │
│                                                        │  [User]        │
│                                                        │  "Add a secret │
│                                                        │   room behind  │
│                                                        │   the throne"  │
│                                                        │                │
│                                                        │  [Assistant]   │
│                                                        │  "Adding room..│
│                                                        │   ✓ Done!"     │
│                                                        │                │
│                                                        ├────────────────┤
│                                                        │ [Type message] │
│                                                        │ [Send]         │
├────────────────────────────────────────────────────────┴────────────────┤
│  Dashboard: Characters | Rooms | POIs | Stats                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### EditChat Component Structure

```tsx
<EditChat>
  {/* Message History */}
  <ChatMessageList>
    {messages.map(msg => (
      <ChatMessage 
        key={msg.id}
        role={msg.role}
        content={msg.content}
        editResult={msg.edit_result}
      />
    ))}
  </ChatMessageList>
  
  {/* Edit Preview (when processing) */}
  {currentEdit && (
    <EditPreview 
      action={currentEdit.action}
      targetType={currentEdit.target_type}
      explanation={currentEdit.explanation}
      status={currentEdit.status}
    />
  )}
  
  {/* Input Area */}
  <ChatInput 
    onSend={handleSendMessage}
    disabled={isProcessing}
    placeholder="Describe what you want to change..."
  />
</EditChat>
```

---

## 🎮 Frontend Three.js

### Rendering Structure

```tsx
<Canvas>
  <Sky /> or <Environment /> with the skybox
  <ambientLight />
  <directionalLight />
  
  <LevelGeometry geometry={scene.geometry}>
    {/* Rooms = horizontal PlaneGeometry with borders */}
    {/* Corridors = PlaneGeometry connecting rooms */}
    {/* POI Markers = CircleGeometry with labels */}
  </LevelGeometry>
  
  {scene.objects.map(obj => (
    <ModelLoader key={obj.id} path={obj.model_path} position={obj.position} />
  ))}
  
  <OrbitControls target={scene.camera.orbit_target} />
</Canvas>
```

### Room Rendering Logic

```typescript
// Each room = horizontal plane
const floor = new PlaneGeometry(room.size[0], room.size[1]);
floor.rotateX(-Math.PI / 2);  // Horizontal
floor.position.set(room.position[0], 0, room.position[2]);

// Colors based on tags
// "entry" = greenish (#3a4a3a)
// "goal" = reddish (#4a3a3a)
// "mid" = neutral (#3a3a4a)
```

---

## ⚙️ Environment Variables

```env
# Backend (.env)
ANTHROPIC_API_KEY=sk-ant-...
TRIPO_API_KEY=...
BLOCKADE_API_KEY=...
PORT=3001
```

---

## 🚀 Startup Commands

```bash
# Backend
cd backend
npm install
npm run start:dev    # Port 3001

# Frontend
cd frontend
npm install
npm run dev          # Port 5173
```

---

## 📊 Typical Time Sequence

| Time | Action |
|------|--------|
| t=0 | User sends prompt |
| t=0.1 | Orchestrator → Context Agent |
| t=1.5 | Context Agent returns GameContext |
| t=1.6 | Orchestrator → Level Layout Agent |
| t=2.2 | Level Layout Agent returns LevelLayout |
| t=2.3 | Orchestrator → Asset Agent + Environment Agent (parallel) |
| t=2.5-25 | Polling external APIs |
| t=25 | Skybox ready |
| t=35 | 3D Assets ready |
| t=35.1 | Orchestrator → Assembly Agent |
| t=36 | Final scene returned |

**Total Time: ~35-40 seconds**

---

## 🧪 Complete Example

### Input
```
"A medieval fantasy RPG with a dragon boss and a knight hero in a dark castle"
```

### Output GameContext (excerpt)
```json
{
  "game_title": "Dark Castle Quest",
  "genre": "RPG",
  "mood": "dark, epic, mysterious",
  "style": "medieval fantasy",
  "characters": [
    {
      "id": "char_001",
      "name": "Knight Hero",
      "role": "protagonist",
      "tripo_prompt": "medieval knight silver armor red cape sword shield, game character, low poly stylized"
    },
    {
      "id": "char_002",
      "name": "Dragon Boss",
      "role": "antagonist",
      "tripo_prompt": "red dragon black horns wings fire, game boss character, low poly stylized"
    }
  ]
}
```

### Output LevelLayout (excerpt)
```json
{
  "level": {
    "name": "Dark Castle Keep",
    "rooms": [
      { "id": "room_001", "name": "Entry Hall", "size": [12, 8], "tags": ["entry"] },
      { "id": "room_002", "name": "Torch Gallery", "size": [10, 6], "tags": ["mid"] },
      { "id": "room_003", "name": "Throne Chamber", "size": [16, 12], "tags": ["goal"] }
    ],
    "corridors": [
      { "id": "corridor_001", "from": "room_001", "to": "room_002", "width": 3, "length": 8 },
      { "id": "corridor_002", "from": "room_002", "to": "room_003", "width": 3, "length": 10 }
    ],
    "flow": {
      "critical_path": ["room_001", "room_002", "room_003"]
    }
  }
}
```

### Edit Chat Interaction Example

**After initial generation, the user interacts with the side chat:**

```
┌─────────────────────────────────────────┐
│ 🤖 Assistant                            │
│ Your level "Dark Castle Keep" is ready! │
│ I've created 3 rooms with the dragon    │
│ boss in the Throne Chamber.             │
│                                         │
│ What would you like to modify?          │
├─────────────────────────────────────────┤
│ 👤 User                                 │
│ Add a secret treasure room behind the   │
│ throne room with a hidden passage       │
├─────────────────────────────────────────┤
│ 🤖 Assistant                            │
│ Adding secret room...                   │
│                                         │
│ ✓ Created "Secret Treasury" (8x6m)      │
│ ✓ Added hidden corridor from Throne     │
│   Chamber                               │
│ ✓ Placed treasure POI at center         │
│                                         │
│ The room is now visible in your scene!  │
├─────────────────────────────────────────┤
│ 👤 User                                 │
│ Add a treasure chest in that room       │
├─────────────────────────────────────────┤
│ 🤖 Assistant                            │
│ Generating treasure chest...            │
│ ⏳ Creating 3D model (TRIPO)...         │
│                                         │
│ [████████░░░░░░░░] 45%                  │
├─────────────────────────────────────────┤
│ 🤖 Assistant                            │
│ ✓ Treasure chest added!                 │
│                                         │
│ Placed at center of Secret Treasury     │
│ with golden glow effect.                │
├─────────────────────────────────────────┤
│ 👤 User                                 │
│ Make the dragon 50% bigger              │
├─────────────────────────────────────────┤
│ 🤖 Assistant                            │
│ ✓ Dragon Boss scaled to 150%            │
│                                         │
│ The dragon now dominates the Throne     │
│ Chamber! 🐉                              │
└─────────────────────────────────────────┘
```

**EditResult for "Add secret room" command:**
```json
{
  "id": "edit_001",
  "action": "add",
  "target_type": "room",
  "changes": {
    "new_rooms": [{
      "id": "room_004",
      "name": "Secret Treasury",
      "shape": "rectangle",
      "size": [8, 6],
      "elevation": 0,
      "tags": ["secret", "treasure"],
      "connections": ["corridor_003"]
    }],
    "new_corridors": [{
      "id": "corridor_003",
      "from": "room_003",
      "to": "room_004",
      "width": 2,
      "length": 4,
      "elevation_change": 0
    }]
  },
  "requires_api_call": false,
  "explanation": "Added Secret Treasury (8x6m) behind Throne Chamber with hidden corridor",
  "status": "completed"
}
```

---

## 🔧 Potential Improvements

1. **Asset Cache**: Reuse already generated models for similar prompts
2. **Texture Generation**: Add procedural textures to walls/floors
3. **Dynamic Lighting**: Animated torches, cast shadows
4. **Export**: Allow scene export in standard format (GLTF)
5. **Drag-and-Drop Editing**: Combine chat with visual drag-and-drop
6. **Multiplayer**: Real-time collaborative preview
7. **Optimization**: Generate LOD for 3D models
8. **API Alternatives**: Support Meshy.ai as an alternative to TRIPO
9. **Edit History**: Undo/redo for chat-based modifications
10. **Voice Commands**: Voice input for hands-free editing
11. **Smart Suggestions**: AI suggests improvements based on game design principles

---

## 📝 Implementation Notes

### Error Handling
- If Context Agent fails → Critical error, cannot continue
- If Level Layout fails → Critical error
- If Asset Agent fails → Use placeholder cubes
- If Environment Agent fails → Use default gradient
- If Assembly Agent fails → Return raw data

### Best Practices
- Validate all JSON returned by Claude
- Implement timeouts on API calls
- Use retry with exponential backoff
- Log each step for debugging
- Serve generated assets via a static endpoint

---

This document contains all the information needed to understand, reproduce, and extend the Game Prototype Generator. Feel free to ask questions about specific aspects of the implementation!

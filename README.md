# 🎮 Game Prototype Generator

> **Transform text prompts into interactive 3D game levels using AI agents**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-black.svg)](https://threejs.org/)

---

## 🎬 Demo

### Watch the Demo Video

[![Game Prototype Generator Demo](https://img.youtube.com/vi/RIs4LgfX2L4/maxresdefault.jpg)](https://youtu.be/RIs4LgfX2L4?si=ir1UO0hWj_4hPyVt)

> 🎥 **Click the image above to watch the full demo on YouTube**

---

## 📖 Overview

Game Prototype Generator is an AI-powered application that transforms natural language descriptions into fully interactive 3D game level prototypes. Using a multi-agent architecture powered by Claude AI, the system orchestrates the creation of:

- 🏰 **Spatial level layouts** (rooms, corridors, points of interest)
- 🐉 **3D character models** (protagonists, antagonists, NPCs)
- 🌅 **Immersive 360° skyboxes**
- 💬 **Real-time editing via natural language chat**

**Built for the AWS Hackathon 2026**

---

## 🎬 Demo

### Watch the Demo Video

[![Game Prototype Generator Demo](https://img.youtube.com/vi/RIs4LgfX2L4/maxresdefault.jpg)](https://youtu.be/RIs4LgfX2L4?si=ir1UO0hWj_4hPyVt)

> 🎥 **Click the image above to watch the full demo on YouTube**

---

### Example

> **Input:** *"A medieval fantasy RPG with a dragon boss and a knight hero in a dark castle"*

The system generates:
- A dark castle level with multiple connected rooms
- A knight hero at the spawn point
- A dragon boss in the throne chamber
- An atmospheric medieval skybox
- Interactive editing capabilities

---

## 🏗️ Agentic Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              🎮 USER PROMPT                                      │
│                   "A medieval RPG with dragon boss..."                          │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        🎭 ORCHESTRATOR AGENT                                     │
│                                                                                  │
│   • Coordinates the entire generation pipeline                                  │
│   • Manages agent communication and state                                       │
│   • Handles error recovery and fallbacks                                        │
│   • Emits real-time progress via WebSocket                                      │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  📋 CONTEXT     │     │  🗺️ LAYOUT      │     │  ✏️ EDIT        │
│     AGENT       │     │     AGENT       │     │    AGENT        │
│                 │     │                 │     │                 │
│ Extracts:       │     │ Generates:      │     │ Interprets:     │
│ • Game title    │     │ • Room layout   │     │ • Natural lang  │
│ • Genre & mood  │     │ • Corridors     │     │ • Scene updates │
│ • Characters    │     │ • POIs          │     │ • Real-time     │
│ • Environment   │     │ • Critical path │     │   modifications │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────────────────────────────┐
         │              │         PARALLEL GENERATION              │
         │              ├──────────────────┬──────────────────────┤
         │              │                  │                      │
         │              ▼                  ▼                      │
         │     ┌─────────────────┐ ┌─────────────────┐            │
         │     │  🎨 ASSET       │ │  🌅 ENVIRONMENT │            │
         │     │     AGENT       │ │      AGENT      │            │
         │     │                 │ │                 │            │
         │     │ Generates via   │ │ Generates via   │            │
         │     │ TRIPO 3D API:   │ │ Blockade Labs:  │            │
         │     │ • Heroes        │ │ • 360° Skybox   │            │
         │     │ • Enemies       │ │ • Atmosphere    │            │
         │     │ • Props         │ │ • Lighting      │            │
         │     └────────┬────────┘ └────────┬────────┘            │
         │              │                   │                     │
         │              └─────────┬─────────┘                     │
         │                        │                               │
         └────────────────────────┼───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        🔧 ASSEMBLY AGENT                                         │
│                                                                                  │
│   • Positions 3D models on level geometry                                       │
│   • Configures lighting and camera                                              │
│   • Creates final SceneConfig                                                   │
│   • Protagonist → Spawn | Antagonist → Goal | NPCs → Secondary rooms           │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     🎮 INTERACTIVE 3D SCENE                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                               │ CHAT │    │
│  │              THREE.JS VIEWER                                  │      │    │
│  │                                                               │ 💬   │    │
│  │   ┌─────┐      ┌───────┐      ┌─────┐                       │ User │    │
│  │   │Entry│──────│Corridor│──────│Boss │                       │ Edit │    │
│  │   │ 🛡️  │      │       │      │ 🐉  │                       │      │    │
│  │   └─────┘      └───────┘      └─────┘                       │ ───► │    │
│  │                                                               │ AI   │    │
│  │   [Orbit Controls] [Game Mode] [Save]                        │      │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Prompt │────▶│ GameContext  │────▶│ LevelLayout  │────▶│ SceneConfig  │
│              │     │              │     │              │     │              │
│ Natural lang │     │ • title      │     │ • rooms[]    │     │ • objects[]  │
│ description  │     │ • genre      │     │ • corridors[]│     │ • geometry   │
│              │     │ • characters │     │ • pois[]     │     │ • lighting   │
│              │     │ • environment│     │ • flow       │     │ • camera     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                     │                    │
                            ▼                     ▼                    ▼
                     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                     │   Claude AI  │     │   Claude AI  │     │  Three.js    │
                     │   Analysis   │     │   Layout Gen │     │  Renderer    │
                     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **NestJS** | Node.js framework with modular architecture |
| **Socket.io** | Real-time bidirectional WebSocket communication |
| **Anthropic Claude** | AI agents for context extraction, layout, and editing |
| **Axios** | HTTP client for external API calls |
| **TypeScript** | Type-safe development |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library |
| **Vite** | Fast build tool and dev server |
| **Three.js** | 3D rendering via @react-three/fiber |
| **@react-three/drei** | Three.js helpers and abstractions |
| **Zustand** | Lightweight state management |
| **Tailwind CSS** | Utility-first styling |
| **Socket.io-client** | WebSocket client |
| **Lucide React** | Icon library |

### External APIs

| API | Purpose | Generation Time |
|-----|---------|-----------------|
| **Claude (Anthropic)** | AI reasoning for all agents | ~1-3s per call |
| **TRIPO 3D** | Text-to-3D model generation (GLB) | ~30-60s per model |
| **Blockade Labs** | Text-to-360° skybox generation | ~20-30s |

---

## 📁 Project Structure

```
game-prototype-generator/
├── backend/                          # NestJS Backend
│   └── src/
│       ├── agents/                   # 🤖 AI Agents
│       │   ├── orchestrator/         # Pipeline coordinator
│       │   ├── context/              # Prompt analysis
│       │   ├── level-layout/         # Spatial generation
│       │   ├── asset/                # 3D model generation
│       │   ├── environment/          # Skybox generation
│       │   ├── assembly/             # Scene composition
│       │   └── edit/                 # Real-time editing
│       │
│       ├── tools/                    # 🔧 External API Services
│       │   ├── tripo/                # TRIPO 3D API client
│       │   ├── skybox/               # Blockade Labs client
│       │   └── cache/                # Asset caching
│       │
│       ├── session/                  # 📦 Session Management
│       │   ├── session.gateway.ts    # WebSocket handlers
│       │   └── session.service.ts    # Session state
│       │
│       ├── chat/                     # 💬 Edit Chat
│       │   ├── chat.gateway.ts       # Chat WebSocket
│       │   └── chat.service.ts       # Chat processing
│       │
│       ├── levels/                   # 💾 Level Persistence
│       │   ├── levels.controller.ts  # REST API
│       │   └── levels.service.ts     # Save/Load logic
│       │
│       └── shared/                   # 📚 Shared Code
│           ├── claude/               # Claude API client
│           └── interfaces/           # TypeScript interfaces
│
├── frontend/                         # React Frontend
│   └── src/
│       ├── components/               # 🎨 UI Components
│       │   ├── Dashboard.tsx         # Level summary
│       │   ├── PromptInput.tsx       # Initial input
│       │   ├── ProgressIndicator.tsx # Generation progress
│       │   └── AssetPanel.tsx        # Asset browser
│       │
│       ├── three/                    # 🎮 3D Components
│       │   ├── SceneViewer.tsx       # Main canvas
│       │   ├── LevelGeometry.tsx     # Rooms & corridors
│       │   ├── ModelLoader.tsx       # GLB loader
│       │   └── FirstPersonControls.tsx # Game mode
│       │
│       ├── chat/                     # 💬 Chat Components
│       │   ├── EditChat.tsx          # Chat panel
│       │   ├── ChatMessage.tsx       # Message display
│       │   └── EditPreview.tsx       # Change preview
│       │
│       ├── hooks/                    # 🪝 React Hooks
│       │   └── useSocket.ts          # WebSocket hook
│       │
│       ├── store/                    # 📦 State Management
│       │   ├── appStore.ts           # App state
│       │   ├── chatStore.ts          # Chat state
│       │   └── levelsStore.ts        # Levels state
│       │
│       └── types/                    # 📝 TypeScript Types
│
└── assets/                           # Generated Assets (GLB, JPG)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **npm** or **yarn**
- API Keys:
  - [Anthropic Claude](https://console.anthropic.com/) (AI reasoning)
  - [TRIPO 3D](https://www.tripo3d.ai/) (3D model generation)
  - [Blockade Labs](https://www.blockadelabs.com/) (Skybox generation)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/game-prototype-generator.git
cd game-prototype-generator
```

2. **Set up environment variables**
```bash
# Create .env file in backend/
cd backend
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-xxx...
TRIPO_API_KEY=your_tripo_key
BLOCKADE_API_KEY=your_blockade_key
PORT=3001
ASSETS_PATH=../assets
EOF
```

3. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. **Start development servers**

```bash
# Terminal 1: Backend (port 3001)
cd backend
npm run start:dev

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:5173](http://localhost:5173)

---

## 💬 Edit Chat Commands

Once your level is generated, use the AI chat to modify it in real-time:

| Command | Action |
|---------|--------|
| "Add a secret room behind the throne" | Creates connected room |
| "Make the dragon 50% bigger" | Scales the model |
| "Add a treasure chest in the entry" | Generates & places new 3D prop |
| "Change the skybox to a stormy night" | Regenerates skybox |
| "Make the floor red in the boss room" | Changes room materials |
| "Add torches along the corridor" | Places light sources |
| "Remove the middle corridor" | Deletes elements |
| "Move the knight closer to the door" | Repositions objects |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Claude API key | Yes |
| `TRIPO_API_KEY` | TRIPO 3D API key | Yes |
| `BLOCKADE_API_KEY` | Blockade Labs API key | Yes |
| `PORT` | Backend port (default: 3001) | No |
| `ASSETS_PATH` | Assets directory path | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

---

## 🔌 WebSocket Events

### Server → Client

| Event | Description |
|-------|-------------|
| `session_created` | New session initialized |
| `progress` | Pipeline step update |
| `log` | Generation log message |
| `complete` | Generation finished |
| `scene_updated` | Scene modified (after edit) |
| `chat_message` | Assistant response |
| `error` | Error occurred |

### Client → Server

| Event | Description |
|-------|-------------|
| `generate` | Start generation with prompt |
| `edit` | Send edit instruction |
| `init_chat` | Initialize chat session |

---

## 📊 Performance

| Phase | Duration |
|-------|----------|
| Context Analysis | ~2s |
| Layout Generation | ~1s |
| 3D Model Generation | ~30-60s per model |
| Skybox Generation | ~20-30s |
| Scene Assembly | ~1s |
| **Total (typical)** | **~40-60s** |

---

## 🎯 Features

- [x] Text-to-level generation
- [x] AI-generated 3D characters (TRIPO)
- [x] Dynamic 360° skyboxes (Blockade Labs)
- [x] Interactive 3D viewer with orbit controls
- [x] First-person game mode
- [x] Real-time AI chat editing
- [x] Room material customization
- [x] Level save/load system
- [x] Real-time progress tracking
- [ ] Multiplayer preview
- [ ] Export to game engine formats
- [ ] Voice command editing

---

## 🧪 Example Output

### Input
```
"A medieval fantasy RPG with a dragon boss and a knight hero in a dark castle"
```

### Generated GameContext
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

### Generated LevelLayout
```json
{
  "level": {
    "name": "Dark Castle Keep",
    "rooms": [
      { "id": "room_001", "name": "Entry Hall", "size": [12, 8], "tags": ["entry"] },
      { "id": "room_002", "name": "Torch Gallery", "size": [10, 6], "tags": ["mid"] },
      { "id": "room_003", "name": "Throne Chamber", "size": [16, 12], "tags": ["goal"] }
    ],
    "flow": {
      "critical_path": ["room_001", "room_002", "room_003"]
    }
  }
}
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com/) for Claude AI
- [TRIPO 3D](https://tripo3d.ai/) for 3D model generation
- [Blockade Labs](https://blockadelabs.com/) for skybox generation
- [Three.js](https://threejs.org/) and React Three Fiber team

---

## 👥 Team

Built with ❤️ for the **AWS Hackathon 2026**

---

## 📧 Contact

For questions or support, please open an issue on GitHub.

# AI Mindmap Application — System Architecture & UI Design
*Version 1.0 — React Native / Expo Implementation*

## 1. Overview
This document outlines the architecture and UI design of a React Native (Expo) application featuring three independent functional modules:
1. AI Chat Module  
2. Document-Based Mindmap Generation Module  
3. YouTube-Based Mindmap Generation Module  

Each module lives in its own JavaScript screen file and contains an embedded AI chat interface. Some UI components are shared across modules.

## 2. Folder Structure
```
app/
  navigation/
    TabNavigator.js
  components/
    ChatInput.js
    MessageList.js
    MindmapCanvas.js
  screens/
    ChatScreen.js
    FileMindmapScreen.js
    YouTubeMindmapScreen.js
  api/
    aiClient.js
    fileUpload.js
    youtubeExtractor.js
  App.js
  app.json
  package.json
```

## 3. Navigation Design
A tab navigator switches between the three major modules:
- Chat
- File → Mindmap
- YouTube → Mindmap

## 4. Shared Components
### ChatInput.js
A reusable input component with:
- Multiline text input
- Left action button
- Right send button

### MessageList.js
Scrollable chat bubbles per role.

### MindmapCanvas.js
Mindmap editor supporting:
- Node display & dragging
- Edge linking
- “Add Node” & “Link Nodes” controls

## 5. Screen 1 — ChatScreen.js
General AI assistant screen:
- MessageList
- ChatInput

## 6. Screen 2 — FileMindmapScreen.js
Generates mindmap from uploaded files.

Layout:
```
[ MindmapCanvas ]
[ MessageList ]
[ ChatInput (+ upload file) ]
```

Workflow:
1. User uploads file.
2. Backend extracts structure via AI.
3. Mindmap JSON returned.
4. Canvas renders nodes & edges.
5. User edits freely.

## 7. Screen 3 — YouTubeMindmapScreen.js
Generates mindmap from YouTube video transcript.

Layout:
```
[ YouTube Link Input ]
[ MindmapCanvas ]
[ MessageList ]
[ ChatInput ]
```

Workflow:
1. User enters YouTube URL.
2. Backend extracts transcript.
3. AI generates mindmap JSON.
4. Canvas displays the map.

## 8. Mindmap Data Structure
### Node
```
{
  "id": "node-1",
  "text": "Main Topic",
  "x": 120,
  "y": 200
}
```

### Edge
```
{
  "from": "node-1",
  "to": "node-2"
}
```

### Full Mindmap
```
{
  "nodes": [],
  "edges": []
}
```

## 9. API Layer Design
### aiClient.js
Handles:
- General AI chat
- File → Mindmap model
- YouTube → Mindmap model

### fileUpload.js
Handles:
- File picking
- Uploading to backend

### youtubeExtractor.js
Handles:
- YouTube transcript extraction

## 10. Canvas Interaction Model
Capabilities:
- Dragging nodes
- Editing nodes
- Linking nodes
- Optional zoom/pan

Libraries:
- react-native-svg
- react-native-gesture-handler
- react-native-reanimated

## 11. Module Summary
| Module | Chat | Canvas | Input Type | AI |
|--------|------|--------|------------|----|
| ChatScreen | Yes | No | Text | General |
| FileMindmapScreen | Yes | Yes | File | Doc → Mindmap |
| YouTubeMindmapScreen | Yes | Yes | URL | Transcript → Mindmap |

## 12. Future Extensions
- Auto-layout algorithms
- Collaboration mode
- Multi-file mindmap merging
- Export as JSON / PNG / PDF

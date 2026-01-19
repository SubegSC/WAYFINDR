# UofC Accessibility Navigator - Complete Project Summary

## Project Overview

**UofC Accessibility Navigator** is a full-stack web application designed to help users navigate the University of Calgary campus with accessibility and sustainability in mind. The app provides intelligent routing that considers different user needs (wheelchair accessibility, visual impairment, eco-friendly paths) and includes a social "buddy walk" feature for users to find walking companions.

## Architecture

### Tech Stack

**Backend:**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** SQLite with Prisma ORM
- **Authentication:** JWT (jsonwebtoken) with bcryptjs for password hashing
- **Map Data:** OpenStreetMap via Overpass API
- **Routing Algorithm:** A* pathfinding with custom cost functions

**Frontend:**
- **Framework:** Next.js 14+ (React)
- **Map Library:** Mapbox GL JS
- **Styling:** Inline styles (modern, gradient-based design)
- **State Management:** React hooks (useState, useEffect)

### Project Structure

```
HackthonNov25/
├── uofc-accessibility-backend-eco/     # Backend server
│   ├── src/
│   │   ├── index.ts                    # Main server entry point
│   │   ├── routes/
│   │   │   ├── auth.ts                 # Authentication (signup/login)
│   │   │   ├── buddy.ts                # Buddy walk system
│   │   │   ├── geocode.ts              # Location search/geocoding
│   │   │   ├── route.ts                # Pathfinding/routing engine
│   │   │   └── reports.ts              # User reports/POIs
│   │   ├── lib/
│   │   │   ├── geo.ts                  # Geographic utilities (haversine, snapping)
│   │   │   └── graph.ts                # Graph data loader
│   │   ├── types.ts                    # TypeScript type definitions
│   │   └── data/
│   │       └── graph.json              # Routing graph (generated from OSM)
│   ├── prisma/
│   │   └── schema.prisma               # Database schema
│   └── scripts/
│       └── ingest_overpass.ts         # OSM data ingestion script
│
└── uofc-accessibility-frontend-mapbox/ # Frontend application
    ├── app/
    │   ├── page.tsx                    # Main application page
    │   ├── layout.tsx                  # Root layout
    │   └── globals.css                 # Global styles
    ├── components/
    │   ├── MapView.tsx                 # Mapbox map component
    │   ├── LoginModal.tsx              # Authentication modal
    │   └── BuddyPanel.tsx              # Buddy walk panel
    └── lib/
        └── api.ts                      # API client functions
```

## Core Features

### 1. Intelligent Routing System

The app provides four routing profiles, each with custom cost functions:

**Default Profile:**
- Shortest path regardless of accessibility features
- Base cost = distance only

**Wheelchair Accessible Profile:**
- **Strongly prefers indoor routes** (0.3x cost for indoor, 2.5x for outdoor)
- Avoids stairs completely (infinite cost)
- Prefers wider paths (>=1.5m: 0.9x, <1.0m: 1.4x)
- Surface quality: excellent/good (0.9x), bad/very_bad (1.5x)
- Slope handling: >8% (2.0x), >5% (1.5x), 0-3% (0.95x)
- Prefers elevators (0.8x), handrails (0.9x), obstacle-free paths (0.9x)
- Penalizes rough surfaces and icy conditions

**Visually Impaired Profile:**
- **Strongly prefers indoor routes** (0.4x cost for indoor, 2.0x for outdoor)
- Avoids stairs completely
- **Lighting preferences:** consistent lighting (0.6x), well-lit (0.7x), poor/low visibility (2.0x)
- Navigation aids: audio beacons (0.75x), high contrast (0.85x), tactile paving (0.9x)
- Prefers handrails (0.9x), obstacle-free paths (0.85x)
- Prefers marked crossings (0.85x)
- Penalizes complex turns (>3 turns: 1.3x, >1: 1.1x)

**Eco Profile:**
- **Heavy toll on indoor routes** (3.5x cost) - strongly prefers outdoor
- Outdoor routes preferred (0.5x cost)
- Prefers green paths (footways, paths, pedestrian areas: 0.7x)
- Prefers natural surfaces (grass/dirt: 0.85x), penalizes paved (1.1x)
- Prefers routes near transit (0.9x)
- Penalizes very bad rough surfaces (1.2x)
- Avoids very steep slopes >10% (1.3x)
- Prefers wider paths >=2.0m (0.9x)

**Route Reasoning:**
- The system analyzes why a route was chosen and provides human-readable explanations
- Factors include: indoor/outdoor preference, surface quality, lighting, accessibility features, etc.

### 2. Map Interaction

- **Click-to-select:** Users click on the map to set start (green marker 📍) and end (red marker 🎯) points
- **Visual markers:** Start point (green), end point (red)
- **Route display:** Purple/blue gradient line showing the calculated path
- **Campus bounds:** Map restricted to UofC campus area (51.0745°N to 51.0825°N, -114.1360°W to -114.1260°W)
- **Visual boundary:** Blue dashed line and semi-transparent fill showing campus area

### 3. User Authentication System

**Backend (`/api/auth`):**
- `POST /signup` - Create new account (email, username, password, optional name)
- `POST /login` - Authenticate user (email, password)
- `GET /me` - Get current user info (protected route)

**Security:**
- Passwords hashed with bcryptjs (10 rounds)
- JWT tokens for session management (7-day expiration)
- Token stored in localStorage on frontend
- Protected routes use `verifyToken` middleware

**Frontend:**
- LoginModal component with signup/login toggle
- User info displayed in header when logged in
- Logout functionality

### 4. Buddy Walk System

**Purpose:** Allow users to find nearby walking companions on campus

**Backend (`/api/buddy`):**
- `POST /location` - Update user's current location (lat, lng)
- `GET /nearby` - Get users within 500m who were active in last 5 minutes
- `POST /request` - Send buddy walk request to another user (with optional message)
- `GET /requests` - Get all buddy requests (sent/received/all)
- `POST /request/:id/respond` - Accept or reject a request
- `POST /request/:id/cancel` - Cancel a sent request

**Frontend:**
- BuddyPanel component with two tabs:
  - **Nearby tab:** Shows users within 500m with distance, allows sending requests
  - **Requests tab:** Shows sent/received requests, allows accepting/rejecting
- Auto-refreshes every 10 seconds
- Location automatically updated when user sets start point on map

**Request States:**
- `pending` - Awaiting response
- `accepted` - Request accepted
- `rejected` - Request rejected
- `cancelled` - Request cancelled by sender

### 5. Geocoding & Search

**Backend (`/api/geocode`):**
- `GET /?q=<query>` - Search for locations
- Uses Mapbox API if token provided, falls back to Nominatim
- Includes campus building presets (TFDL, ICT, EEEL, MSC, Kinesiology)

### 6. User Reports & POIs

**Backend (`/api/reports`):**
- `GET /` - Get recent reports
- `POST /` - Submit new report (type, note, lat, lng, level)
- `GET /api/tiles/heatmap/:z/:x/:y.mvt` - Vector tiles for heatmap visualization
- `GET /api/pois` - Get sustainability POIs (water_refill, recycling, shade_rest, bike_repair)

## Database Schema

### User Model
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String   @unique
  password  String   // hashed with bcrypt
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Location tracking
  lastLat   Float?
  lastLng   Float?
  lastSeen  DateTime?
  
  // Relations
  sentRequests     BuddyRequest[] @relation("Sender")
  receivedRequests BuddyRequest[] @relation("Receiver")
}
```

### BuddyRequest Model
```prisma
model BuddyRequest {
  id        Int      @id @default(autoincrement())
  senderId  Int
  receiverId Int
  status    String   // 'pending', 'accepted', 'rejected', 'cancelled'
  message   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  sender    User     @relation("Sender", fields: [senderId], references: [id])
  receiver  User     @relation("Receiver", fields: [receiverId], references: [id])
  
  @@unique([senderId, receiverId])
  @@index([receiverId, status])
}
```

### Report Model
```prisma
model Report {
  id        Int      @id @default(autoincrement())
  type      String
  note      String?
  lat       Float
  lng       Float
  level     Int?
  createdAt DateTime @default(now())
}
```

## Routing Graph Structure

The routing graph is built from OpenStreetMap data and stored in `src/data/graph.json`:

```typescript
type Graph = {
  nodes: { id: number; coord: [number, number] }[];  // [lng, lat]
  edges: Edge[];
  index?: Record<number, number[]>;  // node -> edge indices
};

type Edge = {
  id: string;
  from: number;
  to: number;
  coords: Coord[];
  length?: number;
  
  // Accessibility attributes
  is_stairs?: boolean;
  surface?: string;
  smoothness?: string;
  lighting?: boolean;
  width?: number;
  footway?: string;
  crossing?: string;
  incline_pct?: number;
  turn_complexity?: number;
  has_curb_ramp?: boolean;
  tactile_paving?: boolean;
  transit_nearby?: boolean;
  indoor?: boolean;
  has_elevator?: boolean;
  has_handrail?: boolean;
  min_width?: number;
  audio_beacon?: boolean;
  high_contrast?: boolean;
  obstacle_free?: boolean;
  consistent_lighting?: boolean;
};
```

## Pathfinding Algorithm

**Algorithm:** A* (A-star) with custom heuristic

**Process:**
1. User clicks start and end points on map
2. Points are "snapped" to nearest graph nodes (within 1000m)
3. A* algorithm finds optimal path using profile-specific cost function
4. Path is reconstructed and analyzed for reasoning
5. Route coordinates returned to frontend for display

**Snapping Logic:**
- Checks all coordinates along edges (not just endpoints)
- Finds nearest node within 1000m
- Falls back to node search if no close edge found
- Validates that snapped nodes have neighbors (connected to graph)

**Error Handling:**
- `start_point_too_far` / `end_point_too_far` - Point >1000m from graph
- `start_node_disconnected` / `end_node_disconnected` - Node has no neighbors
- `same_start_end` - Both points snapped to same node
- `no_path` - No path exists between nodes

## API Endpoints Summary

### Public Endpoints
- `GET /` - Health check
- `GET /api/geocode?q=<query>` - Location search
- `POST /api/route` - Calculate route (start, end, profile)
- `GET /api/reports` - Get reports
- `POST /api/reports` - Submit report
- `GET /api/tiles/heatmap/:z/:x/:y.mvt` - Heatmap tiles
- `GET /api/pois` - Sustainability POIs
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Protected Endpoints (require JWT token)
- `GET /api/auth/me` - Get current user
- `POST /api/buddy/location` - Update location
- `GET /api/buddy/nearby` - Get nearby users
- `POST /api/buddy/request` - Send buddy request
- `GET /api/buddy/requests` - Get requests
- `POST /api/buddy/request/:id/respond` - Accept/reject request
- `POST /api/buddy/request/:id/cancel` - Cancel request

## Frontend Components

### Main Page (`app/page.tsx`)
- Manages routing state (start, end, profile, route)
- Handles map clicks for setting points
- Displays user info and buddy walk button
- Shows login modal when not authenticated
- Shows buddy panel when authenticated

### MapView Component (`components/MapView.tsx`)
- Mapbox GL map instance
- Displays route line
- Shows start/end markers
- Handles map clicks
- Restricted to campus bounds
- Visual campus boundary indicator

### LoginModal Component (`components/LoginModal.tsx`)
- Toggle between login and signup
- Form validation
- Error handling
- Calls auth API and stores token

### BuddyPanel Component (`components/BuddyPanel.tsx`)
- Two-tab interface (Nearby / Requests)
- Displays nearby users with distance
- Send request with optional message
- View and respond to requests
- Auto-refreshes every 10 seconds

## Data Ingestion

**Script:** `scripts/ingest_overpass.ts`

**Process:**
1. Queries OpenStreetMap Overpass API for UofC campus area
2. Extracts ways (paths, footways, corridors, stairs)
3. Extracts nodes (elevators, handrails, tactile paving, transit stops)
4. Builds graph with nodes and edges
5. Annotates edges with accessibility attributes
6. Detects indoor routes (covered, tunnel, indoor=yes, corridor)
7. Detects accessibility features from tags and proximity
8. Outputs `graph.json` for routing engine

**Run with:** `npm run ingest:overpass`

## Environment Variables

**Backend (`.env`):**
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=<random-64-byte-hex-string>
PORT=3001
CORS_ORIGIN=*
MAPBOX_TOKEN=<optional>  # For geocoding
```

**Frontend:**
- `NEXT_PUBLIC_API_BASE` - Backend API URL (defaults to `http://localhost:3001`)
- Mapbox token required for map display (set in MapView component)

## Key Algorithms & Utilities

### Haversine Distance
- Calculates great-circle distance between two coordinates
- Used for: snapping points, finding nearby users, calculating route distances

### Point Snapping
- Finds nearest graph node to clicked coordinate
- Checks all edge coordinates (not just endpoints)
- Validates distance and connectivity

### A* Pathfinding
- Open set: nodes to explore
- Closed set: nodes already explored
- gScore: actual cost from start
- fScore: gScore + heuristic (straight-line distance to end)
- Reconstructs path by following `cameFrom` map

### Cost Function
- Base cost = edge length
- Profile-specific multipliers applied
- Factors: indoor/outdoor, surface, lighting, width, slope, accessibility features
- Returns Infinity for impossible edges (e.g., stairs for wheelchair)

## UI/UX Design

**Color Scheme:**
- Primary gradient: Purple to blue (`#667eea` to `#764ba2`)
- Success: Green (`#10b981`)
- Error: Red (`#ef4444`)
- Warning: Yellow (`#f59e0b`)

**Design Principles:**
- Modern gradient headers
- Clean, minimal interface
- Clear visual hierarchy
- Responsive layout
- Smooth transitions and hover effects

## Development Workflow

1. **Backend:**
   - `npm run dev` - Development with auto-reload (tsx watch)
   - `npm run build` - Compile TypeScript
   - `npm start` - Run production build
   - `npm run prisma:migrate` - Run database migrations
   - `npm run prisma:generate` - Generate Prisma client
   - `npm run ingest:overpass` - Rebuild routing graph

2. **Frontend:**
   - `npm run dev` - Development server
   - `npm run build` - Production build
   - `npm start` - Run production build

## Security Considerations

- Passwords never stored in plaintext (bcrypt hashing)
- JWT tokens for stateless authentication
- Protected routes require valid token
- CORS configured for frontend origin
- Input validation on all endpoints
- SQL injection prevented by Prisma ORM

## Future Enhancements (Not Implemented)

- Real-time location updates via WebSockets
- Push notifications for buddy requests
- Route sharing between users
- Historical route tracking
- Accessibility report submission
- Building/room search for precise indoor navigation

## Dependencies

**Backend:**
- express, cors, dotenv
- @prisma/client, prisma
- bcryptjs, jsonwebtoken
- node-fetch
- geojson-vt, vt-pbf, pbf (for vector tiles)

**Frontend:**
- next, react, react-dom
- mapbox-gl
- (No additional UI libraries - pure React)

## Notes for AI Model Understanding

1. **Routing is profile-based:** Each profile has completely different cost functions, resulting in different optimal paths
2. **Graph is pre-built:** The routing graph is generated from OSM data, not queried in real-time
3. **Location tracking is passive:** User location only updates when they set a start point, not continuously
4. **Buddy system is proximity-based:** Only shows users within 500m who were active in last 5 minutes
5. **Campus-restricted:** All routing and features are limited to UofC campus bounding box
6. **No real-time updates:** Buddy panel refreshes via polling (10s interval), not WebSockets
7. **Authentication is JWT-based:** Stateless, token stored in localStorage
8. **Map interaction is click-based:** No drag-to-route, no waypoint editing - simple start/end selection

This project demonstrates a complete full-stack application with:
- Custom pathfinding algorithm
- Multiple routing profiles with different optimization goals
- User authentication and social features
- Real-world map integration
- Accessibility-first design philosophy


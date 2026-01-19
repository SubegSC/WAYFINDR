
export type Coord = [number, number]; // [lng, lat]

export type Edge = {
  id: string;
  from: number;
  to: number;
  coords: Coord[];
  length?: number;

  // accessibility & sustainability attrs
  is_stairs?: boolean;
  surface?: string;
  smoothness?: string;
  lighting?: boolean;
  width?: number;
  footway?: string;     // sidewalk|crossing
  crossing?: string;    // zebra|traffic_signals|...
  incline_pct?: number;
  turn_complexity?: number;
  has_curb_ramp?: boolean;
  tactile_paving?: boolean;
  transit_nearby?: boolean;
  indoor?: boolean;     // indoor route (covered, tunnel, or inside building)
  has_elevator?: boolean;  // elevator available nearby
  has_handrail?: boolean;  // handrail/guardrail present
  min_width?: number;      // minimum width requirement
  audio_beacon?: boolean;  // audio signals/beacons for visually impaired
  high_contrast?: boolean; // high contrast markings
  obstacle_free?: boolean; // path is clear of obstacles
  consistent_lighting?: boolean; // consistent lighting levels
};

export type Graph = {
  nodes: { id: number; coord: Coord }[];
  edges: Edge[];
  index?: Record<number, number[]>; // node -> edge indices
};

declare module 'geojson-vt' {
  interface Options {
    maxZoom?: number;
    indexMaxZoom?: number;
    indexMaxPoints?: number;
  }
  interface Tile {
    features: any[];
  }
  interface TileIndex {
    getTile(z: number, x: number, y: number): Tile | null;
  }
  function geojsonvt(data: any, options?: Options): TileIndex;
  export = geojsonvt;
}

declare module 'vt-pbf' {
  interface GeojsonVt {
    fromGeojsonVt(data: any): ArrayLike<number>;
  }
  const vtpbf: GeojsonVt;
  export = vtpbf;
}


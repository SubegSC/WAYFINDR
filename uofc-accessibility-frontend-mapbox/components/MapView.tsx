
'use client';
import mapboxgl from 'mapbox-gl';
import React,{useRef,useEffect,forwardRef,useImperativeHandle} from 'react';
import {API_BASE} from '../lib/api';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken=process.env.NEXT_PUBLIC_MAPBOX_TOKEN||'';

// UofC Campus bounding box: [south, west, north, east]
const CAMPUS_BBOX = [51.0745, -114.1360, 51.0825, -114.1260];
// Mapbox format: [[west, south], [east, north]]
const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [CAMPUS_BBOX[1], CAMPUS_BBOX[0]], // [west, south]
  [CAMPUS_BBOX[3], CAMPUS_BBOX[2]]  // [east, north]
];

export type MapRef={
 flyTo:(c:[number,number])=>void;
 fitToCoordinates:(coords:[number,number][])=>void;
 locateMe:()=>void;
 getCenter:()=>[number,number]|null;
 addPOIs:(pts:{lng:number,lat:number,type:string}[])=>void;
};

export default forwardRef<MapRef, {route?:any, onMapClick?:(lng:number,lat:number)=>void, start?:[number,number]|null, end?:[number,number]|null}>((props, ref)=>{
 const containerRef=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<mapboxgl.Map|null>(null);
 const markersRef=useRef<mapboxgl.Marker[]>([]);

  useEffect(()=>{
  if(mapRef.current) return;
  const map=new mapboxgl.Map({
    container:containerRef.current!,
    style:'mapbox://styles/mapbox/streets-v12',
    center:[-114.1316,51.0788],
    zoom:15,
    maxBounds:CAMPUS_BOUNDS, // Restrict panning to campus area
    minZoom:14, // Prevent zooming out too far
    maxZoom:18
  });
  mapRef.current=map;
  
  // Fit to campus bounds on load
  map.fitBounds(CAMPUS_BOUNDS, {padding:50});

  map.on('load',()=>{
    // Add campus boundary indicator
    map.addSource('campus-boundary',{
      type:'geojson',
      data:{
        type:'FeatureCollection',
        features:[{
          type:'Feature',
          properties:{},
          geometry:{
            type:'Polygon',
            coordinates:[[
              [CAMPUS_BBOX[1], CAMPUS_BBOX[0]], // SW
              [CAMPUS_BBOX[3], CAMPUS_BBOX[0]], // SE
              [CAMPUS_BBOX[3], CAMPUS_BBOX[2]], // NE
              [CAMPUS_BBOX[1], CAMPUS_BBOX[2]], // NW
              [CAMPUS_BBOX[1], CAMPUS_BBOX[0]]  // Close polygon
            ]]
          }
        }]
      }
    });
    
             // Add boundary outline
             map.addLayer({
               id:'campus-boundary-outline',
               type:'line',
               source:'campus-boundary',
               paint:{
                 'line-color':'#5a93c6',
                 'line-width':3,
                 'line-opacity':0.7,
                 'line-dasharray':[2,2]
               }
             });
             
             // Add semi-transparent fill to show restricted area
             map.addLayer({
               id:'campus-boundary-fill',
               type:'fill',
               source:'campus-boundary',
               paint:{
                 'fill-color':'#5a93c6',
                 'fill-opacity':0.06
               }
             });
    
    map.addSource('reports',{
      type:'vector',
      tiles:[`${API_BASE}/api/tiles/heatmap/{z}/{x}/{y}.mvt`],
      minzoom:0,maxzoom:16
    });
    map.addLayer({
      id:'reports-circles',type:'circle',source:'reports','source-layer':'heat',
      paint:{'circle-radius':4,'circle-opacity':0.4}
    });
  });

  return()=>{map.remove(); mapRef.current=null;};
 },[]);

 // Set up click handler
 useEffect(()=>{
  const map=mapRef.current;
  if(!map) return;
  
  const handleClick=(e:any)=>{
    if(props.onMapClick){
      props.onMapClick(e.lngLat.lng, e.lngLat.lat);
    }
  };
  
  map.on('click',handleClick);
  return()=>{
    map.off('click',handleClick);
  };
 },[props.onMapClick]);

 useEffect(()=>{
  const map=mapRef.current;
  if(!map) return;
  const src='route-src', layer='route-line';
  if(!props.route){
    if(map.getLayer(layer)) map.removeLayer(layer);
    if(map.getSource(src)) map.removeSource(src);
    return;
  }
  if(!map.getSource(src))
    map.addSource(src,{type:'geojson',data:props.route});
  else (map.getSource(src) as any).setData(props.route);
  if(!map.getLayer(layer)){
    map.addLayer({
      id:layer,
      type:'line',
      source:src,
      paint:{
        'line-width':6,
        'line-color':'#5a93c6',
        'line-opacity':0.9,
        'line-blur':0.5
      }
    });
  }
 },[props.route]);

 // Update markers for start/end points
 useEffect(()=>{
  const map=mapRef.current;
  if(!map) return;
  
  // Remove existing markers
  markersRef.current.forEach(marker=>marker.remove());
  markersRef.current=[];
  
  // Add start marker (green) - improved design
  if(props.start){
    const startEl=document.createElement('div');
    startEl.style.cssText='width:32px;height:32px;background:#10b981;border:4px solid #ffffff;border-radius:50%;cursor:pointer;box-shadow:0 4px 12px rgba(16, 185, 129, 0.4), 0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;';
    startEl.innerHTML='📍';
    const startMarker=new mapboxgl.Marker({element:startEl, anchor:'bottom'}).setLngLat(props.start).addTo(map);
    markersRef.current.push(startMarker);
  }
  
  // Add end marker (red) - improved design
  if(props.end){
    const endEl=document.createElement('div');
    endEl.style.cssText='width:32px;height:32px;background:#ef4444;border:4px solid #ffffff;border-radius:50%;cursor:pointer;box-shadow:0 4px 12px rgba(239, 68, 68, 0.4), 0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;';
    endEl.innerHTML='🎯';
    const endMarker=new mapboxgl.Marker({element:endEl, anchor:'bottom'}).setLngLat(props.end).addTo(map);
    markersRef.current.push(endMarker);
  }
 },[props.start,props.end]);

 useImperativeHandle(ref,()=>({
  flyTo(c){mapRef.current?.flyTo({center:c,zoom:16});},
  fitToCoordinates(coords){
   if(!coords?.length) return;
   let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
   for(const [x,y] of coords){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
   // Ensure bounds stay within campus area
   const bounds:[[number,number],[number,number]] = [
     [Math.max(minX, CAMPUS_BBOX[1]), Math.max(minY, CAMPUS_BBOX[0])],
     [Math.min(maxX, CAMPUS_BBOX[3]), Math.min(maxY, CAMPUS_BBOX[2])]
   ];
   mapRef.current?.fitBounds(bounds,{padding:40});
  },
  locateMe(){
    navigator.geolocation?.getCurrentPosition(pos=>{
      mapRef.current?.flyTo({center:[pos.coords.longitude,pos.coords.latitude],zoom:17});
    });
  },
  getCenter(){
    const c=mapRef.current?.getCenter(); if(!c) return null;
    return [c.lng,c.lat];
  },
  addPOIs(points){ /* simplified; not needed for demo */ }
 }),[]);

 return <div ref={containerRef} style={{width:'100%',height:'100%'}} />;
});

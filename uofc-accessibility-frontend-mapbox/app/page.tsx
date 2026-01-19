
'use client';
import React,{useRef,useState,useEffect} from 'react';
import Map,{MapRef} from '../components/MapView';
import LoginModal from '../components/LoginModal';
import BuddyPanel from '../components/BuddyPanel';
import MessagesPanel from '../components/MessagesPanel';
import {geocodeQuery,postRoute,getCurrentUser,clearAuthToken,updateLocation} from '../lib/api';

// Export shareLocation function for BuddyPanel
export function shareMapLocation(lat:number,lng:number){
 updateLocation(lat,lng);
}

export default function Home(){
 const mapRef=useRef<MapRef>(null);
 const [start,setStart]=useState<[number,number]|null>(null);
 const [end,setEnd]=useState<[number,number]|null>(null);
 const [profile,setProfile]=useState('default'); // Default to shortest path
 const [route,setRoute]=useState<any>(null);
 const [status,setStatus]=useState('Click on the map to set start point');
 const [routeReasoning,setRouteReasoning]=useState<string|null>(null);
 const [user,setUser]=useState<any>(null);
 const [showLogin,setShowLogin]=useState(false);
 const [showBuddy,setShowBuddy]=useState(false);
 const [showMessages,setShowMessages]=useState(false);
 const [darkMode,setDarkMode]=useState(false);

 useEffect(()=>{
  // Load dark mode preference from localStorage
  const saved=localStorage.getItem('darkMode');
  if(saved!==null){
   setDarkMode(saved==='true');
  }
 },[]);

 useEffect(()=>{
  // Apply dark mode class to document
  if(darkMode){
   document.documentElement.classList.add('dark');
  }else{
   document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('darkMode',darkMode.toString());
 },[darkMode]);

 useEffect(()=>{
  checkAuth();
 },[]);

 useEffect(()=>{
  if(user&&start){
   updateLocation(start[1],start[0]);
  }
 },[user,start]);

 async function checkAuth(){
  const res=await getCurrentUser();
  if(res?.ok&&res?.user){
   setUser(res.user);
  }
 }

 function handleLoginSuccess(userData:any,token:string){
  setUser(userData);
  setShowLogin(false);
 }

 function handleLogout(){
  clearAuthToken();
  setUser(null);
  setShowBuddy(false);
 }

 function handleMapClick(lng:number,lat:number){
  if(!start){
   setStart([lng,lat]);
   setStatus('Start point set! Click again to set end point');
  }else if(!end){
   setEnd([lng,lat]);
   setStatus('End point set! Click "Get Route" to calculate route');
  }else{
   // Reset and set new start
   setStart([lng,lat]);
   setEnd(null);
   setRoute(null);
   setStatus('Start point updated! Click again to set end point');
  }
 }

 async function routeNow(){
  if(!start||!end){
   setStatus('Please set both start and end points by clicking on the map');
   return;
  }
  setStatus('Calculating route...');
  setRouteReasoning(null);
  const res=await postRoute(start,end,profile);
  if(res?.coords){
   setRoute({
    type:'FeatureCollection',
    features:[
     {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:res.coords}}
    ]
   });
   mapRef.current?.fitToCoordinates(res.coords);
   const distance=(res.length || 0).toFixed(0);
   setStatus(`Route found! Distance: ${distance}m`);
   if(res.reasoning?.summary){
    setRouteReasoning(res.reasoning.summary);
   }
  }else{
   const errorMsg = res?.error || 'unknown';
   let userMsg = 'No route found. Try different points.';
   if (errorMsg === 'start_point_too_far' || errorMsg === 'end_point_too_far') {
    userMsg = 'Point too far from available paths. Click closer to campus walkways.';
   } else if (errorMsg === 'start_node_disconnected' || errorMsg === 'end_node_disconnected') {
    userMsg = 'Selected point is not connected to the path network. Try a different location.';
   } else if (errorMsg === 'same_start_end') {
    userMsg = 'Start and end points are the same. Please select different points.';
   }
   setStatus(userMsg);
   setRouteReasoning(null);
  }
 }

 function clearRoute(){
  setStart(null);
  setEnd(null);
  setRoute(null);
  setRouteReasoning(null);
  setStatus('Click on the map to set start point');
 }

 const bgColor=darkMode?'#1a1a1a':'#ffffff';
 const textColor=darkMode?'#f0f0f0':'#1a1a1a';
 const cardBg=darkMode?'#2a2a2a':'#ffffff';
 const borderColor=darkMode?'#3a3a3a':'#e0e0e0';

 return(
  <div style={{height:'100vh',display:'flex',flexDirection:'column',background:bgColor,color:textColor}}>
    {/* Header */}
    <div style={{
      background:darkMode?'#1e2d3f':'#233c52',
      padding:'20px 32px',
      boxShadow:'0 2px 12px rgba(0,0,0,0.1)',
      color:'white',
      display:'flex',
      justifyContent:'space-between',
      alignItems:'center',
      borderBottom:'3px solid #5a93c6'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
        <img 
         src="/logo.webp" 
         alt="WAYFINDR Logo" 
         style={{
          height:'48px',
          width:'auto',
          objectFit:'contain'
         }}
         onError={(e)=>{
          // Hide image if it doesn't exist
          (e.target as HTMLImageElement).style.display='none';
         }}
        />
        <div>
          <h1 style={{margin:0,fontSize:'28px',fontWeight:700,marginBottom:'2px',letterSpacing:'-0.5px'}}>WAYFINDR</h1>
          <p style={{margin:0,fontSize:'13px',opacity:0.95,fontWeight:400,letterSpacing:'0.5px'}}>JOURNEY SMART</p>
        </div>
      </div>
      <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
        {user?(
         <>
          <div style={{textAlign:'right'}}>
           <div style={{fontSize:'14px',fontWeight:600}}>{user.name||user.username}</div>
           <div style={{fontSize:'12px',opacity:0.8}}>@{user.username}</div>
          </div>
          <button
           onClick={()=>setDarkMode(!darkMode)}
           style={{
            padding:'10px 14px',
            background:'rgba(255,255,255,0.15)',
            color:'white',
            border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:'8px',
            fontSize:'18px',
            fontWeight:600,
            cursor:'pointer',
            transition:'all 0.2s ease',
            display:'flex',
            alignItems:'center',
            justifyContent:'center'
           }}
           onMouseEnter={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.5)';
           }}
           onMouseLeave={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';
           }}
           title={darkMode?'Switch to Light Mode':'Switch to Dark Mode'}
          >
           {darkMode?'☀️':'🌙'}
          </button>
          <button
           onClick={()=>setShowBuddy(!showBuddy)}
           style={{
            padding:'10px 18px',
            background:'rgba(255,255,255,0.15)',
            color:'white',
            border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:'8px',
            fontSize:'13px',
            fontWeight:600,
            cursor:'pointer',
            transition:'all 0.2s ease'
           }}
           onMouseEnter={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.5)';
           }}
           onMouseLeave={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';
           }}
          >
           👥 Buddy Walk
          </button>
          <button
           onClick={()=>setShowMessages(!showMessages)}
           style={{
            padding:'10px 18px',
            background:'rgba(255,255,255,0.15)',
            color:'white',
            border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:'8px',
            fontSize:'13px',
            fontWeight:600,
            cursor:'pointer',
            transition:'all 0.2s ease'
           }}
           onMouseEnter={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.5)';
           }}
           onMouseLeave={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';
           }}
          >
           💬 Messages
          </button>
          <button
           onClick={handleLogout}
           style={{
            padding:'10px 18px',
            background:'rgba(255,255,255,0.15)',
            color:'white',
            border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:'8px',
            fontSize:'13px',
            fontWeight:600,
            cursor:'pointer',
            transition:'all 0.2s ease'
           }}
           onMouseEnter={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.5)';
           }}
           onMouseLeave={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';
           }}
          >
           Logout
          </button>
         </>
        ):(
         <>
          <button
           onClick={()=>setDarkMode(!darkMode)}
           style={{
            padding:'10px 14px',
            background:'rgba(255,255,255,0.15)',
            color:'white',
            border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:'8px',
            fontSize:'18px',
            fontWeight:600,
            cursor:'pointer',
            transition:'all 0.2s ease',
            display:'flex',
            alignItems:'center',
            justifyContent:'center'
           }}
           onMouseEnter={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.5)';
           }}
           onMouseLeave={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';
           }}
           title={darkMode?'Switch to Light Mode':'Switch to Dark Mode'}
          >
           {darkMode?'☀️':'🌙'}
          </button>
          <button
           onClick={()=>setShowLogin(true)}
           style={{
            padding:'10px 20px',
            background:'rgba(255,255,255,0.15)',
            color:'white',
            border:'1.5px solid rgba(255,255,255,0.3)',
            borderRadius:'8px',
            fontSize:'13px',
            fontWeight:600,
            cursor:'pointer',
            transition:'all 0.2s ease'
           }}
           onMouseEnter={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.25)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.5)';
           }}
           onMouseLeave={(e)=>{
            e.currentTarget.style.background='rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';
           }}
          >
           Login / Sign Up
          </button>
         </>
        )}
      </div>
    </div>

    {/* Controls Panel */}
    <div style={{
      padding:'20px 32px',
      background:cardBg,
      borderBottom:`1px solid ${borderColor}`,
      boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
      display:'flex',
      gap:'16px',
      alignItems:'center',
      flexWrap:'wrap'
    }}>
      <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          <label style={{fontSize:'11px',fontWeight:600,color:darkMode?'#999':'#666',textTransform:'uppercase',letterSpacing:'0.8px'}}>Route Profile</label>
          <select 
            value={profile} 
            onChange={e=>setProfile(e.target.value)} 
            style={{
              padding:'12px 18px',
              fontSize:'14px',
              border:`2px solid ${borderColor}`,
              borderRadius:'8px',
              backgroundColor:cardBg,
              color:textColor,
              cursor:'pointer',
              fontWeight:500,
              minWidth:'240px',
              outline:'none',
              transition:'all 0.2s ease'
            }}
            onFocus={(e)=>e.currentTarget.style.borderColor='#5a93c6'}
            onBlur={(e)=>e.currentTarget.style.borderColor=borderColor}
          >
            <option value="default">📍 Default (Shortest Path)</option>
            <option value="wheelchair">♿ Wheelchair Accessible</option>
            <option value="visually_impaired">👁️ Visually Impaired</option>
            <option value="eco">🌿 Eco (Outdoor Nature)</option>
          </select>
        </div>

        <button 
          onClick={routeNow} 
          style={{
            padding:'12px 28px',
            fontSize:'14px',
            fontWeight:600,
            background:'#5a93c6',
            color:'white',
            border:'none',
            borderRadius:'8px',
            cursor:'pointer',
            boxShadow:'0 2px 8px rgba(90, 147, 198, 0.3)',
            alignSelf:'flex-end',
            transition:'all 0.2s ease'
          }}
          onMouseEnter={(e)=>{
            e.currentTarget.style.background='#4a83b6';
            e.currentTarget.style.boxShadow='0 4px 12px rgba(90, 147, 198, 0.4)';
          }}
          onMouseLeave={(e)=>{
            e.currentTarget.style.background='#5a93c6';
            e.currentTarget.style.boxShadow='0 2px 8px rgba(90, 147, 198, 0.3)';
          }}
        >
          Get Route
        </button>

        <button 
          onClick={clearRoute} 
          style={{
            padding:'12px 24px',
            fontSize:'14px',
            fontWeight:500,
            backgroundColor:darkMode?'#3a3a3a':'#f5f5f5',
            color:darkMode?'#e0e0e0':'#666',
            border:`2px solid ${borderColor}`,
            borderRadius:'8px',
            cursor:'pointer',
            alignSelf:'flex-end',
            transition:'all 0.2s ease'
          }}
          onMouseEnter={(e)=>{
            e.currentTarget.style.backgroundColor=darkMode?'#4a4a4a':'#eeeeee';
            e.currentTarget.style.borderColor=darkMode?'#5a5a5a':'#d0d0d0';
          }}
          onMouseLeave={(e)=>{
            e.currentTarget.style.backgroundColor=darkMode?'#3a3a3a':'#f5f5f5';
            e.currentTarget.style.borderColor=borderColor;
          }}
        >
          Clear
        </button>
      </div>

      <div style={{
        marginLeft:'auto',
        padding:'12px 20px',
        background:darkMode?'#2a2a2a':'#f8f9fa',
        borderRadius:'8px',
        border:`1px solid ${borderColor}`,
        minWidth:'240px'
      }}>
        <div style={{fontSize:'11px',fontWeight:600,color:darkMode?'#999':'#666',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'}}>Status</div>
        <div style={{fontSize:'13px',color:textColor,fontWeight:500}}>{status}</div>
      </div>
    </div>

    {/* Route Reasoning */}
    {routeReasoning && (
      <div style={{
        padding:'14px 32px',
        background:darkMode?'#2a3a4a':'#e8f0f7',
        borderBottom:`1px solid ${darkMode?'#3a4a5a':'#d0e0f0'}`,
        fontSize:'13px',
        color:darkMode?'#a0c0e0':'#233c52',
        display:'flex',
        alignItems:'center',
        gap:'10px',
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.5)'
      }}>
        <span style={{fontSize:'18px'}}>💡</span>
        <div>
          <strong style={{fontWeight:600}}>Why this route?</strong> {routeReasoning}
        </div>
      </div>
    )}

    {/* Map Container */}
    <div style={{flex:1,position:'relative',background:darkMode?'#1a1a1a':'#e9ecef'}}>
      <Map ref={mapRef} route={route} onMapClick={handleMapClick} start={start} end={end}/>
      
      {/* Instructions Overlay */}
      {!start && !end && (
        <div style={{
          position:'absolute',
          top:'24px',
          left:'24px',
          background:darkMode?'rgba(42,42,42,0.98)':'rgba(255,255,255,0.98)',
          padding:'20px 24px',
          borderRadius:'12px',
          boxShadow:'0 4px 16px rgba(0,0,0,0.15)',
          zIndex:1000,
          maxWidth:'320px',
          border:`2px solid #5a93c6`
        }}>
          <div style={{fontSize:'15px',fontWeight:700,color:darkMode?'#a0c0e0':'#233c52',marginBottom:'10px',display:'flex',alignItems:'center',gap:'10px'}}>
            <span>📍</span> How to use
          </div>
          <div style={{fontSize:'13px',color:darkMode?'#ccc':'#666',lineHeight:'1.6'}}>
            Click on the map to set your <strong style={{color:textColor}}>start point</strong> (green marker), then click again to set your <strong style={{color:textColor}}>end point</strong> (red marker).
          </div>
        </div>
      )}
    </div>

    {/* Login Modal */}
    {showLogin&&(
     <LoginModal
      onSuccess={handleLoginSuccess}
      onClose={()=>setShowLogin(false)}
      darkMode={darkMode}
     />
    )}

    {/* Buddy Panel */}
    {showBuddy&&user&&(
     <BuddyPanel
      user={user}
      onClose={()=>setShowBuddy(false)}
      onMapClick={(lat,lng)=>{
       updateLocation(lat,lng);
      }}
      darkMode={darkMode}
     />
    )}

    {/* Messages Panel */}
    {showMessages&&user&&(
     <MessagesPanel
      user={user}
      onClose={()=>setShowMessages(false)}
      darkMode={darkMode}
     />
    )}
  </div>
 );
}

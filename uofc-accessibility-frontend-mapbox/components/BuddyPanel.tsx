'use client';
import React,{useState,useEffect} from 'react';
import {getNearbyUsers,sendBuddyRequest,getBuddyRequests,respondToRequest,updateLocation} from '../lib/api';

type Props={
 user:any;
 onClose:()=>void;
 onMapClick?:(lat:number,lng:number)=>void;
 darkMode?:boolean;
};

export default function BuddyPanel({user,onClose,onMapClick,darkMode=false}:Props){
 const bgColor=darkMode?'#2a2a2a':'white';
 const textColor=darkMode?'#f0f0f0':'#212529';
 const borderColor=darkMode?'#3a3a3a':'#e9ecef';
 const cardBg=darkMode?'#1a1a1a':'#f8f9fa';
 const [nearby,setNearby]=useState<any[]>([]);
 const [requests,setRequests]=useState<any[]>([]);
 const [activeTab,setActiveTab]=useState<'nearby'|'requests'>('nearby');
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState<Record<number,string>>({});
 const [userLocation,setUserLocation]=useState<{lat:number,lng:number}|null>(null);
 const [locationSharing,setLocationSharing]=useState(false);

 useEffect(()=>{
  loadData();
  const interval=setInterval(loadData,10000); // Refresh every 10 seconds
  return()=>clearInterval(interval);
 },[]);

 useEffect(()=>{
  // Try to get user's current location from map if available
  if(navigator.geolocation){
   navigator.geolocation.getCurrentPosition(
    (pos)=>{
     const lat=pos.coords.latitude;
     const lng=pos.coords.longitude;
     setUserLocation({lat,lng});
    },
    ()=>{},
    {enableHighAccuracy:true,timeout:5000}
   );
  }
 },[]);

 async function loadData(){
  setLoading(true);
  try{
   const [nearbyRes,requestsRes]=await Promise.all([
    getNearbyUsers(1000), // Increased to 1000m for easier testing
    getBuddyRequests('all')
   ]);
   if(nearbyRes?.users) setNearby(nearbyRes.users);
   if(requestsRes?.requests) setRequests(requestsRes.requests);
  }catch(e){
   console.error('Failed to load buddy data',e);
  }finally{
   setLoading(false);
  }
 }

 async function shareLocation(){
  if(!userLocation) return;
  setLocationSharing(true);
  try{
   const res=await updateLocation(userLocation.lat,userLocation.lng);
   if(res?.ok){
    await loadData(); // Refresh immediately
    alert('Location shared! Other users can now see you.');
   }
  }catch(e){
   console.error('Failed to share location',e);
   alert('Failed to share location. Please try again.');
  }finally{
   setLocationSharing(false);
  }
 }

 async function shareMapLocation(lat:number,lng:number){
  setLocationSharing(true);
  try{
   const res=await updateLocation(lat,lng);
   if(res?.ok){
    setUserLocation({lat,lng});
    await loadData();
   }
  }catch(e){
   console.error('Failed to share location',e);
  }finally{
   setLocationSharing(false);
  }
 }

 async function handleSendRequest(receiverId:number){
  const msg=message[receiverId]||'';
  setLoading(true);
  try{
   const res=await sendBuddyRequest(receiverId,msg);
   if(res?.ok){
    setMessage({...message,[receiverId]:''});
    await loadData();
    alert('Buddy request sent!');
   }else{
    alert(res?.error||'Failed to send request. '+(res?.error||'Unknown error'));
   }
  }catch(e){
   console.error('Failed to send request',e);
   alert('Failed to send request. Please try again.');
  }finally{
   setLoading(false);
  }
 }

 async function handleRespond(requestId:number,action:'accept'|'reject'){
  setLoading(true);
  try{
   const res=await respondToRequest(requestId,action);
   if(res?.ok){
    await loadData();
   }
  }catch(e){
   console.error('Failed to respond',e);
  }finally{
   setLoading(false);
  }
 }

 return(
  <div style={{
   position:'fixed',
   top:0,
   right:0,
   width:'400px',
   height:'100vh',
   background:bgColor,
   boxShadow:'-4px 0 12px rgba(0,0,0,0.15)',
   zIndex:1000,
   display:'flex',
   flexDirection:'column',
   color:textColor
  }}>
   <div style={{
    padding:'20px 24px',
    background:'#233c52',
    color:'white',
    borderBottom:'3px solid #5a93c6'
   }}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
     <h3 style={{margin:0,fontSize:'20px',fontWeight:700,letterSpacing:'-0.3px'}}>👥 Buddy Walk</h3>
     <button onClick={onClose} style={{
      background:'rgba(255,255,255,0.2)',
      border:'none',
      color:'white',
      borderRadius:'4px',
      width:'32px',
      height:'32px',
      cursor:'pointer',
      fontSize:'20px'
     }}>×</button>
    </div>
    <div style={{fontSize:'12px',opacity:0.9,marginTop:'4px'}}>Find walking buddies nearby</div>
   </div>

   <div style={{
    display:'flex',
    borderBottom:`1px solid ${borderColor}`
   }}>
    <button
     onClick={()=>setActiveTab('nearby')}
     style={{
      flex:1,
      padding:'14px',
      background:activeTab==='nearby'?cardBg:bgColor,
      border:'none',
      borderBottom:activeTab==='nearby'?'3px solid #5a93c6':'none',
      cursor:'pointer',
      fontWeight:activeTab==='nearby'?600:400,
      fontSize:'14px',
      transition:'all 0.2s ease',
      color:textColor
     }}
    >
     Nearby ({nearby.length})
    </button>
    <button
     onClick={()=>setActiveTab('requests')}
     style={{
      flex:1,
      padding:'14px',
      background:activeTab==='requests'?cardBg:bgColor,
      border:'none',
      borderBottom:activeTab==='requests'?'3px solid #5a93c6':'none',
      cursor:'pointer',
      fontWeight:activeTab==='requests'?600:400,
      fontSize:'14px',
      transition:'all 0.2s ease',
      color:textColor
     }}
    >
     Requests ({requests.filter((r:any)=>r.status==='pending').length})
    </button>
   </div>

   <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
    {activeTab==='nearby'&&(
     <div style={{
      padding:'12px',
      background:'#e3f2fd',
      borderRadius:'8px',
      marginBottom:'16px',
      fontSize:'12px',
      color:'#1565c0'
     }}>
      <strong>📍 Share Your Location:</strong>
      <div style={{marginTop:'8px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
       <button
        onClick={shareLocation}
        disabled={!userLocation||locationSharing}
        style={{
         padding:'10px 18px',
         background:userLocation&&!locationSharing?'#5a93c6':'#95a5a6',
         color:'white',
         border:'none',
         borderRadius:'8px',
         fontSize:'12px',
         fontWeight:600,
         cursor:userLocation&&!locationSharing?'pointer':'not-allowed',
         boxShadow:userLocation&&!locationSharing?'0 2px 6px rgba(90, 147, 198, 0.3)':'none',
         transition:'all 0.2s ease'
        }}
        onMouseEnter={(e)=>{
         if(userLocation&&!locationSharing){
          e.currentTarget.style.background='#4a83b6';
         }
        }}
        onMouseLeave={(e)=>{
         if(userLocation&&!locationSharing){
          e.currentTarget.style.background='#5a93c6';
         }
        }}
       >
        {locationSharing?'Sharing...':'Share GPS Location'}
       </button>
       <div style={{fontSize:'11px',color:'#6c757d',alignSelf:'center'}}>
        Or click on the map to set your location
       </div>
      </div>
      {userLocation&&(
       <div style={{marginTop:'8px',fontSize:'11px',color:'#6c757d'}}>
        Your location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
       </div>
      )}
     </div>
    )}

    {loading&&(
     <div style={{textAlign:'center',padding:'20px',color:'#6c757d'}}>Loading...</div>
    )}

    {activeTab==='nearby'&&(
     <>
      {nearby.length===0&&!loading&&(
       <div style={{textAlign:'center',padding:'40px 20px',color:'#6c757d'}}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>📍</div>
        <div>No nearby users found</div>
        <div style={{fontSize:'12px',marginTop:'8px',color:'#495057'}}>
         <strong>To see other users:</strong><br/>
         1. Click "Share GPS Location" above, OR<br/>
         2. Click on the map to set your location<br/>
         <br/>
         Other users need to do the same within 1000m of you.
        </div>
       </div>
      )}
      {nearby.map((u:any)=>(
       <div key={u.id} style={{
        padding:'16px',
        border:`1px solid ${borderColor}`,
        borderRadius:'12px',
        marginBottom:'12px',
        background:cardBg
       }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:'8px'}}>
         <div>
          <div style={{fontWeight:600,fontSize:'14px',color:textColor}}>{u.name||u.username}</div>
          <div style={{fontSize:'12px',color:darkMode?'#999':'#6c757d'}}>@{u.username}</div>
         </div>
         <div style={{fontSize:'12px',color:'#5a93c6',fontWeight:600}}>{u.distance}m away</div>
        </div>
        <input
         type="text"
         placeholder="Optional message..."
         value={message[u.id]||''}
         onChange={e=>setMessage({...message,[u.id]:e.target.value})}
         style={{
          width:'100%',
          padding:'8px 10px',
          border:`1px solid ${borderColor}`,
          borderRadius:'6px',
          fontSize:'12px',
          marginBottom:'8px',
          outline:'none',
          background:darkMode?'#1a1a1a':'white',
          color:textColor
         }}
        />
        <button
         onClick={()=>handleSendRequest(u.id)}
         disabled={loading}
         style={{
          width:'100%',
          padding:'10px',
          background:'#5a93c6',
          color:'white',
          border:'none',
          borderRadius:'8px',
          fontSize:'12px',
          fontWeight:600,
          cursor:loading?'not-allowed':'pointer',
          boxShadow:'0 2px 6px rgba(90, 147, 198, 0.3)',
          transition:'all 0.2s ease'
         }}
         onMouseEnter={(e)=>{
          if(!loading){
           e.currentTarget.style.background='#4a83b6';
           e.currentTarget.style.boxShadow='0 4px 10px rgba(90, 147, 198, 0.4)';
          }
         }}
         onMouseLeave={(e)=>{
          if(!loading){
           e.currentTarget.style.background='#5a93c6';
           e.currentTarget.style.boxShadow='0 2px 6px rgba(90, 147, 198, 0.3)';
          }
         }}
        >
         Send Request
        </button>
       </div>
      ))}
     </>
    )}

    {activeTab==='requests'&&(
     <>
      {requests.length===0&&!loading&&(
       <div style={{textAlign:'center',padding:'40px 20px',color:'#6c757d'}}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>📬</div>
        <div>No requests</div>
       </div>
      )}
      {requests.map((req:any)=>(
       <div key={req.id} style={{
        padding:'16px',
        border:`1px solid ${borderColor}`,
        borderRadius:'12px',
        marginBottom:'12px',
        background:req.status==='pending'?(darkMode?'#3a2a1a':'#fff3cd'):cardBg
       }}>
        <div style={{fontSize:'12px',color:darkMode?'#999':'#6c757d',marginBottom:'8px'}}>
         {req.senderId===user.id?'Sent to':'From'} <strong style={{color:textColor}}>{req.senderId===user.id?req.receiver.username:req.sender.username}</strong>
        </div>
        {req.message&&(
         <div style={{fontSize:'13px',color:darkMode?'#ccc':'#495057',marginBottom:'8px',fontStyle:'italic'}}>"{req.message}"</div>
        )}
        <div style={{fontSize:'11px',color:darkMode?'#999':'#6c757d',marginBottom:'8px'}}>
         Status: <strong style={{color:req.status==='accepted'?'#10b981':req.status==='rejected'?'#ef4444':'#f59e0b'}}>{req.status}</strong>
        </div>
        {req.status==='pending'&&req.receiverId===user.id&&(
         <div style={{display:'flex',gap:'8px'}}>
          <button
           onClick={()=>handleRespond(req.id,'accept')}
           style={{
            flex:1,
            padding:'8px',
            background:'#10b981',
            color:'white',
            border:'none',
            borderRadius:'6px',
            fontSize:'12px',
            fontWeight:600,
            cursor:'pointer'
           }}
          >
           Accept
          </button>
          <button
           onClick={()=>handleRespond(req.id,'reject')}
           style={{
            flex:1,
            padding:'8px',
            background:'#ef4444',
            color:'white',
            border:'none',
            borderRadius:'6px',
            fontSize:'12px',
            fontWeight:600,
            cursor:'pointer'
           }}
          >
           Reject
          </button>
         </div>
        )}
       </div>
      ))}
     </>
    )}
   </div>
  </div>
 );
}


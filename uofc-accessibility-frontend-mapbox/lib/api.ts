
export const API_BASE=process.env.NEXT_PUBLIC_API_BASE||'http://localhost:3001';

// Auth helpers
export function getAuthToken():string|null{
 return localStorage.getItem('auth_token');
}

export function setAuthToken(token:string){
 localStorage.setItem('auth_token',token);
}

export function clearAuthToken(){
 localStorage.removeItem('auth_token');
}

// Auth API
export async function signup(email:string,username:string,password:string,name?:string){
 const r=await fetch(`${API_BASE}/api/auth/signup`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,username,password,name})
 });
 return r.json();
}

export async function login(email:string,password:string){
 const r=await fetch(`${API_BASE}/api/auth/login`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email,password})
 });
 return r.json();
}

export async function getCurrentUser(){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/auth/me`,{
  headers:{'Authorization':`Bearer ${token}`}
 });
 if(!r.ok) return null;
 return r.json();
}

// Buddy API
export async function updateLocation(lat:number,lng:number){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/buddy/location`,{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
  body:JSON.stringify({lat,lng})
 });
 return r.json();
}

export async function getNearbyUsers(distance?:number){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/buddy/nearby?distance=${distance||500}`,{
  headers:{'Authorization':`Bearer ${token}`}
 });
 if(!r.ok) return null;
 return r.json();
}

export async function sendBuddyRequest(receiverId:number,message?:string){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/buddy/request`,{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
  body:JSON.stringify({receiverId,message})
 });
 return r.json();
}

export async function getBuddyRequests(type?:'sent'|'received'|'all'){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/buddy/requests?type=${type||'all'}`,{
  headers:{'Authorization':`Bearer ${token}`}
 });
 if(!r.ok) return null;
 return r.json();
}

export async function respondToRequest(requestId:number,action:'accept'|'reject'){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/buddy/request/${requestId}/respond`,{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
  body:JSON.stringify({action})
 });
 return r.json();
}

export async function cancelRequest(requestId:number){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/buddy/request/${requestId}/cancel`,{
  method:'POST',
  headers:{'Authorization':`Bearer ${token}`}
 });
 return r.json();
}

// Messages API
export async function getConversations(){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/messages/conversations`,{
  headers:{'Authorization':`Bearer ${token}`}
 });
 if(!r.ok) return null;
 return r.json();
}

export async function getMessages(userId:number){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/messages/${userId}`,{
  headers:{'Authorization':`Bearer ${token}`}
 });
 if(!r.ok) return null;
 return r.json();
}

export async function sendMessage(userId:number,content:string){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/messages/${userId}`,{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
  body:JSON.stringify({content})
 });
 return r.json();
}

export async function getUnreadCount(){
 const token=getAuthToken();
 if(!token) return null;
 const r=await fetch(`${API_BASE}/api/messages/unread/count`,{
  headers:{'Authorization':`Bearer ${token}`}
 });
 if(!r.ok) return null;
 return r.json();
}

// Route API
export async function geocodeQuery(q:string){
 const r=await fetch(`${API_BASE}/api/geocode?q=${encodeURIComponent(q)}`);
 return r.json();
}

export async function postRoute(start:[number,number],end:[number,number],profile:string){
 const r=await fetch(`${API_BASE}/api/route`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({start,end,profile})
 });
 return r.json();
}

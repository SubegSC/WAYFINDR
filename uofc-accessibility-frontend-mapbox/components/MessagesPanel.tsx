'use client';
import React,{useState,useEffect,useRef} from 'react';
import {getConversations,getMessages,sendMessage,getUnreadCount} from '../lib/api';

type Props={
 user:any;
 onClose:()=>void;
 darkMode?:boolean;
};

export default function MessagesPanel({user,onClose,darkMode=false}:Props){
 const bgColor=darkMode?'#2a2a2a':'white';
 const textColor=darkMode?'#f0f0f0':'#212529';
 const borderColor=darkMode?'#3a3a3a':'#e9ecef';
 const cardBg=darkMode?'#1a1a1a':'#f8f9fa';
 const [conversations,setConversations]=useState<any[]>([]);
 const [selectedUser,setSelectedUser]=useState<any|null>(null);
 const [messages,setMessages]=useState<any[]>([]);
 const [newMessage,setNewMessage]=useState('');
 const [loading,setLoading]=useState(false);
 const [sending,setSending]=useState(false);
 const messagesEndRef=useRef<HTMLDivElement>(null);
 const [unreadCount,setUnreadCount]=useState(0);

 useEffect(()=>{
  loadConversations();
  loadUnreadCount();
  const interval=setInterval(()=>{
   loadConversations();
   loadUnreadCount();
   if(selectedUser){
    loadMessages(selectedUser.id);
   }
  },3000); // Refresh every 3 seconds
  return()=>clearInterval(interval);
 },[selectedUser]);

 useEffect(()=>{
  if(selectedUser){
   loadMessages(selectedUser.id);
  }
 },[selectedUser]);

 useEffect(()=>{
  messagesEndRef.current?.scrollIntoView({behavior:'smooth'});
 },[messages]);

 async function loadConversations(){
  try{
   const res=await getConversations();
   if(res?.ok&&res?.conversations){
    setConversations(res.conversations);
   }
  }catch(e){
   console.error('Failed to load conversations',e);
  }
 }

 async function loadMessages(userId:number){
  setLoading(true);
  try{
   const res=await getMessages(userId);
   if(res?.ok&&res?.messages){
    setMessages(res.messages);
   }
  }catch(e){
   console.error('Failed to load messages',e);
  }finally{
   setLoading(false);
  }
 }

 async function loadUnreadCount(){
  try{
   const res=await getUnreadCount();
   if(res?.ok){
    setUnreadCount(res.count||0);
   }
  }catch(e){
   // Ignore errors
  }
 }

 async function handleSendMessage(){
  if(!selectedUser||!newMessage.trim()||sending) return;
  
  setSending(true);
  try{
   const res=await sendMessage(selectedUser.id,newMessage.trim());
   if(res?.ok){
    setNewMessage('');
    await loadMessages(selectedUser.id);
    await loadConversations();
   }else{
    alert(res?.error||'Failed to send message');
   }
  }catch(e){
   console.error('Failed to send message',e);
   alert('Failed to send message');
  }finally{
   setSending(false);
  }
 }

 return(
  <div style={{
   position:'fixed',
   top:0,
   right:0,
   width:'500px',
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
     <h3 style={{margin:0,fontSize:'20px',fontWeight:700,letterSpacing:'-0.3px'}}>💬 Messages</h3>
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
    {unreadCount>0&&(
     <div style={{fontSize:'12px',opacity:0.9,marginTop:'4px'}}>
      {unreadCount} unread message{unreadCount!==1?'s':''}
     </div>
    )}
   </div>

   {!selectedUser?(
    <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
     {conversations.length===0?(
      <div style={{textAlign:'center',padding:'40px 20px',color:'#6c757d'}}>
       <div style={{fontSize:'48px',marginBottom:'12px'}}>💬</div>
       <div>No conversations yet</div>
       <div style={{fontSize:'12px',marginTop:'8px',color:'#495057'}}>
        Accept a buddy request to start messaging!
       </div>
      </div>
     ):(
      conversations.map((conv:any)=>(
       <div
        key={conv.id}
        onClick={()=>setSelectedUser(conv)}
        style={{
         padding:'16px',
         border:`1px solid ${borderColor}`,
         borderRadius:'12px',
         marginBottom:'12px',
         background:conv.unreadCount>0?(darkMode?'#3a2a1a':'#fff3cd'):cardBg,
         cursor:'pointer',
         display:'flex',
         justifyContent:'space-between',
         alignItems:'center'
        }}
       >
        <div style={{flex:1}}>
         <div style={{fontWeight:600,fontSize:'14px',color:textColor}}>
          {conv.name||conv.username}
          {conv.unreadCount>0&&(
           <span style={{
            marginLeft:'8px',
            background:'#ef4444',
            color:'white',
            borderRadius:'50%',
            padding:'2px 6px',
            fontSize:'11px',
            fontWeight:600
           }}>{conv.unreadCount}</span>
          )}
         </div>
         {conv.lastMessage&&(
          <div style={{fontSize:'12px',color:darkMode?'#999':'#6c757d',marginTop:'4px'}}>
           {conv.lastMessage.content.length>50
            ?conv.lastMessage.content.substring(0,50)+'...'
            :conv.lastMessage.content}
          </div>
         )}
        </div>
       </div>
      ))
     )}
    </div>
   ):(
    <>
     <div style={{
      padding:'12px 16px',
      borderBottom:`1px solid ${borderColor}`,
      display:'flex',
      alignItems:'center',
      gap:'12px',
      background:cardBg
     }}>
      <button
       onClick={()=>setSelectedUser(null)}
       style={{
        background:'none',
        border:'none',
        fontSize:'20px',
        cursor:'pointer',
        color:darkMode?'#999':'#6c757d'
       }}
      >←</button>
      <div>
       <div style={{fontWeight:600,fontSize:'14px',color:textColor}}>
        {selectedUser.name||selectedUser.username}
       </div>
       <div style={{fontSize:'11px',color:darkMode?'#999':'#6c757d'}}>@{selectedUser.username}</div>
      </div>
     </div>

     <div style={{flex:1,overflowY:'auto',padding:'16px',background:cardBg}}>
      {loading?(
       <div style={{textAlign:'center',padding:'20px',color:'#6c757d'}}>Loading...</div>
      ):messages.length===0?(
       <div style={{textAlign:'center',padding:'40px 20px',color:'#6c757d'}}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>💬</div>
        <div>No messages yet</div>
        <div style={{fontSize:'12px',marginTop:'8px'}}>Start the conversation!</div>
       </div>
      ):(
       messages.map((msg:any)=>(
        <div
         key={msg.id}
         style={{
          marginBottom:'12px',
          display:'flex',
          justifyContent:msg.senderId===user.id?'flex-end':'flex-start'
         }}
        >
         <div          style={{
          maxWidth:'70%',
          padding:'12px 16px',
          borderRadius:'12px',
          background:msg.senderId===user.id
           ?'#5a93c6'
           :(darkMode?'#3a3a3a':'white'),
          color:msg.senderId===user.id?'white':textColor,
          boxShadow:msg.senderId===user.id
           ?'0 2px 6px rgba(90, 147, 198, 0.3)'
           :'0 2px 4px rgba(0,0,0,0.1)',
          fontSize:'13px',
          lineHeight:'1.5'
         }}>
          {msg.content}
         </div>
        </div>
       ))
      )}
      <div ref={messagesEndRef}/>
     </div>

     <div style={{
      padding:'12px 16px',
      borderTop:`1px solid ${borderColor}`,
      background:bgColor,
      display:'flex',
      gap:'8px'
     }}>
      <input
       type="text"
       value={newMessage}
       onChange={e=>setNewMessage(e.target.value)}
       onKeyPress={e=>{
        if(e.key==='Enter'&&!e.shiftKey){
         e.preventDefault();
         handleSendMessage();
        }
       }}
       placeholder="Type a message..."
       style={{
        flex:1,
        padding:'10px 12px',
        border:`2px solid ${borderColor}`,
        borderRadius:'8px',
        fontSize:'13px',
        outline:'none',
        background:darkMode?'#1a1a1a':'white',
        color:textColor
       }}
      />
      <button
       onClick={handleSendMessage}
       disabled={!newMessage.trim()||sending}
       style={{
        padding:'12px 24px',
        background:newMessage.trim()&&!sending
         ?'#5a93c6'
         :'#95a5a6',
        color:'white',
        border:'none',
        borderRadius:'8px',
        fontSize:'13px',
        fontWeight:600,
        cursor:newMessage.trim()&&!sending?'pointer':'not-allowed',
        boxShadow:newMessage.trim()&&!sending?'0 2px 6px rgba(90, 147, 198, 0.3)':'none',
        transition:'all 0.2s ease'
       }}
       onMouseEnter={(e)=>{
        if(newMessage.trim()&&!sending){
         e.currentTarget.style.background='#4a83b6';
         e.currentTarget.style.boxShadow='0 4px 10px rgba(90, 147, 198, 0.4)';
        }
       }}
       onMouseLeave={(e)=>{
        if(newMessage.trim()&&!sending){
         e.currentTarget.style.background='#5a93c6';
         e.currentTarget.style.boxShadow='0 2px 6px rgba(90, 147, 198, 0.3)';
        }
       }}
      >
       {sending?'Sending...':'Send'}
      </button>
     </div>
    </>
   )}
  </div>
 );
}


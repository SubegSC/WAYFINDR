'use client';
import React,{useState} from 'react';
import {signup,login,setAuthToken} from '../lib/api';

type Props={
 onSuccess:(user:any,token:string)=>void;
 onClose:()=>void;
 darkMode?:boolean;
};

export default function LoginModal({onSuccess,onClose,darkMode=false}:Props){
 const bgColor=darkMode?'#2a2a2a':'white';
 const textColor=darkMode?'#f0f0f0':'#212529';
 const borderColor=darkMode?'#3a3a3a':'#e0e0e0';
 const inputBg=darkMode?'#1a1a1a':'white';
 const [isLogin,setIsLogin]=useState(true);
 const [email,setEmail]=useState('');
 const [username,setUsername]=useState('');
 const [password,setPassword]=useState('');
 const [name,setName]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);

 async function handleSubmit(e:React.FormEvent){
  e.preventDefault();
  setError('');
  setLoading(true);

  try{
   let res;
   if(isLogin){
    res=await login(email,password);
   }else{
    if(!username){
     setError('Username required');
     setLoading(false);
     return;
    }
    res=await signup(email,username,password,name);
   }

   if(res?.ok&&res?.token){
    setAuthToken(res.token);
    onSuccess(res.user,res.token);
   }else{
    setError(res?.error||'Failed to authenticate');
   }
  }catch(e:any){
   setError(e.message||'An error occurred');
  }finally{
   setLoading(false);
  }
 }

 return(
  <div style={{
   position:'fixed',
   top:0,left:0,right:0,bottom:0,
   background:'rgba(0,0,0,0.5)',
   display:'flex',
   alignItems:'center',
   justifyContent:'center',
   zIndex:10000
  }} onClick={onClose}>
   <div style={{
    background:bgColor,
    borderRadius:'16px',
    padding:'32px',
    maxWidth:'400px',
    width:'90%',
    boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
    color:textColor
   }} onClick={(e)=>e.stopPropagation()}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
      <h2 style={{margin:0,fontSize:'26px',fontWeight:700,color:darkMode?'#a0c0e0':'#233c52',letterSpacing:'-0.5px'}}>
       {isLogin?'Login':'Sign Up'}
      </h2>
     <button onClick={onClose} style={{
      background:'none',
      border:'none',
      fontSize:'24px',
      cursor:'pointer',
      color:darkMode?'#999':'#6c757d',
      padding:0,
      width:'32px',
      height:'32px',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      borderRadius:'4px'
     }}>×</button>
    </div>

    <form onSubmit={handleSubmit}>
     {!isLogin&&(
      <div style={{marginBottom:'16px'}}>
       <label style={{display:'block',fontSize:'14px',fontWeight:500,color:darkMode?'#ccc':'#495057',marginBottom:'6px'}}>Username</label>
       <input
        type="text"
        value={username}
        onChange={e=>setUsername(e.target.value)}
        style={{
         width:'100%',
         padding:'10px 12px',
         border:`2px solid ${borderColor}`,
         borderRadius:'8px',
         fontSize:'14px',
         outline:'none',
         background:inputBg,
         color:textColor
        }}
        required={!isLogin}
       />
      </div>
     )}

     <div style={{marginBottom:'16px'}}>
      <label style={{display:'block',fontSize:'14px',fontWeight:500,color:darkMode?'#ccc':'#495057',marginBottom:'6px'}}>Email</label>
      <input
       type="email"
       value={email}
       onChange={e=>setEmail(e.target.value)}
       style={{
        width:'100%',
        padding:'10px 12px',
        border:`2px solid ${borderColor}`,
        borderRadius:'8px',
        fontSize:'14px',
        outline:'none',
        background:inputBg,
        color:textColor
       }}
       required
      />
     </div>

     <div style={{marginBottom:'16px'}}>
      <label style={{display:'block',fontSize:'14px',fontWeight:500,color:darkMode?'#ccc':'#495057',marginBottom:'6px'}}>Password</label>
      <input
       type="password"
       value={password}
       onChange={e=>setPassword(e.target.value)}
       style={{
        width:'100%',
        padding:'10px 12px',
        border:`2px solid ${borderColor}`,
        borderRadius:'8px',
        fontSize:'14px',
        outline:'none',
        background:inputBg,
        color:textColor
       }}
       required
      />
     </div>

     {!isLogin&&(
      <div style={{marginBottom:'20px'}}>
       <label style={{display:'block',fontSize:'14px',fontWeight:500,color:darkMode?'#ccc':'#495057',marginBottom:'6px'}}>Name (Optional)</label>
       <input
        type="text"
        value={name}
        onChange={e=>setName(e.target.value)}
        style={{
         width:'100%',
         padding:'10px 12px',
         border:`2px solid ${borderColor}`,
         borderRadius:'8px',
         fontSize:'14px',
         outline:'none',
         background:inputBg,
         color:textColor
        }}
       />
      </div>
     )}

     {error&&(
      <div style={{
       padding:'10px',
       background:'#fee',
       color:'#c33',
       borderRadius:'8px',
       fontSize:'13px',
       marginBottom:'16px'
      }}>{error}</div>
     )}

     <button
      type="submit"
      disabled={loading}
      style={{
       width:'100%',
       padding:'14px',
       background:loading?'#95a5a6':'#5a93c6',
       color:'white',
       border:'none',
       borderRadius:'8px',
       fontSize:'14px',
       fontWeight:600,
       cursor:loading?'not-allowed':'pointer',
       marginBottom:'12px',
       boxShadow:loading?'none':'0 2px 8px rgba(90, 147, 198, 0.3)',
       transition:'all 0.2s ease'
      }}
      onMouseEnter={(e)=>{
       if(!loading){
        e.currentTarget.style.background='#4a83b6';
        e.currentTarget.style.boxShadow='0 4px 12px rgba(90, 147, 198, 0.4)';
       }
      }}
      onMouseLeave={(e)=>{
       if(!loading){
        e.currentTarget.style.background='#5a93c6';
        e.currentTarget.style.boxShadow='0 2px 8px rgba(90, 147, 198, 0.3)';
       }
      }}
     >
      {loading?'Please wait...':(isLogin?'Login':'Sign Up')}
     </button>

     <div style={{textAlign:'center',fontSize:'13px',color:darkMode?'#999':'#6c757d'}}>
      {isLogin?'Don\'t have an account? ':'Already have an account? '}
      <button
       type="button"
       onClick={()=>{setIsLogin(!isLogin);setError('');}}
       style={{
        background:'none',
        border:'none',
        color:'#5a93c6',
        cursor:'pointer',
        fontWeight:600,
        textDecoration:'underline'
       }}
      >
       {isLogin?'Sign up':'Login'}
      </button>
     </div>
    </form>
   </div>
  </div>
 );
}


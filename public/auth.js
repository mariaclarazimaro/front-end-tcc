/* Cliente de sessão Laravel. Credenciais e dados são mantidos no servidor. */
window.AuthClient=(()=>{
 let user=null,users=[],csrf=null;
 async function request(path,method='GET',body){
  if(method!=='GET'&&!csrf){const r=await fetch('/api/csrf',{credentials:'same-origin',headers:{Accept:'application/json'}});if(!r.ok)throw Error('Não foi possível iniciar uma sessão segura.');csrf=(await r.json()).token;}
  const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-TOKEN':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({message:'O servidor não respondeu como esperado.'}));
  if(!response.ok){const message=data.errors?Object.values(data.errors).flat()[0]:data.message;const error=Object.assign(new Error(message||'Não foi possível concluir a operação.'),{status:response.status,retryAfter:data.retry_after||0,passwordRequired:data.password_required});if(response.status===419)csrf=null;throw error;}
  return data;
 }
 async function init(){const response=await fetch('/api/csrf',{credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw Error('Servidor indisponível.');csrf=(await response.json()).token;try{user=(await request('me')).user;}catch(e){if(e.status!==401)throw e;user=null;}if(user?.must_change_password)return;if(user&&Access.can(user,'users.manage'))users=await request('users');}
 async function login(email,password){user=(await request('login','POST',{email,password})).user;csrf=null;return user;}
 async function logout(){await request('logout','POST');user=null;users=[];csrf=null;}
 async function add(record,password){await request('users','POST',{...record,password});users=await request('users');}
 async function updateAccess(email,perfil,extras,security={}){const target=users.find(u=>u.email===email);if(!target)throw Error('Usuário não encontrado.');await request('users/'+target.id,'PATCH',{perfil,extras,...security});users=await request('users');user=(await request('me')).user;}
 async function change(oldPassword,password){user=(await request('password','PUT',{old_password:oldPassword,password})).user;csrf=null;}
 async function refresh(){user=(await request('me')).user;return user;}
 return {init,current:()=>user,users:()=>users,login,logout,add,updateAccess,change,request,refresh};
})();

(async()=>{
 const form=document.getElementById('login-form'),error=document.getElementById('login-error'),submit=form.querySelector('[type=submit]');
 const mandatory=document.getElementById('first-password-form');let countdown;
 function showPassword(){form.hidden=true;mandatory.hidden=false;document.getElementById('initial-password').focus();}
 document.getElementById('toggle-password').onclick=()=>{const input=document.getElementById('login-password'),button=document.getElementById('toggle-password');const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Ocultar':'Mostrar';button.setAttribute('aria-pressed',show);button.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');};
 submit.disabled=true;
 try{await AuthClient.init();submit.disabled=false;if(AuthClient.current()?.must_change_password)showPassword();}
 catch{error.hidden=false;error.textContent='Não foi possível conectar ao servidor. Verifique se o sistema está em execução e recarregue a página.';}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity()||submit.disabled)return;submit.disabled=true;error.hidden=true;
  try{const user=await AuthClient.login(document.getElementById('login-email').value.trim().toLowerCase(),document.getElementById('login-password').value);document.getElementById('login-password').value='';if(user.must_change_password)showPassword();else location.replace('painel.html');}
  catch(e){error.textContent=e.message;error.hidden=false;if(e.retryAfter){let left=e.retryAfter;clearInterval(countdown);countdown=setInterval(()=>{left--;submit.textContent=`Tente novamente em ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(left<=0){clearInterval(countdown);submit.disabled=false;submit.textContent='Entrar no painel';}},1000);return;}document.getElementById('login-password').focus();}
  submit.disabled=false;
 });
 mandatory.onsubmit=async e=>{e.preventDefault();const btn=mandatory.querySelector('[type=submit]'),err=document.getElementById('first-password-error');btn.disabled=true;err.hidden=true;try{const next=document.getElementById('first-new-password').value;if(next!==document.getElementById('first-confirm-password').value)throw Error('As senhas não coincidem.');await AuthClient.change(document.getElementById('initial-password').value,next);location.replace('painel.html');}catch(e){err.textContent=e.message;err.hidden=false;}finally{btn.disabled=false;}};
 document.getElementById('first-password-logout').onclick=async()=>{await AuthClient.logout();location.reload();};
})();

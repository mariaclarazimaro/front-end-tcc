<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Auth,DB,Hash,RateLimiter};
class AuthController {
    private function audit(string $type,string $description,?int $user=null): void {
        DB::table('audit_logs')->insert(['type'=>$type,'description'=>$description,'user_id'=>$user,'created_at'=>now()]);
    }
    public function login(Request $request) {
        $data=$request->validate(['email'=>'required|email|max:150','password'=>'required|string|max:128']);
        $email=mb_strtolower(trim($data['email']));
        $ipKey='login-ip:'.hash('sha256',$request->ip());
        $key='login:'.hash('sha256',$email.'|'.$request->ip());
        if(RateLimiter::tooManyAttempts($key,5)||RateLimiter::tooManyAttempts($ipKey,30)) {
            $retry=max(RateLimiter::availableIn($key),RateLimiter::availableIn($ipKey),1);
            return response()->json(['message'=>'Muitas tentativas. Aguarde para tentar novamente.','retry_after'=>$retry],429)->header('Retry-After',$retry);
        }
        RateLimiter::hit($key,900); RateLimiter::hit($ipKey,900);
        $user=DB::transaction(function() use($email,$data) {
            $user=User::where('email',$email)->lockForUpdate()->first();
            // Hash válido também para conta ausente: evita resposta imediata que denuncie o e-mail.
            $valid=Hash::check($data['password'],$user?->password ?? config('security.dummy_hash'));
            if(!$user || !$user->active || ($user->locked_until && $user->locked_until->isFuture())) return null;
            if(!$valid) {
                if($user->locked_until && $user->locked_until->isPast())$user->failed_attempts=0;
                $user->failed_attempts++;
                if($user->failed_attempts>=10) { $user->locked_until=now()->addMinutes(15);$this->audit('account_locked','Bloqueio temporário por falhas de login.',$user->id); }
                $user->save(); return null;
            }
            $user->failed_attempts=0;$user->locked_until=null;
            if(Hash::needsRehash($user->password))$user->password=$data['password'];
            $user->save();return $user;
        });
        if(!$user)return response()->json(['message'=>'Não foi possível entrar. Confira suas credenciais ou procure o administrador.'],422);
        RateLimiter::clear($key); Auth::login($user);$request->session()->regenerate();
        $request->session()->put(['version'=>$user->session_version,'signed_at'=>now()->timestamp]);
        $this->audit('login','Entrada no sistema.',$user->id);
        return response()->json(['user'=>$user]);
    }
    public function me(Request $request) { return ['user'=>$request->user()]; }
    public function logout(Request $request) { Auth::logout();$request->session()->invalidate();$request->session()->regenerateToken();return response()->json(['ok'=>true]); }
    public function password(Request $request) {
        $request->validate(['old_password'=>'required|string|max:128','password'=>Permissions::password()]);
        $key='password:'.$request->user()->id;
        if(RateLimiter::tooManyAttempts($key,5))return response()->json(['message'=>'Aguarde 15 minutos para tentar alterar a senha novamente.'],429);
        if(!Hash::check($request->old_password,$request->user()->password)){RateLimiter::hit($key,900);return response()->json(['message'=>'Senha atual incorreta.'],422);}
        if(Hash::check($request->password,$request->user()->password))return response()->json(['message'=>'Escolha uma senha diferente da atual.'],422);
        $user=$request->user();$user->password=$request->password;$user->must_change_password=false;$user->session_version++;$user->save();RateLimiter::clear($key);
        $request->session()->regenerate();$request->session()->put('version',$user->session_version);
        $this->audit('password_changed','Alterou a própria senha.',$user->id);return ['user'=>$user];
    }
}

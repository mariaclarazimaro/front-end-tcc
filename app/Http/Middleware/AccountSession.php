<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class AccountSession {
    public function handle(Request $request, Closure $next) {
        $user=$request->user();
        if (!$user || !$user->active || $request->session()->get('version')!==$user->session_version || now()->timestamp-$request->session()->get('signed_at',0)>28800) {
            auth()->logout(); $request->session()->invalidate(); $request->session()->regenerateToken();
            return response()->json(['message'=>'Sua sessão expirou. Entre novamente.'],401);
        }
        if ($user->must_change_password && !in_array($request->path(),['api/me','api/password','api/logout'])) {
            return response()->json(['message'=>'Altere sua senha inicial para continuar.','password_required'=>true],403);
        }
        return $next($request);
    }
}

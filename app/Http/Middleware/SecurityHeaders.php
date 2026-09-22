<?php
namespace App\Http\Middleware;
class SecurityHeaders {
 public function handle($request,\Closure $next){$response=$next($request);foreach(['X-Content-Type-Options'=>'nosniff','X-Frame-Options'=>'DENY','Referrer-Policy'=>'same-origin','Permissions-Policy'=>'camera=(), microphone=(), geolocation=()','Content-Security-Policy'=>"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"] as $k=>$v)$response->headers->set($k,$v);if($request->is('api/*'))$response->headers->set('Cache-Control','no-store');if($request->secure())$response->headers->set('Strict-Transport-Security','max-age=31536000');return $response;}
}

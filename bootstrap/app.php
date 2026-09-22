<?php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\{Middleware,Exceptions};
return Application::configure(basePath:dirname(__DIR__))
 ->withRouting(web:__DIR__.'/../routes/web.php',commands:__DIR__.'/../routes/console.php',health:'/up')
 ->withMiddleware(function(Middleware $middleware){
    if (env('TRUSTED_PROXIES')) {
        $middleware->trustProxies(at: env('TRUSTED_PROXIES') === '*' ? '*' : explode(',', env('TRUSTED_PROXIES')), headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT);
    }
    $middleware->alias(['account'=>App\Http\Middleware\AccountSession::class]);
    $middleware->append(App\Http\Middleware\SecurityHeaders::class);
    $middleware->redirectGuestsTo(fn()=>'/index.html');
 })
 ->withExceptions(function(Exceptions $exceptions){$exceptions->shouldRenderJsonWhen(fn($r,$e)=>$r->is('api/*')||$r->expectsJson());})
 ->create();

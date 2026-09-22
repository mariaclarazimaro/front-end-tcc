<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{AuthController,UserController,OperationsController};
Route::get('/api/csrf',fn()=>['token'=>csrf_token()]);
Route::post('/api/login',[AuthController::class,'login']);
Route::middleware(['auth','account'])->prefix('api')->group(function(){
 Route::get('/me',[AuthController::class,'me']);Route::post('/logout',[AuthController::class,'logout']);Route::put('/password',[AuthController::class,'password']);
 Route::get('/state',[OperationsController::class,'state']);
 Route::get('/users',[UserController::class,'index']);Route::post('/users',[UserController::class,'store']);Route::patch('/users/{user}',[UserController::class,'update']);
 Route::post('/products',[OperationsController::class,'product']);Route::put('/products/{id}',[OperationsController::class,'product']);Route::post('/lots',[OperationsController::class,'receive']);Route::post('/sales',[OperationsController::class,'sale']);Route::post('/lots/{id}/discard',[OperationsController::class,'discard']);
});
Route::get('/{path?}',function(string $path='index.html'){
 $allowed=['index.html','painel.html','style.css','login.js','auth.js','access.js','script.js','rules.js','inventory.js','team.js','img/logo.png'];
 abort_unless(in_array($path,$allowed,true),404);
 $mime=match(pathinfo($path,PATHINFO_EXTENSION)){'js'=>'application/javascript','css'=>'text/css','png'=>'image/png',default=>'text/html'};
 return response()->file(public_path($path),['Content-Type'=>$mime,'Cache-Control'=>'no-cache']);
})->where('path','.*');

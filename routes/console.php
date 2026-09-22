<?php
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
Artisan::command('doce:admin {email} {--name=Administrador}',function(){
 $email=mb_strtolower(trim($this->argument('email')));
 if(!filter_var($email,FILTER_VALIDATE_EMAIL)){$this->error('E-mail inválido.');return 1;}
 if(User::where('email',$email)->exists()){$this->error('Conta já existente.');return 1;}
 $password=$this->secret('Senha inicial (12 caracteres, maiúscula, minúscula e número)');
 $validator=validator(['password'=>$password],['password'=>App\Support\Permissions::password()]);
 if($validator->fails()){$this->error('Senha inválida.');return 1;}
 User::create(['nome'=>$this->option('name'),'email'=>$email,'password'=>$password,'perfil'=>'admin','extras'=>[],'must_change_password'=>true]);$this->info('Administrador criado. A troca de senha será exigida no primeiro acesso.');
});

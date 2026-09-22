<?php
return ['driver'=>'database','lifetime'=>30,'expire_on_close'=>true,'encrypt'=>true,'files'=>storage_path('framework/sessions'),'connection'=>null,'table'=>'sessions','store'=>null,'lottery'=>[2,100],'cookie'=>'doce_session','path'=>'/','domain'=>null,'secure'=>(bool)env('SESSION_SECURE_COOKIE',true),'http_only'=>true,'same_site'=>'lax','partitioned'=>false];

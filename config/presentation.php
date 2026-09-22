<?php

return [
    'admin_email' => env('INITIAL_ADMIN_EMAIL', 'admin@docesabor.local'),
    'admin_password' => env('INITIAL_ADMIN_PASSWORD'), // obrigatório fora de APP_ENV=local para banco novo
];

<?php
namespace Database\Seeders;

use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Serializa instalações simultâneas sem criar uma tabela auxiliar.
            DB::table('migrations')->orderBy('id')->lockForUpdate()->get();
            if (!User::exists()) {
                $email = mb_strtolower(trim(config('presentation.admin_email')));
                $password = config('presentation.admin_password');
                // Credencial de demonstração somente no ambiente local. Na hospedagem,
                // configure a MESMA senha em INITIAL_ADMIN_PASSWORD antes do primeiro deploy.
                if (!$password && app()->environment('local')) $password = 'DoceSabor@2026';
                if (!$password) {
                    throw new \RuntimeException('Defina INITIAL_ADMIN_PASSWORD no Railway antes do primeiro deploy (pode usar a mesma senha temporária local; prefira uma senha privada).');
                }
                validator(['email'=>$email, 'password'=>$password], [
                    'email'=>['required','email'], 'password'=>Permissions::password(),
                ])->validate();
                User::create([
                    'nome'=>'Administrador', 'email'=>$email, 'password'=>$password,
                    'perfil'=>'admin', 'extras'=>[], 'active'=>true, 'must_change_password'=>true,
                ]);
                $this->command?->info("Administrador inicial criado: {$email}. Troca de senha obrigatória.");
            } else {
                $this->command?->info('Contas existentes preservadas; nenhuma senha foi alterada.');
            }
            $this->call(PresentationCatalogSeeder::class);
        });
    }
}

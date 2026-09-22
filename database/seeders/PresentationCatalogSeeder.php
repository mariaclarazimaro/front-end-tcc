<?php
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PresentationCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $created = DB::transaction(function () {
            $admin = User::where('perfil', 'admin')->where('active', true)->orderBy('id')->lockForUpdate()->first();
            if (!$admin) {
                throw new \RuntimeException('Cadastre um administrador ativo antes dos produtos de exemplo.');
            }
            // Preços e quantidades fictícios. Datas calculadas no dia da primeira execução.
            $catalog = [
                ['Brigadeiro Gourmet', 'Doces', 'unidade', '4.50', 20, [[30, -2, 2], [20, 0, 7]]],
                ['Beijinho de Coco', 'Doces', 'unidade', '4.00', 20, [[8, -1, 4]]],
                ['Bolo de Chocolate', 'Bolos', 'fatia', '12.00', 10, [[18, -1, 3]]],
                ['Torta de Limão', 'Tortas', 'fatia', '11.00', 10, [[7, -1, 1]]],
                ['Brownie de Chocolate', 'Doces', 'unidade', '8.50', 12, [[24, -1, 8]]],
                ['Cupcake de Baunilha', 'Bolos', 'unidade', '9.00', 10, [[4, -1, 5]]],
                ['Coxinha de Frango', 'Salgados', 'unidade', '7.50', 15, [[25, 0, 2]]],
                ['Pão de Queijo', 'Salgados', 'unidade', '5.00', 20, [[40, 0, 6]]],
            ];
            $count = 0;
            foreach ($catalog as [$name, $category, $unit, $price, $minimum, $lots]) {
                // Preserva produtos existentes e não repõe estoque ao executar novamente.
                if (DB::table('products')->where('nome', $name)->exists()) continue;
                $id = DB::table('products')->insertGetId([
                    'nome'=>$name, 'categoria'=>$category, 'unidade'=>$unit,
                    'preco'=>$price, 'minimo'=>$minimum, 'created_at'=>now(), 'updated_at'=>now(),
                ]);
                foreach ($lots as [$quantity, $made, $expires]) {
                    DB::table('lots')->insert([
                        'product_id'=>$id, 'fabricacao'=>today()->addDays($made)->toDateString(),
                        'validade'=>today()->addDays($expires)->toDateString(),
                        'qtd_inicial'=>$quantity, 'qtd_atual'=>$quantity, 'status'=>'ativo',
                        'created_by'=>$admin->id, 'created_at'=>now(), 'updated_at'=>now(),
                    ]);
                }
                $count++;
            }
            if ($count) DB::table('audit_logs')->insert([
                'user_id'=>$admin->id, 'type'=>'presentation_catalog',
                'description'=>"Carga de apresentação: {$count} produtos fictícios e seus lotes.",
                'created_at'=>now(),
            ]);
            return $count;
        });
        $this->command?->info("Produtos de exemplo criados: {$created}. Cadastros existentes preservados.");
    }
}

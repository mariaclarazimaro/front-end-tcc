<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::create('users',function(Blueprint $t){$t->id();$t->string('nome',100);$t->string('email',150)->unique();$t->string('password');$t->string('perfil',20)->default('operador');$t->json('extras')->nullable();$t->boolean('active')->default(true);$t->boolean('must_change_password')->default(true);$t->unsignedInteger('failed_attempts')->default(0);$t->timestamp('locked_until')->nullable();$t->unsignedInteger('session_version')->default(1);$t->rememberToken();$t->timestamps();});
  Schema::create('sessions',function(Blueprint $t){$t->string('id')->primary();$t->foreignId('user_id')->nullable()->index();$t->string('ip_address',45)->nullable();$t->text('user_agent')->nullable();$t->longText('payload');$t->integer('last_activity')->index();});
  Schema::create('cache',function(Blueprint $t){$t->string('key')->primary();$t->mediumText('value');$t->integer('expiration');});
  Schema::create('cache_locks',function(Blueprint $t){$t->string('key')->primary();$t->string('owner');$t->integer('expiration');});
  Schema::create('products',function(Blueprint $t){$t->id();$t->string('nome',100)->unique();$t->string('categoria',50);$t->string('unidade',20);$t->decimal('preco',10,2);$t->unsignedInteger('minimo')->default(10);$t->timestamps();});
  Schema::create('lots',function(Blueprint $t){$t->id();$t->foreignId('product_id')->constrained('products');$t->date('fabricacao');$t->date('validade');$t->unsignedInteger('qtd_inicial');$t->unsignedInteger('qtd_atual');$t->string('status',20)->default('ativo');$t->foreignId('created_by')->constrained('users');$t->timestamps();$t->index(['product_id','status','fabricacao','id']);$t->index('validade');});
  Schema::create('sales',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained('users');$t->string('vendedor_nome',100);$t->string('vendedor_email',150);$t->string('pagamento',30);$t->decimal('total',12,2);$t->uuid('idempotency_key')->unique();$t->timestamps();$t->index(['user_id','created_at']);});
  Schema::create('sale_items',function(Blueprint $t){$t->id();$t->foreignId('sale_id')->constrained('sales');$t->foreignId('lot_id')->constrained('lots');$t->foreignId('product_id')->constrained('products');$t->string('nome',100);$t->unsignedInteger('qtd');$t->decimal('preco_unit',10,2);});
  Schema::create('discards',function(Blueprint $t){$t->id();$t->foreignId('lot_id')->constrained('lots');$t->foreignId('user_id')->constrained('users');$t->unsignedInteger('quantidade');$t->string('motivo',80);$t->string('observacao',300)->nullable();$t->timestamps();});
  Schema::create('audit_logs',function(Blueprint $t){$t->id();$t->foreignId('user_id')->nullable()->constrained('users');$t->string('type',50);$t->text('description');$t->timestamp('created_at')->index();});
 }
 public function down():void {foreach(['audit_logs','discards','sale_items','sales','lots','products','cache_locks','cache','sessions','users'] as $name)Schema::dropIfExists($name);}
};

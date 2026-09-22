<?php
namespace App\Http\Controllers;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
class OperationsController {
 private function audit($type,$description){DB::table('audit_logs')->insert(['type'=>$type,'description'=>$description,'user_id'=>auth()->id(),'created_at'=>now()]);}
 public function product(Request $r,?int $id=null){
  Permissions::check('products.manage');$data=$r->validate(['nome'=>['required','string','max:100',Rule::unique('products')->ignore($id)],'categoria'=>'required|string|max:50','unidade'=>['required',Rule::in(['unidade','fatia','caixa','pacote'])],'preco'=>'required|numeric|min:0.01|max:99999999.99|decimal:0,2','minimo'=>'required|integer|min:1|max:1000000']);
  return DB::transaction(function()use($id,$data){if($id){abort_unless(DB::table('products')->where('id',$id)->lockForUpdate()->first(),404);DB::table('products')->where('id',$id)->update([...$data,'updated_at'=>now()]);}else $id=DB::table('products')->insertGetId([...$data,'created_at'=>now(),'updated_at'=>now()]);$this->audit('product_saved','Salvou produto #'.$id.': '.$data['nome']);return ['id'=>$id];});
 }
 public function receive(Request $r){
  Permissions::check('stock.receive');$data=$r->validate(['produtoId'=>'required|integer|exists:products,id','fabricacao'=>'required|date_format:Y-m-d|before_or_equal:today','validade'=>'required|date_format:Y-m-d|after:fabricacao|after_or_equal:today','quantidade'=>'required|integer|min:1|max:1000000']);
  return DB::transaction(function()use($data){DB::table('products')->where('id',$data['produtoId'])->lockForUpdate()->first();$id=DB::table('lots')->insertGetId(['product_id'=>$data['produtoId'],'fabricacao'=>$data['fabricacao'],'validade'=>$data['validade'],'qtd_inicial'=>$data['quantidade'],'qtd_atual'=>$data['quantidade'],'created_by'=>auth()->id(),'created_at'=>now(),'updated_at'=>now()]);$this->audit('stock_received','Registrou entrada de '.$data['quantidade'].' unidades no lote #'.$id);return ['id'=>$id];});
 }
 public function sale(Request $r){
  Permissions::check('sales.create');$data=$r->validate(['pagamento'=>['required',Rule::in(['Dinheiro','Pix','Cartão de débito','Cartão de crédito'])],'idempotency_key'=>'required|uuid','items'=>'required|array|min:1|max:100','items.*.produtoId'=>'required|integer|distinct|exists:products,id','items.*.quantidade'=>'required|integer|min:1|max:1000000']);
  return DB::transaction(function()use($data){
   // A mesma conta serializa seus reenvios; produtos ordenados evitam inversão de locks entre caixas.
   DB::table('users')->where('id',auth()->id())->lockForUpdate()->first();
   $previous=DB::table('sales')->where('idempotency_key',$data['idempotency_key'])->first();
   if($previous){abort_unless($previous->user_id===auth()->id(),409,'Chave já utilizada.');return ['id'=>$previous->id,'total'=>(float)$previous->total];}
   $items=collect($data['items'])->sortBy('produtoId');$allocated=[];$cents=0;
   foreach($items as $item){
    $product=DB::table('products')->where('id',$item['produtoId'])->lockForUpdate()->first();
    $lots=DB::table('lots')->where('product_id',$product->id)->where('status','ativo')->where('qtd_atual','>',0)->where('validade','>=',today()->toDateString())->orderBy('fabricacao')->orderBy('id')->lockForUpdate()->get();
    $remaining=$item['quantidade'];abort_if($lots->sum('qtd_atual')<$remaining,422,'Estoque insuficiente para '.$product->nome.'. Atualize o carrinho.');
    foreach($lots as $lot){if(!$remaining)break;$qty=min($lot->qtd_atual,$remaining);$remaining-=$qty;$price=(int)round($product->preco*100);$cents+=$price*$qty;abort_if($cents>999999999999,422,'Total excede o limite.');$allocated[]=['lot_id'=>$lot->id,'product_id'=>$product->id,'nome'=>$product->nome,'qtd'=>$qty,'preco_unit'=>$price/100];DB::table('lots')->where('id',$lot->id)->update(['qtd_atual'=>$lot->qtd_atual-$qty,'status'=>$lot->qtd_atual===$qty?'esgotado':'ativo','updated_at'=>now()]);}
   }
   $id=DB::table('sales')->insertGetId(['user_id'=>auth()->id(),'vendedor_nome'=>auth()->user()->nome,'vendedor_email'=>auth()->user()->email,'pagamento'=>$data['pagamento'],'total'=>$cents/100,'idempotency_key'=>$data['idempotency_key'],'created_at'=>now(),'updated_at'=>now()]);
   foreach($allocated as $item)DB::table('sale_items')->insert(['sale_id'=>$id,...$item]);
   $this->audit('sale_created','Registrou venda #'.$id);return ['id'=>$id,'total'=>$cents/100];
  },3);
 }
 public function discard(Request $r,int $id){
  Permissions::check('stock.discard');$data=$r->validate(['motivo'=>['required',Rule::in(['Validade vencida','Avaria','Qualidade inadequada','Outro'])],'observacao'=>'nullable|string|max:300|required_if:motivo,Outro']);
  return DB::transaction(function()use($id,$data){$lot=DB::table('lots')->where('id',$id)->lockForUpdate()->first();abort_unless($lot,404);abort_if(!$lot->qtd_atual||$lot->status!=='ativo',409,'Este lote não possui saldo disponível.');abort_if($data['motivo']==='Validade vencida'&&$lot->validade>=today()->toDateString(),422,'O lote ainda não está vencido.');$qty=$lot->qtd_atual;DB::table('discards')->insert(['lot_id'=>$id,'user_id'=>auth()->id(),'quantidade'=>$qty,...$data,'created_at'=>now(),'updated_at'=>now()]);DB::table('lots')->where('id',$id)->update(['qtd_atual'=>0,'status'=>'descartado','updated_at'=>now()]);$this->audit('stock_discarded','Descartou '.$qty.' unidades do lote #'.$id.': '.$data['motivo']);return ['ok'=>true];});
 }
 public function state(Request $r){
  $user=$r->user();$full=$user->canDo('sales.all')||$user->canDo('reports.view');
  $sales=DB::table('sales')->when(!$full,fn($q)=>$user->canDo('sales.own')?$q->where('user_id',$user->id):$q->whereRaw('1=0'))->orderByDesc('id')->get();
  $items=DB::table('sale_items')->whereIn('sale_id',$sales->pluck('id'))->get()->groupBy('sale_id');
  $resultSales=$sales->map(fn($v)=>['id'=>$v->id,'dataHora'=>$v->created_at,'vendedorNome'=>$v->vendedor_nome,'vendedorEmail'=>$v->vendedor_email,'pagamento'=>$v->pagamento,'total'=>(float)$v->total,'itens'=>($items[$v->id]??collect())->map(fn($i)=>['loteId'=>$i->lot_id,'produtoId'=>$i->product_id,'nome'=>$i->nome,'qtd'=>$i->qtd,'precoUnit'=>(float)$i->preco_unit])->values()]);
  $lots=DB::table('lots')->join('users','users.id','=','lots.created_by')->select('lots.*','users.nome as actor')->get();
  $discards=DB::table('discards')->join('users','users.id','=','discards.user_id')->select('discards.*','users.nome as actor')->get();
  $movements=[];
  foreach($lots as $l)$movements[]=['produtoId'=>$l->product_id,'loteId'=>$l->id,'type'=>'Entrada','qty'=>$l->qtd_inicial,'date'=>$l->created_at,'actor'=>$l->actor,'reference'=>'Recebimento'];
  foreach($discards as $d){$lot=$lots->firstWhere('id',$d->lot_id);$movements[]=['produtoId'=>$lot->product_id,'loteId'=>$d->lot_id,'type'=>'Descarte','qty'=>-$d->quantidade,'date'=>$d->created_at,'actor'=>$d->actor,'reference'=>$d->motivo];}
  // Movimentações operacionais não expõem valores nem e-mails de vendas alheias.
  foreach(DB::table('sale_items')->join('sales','sales.id','=','sale_items.sale_id')->select('sale_items.product_id','sale_items.lot_id','sale_items.qtd','sales.created_at','sales.vendedor_nome','sales.id')->get() as $i)$movements[]=['produtoId'=>$i->product_id,'loteId'=>$i->lot_id,'type'=>'Venda','qty'=>-$i->qtd,'date'=>$i->created_at,'actor'=>$i->vendedor_nome,'reference'=>'Venda #'.$i->id];
  return ['produtos'=>DB::table('products')->get()->map(fn($p)=>['id'=>$p->id,'nome'=>$p->nome,'categoria'=>$p->categoria,'unidade'=>$p->unidade,'preco'=>(float)$p->preco,'minimo'=>$p->minimo]),'lotes'=>$lots->map(fn($l)=>['id'=>$l->id,'produtoId'=>$l->product_id,'fabricacao'=>$l->fabricacao.'T00:00:00','validade'=>$l->validade.'T00:00:00','qtdInicial'=>$l->qtd_inicial,'qtdAtual'=>$l->qtd_atual,'status'=>$l->status,'criadoPor'=>$l->actor,'criadoEm'=>$l->created_at]),'vendas'=>$resultSales,'movements'=>$movements,'descartes'=>$discards->map(fn($d)=>['loteId'=>$d->lot_id,'quantidade'=>$d->quantidade,'motivo'=>$d->motivo,'observacao'=>$d->observacao,'usuario'=>$d->actor,'dataHora'=>$d->created_at]),'historico'=>$user->canDo('reports.view')?DB::table('audit_logs')->orderByDesc('id')->limit(200)->get()->map(fn($h)=>['id'=>$h->id,'tipo'=>$h->type,'descricao'=>$h->description,'dataHora'=>$h->created_at]):[]];
 }
}

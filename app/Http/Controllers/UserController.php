<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
class UserController {
    public function index(){Permissions::check('users.manage');return User::orderBy('nome')->get();}
    public function store(Request $r){
        Permissions::check('users.manage');
        $r->merge(['email'=>mb_strtolower(trim($r->input('email','')))]);
        $data=$r->validate(['nome'=>'required|string|max:100','email'=>'required|email|max:150|unique:users','perfil'=>['required',Rule::in(array_keys(Permissions::ROLES))],'extras'=>'present|array','extras.*'=>Rule::in(Permissions::EXTRAS),'password'=>Permissions::password()]);
        $u=DB::transaction(function()use($data){$u=User::create([...$data,'must_change_password'=>true]);$this->audit('Cadastrou a conta '.$u->email);return $u;});return response()->json($u,201);
    }
    public function update(Request $r,User $user){
        Permissions::check('users.manage');
        $data=$r->validate(['perfil'=>['sometimes',Rule::in(array_keys(Permissions::ROLES))],'extras'=>'sometimes|array','extras.*'=>Rule::in(Permissions::EXTRAS),'active'=>'sometimes|boolean','unlock'=>'sometimes|boolean','password'=>['sometimes',...Permissions::password()]]);
        return DB::transaction(function()use($r,$data,$user){
            // Ordem estável de locks também protege a permanência de um administrador ativo.
            $admins=User::where('perfil','admin')->orderBy('id')->lockForUpdate()->get();
            $target=User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $removes=($data['active']??$target->active)===false || ($data['perfil']??$target->perfil)!=='admin';
            abort_if($target->id===$r->user()->id && ($removes||isset($data['password'])),422,'Use Minha conta para sua senha e outro administrador para alterar seu acesso.');
            abort_if($target->perfil==='admin'&&$target->active&&$removes&&$admins->where('active',true)->count()<=1,422,'Mantenha um administrador ativo.');
            $before=['perfil'=>$target->perfil,'extras'=>$target->extras,'active'=>$target->active];
            foreach(['perfil','extras','active'] as $field)if(array_key_exists($field,$data))$target->$field=$data[$field];
            if($data['unlock']??false){$target->failed_attempts=0;$target->locked_until=null;}
            if(isset($data['password'])){$target->password=$data['password'];$target->must_change_password=true;}
            $target->session_version++;$target->save();
            if($target->id===$r->user()->id)$r->session()->put('version',$target->session_version);
            $this->audit('Atualizou acesso de '.$target->email.'; anterior: '.json_encode($before).'; atual: '.json_encode(['perfil'=>$target->perfil,'extras'=>$target->extras,'active'=>$target->active]).(isset($data['password'])?'; redefiniu senha temporária':'').(($data['unlock']??false)?'; desbloqueou conta':''));
            return $target;
        });
    }
    private function audit($description){DB::table('audit_logs')->insert(['type'=>'account_updated','description'=>$description,'user_id'=>auth()->id(),'created_at'=>now()]);}
}

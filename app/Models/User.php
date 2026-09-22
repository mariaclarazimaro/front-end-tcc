<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
class User extends Authenticatable {
    protected $guarded = ['id'];
    protected $hidden = ['password','remember_token','failed_attempts','session_version'];
    protected function casts(): array { return ['extras'=>'array','active'=>'boolean','must_change_password'=>'boolean','locked_until'=>'datetime','password'=>'hashed']; }
    public function canDo(string $permission): bool {
        $base = \App\Support\Permissions::ROLES[$this->perfil] ?? [];
        return in_array($permission,$base,true) || ($permission!=='users.manage' && in_array($permission,\App\Support\Permissions::EXTRAS,true) && in_array($permission,$this->extras ?? [],true));
    }
}

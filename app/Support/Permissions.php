<?php
namespace App\Support;
class Permissions {
    public const EXTRAS = ['sales.create','sales.own','sales.all','stock.receive','products.manage','stock.discard','reports.view'];
    public const ROLES = [
        'operador'=>['sales.create','sales.own'],
        'estoquista'=>['stock.receive'],
        'gerente'=>self::EXTRAS,
        'admin'=>[...self::EXTRAS,'users.manage'],
    ];
    public static function check(string $permission): void { abort_unless(auth()->user()?->canDo($permission),403,'Você não tem permissão para esta ação.'); }
    public static function password(): array { return ['required','string','max:64',function($attribute,$value,$fail){if(strlen($value)>72)$fail('Use uma senha de até 72 bytes.');},\Illuminate\Validation\Rules\Password::min(12)->mixedCase()->numbers()]; }
}

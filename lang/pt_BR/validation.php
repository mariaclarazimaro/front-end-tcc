<?php
return [
 'required'=>'O campo :attribute é obrigatório.', 'required_if'=>'Informe :attribute quando :other for :value.',
 'email'=>'Informe um e-mail válido.', 'unique'=>'Já existe um registro com este :attribute.',
 'min'=>['string'=>'O campo :attribute deve ter pelo menos :min caracteres.','numeric'=>'O campo :attribute deve ser no mínimo :min.','array'=>'Selecione pelo menos :min item.'],
 'max'=>['string'=>'O campo :attribute deve ter no máximo :max caracteres.','numeric'=>'O campo :attribute deve ser no máximo :max.','array'=>'Selecione no máximo :max itens.'],
 'integer'=>'O campo :attribute deve ser um número inteiro.', 'numeric'=>'O campo :attribute deve ser numérico.',
 'exists'=>'O registro selecionado em :attribute não existe.', 'in'=>'A opção de :attribute é inválida.',
 'date_format'=>'Informe :attribute no formato :format.', 'before_or_equal'=>'A fabricação não pode estar no futuro.',
 'after'=>'A validade deve ser posterior à fabricação.', 'after_or_equal'=>'A validade não pode estar vencida.',
 'decimal'=>'O preço deve ter no máximo duas casas decimais.', 'distinct'=>'Não repita o mesmo produto.',
 'password'=>['mixed'=>'A senha deve conter letras maiúsculas e minúsculas.','numbers'=>'A senha deve conter pelo menos um número.'],
 'attributes'=>['nome'=>'nome','email'=>'e-mail','password'=>'senha','old_password'=>'senha atual','perfil'=>'perfil','extras'=>'permissões','preco'=>'preço','minimo'=>'estoque mínimo','produtoId'=>'produto','quantidade'=>'quantidade','observacao'=>'observação'],
];

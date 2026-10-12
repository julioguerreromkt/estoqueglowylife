# Guia de operação (dia a dia)

## Perfis
- **Administrador**: tudo, inclusive criar usuários, unidades, categorias e campos personalizados.
- **Gestor**: acompanha, movimenta, faz ajuste de inventário e cancela transferência.
- **Operador**: cadastra produtos, registra entrada, saída e transferência. Não faz ajuste.
- **Consulta**: só visualiza.
Cada usuário pode ser restrito a uma unidade (ex.: Mônica só vê e movimenta Aracaju).

## Rotinas
- **Chegou mercadoria**: Movimentações > + Entrada > produto, unidade, quantidade, origem/NF.
- **Saiu pedido**: Movimentações > − Saída > produto, unidade, quantidade, destino (consultor) e nº do pedido. O mesmo botão existe no catálogo e na ficha do produto.
- **Mandar da Sede para Aracaju**: Transferências > Nova transferência. A quantidade sai da Sede na hora e fica "em trânsito". Quando chegar, Aracaju clica em **Confirmar recebimento**. Se chegar menos, informe a quantidade recebida: o sistema abre uma pendência de inventário.
- **Contagem física**: Inventário > escolha a unidade > digite o contado > justificativa > Aplicar. Cada diferença vira um ajuste no histórico.
- **Estoque mínimo**: na ficha do produto > Editar > "Estoque por unidade". Com mínimo definido, o produto aparece como "Baixo" no dashboard.
- **Fotos**: ficha do produto > Enviar foto (funciona no celular, direto da câmera).
- **Excel**: Relatórios > Posição de estoque > Excel. Importação: Usuários e Configurações > Importar.

## Pendência deixada pela planilha
- NEURAKIX em Aracaju fechava em -5 na planilha. Entrou com saldo 0 e uma pendência aberta em Inventário. Conte fisicamente e aplique o ajuste.
- Transferências antigas (antes de 12/10/2026) estão no histórico como "Saída" na Sede e "Entrada" em Aracaju, do jeito que a planilha registrava.

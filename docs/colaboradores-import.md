# Importar colaboradores

O arquivo [`colaboradores-import.csv`](colaboradores-import.csv) combina os nomes extraídos do
`controle_ti.xlsx` com os nomes que apareceram depois na tabela de notebooks (WLNB/WLDK) que você
enviou — nada foi inventado, tudo veio do que estava escrito nas planilhas.

## Como usar

1. Abra `colaboradores-import.csv` (dá pra abrir no Excel/Google Sheets direto).
2. Copie as linhas (sem precisar da linha de cabeçalho, se sua aba `Colaboradores` já tem os
   cabeçalhos) e cole na aba `Colaboradores` da planilha do sistema.
3. Ajuste **Cargo** e **Email** (a maioria ficou em branco — as planilhas antigas não tinham essa
   informação, exceto o Emerson, identificado como "Desenhista").
4. Vá excluindo os que não fazem mais sentido e corrigindo os que estiverem desatualizados.

## Divergências que você vai querer conferir

- **"EMANUELA DEVOLVIDO"** no `controle_ti.xlsx`: o nome preenchido na própria linha de dados é
  **"Eduarda Copati"**, não "Emanuela". Pode ser a mesma pessoa com a aba mal nomeada, ou duas
  pessoas diferentes. Usei "Eduarda Copati" (o nome que estava na célula), mas vale confirmar.
- **Evandro Lima, Igor Hirayama e Guilherme Coletto** estavam marcados como "Devolvido" (inativos)
  no `controle_ti.xlsx`, mas aparecem como responsáveis atuais por um notebook na tabela WLNB mais
  recente. Marquei os três como **Ativo** no CSV (priorizando a tabela mais nova, como combinado),
  mas vale confirmar se voltaram à empresa ou se o notebook está com eles só temporariamente.
- **"Alexandre Silva"** (na tabela WLNB) e **"Danilo Ito"** (no `controle_ti.xlsx`) foram tratados
  como a mesma pessoa que já está na lista com o nome completo — "Alexandre Barros da Silva" e
  "Danilo Tibana Ito" — para não duplicar cadastro com nomes diferentes para a mesma pessoa.
- **WLNB09**: o responsável constava como **"off"** na tabela de notebooks, o que não parece um nome
  de pessoa. Deixei o item sem colaborador atribuído em
  [`itens-import-notebooks.csv`](itens-import-notebooks.csv) — confirme quem é o responsável real.
- **Felipe Peres, Samantha Andrade e Marina Brito** são nomes novos, que não estavam no
  `controle_ti.xlsx` — adicionados como solicitado.

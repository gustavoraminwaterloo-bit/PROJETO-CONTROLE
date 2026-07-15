# Guia de migração dos controles atuais

Como combinado, os dados de TI (`controle_ti.xlsx`) estão desatualizados e serão recadastrados do
zero, direto no novo sistema, conforme você for confirmando com cada colaborador. Já os equipamentos
de medição e os materiais de referência têm dado bom para aproveitar. Sugestão de ordem:

## 1. Colaboradores

Use [`colaboradores-import.csv`](colaboradores-import.csv) — já tem todos os nomes extraídos do
`controle_ti.xlsx`, com quem está nas abas "Devolvido" marcado como Inativo. Cole na aba
`Colaboradores` e vá ajustando/excluindo conforme necessário (veja
[`colaboradores-import.md`](colaboradores-import.md) para o passo a passo e uma divergência de nome
que vale conferir).

## 2. Equipamentos de medição (LEMCC-V02.xlsx)

Para cada linha da aba "EM USO_AT" do `LEMCC-V02.xlsx`:

| Campo no LEMCC | Vira no sistema (aba `Itens`) |
|---|---|
| Código Interno | ID |
| Descrição | Descricao |
| Marca | Marca |
| Modelo | (pode juntar em Descricao) |
| N° de Série | NumeroSerie |
| Última calibração | UltimaCalibracao |
| Próxima calibração | ProximaCalibracao |
| Nº Certificado | NumeroCertificadoCalibracao |

Defina `Categoria = Equipamento de Medição`, `RequerCalibracao = Sim`, `Status = Em estoque` (ou
`Com colaborador` se já souber quem está com ele) e `LocalArmazenamento` conforme o de costume
(ex: "Sala da Logística").

Os equipamentos da aba "FORA DE USO" podem entrar com `Status = Fora de uso`.

## 3. Histórico de empréstimos (PT-005-F02-V03 - Controle de Uso.xlsx)

Este arquivo tem uma aba por equipamento com um log de retiradas. Você **não precisa** importar todo
o histórico antigo — se quiser manter só o mais recente/relevante como referência, registre no
sistema (tela "Saída", ou direto na página do item) as retiradas que ainda estão em aberto (sem
"Data Devolução" preenchida), assim o sistema já nasce refletindo a realidade atual: quem está com
o quê.

## 4. Materiais de referência (PT 007 - Materiais de Referência.docx)

Para cada linha da tabela do documento, cadastre na aba `MateriaisReferencia`:

| Campo no documento | Vira no sistema |
|---|---|
| Identificação do Item | Identificacao |
| Certificador | Certificador |
| Certificado Nº | NumeroCertificado |
| Lote Nº | Lote |
| Incerteza de Medição | IncertezaMedicao |
| Validade (ex: "dezembro-26") | Validade — converta para o **último dia daquele mês**, em formato `AAAA-MM-DD` (ex: "dezembro-26" → `2026-12-31`) |

## 5. Notebooks (tabela WLNB/WLDK)

Use [`itens-import-notebooks.csv`](itens-import-notebooks.csv) — já vem pronto no formato da aba
`Itens`, com código patrimonial, modelo, marca, valor, local e colaborador responsável, a partir da
tabela de notebooks mais atual que você enviou. Cole direto na aba `Itens`. Há algumas observações
marcadas nas próprias linhas (coluna `Observacoes`) para itens com dado estranho ou incompleto —
confira-as antes de considerar a importação definitiva (também documentadas em
[`colaboradores-import.md`](colaboradores-import.md)).

## 6. Celulares (controle_ti.xlsx)

Use [`itens-import-celulares.csv`](itens-import-celulares.csv) — 28 celulares extraídos da coluna
CELULAR de cada aba, prontos para colar na aba `Itens`. Tem várias pendências marcadas na própria
coluna `Observacoes` (patrimônio duplicado, itens sem número, casos ambíguos pessoal/corporativo) —
veja o detalhamento em [`itens-import-celulares.md`](itens-import-celulares.md) antes de considerar
definitivo.

## 7. Demais itens de TI (controle_ti.xlsx)

Para o que não veio nem na tabela de notebooks nem na de celulares (mouse, teclado, monitor etc.), sem pressa: vá
cadastrando cada colaborador ativo na aba `Colaboradores` e, para cada equipamento que ele realmente
tem hoje (confirme, já que a planilha está desatualizada), crie o item correspondente em `Itens` com
`Categoria` adequada (Mouse, Teclado, Mousepad, Suporte, Adaptador de Tela, Monitor etc.), `Status = Com colaborador` e `ColaboradorAtual`
preenchido. Aproveite os números de patrimônio que aparecem nas observações da planilha antiga (ex:
"Patrimônio 202") como `NumeroSerie` ou parte da `Descricao`.

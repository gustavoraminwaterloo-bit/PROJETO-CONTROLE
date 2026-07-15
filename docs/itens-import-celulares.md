# Importar celulares do `controle_ti.xlsx`

O arquivo [`itens-import-celulares.csv`](itens-import-celulares.csv) traz **28 celulares**
extraídos da coluna CELULAR de cada aba do `controle_ti.xlsx`, prontos para colar na aba `Itens`.

## Critério usado

Como combinado, só entraram celulares que pareciam ser **da empresa** — ou porque tinham número de
patrimônio, ou porque a célula dizia "Waterloo"/"Sim"/um modelo (sem estar marcado como "Pessoal" ou
"Não possuo"). Quem estava explicitamente marcado como equipamento pessoal ficou de fora.

**Ficaram de fora por falta de dado** (a coluna CELULAR estava em branco na planilha): Igor
Yakovenko, Rubens Sergio, Igor Hirayama, Edison Cassimiro, Emerson.

## Pendências para você conferir

- **CEL-000173**: o mesmo número de patrimônio aparece na aba de **Josiane Leitão** e na de
  **Gustavo Ramin**, de forma idêntica — inclusive o "notebook 000177" citado nas duas. Muito
  provável erro de cópia na planilha original. Deixei o item **sem colaborador atribuído** (Em
  estoque) até você confirmar fisicamente quem está com o aparelho.
- **CEL-213 (Evandro Lima)**: a planilha original marcava como devolvido, mas ele aparece como
  responsável ativo por um notebook na tabela mais recente — mantive como "Com colaborador",
  mesma linha de raciocínio já aplicada aos itens dele na importação de notebooks.
- **Vários itens sem número de patrimônio** (Thays Guedes, Júlia Oliveira, Bárbara Bezerra, Samantha
  Stocco, Tatiane Furigo, Alexandre Barros da Silva, Gustavo Saunorins): a planilha só dizia "Sim"
  ou "Waterloo", sem número. Ficou marcado "Celular corporativo" genérico — vale complementar com o
  número de patrimônio real assim que localizar, e gerar a etiqueta só depois disso.
- **Danilo Ito, Vitor Cavenaghi e Guilherme Coletto**: nas linhas deles, os outros periféricos
  (mouse, teclado etc.) estavam marcados como "Pessoal", mas o celular não tinha essa marcação —
  fica a dúvida se o celular é mesmo corporativo ou se só faltou marcar "Pessoal" nessa célula
  também. Incluí os três com essa observação — apague-os do CSV antes de importar se, na real, forem
  aparelhos pessoais.
- **Devolvidos sem patrimônio** (Mikaelly Santos, Monica Yoshimoto, Eduarda Copati, Marcia Araujo,
  Jonathan Oliveira): entraram como "Em estoque" (devolvidos), mas sem um número de patrimônio não
  dá pra ter certeza absoluta de que é o mesmo aparelho físico que está fisicamente no estoque hoje
  — vale uma conferência visual rápida.

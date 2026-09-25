# Controle de Insumos, Patrimônio e Equipamentos

Sistema simples para controlar os equipamentos/insumos de cada colaborador, o estoque de entrada e
saída de material, o empréstimo de equipamentos de medição por projeto (com custo rastreado), a
calibração de equipamentos e a validade de materiais de referência de laboratório — com etiqueta de
QR Code por item.

- **Site**: HTML/CSS/JS puro (sem build), pasta `public/`.
- **Backend**: Google Apps Script (`apps-script/Code.gs`), lendo/escrevendo num Google Sheets.
- **Proxy de segurança**: uma Netlify Function (`netlify/functions/api.js`) que guarda a senha e o
  segredo do Apps Script fora do navegador.
- **Hospedagem**: Netlify (gratuito).

Veja também: [`docs/planilha-modelo.md`](docs/planilha-modelo.md) (estrutura da planilha) e
[`docs/migracao.md`](docs/migracao.md) (como trazer os dados das planilhas atuais).

## Segredos (nunca escrever os valores neste repositório)

O sistema usa dois valores técnicos (strings aleatórias fortes) que **não ficam no código nem neste
README** — este repositório é público, então qualquer valor escrito aqui fica visível para todos.
Guarde-os só num lugar seguro (ex: gerenciador de senhas da empresa) e cole-os direto no Apps Script
e no Netlify:

| Variável | Onde entra |
|---|---|
| `API_SECRET` (Apps Script) e `APPS_SCRIPT_SECRET` (Netlify) — **o mesmo valor nos dois lugares** | Passo 2 e Passo 4 |
| `SESSION_SECRET` (Netlify) | Passo 4 |

Para gerar um valor novo (40 caracteres aleatórios), rode num terminal:

```
node -e "console.log(require('crypto').randomBytes(30).toString('base64url'))"
```

(ou use o gerador de senhas do seu gerenciador, com 40 caracteres, só letras e números).

A única senha que **você** escolhe e digita de fato é a `ADMIN_PASSWORD` (a senha de login do site).

## Passo 1 — Criar a planilha no Google Sheets

1. Crie uma planilha nova em [sheets.google.com](https://sheets.google.com).
2. Crie as 7 abas com os cabeçalhos exatos descritos em `docs/planilha-modelo.md`. (As abas antigas
   `Reservas` e `Usuarios`, se existirem, podem ficar como histórico — o sistema não as lê mais.)
3. Copie o **ID da planilha**: é o trecho da URL entre `/d/` e `/edit`.
   Ex: `https://docs.google.com/spreadsheets/d/ESTE_TRECHO_AQUI/edit` → `ESTE_TRECHO_AQUI`.

## Passo 2 — Publicar o Apps Script

1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**.
2. Apague o conteúdo padrão e cole todo o conteúdo de `apps-script/Code.gs` deste repositório.
3. Menu **Configuração do projeto** (ícone de engrenagem) → **Propriedades do script** → adicione:
   - `SHEET_ID` = o ID copiado no passo 1
   - `API_SECRET` = o valor secreto que você gerou (ver "Segredos" acima)
4. Menu **Implantar** → **Nova implantação** → tipo **Aplicativo da Web**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Autorize as permissões pedidas (é a sua própria conta Google acessando sua própria planilha).
6. Copie a **URL do aplicativo da Web** gerada — vai ser a variável `APPS_SCRIPT_URL` no Netlify.

> Sempre que você editar o `Code.gs`, precisa fazer **Implantar → Gerenciar implantações → Editar
> (ícone de lápis) → Nova versão** para as mudanças valerem na URL publicada.

## Passo 3 — Código no GitHub

O código já está em https://github.com/gustavoraminwaterloo-bit/PROJETO-CONTROLE (branch `main`).
O Netlify publica automaticamente a cada alteração enviada para a `main`. Para o dia a dia de
atualizações, veja **"Como atualizar o código"** mais abaixo.

## Passo 4 — Conectar ao Netlify

1. Em [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Escolha o repositório do GitHub que você acabou de criar.
3. Configuração de build (o `netlify.toml` já define isso, só confirme):
   - Build command: (vazio)
   - Publish directory: `public`
4. Antes de publicar, vá em **Site settings → Environment variables** e adicione:
   - `ADMIN_PASSWORD` — escolha agora a senha que você vai digitar para entrar no site
   - `SESSION_SECRET` = o segundo valor secreto que você gerou
   - `APPS_SCRIPT_URL` — a URL copiada no Passo 2
   - `APPS_SCRIPT_SECRET` = o mesmo valor do `API_SECRET` do Apps Script
5. Publique o site (Deploy site).

Pronto — o site estará em uma URL do tipo `https://algum-nome.netlify.app`. Você pode trocar esse
nome em **Site settings → Site details → Change site name**.

## Passo 5 — Assistente de IA (opcional)

O menu **Assistente** permite conversar com o sistema (consultar dados, colar/anexar linhas de
planilha para cadastrar em lote, e — com
sua confirmação — registrar ações). Suporta dois
provedores de IA; por padrão usa o **Gemini** (Google), que dá pra ativar com sua própria conta
Google, sem depender de aprovação de outra pessoa:

1. Crie uma chave de API em [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   (entre com a mesma conta Google que você já usa para a planilha/Apps Script).
2. No Netlify, **Site settings → Environment variables**, adicione:
   - `GEMINI_API_KEY` = a chave gerada
3. Redeploy o site (Netlify faz isso automaticamente depois de salvar a variável, ou clique em
   **Trigger deploy** em **Deploys**).

Sem essa variável configurada, as outras telas do site continuam funcionando normalmente — só o
Assistente fica indisponível.

> **Alternativa (Claude/Anthropic)**: se no futuro você tiver acesso a uma chave da Anthropic, dá
> pra trocar de provedor sem mudar código — adicione `IA_PROVIDER=claude` e `ANTHROPIC_API_KEY` nas
> variáveis de ambiente do Netlify.

## Como usar no dia a dia

- Acesse o site, digite a senha (`ADMIN_PASSWORD`).
- Cadastre os colaboradores e projetos primeiro (menus **Colaboradores** e **Projetos**).
- Cadastre os itens (**Itens → Novo item**), depois registre a entrada de compra (**Entrada**).
- Para tirar algo do estoque, use **Saída** (ou a página do próprio item) — escolhendo se é para um
  colaborador (fica com ele) ou para um projeto (registra retirada/devolução e custo).
- Equipamentos de medição/laboratório (com calibração e locação a projetos) ficam separados em
  **Equipamentos** — cadastre lá, e use "Registrar locação"/"Registrar devolução"/"Registrar
  calibração" na página de cada equipamento.
- Veículos da frota ficam em **Veículos** — alocação fixa a um colaborador (normalmente um
  técnico), igual ao fluxo de Itens, com devolução e dados de contrato. (A reserva de veículo por
  período é feita em outro sistema da empresa, não aqui.) A página **Colaboradores** mostra, para cada pessoa, tudo que
  ela tem no momento (itens de TI, veículo e equipamentos em locação).
- Gere e imprima as etiquetas de QR Code em **Etiquetas** — ajuste o tamanho conforme sua impressora
  térmica antes de imprimir. Cada QR abre a página de histórico daquele item/equipamento.
- O **Painel** mostra avisos de calibração de equipamentos e validade de materiais de referência
  vencendo nos próximos 60 dias.
- O **Assistente** responde perguntas sobre os dados e pode registrar ações por conversa (ex:
  "registra a devolução do MP-01") — toda ação que muda dados aparece como um cartão de confirmação
  antes de ser executada de verdade. Também aceita colar várias linhas de planilha ou anexar um
  arquivo `.csv`/`.txt` para cadastrar tudo de uma vez, em uma única confirmação.

## Testando sem publicar ainda

Como este projeto não usa nenhuma ferramenta de build, dá para abrir `public/index.html` direto num
servidor local simples e testar a interface em **modo de demonstração** (os dados ficam só no seu
navegador, em nenhum servidor real) — é assim que a interface foi validada durante o desenvolvimento.
Para usar de verdade com a equipe, é necessário publicar no Netlify (Passo 4) e configurar o Apps
Script (Passo 2), já que é isso que dá acesso à planilha real e a senha de verdade.

## Sobre a segurança

- A senha (`ADMIN_PASSWORD`) e o segredo do Apps Script (`APPS_SCRIPT_SECRET`) nunca ficam visíveis
  no navegador — só a Netlify Function (que roda no servidor da Netlify) os conhece.
- A sessão de login expira em 12 horas; depois disso é preciso digitar a senha de novo.
- Isso é adequado para uma ferramenta interna com acesso único de administrador. Se o número de
  usuários crescer ou o dado ficar mais sensível, vale migrar para uma autenticação mais robusta
  (ex: Netlify Identity ou Google OAuth) — mudança estrutural, precisa ser aprovada antes.
- Nenhum segredo (senhas, `API_SECRET`, `SESSION_SECRET`, chaves de IA) pode ser escrito no código,
  no README ou em qualquer arquivo do repositório — só nas variáveis de ambiente do Netlify e nas
  propriedades do script do Apps Script.
- O **Assistente** nunca executa uma ação que altera dados (cadastrar, registrar entrada/saída/
  locação/devolução/calibração, importação em lote) sozinho — ele sempre para e mostra um cartão de
  confirmação, e só chama o Apps Script depois que você clica em "Confirmar". A chave de IA
  (`GEMINI_API_KEY` ou `ANTHROPIC_API_KEY`) fica só no servidor, igual às outras variáveis.

## Como atualizar o código (GitHub Desktop)

Fluxo usado para as alterações do dia a dia:

1. **Primeira vez:** no GitHub Desktop, *File → Clone repository* → `PROJETO-CONTROLE` → escolha uma
   pasta no computador. Depois, no app do Claude, use **"Add folder"** e selecione essa pasta, para a
   IA editar os arquivos diretamente.
2. **Antes de cada alteração:** clique em **Fetch origin / Pull origin** para trazer a versão mais
   recente (evita conflito com o que foi alterado por outra pessoa ou pelo site do GitHub).
3. A IA faz as alterações seguindo o `CLAUDE.md` (menor mudança possível, testar em `?mock=1`).
4. **Revisar** no GitHub Desktop a lista de arquivos e as linhas alteradas.
5. Escrever um resumo em *Summary* → **Commit to main** → **Push origin**.
6. O Netlify publica sozinho em 1–2 minutos. Mudanças em `apps-script/Code.gs` exigem também colar o
   código novo no Apps Script e fazer **Implantar → Gerenciar implantações → Nova versão**.

Não subir para o repositório: arquivos `.zip`, `.patch`, prints de tela soltos ou qualquer arquivo com
senha/segredo. Arquivos de teste devem ficar fora da pasta do projeto.

## Sobre a cópia no Lovable

Existe uma cópia do sistema no Lovable ("Remix of Project Lovable Streamline"), refeita em React
(TanStack Start). Ela é uma base de código **separada** deste repositório: alterações feitas aqui não
aparecem lá e vice-versa. Hoje o sistema em uso (produção) é o deste repositório, publicado no Netlify;
a cópia do Lovable ainda não está publicada. Trocar a versão oficial para o Lovable é uma mudança
estrutural e precisa ser decidida pelo administrador antes.

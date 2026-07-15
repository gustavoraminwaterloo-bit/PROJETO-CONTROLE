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

## Segredos já gerados para você

Já gerei os dois valores técnicos abaixo (strings aleatórias fortes, só para o sistema usar —
você nunca precisa digitá-las). Guarde-os num lugar seguro (ex: gerenciador de senhas da empresa) —
eles vão ser colados exatamente como estão nos Passos 2 e 4:

| Variável | Valor | Onde entra |
|---|---|---|
| `API_SECRET` (Apps Script) e `APPS_SCRIPT_SECRET` (Netlify) — **é o mesmo valor nos dois lugares** | `xsu4HvfFHykHcLlpaygfg1DjOhM8hhRk3bBXM7WU` | Passo 2 e Passo 4 |
| `SESSION_SECRET` (Netlify) | `RHORLxAcQAeNxfOdICatdmco5T6EIsDPevldzYZY` | Passo 4 |

A única senha que **você** escolhe e vai digitar de fato é a `ADMIN_PASSWORD` (a senha de login do
site) — defina algo memorável só na hora do Passo 4.

## Passo 1 — Criar a planilha no Google Sheets

1. Crie uma planilha nova em [sheets.google.com](https://sheets.google.com).
2. Crie as 5 abas com os cabeçalhos exatos descritos em `docs/planilha-modelo.md`.
3. Copie o **ID da planilha**: é o trecho da URL entre `/d/` e `/edit`.
   Ex: `https://docs.google.com/spreadsheets/d/ESTE_TRECHO_AQUI/edit` → `ESTE_TRECHO_AQUI`.

## Passo 2 — Publicar o Apps Script

1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**.
2. Apague o conteúdo padrão e cole todo o conteúdo de `apps-script/Code.gs` deste repositório.
3. Menu **Configuração do projeto** (ícone de engrenagem) → **Propriedades do script** → adicione:
   - `SHEET_ID` = o ID copiado no passo 1
   - `API_SECRET` = `xsu4HvfFHykHcLlpaygfg1DjOhM8hhRk3bBXM7WU` (já gerado acima — cole exatamente assim)
4. Menu **Implantar** → **Nova implantação** → tipo **Aplicativo da Web**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Autorize as permissões pedidas (é a sua própria conta Google acessando sua própria planilha).
6. Copie a **URL do aplicativo da Web** gerada — vai ser a variável `APPS_SCRIPT_URL` no Netlify.

> Sempre que você editar o `Code.gs`, precisa fazer **Implantar → Gerenciar implantações → Editar
> (ícone de lápis) → Nova versão** para as mudanças valerem na URL publicada.

## Passo 3 — Subir este projeto para o GitHub

1. Crie um repositório novo (pode ser privado) em [github.com/new](https://github.com/new).
2. Neste computador, na pasta do projeto:
   ```
   git init
   git add .
   git commit -m "Primeira versão do sistema de controle"
   git remote add origin <URL do repositório que você criou>
   git branch -M main
   git push -u origin main
   ```

## Passo 4 — Conectar ao Netlify

1. Em [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Escolha o repositório do GitHub que você acabou de criar.
3. Configuração de build (o `netlify.toml` já define isso, só confirme):
   - Build command: (vazio)
   - Publish directory: `public`
4. Antes de publicar, vá em **Site settings → Environment variables** e adicione:
   - `ADMIN_PASSWORD` — escolha agora a senha que você vai digitar para entrar no site
   - `SESSION_SECRET` = `RHORLxAcQAeNxfOdICatdmco5T6EIsDPevldzYZY` (já gerado acima)
   - `APPS_SCRIPT_URL` — a URL copiada no Passo 2
   - `APPS_SCRIPT_SECRET` = `xsu4HvfFHykHcLlpaygfg1DjOhM8hhRk3bBXM7WU` (o mesmo valor do `API_SECRET` do Apps Script)
5. Publique o site (Deploy site).

Pronto — o site estará em uma URL do tipo `https://algum-nome.netlify.app`. Você pode trocar esse
nome em **Site settings → Site details → Change site name**.

## Como usar no dia a dia

- Acesse o site, digite a senha (`ADMIN_PASSWORD`).
- Cadastre os colaboradores e projetos primeiro (menus **Colaboradores** e **Projetos**).
- Cadastre os itens (**Itens → Novo item**), depois registre a entrada de compra (**Entrada**).
- Para tirar algo do estoque, use **Saída** (ou a página do próprio item) — escolhendo se é para um
  colaborador (fica com ele) ou para um projeto (registra retirada/devolução e custo).
- Gere e imprima as etiquetas de QR Code em **Etiquetas** — ajuste o tamanho conforme sua impressora
  térmica antes de imprimir. Cada QR abre a página de histórico daquele item.
- O **Painel** mostra avisos de calibração e validade de materiais de referência vencendo nos
  próximos 60 dias.

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
- Isso é adequado para uma ferramenta interna de uso único (você como administrador). Não é um
  sistema com múltiplos usuários/permissões — se no futuro vários colaboradores precisarem de login
  próprio, vale migrar para uma autenticação mais robusta (ex: Netlify Identity ou Google OAuth).

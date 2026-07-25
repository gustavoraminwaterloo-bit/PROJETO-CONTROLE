import { api, MODO_DEMO } from '../api.js';
import { marcarLogado } from '../app.js';
import { icons } from '../icons.js';

export async function viewLogin(main) {
  // Analista é o modo padrão e visível — o acesso de administrador fica atrás
  // de um ícone discreto, pra não expor pra quem olha a tela que existem dois
  // níveis de acesso diferentes.
  let modo = 'analista';

  function render() {
    main.innerHTML = `
      <div class="login-shell">
        <div class="login-box">
          <div class="logo-icone">${icons.logo}</div>
          <h2>Controle de Insumos e Patrimônio</h2>
          <p class="subtitulo" style="color:var(--text-secondary); margin-bottom:20px">Entre para acessar o painel</p>
          <div class="card" style="position:relative">
            <button type="button" id="btn-modo-alternar" class="icon-btn" title="${modo === 'admin' ? 'Entrar como analista' : 'Acesso administrativo'}"
              aria-label="Alternar tipo de acesso" style="position:absolute; top:10px; right:10px; opacity:0.45">
              ${icons.chave}
            </button>
            ${MODO_DEMO ? `<p class="ajuda" style="margin-bottom:12px">Modo de demonstração: digite ${modo === 'admin' ? 'qualquer senha' : 'qualquer usuário e senha'} para entrar.</p>` : ''}
            <form id="form-login">
              ${modo === 'analista' ? `
                <label>Usuário
                  <input type="text" name="usuario" required autofocus placeholder="ex: fernando.silva" />
                </label>
              ` : ''}
              <label>Senha
                <input type="password" name="senha" required ${modo === 'admin' ? 'autofocus' : ''} placeholder="••••••••" />
              </label>
              <p class="msg-erro" id="erro-login" style="display:none"></p>
              <button type="submit">Entrar</button>
            </form>
          </div>
        </div>
      </div>
    `;

    const btnAlternar = document.getElementById('btn-modo-alternar');
    btnAlternar.addEventListener('mouseenter', () => { btnAlternar.style.opacity = '0.9'; });
    btnAlternar.addEventListener('mouseleave', () => { btnAlternar.style.opacity = '0.45'; });
    btnAlternar.addEventListener('click', () => { modo = modo === 'admin' ? 'analista' : 'admin'; render(); });

    document.getElementById('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(e.target).entries());
      const erroEl = document.getElementById('erro-login');
      erroEl.style.display = 'none';
      const resp = modo === 'admin' ? await api.login(dados.senha) : await api.loginAnalista(dados.usuario, dados.senha);
      if (resp.ok) {
        marcarLogado(true, resp.papel, resp.nome);
        location.hash = resp.papel === 'analista' ? '#/reservas' : '#/';
      } else {
        erroEl.textContent = resp.error || 'Não foi possível entrar.';
        erroEl.style.display = 'block';
      }
    });
  }

  render();
}

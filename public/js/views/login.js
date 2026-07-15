import { api, MODO_DEMO } from '../api.js';
import { marcarLogado } from '../app.js';
import { icons } from '../icons.js';

export async function viewLogin(main) {
  main.innerHTML = `
    <div class="login-shell">
      <div class="login-box">
        <div class="logo-icone">${icons.logo}</div>
        <h2>Controle de Insumos e Patrimônio</h2>
        <p class="subtitulo" style="color:var(--text-secondary); margin-bottom:20px">Entre para acessar o painel</p>
        <div class="card">
          ${MODO_DEMO ? '<p class="ajuda" style="margin-bottom:12px">Modo de demonstração: digite qualquer senha para entrar.</p>' : ''}
          <form id="form-login">
            <label>Senha
              <input type="password" name="senha" required autofocus placeholder="••••••••" />
            </label>
            <p class="msg-erro" id="erro-login" style="display:none"></p>
            <button type="submit">Entrar</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha = new FormData(e.target).get('senha');
    const erroEl = document.getElementById('erro-login');
    erroEl.style.display = 'none';
    const resp = await api.login(senha);
    if (resp.ok) {
      marcarLogado(true);
      location.hash = '#/';
    } else {
      erroEl.textContent = resp.error || 'Não foi possível entrar.';
      erroEl.style.display = 'block';
    }
  });
}

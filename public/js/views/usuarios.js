import { api } from '../api.js';
import { escapeHtml } from '../util.js';

export async function viewUsuarios(main) {
  const usuarios = await api.listUsuarios();

  main.innerHTML = `
    <div class="pagina-titulo">
      <h2>Usuários</h2>
      <div class="subtitulo">Login individual dos analistas — acesso reduzido, só à reserva de veículos</div>
    </div>

    <div class="card">
      <h3>Novo analista</h3>
      <form id="form-usuario" class="grid cols-2" style="max-width:none">
        <label>Nome * <input name="Nome" required /></label>
        <label>Usuário (login) * <input name="Usuario" required placeholder="ex: fernando.silva" /></label>
        <label>Senha * <input name="senha" type="password" required minlength="6" /></label>
        <label>Confirmar senha * <input name="senhaConfirma" type="password" required minlength="6" /></label>
      </form>
      <p class="msg-erro" id="erro-usuario" style="display:none"></p>
      <button id="btn-salvar-usuario" style="margin-top:10px">Criar analista</button>
    </div>

    <div class="card">
      <h3>Lista de usuários</h3>
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Usuário</th><th>Status</th><th class="no-print">Ações</th></tr></thead>
          <tbody>
            ${usuarios.length ? usuarios.map((u) => `
              <tr>
                <td>${escapeHtml(u.Nome)}</td>
                <td>${escapeHtml(u.Usuario)}</td>
                <td><span class="badge ${u.Status === 'Inativo' ? 'fora' : 'estoque'}">${escapeHtml(u.Status)}</span></td>
                <td class="no-print">${u.Status === 'Inativo' ? '' : `<button type="button" class="secundario perigo" data-usuario="${escapeHtml(u.Usuario)}">Desativar</button>`}</td>
              </tr>
            `).join('') : '<tr><td colspan="4">Nenhum usuário cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-salvar-usuario').addEventListener('click', async () => {
    const dados = Object.fromEntries(new FormData(document.getElementById('form-usuario')).entries());
    const erroEl = document.getElementById('erro-usuario');
    erroEl.style.display = 'none';
    if (dados.senha !== dados.senhaConfirma) {
      erroEl.textContent = 'As senhas não coincidem.';
      erroEl.style.display = 'block';
      return;
    }
    try {
      await api.criarUsuario({ Nome: dados.Nome, Usuario: dados.Usuario, senha: dados.senha });
      await viewUsuarios(main);
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.style.display = 'block';
    }
  });

  main.querySelectorAll('[data-usuario]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Desativar o acesso de ${btn.dataset.usuario}?`)) return;
      try {
        await api.desativarUsuario({ Usuario: btn.dataset.usuario });
        await viewUsuarios(main);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

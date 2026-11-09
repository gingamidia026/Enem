'use strict';
const conteudo = document.querySelector('#conteudo');
const aviso = document.querySelector('#aviso');
const menu = document.querySelector('#menu');
let painel = null;
let cadastro = false;
let perfilTeste = false;
let simulado = null;
const escapar = valor => String(valor).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(caminho, dados) {
  const resposta = await fetch(caminho, dados === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});
  const resultado = await resposta.json();
  if (!resposta.ok) {
    if (resposta.status === 401 && painel) { painel = null; simulado = null; login(); }
    throw new Error(resultado.erro || 'Não foi possível concluir. Tente novamente.');
  }
  return resultado;
}
function erro(e) { aviso.textContent = e.message || 'Falha de conexão. Tente novamente.'; }
function tela(html) { aviso.textContent = ''; conteudo.innerHTML = html; }
function login() {
  menu.hidden = true;
  tela(`<div class="acesso"><section class="formulario"><h1>${cadastro ? 'Crie seu espaço' : 'Entre para estudar'}</h1><p>Questões, simulado e seu progresso em um só lugar.</p><form id="acesso">${cadastro ? '<label for="nome">Como você se chama?</label><input id="nome" name="nome" autocomplete="name" minlength="2" maxlength="80" required>' : ''}<label for="email">${cadastro ? 'E-mail' : 'Login'}</label><input id="email" name="email" type="${cadastro ? 'email' : 'text'}" autocomplete="username" maxlength="232" spellcheck="false" required><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="${cadastro ? 'new-password' : 'current-password'}" minlength="${cadastro ? 12 : 1}" maxlength="128" required><small>${cadastro ? 'Use de 12 a 128 caracteres.' : 'Digite sua senha para entrar.'}</small><button type="submit">${cadastro ? 'Criar conta' : 'Entrar'}</button></form>${!cadastro && perfilTeste ? '<p class="nota">Perfil de teste: login <strong>teste</strong> e senha <strong>123</strong>.</p>' : ''}<button class="discreto troca" id="trocar">${cadastro ? 'Já tenho uma conta' : 'Quero criar uma conta'}</button><p><small>Guardamos seu nome, e-mail e respostas para mostrar seu progresso. Use dados de teste nesta versão inicial.</small></p></section></div>`);
  document.querySelector('#trocar').onclick = () => { cadastro = !cadastro; login(); };
  document.querySelector('#acesso').onsubmit = async evento => {
    evento.preventDefault(); const form = evento.currentTarget; const botao = form.querySelector('button');
    botao.disabled = true; aviso.textContent = 'Conectando…';
    try { await api(cadastro ? '/api/cadastro' : '/api/entrar', Object.fromEntries(new FormData(form))); await atualizar(); navegar(); } catch(e) { erro(e); } finally { botao.disabled = false; }
  };
}
async function atualizar() { painel = await api('/api/painel'); menu.hidden = false; }
function indicadores() { const {total, acertos} = painel.progresso; return `<div class="indicadores"><div class="indicador"><strong>${total}</strong><span>respostas enviadas</span></div><div class="indicador"><strong>${acertos}</strong><span>acertos registrados</span></div><div class="indicador"><strong>${total ? Math.round(acertos / total * 100) + '%' : '—'}</strong><span>acerto nas tentativas</span></div></div>`; }
function navegar() {
  if (!painel) return login();
  simulado = null;
  const pagina = location.hash || '#inicio';
  menu.querySelectorAll('a').forEach(a => { if(a.hash === pagina) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  if(pagina === '#questoes') {
    tela('<h1>Escolha o que praticar.</h1><p>Comece por uma área ou explore todas as questões disponíveis.</p><label for="area">Área do conhecimento</label><select id="area"><option value="">Todas as áreas</option>' + [...new Set(painel.questoes.map(q=>q.area))].map(a=>`<option>${escapar(a)}</option>`).join('') + '</select><div id="lista"></div>');
    const listar = () => { document.querySelector('#lista').innerHTML = painel.questoes.filter(q=>!document.querySelector('#area').value || q.area === document.querySelector('#area').value).map(q=>`<article class="linha"><div><p>${escapar(q.area)}</p><h2>${escapar(q.titulo)}</h2></div><button data-questao="${q.id}">Resolver questão</button></article>`).join(''); document.querySelectorAll('[data-questao]').forEach(b=>b.onclick=()=>abrir(Number(b.dataset.questao)).catch(erro)); };
    document.querySelector('#area').onchange = listar; listar();
  } else if(pagina === '#simulado') {
    tela(`<h1>Uma pausa para praticar.</h1><p>Resolva as ${painel.questoes.length} questões demonstrativas, uma de cada área. Ao final, veja quantas acertou nesta rodada.</p><div class="nota">Simulado curto de demonstração, sem cronômetro e sem cálculo de nota TRI. As respostas enviadas entram no seu progresso; a rodada em andamento é perdida ao sair da página.</div><button id="comecar">Começar simulado curto</button>`);
    document.querySelector('#comecar').onclick=()=>{simulado={indice:0,acertos:0,ids:painel.questoes.map(q=>q.id)}; abrir(simulado.ids[0]).catch(erro);};
  } else if(pagina === '#progresso') {
    tela(`<h1>Seu estudo, até aqui.</h1>${indicadores()}<p>${painel.progresso.total ? 'Cada tentativa faz parte do seu histórico. Repetir uma questão também conta como uma nova resposta.' : 'Seu progresso começa na primeira resposta. Escolha uma questão para experimentar.'}</p><a class="botao" href="#questoes">Praticar questões</a><div class="nota">Esses números representam tentativas e acertos nesta plataforma. Não são previsão de desempenho no ENEM.</div>`);
  } else {
    tela(`<p>Olá, ${escapar(painel.conta.nome)}.</p><h1>Vamos dar o próximo passo?</h1><p>Escolha uma questão, tente resolver e confira a explicação. Seu progresso fica guardado na sua conta.</p><div class="acoes"><a class="botao" href="#questoes">Praticar agora</a><a class="botao discreto" href="#simulado">Fazer simulado curto</a></div>${indicadores()}<h2>Um pouco de cada área</h2><p>Matemática, Linguagens, Ciências Humanas e Ciências da Natureza.</p><div class="nota">Catálogo inicial com conteúdo autoral demonstrativo. O banco de questões oficiais ainda não está incluído.</div>`);
  }
}
async function abrir(id) {
  aviso.textContent = 'Carregando questão…';
  const q = await api('/api/questoes/' + id);
  tela(`<section class="questao"><p>${escapar(q.area)}${simulado ? ` · Questão ${simulado.indice+1} de ${simulado.ids.length}` : ''}</p><h1>${escapar(q.titulo)}</h1><p>${escapar(q.enunciado)}</p><form id="responder"><fieldset><legend>Selecione sua resposta</legend>${q.alternativas.map((a,i)=>`<label class="alternativa"><input type="radio" name="alternativa" value="${i}" required><span>${String.fromCharCode(65+i)}. ${escapar(a)}</span></label>`).join('')}</fieldset><button type="submit">Conferir resposta</button></form><div id="resultado" aria-live="polite"></div></section>`);
  document.querySelector('#responder').onsubmit=async evento=>{
    evento.preventDefault(); const form=evento.currentTarget; const botao=form.querySelector('button'); botao.disabled=true;
    try {
      const r=await api('/api/questoes/'+id,{alternativa:Number(new FormData(form).get('alternativa'))});
      form.querySelector('fieldset').disabled=true; botao.hidden=true;
      if(simulado && r.acerto) simulado.acertos++;
      await atualizar();
      document.querySelector('#resultado').innerHTML=`<div class="resultado"><strong>${r.acerto ? 'Você acertou!' : 'Vamos entender essa resposta.'}</strong><p>Alternativa correta: ${String.fromCharCode(65+r.correta)}.</p><p>${escapar(r.explicacao)}</p></div>${simulado ? '<button id="proxima">Continuar simulado</button>' : '<a class="botao" href="#questoes">Escolher outra questão</a>'}`;
      if(simulado) document.querySelector('#proxima').onclick=async()=>{
        simulado.indice++;
        if(simulado.indice < simulado.ids.length) { try { await abrir(simulado.ids[simulado.indice]); } catch(e) { simulado.indice--; erro(e); } }
        else { tela(`<h1>Rodada concluída.</h1><p>Você acertou ${simulado.acertos} de ${simulado.ids.length} questões nesta rodada.</p><a class="botao" href="#progresso">Ver meu progresso</a>`); simulado=null; }
      };
    } catch(e) { erro(e); botao.disabled=false; }
  };
}
document.querySelector('#sair').onclick=async()=>{try {await api('/api/sair',{}); painel=null;simulado=null;login();}catch(e){erro(e);}};
window.addEventListener('hashchange',navegar);
api('/api/configuracao').then(config => { perfilTeste = config.perfilTeste; return atualizar(); }).then(navegar).catch(e=>{login(); if(!e.message.includes('Entre na sua conta'))erro(e);});
// Navegar também quando o destino já é a seção selecionada.
document.addEventListener('click', evento => {
  const link = evento.target.closest('a[href^="#"]');
  if (link && ['#inicio','#questoes','#simulado','#progresso'].includes(link.hash) && link.hash === location.hash) { evento.preventDefault(); navegar(); }
});

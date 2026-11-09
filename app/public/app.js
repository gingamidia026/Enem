'use strict';
const conteudo = document.querySelector('#conteudo');
const aviso = document.querySelector('#aviso');
const menu = document.querySelector('#menu');
let painel = null;
let cadastro = false;
const publico = document.documentElement.dataset.publico === '1';
const conexao = window.ENEM_PUBLICO || {};
// A senha nunca é armazenada. O servidor mantém expiração e revogação.
const chaveSessao = 'pu.sessao.v1';
let sessao = '';
function guardarSessao(token) {
  sessao = token;
  try {
    if (token) localStorage.setItem(chaveSessao, JSON.stringify({token, expira:Date.now()+86400000}));
    else localStorage.removeItem(chaveSessao);
  } catch { /* Navegadores com armazenamento bloqueado mantêm a sessão na página. */ }
}
if (publico) {
  try {
    const salva = JSON.parse(localStorage.getItem(chaveSessao) || 'null');
    if (salva && salva.expira > Date.now() && /^[A-Za-z0-9_-]{20,100}$/.test(salva.token)) sessao = salva.token;
    else guardarSessao('');
  } catch { guardarSessao(''); }
}
function mensagemErro(e) {
  if (e instanceof TypeError || ['TimeoutError','AbortError'].includes(e.name)) return 'Não foi possível conectar ao PU. Verifique sua conexão e tente novamente.';
  return e.message || 'Não foi possível concluir. Tente novamente.';
}
let perfilTeste = publico;
let simulado = null;
const escapar = valor => String(valor).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function transportar(caminho, dados) {
  if (!publico) {
    const resposta = await fetch(caminho, dados === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});
    return {status:resposta.status,dados:await resposta.json()};
  }
  if (!conexao.habilitado || !/^https:\/\/[^/]+$/.test(conexao.intermediario || '')) throw new Error('O acesso público está em configuração. Ainda não é possível entrar.');
  const envio = await fetch(conexao.intermediario + '/pedido', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({metodo:dados===undefined?'GET':'POST',caminho,dados,token:sessao}),signal:AbortSignal.timeout(12000)});
  const recibo = await envio.json();
  if(!envio.ok) throw new Error(recibo.erro || 'A plataforma está temporariamente indisponível.');
  const limite = Date.now() + 30000;
  while(Date.now()<limite) {
    await new Promise(r=>setTimeout(r,500));
    const resposta = await fetch(conexao.intermediario + '/resultado/' + recibo.id, {headers:{Authorization:'Bearer '+recibo.recibo},signal:AbortSignal.timeout(10000)});
    const corpo = await resposta.json();
    if(resposta.status===202) continue;
    if(!resposta.ok) throw new Error(corpo.erro || 'Não foi possível consultar a resposta.');
    return corpo;
  }
  throw new Error('A resposta demorou mais que o esperado. Tente novamente.');
}
async function api(caminho, dados) {
  const resposta = await transportar(caminho,dados);
  const resultado = resposta.dados;
  if(resposta.status>=400) {
    if(resposta.status===401){painel=null;guardarSessao('');simulado=null;login();}
    throw new Error(resultado.erro || 'Não foi possível concluir. Tente novamente.');
  }
  if(resultado.sessao){guardarSessao(resultado.sessao);delete resultado.sessao;}
  if(caminho==='/api/sair')guardarSessao('');
  return resultado;
}
function erro(e) { aviso.textContent = mensagemErro(e); }
const observadorEntrada = 'IntersectionObserver' in window ? new IntersectionObserver(entradas => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('revelar');
      observadorEntrada.unobserve(entrada.target);
    }
  });
}, {threshold: 0.05}) : null;
function tela(html) {
  if (observadorEntrada) observadorEntrada.disconnect();
  aviso.textContent = ''; conteudo.innerHTML = html;
  if (observadorEntrada && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    [...conteudo.children].forEach((bloco, indice) => {
      bloco.style.setProperty('--atraso', `${Math.min(indice, 4) * 80}ms`);
      observadorEntrada.observe(bloco);
    });
  }
}
function login() {
  menu.hidden = true;
  document.body.classList.add('sem-sessao');
  tela(`<div class="acesso"><section class="formulario"><h1>${cadastro ? 'Crie seu espaço' : 'Entre para estudar'}</h1><p>Continue seus estudos, no seu ritmo.</p>${publico && !conexao.habilitado ? '<p class="nota" role="status">O acesso público está em configuração. Ainda não é possível entrar.</p>' : ''}<form id="acesso">${cadastro ? '<label for="nome">Como você se chama?</label><input id="nome" name="nome" autocomplete="name" minlength="2" maxlength="80" required>' : ''}<label for="email">${cadastro ? 'E-mail' : 'Login'}</label><input id="email" name="email" type="${cadastro ? 'email' : 'text'}" autocomplete="username" maxlength="232" spellcheck="false" required><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="${cadastro ? 'new-password' : 'current-password'}" minlength="${cadastro ? 12 : 1}" maxlength="128" required><small>${cadastro ? 'Use de 12 a 128 caracteres.' : 'Digite sua senha para entrar.'}</small><button type="submit" ${publico && !conexao.habilitado ? 'disabled' : ''}>${cadastro ? 'Criar conta' : 'Entrar'}</button><p id="erro-acesso" class="erro-campo" role="alert"></p></form><button class="discreto troca" id="trocar">${cadastro ? 'Já tenho uma conta' : 'Quero criar uma conta'}</button><p class="privacidade"><small>Guardamos seu nome, e-mail e respostas para mostrar seu progresso. Use dados de teste nesta versão inicial.</small></p></section></div>`);
  document.querySelector('#trocar').onclick = () => { cadastro = !cadastro; login(); };
  document.querySelector('#acesso').onsubmit = async evento => {
    evento.preventDefault(); const form = evento.currentTarget; const botao = form.querySelector('button');
    botao.disabled = true; botao.setAttribute('aria-busy','true'); form.setAttribute('aria-busy','true'); document.querySelector('#erro-acesso').textContent=''; botao.textContent = cadastro ? 'Criando conta…' : 'Entrando…'; aviso.textContent = '';
    try { await api(cadastro ? '/api/cadastro' : '/api/entrar', Object.fromEntries(new FormData(form))); await atualizar(); navegar(); } catch(e) { document.querySelector('#erro-acesso').textContent = mensagemErro(e); } finally { form.removeAttribute('aria-busy'); botao.removeAttribute('aria-busy'); botao.disabled = false; botao.textContent = cadastro ? 'Criar conta' : 'Entrar'; }
  };
}
async function atualizar() { painel = await api('/api/painel'); menu.hidden = false; document.body.classList.remove('sem-sessao'); }
function indicadores() { const {total, acertos} = painel.progresso; return `<div class="indicadores"><div class="indicador"><strong>${total}</strong><span>respostas enviadas</span></div><div class="indicador"><strong>${acertos}</strong><span>acertos registrados</span></div><div class="indicador"><strong>${total ? Math.round(acertos / total * 100) + '%' : '—'}</strong><span>acerto nas tentativas</span>${total ? `<progress aria-label="Proporção de acertos nas tentativas" value="${acertos}" max="${total}"></progress>` : ''}</div></div>`; }
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
    evento.preventDefault(); const form=evento.currentTarget; const botao=form.querySelector('button'); botao.disabled=true; botao.setAttribute('aria-busy','true'); botao.textContent='Conferindo…';
    try {
      const r=await api('/api/questoes/'+id,{alternativa:Number(new FormData(form).get('alternativa'))});
      form.querySelector('fieldset').disabled=true; botao.hidden=true;
      form.querySelectorAll('.alternativa').forEach((alternativa,indice)=>{
        if(indice===r.correta || alternativa.querySelector('input').checked){
          alternativa.dataset.correcao=indice===r.correta?'correta':'escolhida';
          const legenda=document.createElement('small'); legenda.className='correcao';
          legenda.textContent=indice===r.correta?'Resposta correta':'Sua resposta'; alternativa.querySelector('span').append(legenda);
        }
      });
      if(simulado && r.acerto) simulado.acertos++;
      await atualizar();
      document.querySelector('#resultado').innerHTML=`<div class="resultado"><strong>${r.acerto ? 'Você acertou!' : 'Vamos entender essa resposta.'}</strong><p>Alternativa correta: ${String.fromCharCode(65+r.correta)}.</p><p>${escapar(r.explicacao)}</p></div>${simulado ? '<button id="proxima">Continuar simulado</button>' : '<a class="botao" href="#questoes">Escolher outra questão</a>'}`;
      if(simulado) document.querySelector('#proxima').onclick=async()=>{
        simulado.indice++;
        if(simulado.indice < simulado.ids.length) { try { await abrir(simulado.ids[simulado.indice]); } catch(e) { simulado.indice--; erro(e); } }
        else { tela(`<h1>Rodada concluída.</h1><p>Você acertou ${simulado.acertos} de ${simulado.ids.length} questões nesta rodada.</p><a class="botao" href="#progresso">Ver meu progresso</a>`); simulado=null; }
      };
    } catch(e) { erro(e); botao.disabled=false; botao.removeAttribute('aria-busy'); botao.textContent='Conferir resposta'; }
  };
}
document.querySelector('#sair').onclick=async()=>{try {await api('/api/sair',{}); painel=null;simulado=null;login();}catch(e){erro(e);}};
window.addEventListener('hashchange',navegar);
login();
if (publico) {
  if (conexao.habilitado && sessao) atualizar().then(navegar).catch(e=>{if(sessao)erro(e);});
} else {
  api('/api/configuracao').then(config => { perfilTeste = config.perfilTeste; return atualizar(); }).then(navegar).catch(e=>{login(); if(!e.message.includes('Entre na sua conta'))erro(e);});
}
// Navegar também quando o destino já é a seção selecionada.
document.addEventListener('click', evento => {
  const link = evento.target.closest('a[href^="#"]');
  if (link && ['#inicio','#questoes','#simulado','#progresso'].includes(link.hash) && link.hash === location.hash) { evento.preventDefault(); navegar(); }
});

document.addEventListener('pointerdown',()=>{document.documentElement.dataset.entrada='ponteiro';});
document.addEventListener('keydown',()=>{document.documentElement.dataset.entrada='teclado';});

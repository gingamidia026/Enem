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
let dispositivo = '';
try { dispositivo=localStorage.getItem('pu.dispositivo.v1') || ''; } catch {}
function guardarSessao(token) {
  sessao = token;
  try {
    if (token) localStorage.setItem(chaveSessao, JSON.stringify({token, expira:Date.now()+30*86400000}));
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
  if(resultado.dispositivo){dispositivo=resultado.dispositivo;try{localStorage.setItem('pu.dispositivo.v1',dispositivo);}catch{} delete resultado.dispositivo;}
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
  PUSimulador.limpar();
  menu.hidden = true;
  document.body.classList.add('sem-sessao');
  tela(`<div class="acesso"><section class="formulario"><h1>${cadastro ? 'Crie seu espaço' : 'Entre para estudar'}</h1><p>Entre para continuar o ciclo de questões e consultar seu progresso.</p>${publico && !conexao.habilitado ? '<p class="nota" role="status">O acesso público está em configuração. Ainda não é possível entrar.</p>' : ''}<form id="acesso">${cadastro ? '<label for="nome">Como você se chama?</label><input id="nome" name="nome" autocomplete="name" minlength="2" maxlength="80" required>' : ''}<label for="email">${cadastro ? 'E-mail' : 'Login'}</label><input id="email" name="email" type="${cadastro ? 'email' : 'text'}" autocomplete="username" maxlength="232" spellcheck="false" required><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="${cadastro ? 'new-password' : 'current-password'}" minlength="${cadastro ? 12 : 1}" maxlength="128" required><small>${cadastro ? 'Use de 12 a 128 caracteres.' : 'Digite sua senha para entrar.'}</small><button type="submit" ${publico && !conexao.habilitado ? 'disabled' : ''}>${cadastro ? 'Criar conta' : 'Entrar'}</button><p id="erro-acesso" class="erro-campo" role="alert"></p></form><button class="discreto troca" id="trocar">${cadastro ? 'Já tenho uma conta' : 'Quero criar uma conta'}</button><p class="privacidade"><small>Guardamos seu nome, e-mail e respostas para mostrar seu progresso. Use dados de teste nesta versão inicial.</small></p></section></div>`);
  document.querySelector('#trocar').onclick = () => { cadastro = !cadastro; login(); };
  document.querySelector('#acesso').onsubmit = async evento => {
    evento.preventDefault(); const form = evento.currentTarget; const botao = form.querySelector('button');
    botao.disabled = true; botao.setAttribute('aria-busy','true'); form.setAttribute('aria-busy','true'); document.querySelector('#erro-acesso').textContent=''; botao.textContent = cadastro ? 'Criando conta…' : 'Entrando…'; aviso.textContent = '';
    try { const entrada = await api(cadastro ? '/api/cadastro' : '/api/entrar', {...Object.fromEntries(new FormData(form)),dispositivo,nomeDispositivo:'Meu navegador'}); if(entrada.iniciando)tela('<p role="status">Estamos iniciando seu site personalizado. Por favor, aguarde.</p>'); if(entrada.painel) mostrarPainel(entrada.painel); else await atualizar(); if(entrada.iniciando && !publico && location.pathname!='/site/'){location.assign('/site/'+location.hash);return;} navegar(); } catch(e) { if(!document.querySelector('#erro-acesso'))login(); document.querySelector('#erro-acesso').textContent = mensagemErro(e); } finally { form.removeAttribute('aria-busy'); botao.removeAttribute('aria-busy'); botao.disabled = false; botao.textContent = cadastro ? 'Criar conta' : 'Entrar'; }
  };
}
function mostrarPainel(dados) { painel = dados; menu.hidden = false; document.body.classList.remove('sem-sessao'); }
async function atualizar() { if(!painel)tela('<p role="status">Estamos iniciando seu site personalizado. Por favor, aguarde.</p>'); mostrarPainel(await api('/api/painel')); }
function indicadores() { const {total, acertos} = painel.progresso; return `<div class="indicadores"><div class="indicador"><strong>${total}</strong><span>respostas enviadas</span></div><div class="indicador"><strong>${acertos}</strong><span>acertos registrados</span></div><div class="indicador"><strong>${total ? Math.round(acertos / total * 100) + '%' : '—'}</strong><span>acerto nas tentativas</span>${total ? `<progress aria-label="Proporção de acertos nas tentativas" value="${acertos}" max="${total}"></progress>` : ''}</div></div>`; }
function densidades() {
  const d=painel.densidade;
  if(!d) return '';
  return `<h2>Densidades de estudo</h2><p><strong>${d.concluidas} densidades completas</strong> · ${d.feitas} de ${d.total} questões neste ciclo.</p>${d.total ? `<progress aria-label="Questões feitas na densidade" value="${d.feitas}" max="${d.total}"></progress>`:''}<p>Uma densidade termina depois de todas as matérias. Acertos e erros contam como prática.</p><p class="secundario">${escapar(d.base)}</p>${d.materias.map(m=>`<p>${escapar(m.materia)}: ${m.feitas} de ${m.total}</p>`).join('')}${d.bloqueada?'<p role="status">Uma questão do ciclo saiu do catálogo. Seu progresso foi guardado. É preciso revisar o catálogo para continuar.</p>':''}${d.proxima?'<button id="continuar-densidade">Continuar densidade</button>':'<p>Não há questão disponível para continuar o ciclo agora.</p>'}`;
}
function ligarDensidade(){const b=document.querySelector('#continuar-densidade');if(b)b.onclick=()=>{b.disabled=true;b.textContent='Carregando…';abrir(painel.densidade.proxima).catch(e=>{erro(e);b.disabled=false;b.textContent='Continuar densidade';});};}
function perfilAluno(){const p=painel.perfil;if(!p)return '';return `<h2>Seu perfil de aprendizagem</h2><p>Veja os assuntos em que acertou menos e mais, junto da quantidade de tentativas. Esses percentuais mudam com suas respostas.</p>${p.assuntos.length?p.assuntos.map(a=>`<article class="linha"><div><h3>${escapar(a.materia)} · ${escapar(a.assunto)}</h3><p>${a.acertos} acertos e ${a.erros} erros em ${a.tentativas} tentativas (${a.percentual}%).</p><p>${a.media===null?'Comparação disponível quando houver respostas de pelo menos cinco usuários nesse assunto.':`Média dos usuários: ${a.media}%. Sua diferença: ${(a.percentual-a.media).toFixed(1)} pontos percentuais.`}</p></div></article>`).join(''):'<p>Responda uma questão para começar seu perfil.</p>'}<p>Média geral dos usuários: ${p.mediaGeral===null?'amostra insuficiente':p.mediaGeral+'%'}.</p><p class="secundario">Atualização semanal: ${escapar(p.atualizada.slice(0,10))}. ${escapar(p.periodo)} Questões retiradas do catálogo não entram na classificação por assunto; suas respostas continuam no histórico total. Esta comparação não é nota TRI.</p>`;}
async function dispositivosPermitidos(){
  tela('<p role="status">Carregando dispositivos…</p>');
  try {
    const dados=await api('/api/dispositivos');
    tela('<h1>Dispositivos autorizados</h1><p>Um novo navegador é registrado após entrar com sua senha. Você pode manter até cinco dispositivos. Revogar encerra as sessões daquele dispositivo.</p>'+dados.dispositivos.map(d=>`<section><h2>${escapar(d.nome)}${d.atual?' (este dispositivo)':''}</h2><button data-revogar="${escapar(d.id)}">Revogar acesso</button></section>`).join(''));
    document.querySelectorAll('[data-revogar]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/dispositivos',{acao:'revogar',id:b.dataset.revogar});await atualizar();await dispositivosPermitidos();}catch(e){erro(e);b.disabled=false;}});
  }catch(e){erro(e);}
}
function privacidade(){tela(`<h1>Seus dados e sua segurança</h1><h2>O que guardamos e para quê</h2><p>Nome, e-mail, senha protegida por hash, sessão e respostas com data. Usamos esses dados para acesso à conta, histórico, perfil de aprendizagem e comparação coletiva semanal. O perfil é calculado por matéria e assunto; não determina capacidade ou diagnóstico.</p><h2>Onde passam os dados</h2><p>O navegador conversa com uma conexão HTTPS intermediária. Pedidos e respostas passam temporariamente por uma fila; o conector do PC os leva ao servidor. Contas e histórico ficam no banco da instalação do PU. O PC precisa estar ligado.</p><h2>Proteção e compartilhamento</h2><p>O navegador não recebe banco, senhas protegidas, respostas de outros alunos ou gabaritos antes da correção. O servidor verifica a sessão em cada pedido. A comparação mostra apenas médias agregadas de grupos com pelo menos cinco usuários e exclui a conta de teste. Não há envio das respostas a modelos de IA nesta funcionalidade.</p><h2>Sessão e armazenamento</h2><p>A sessão dura até 30 dias e pode ser encerrada em Sair da conta. No acesso público, a credencial de sessão fica no armazenamento do navegador; evite dispositivos compartilhados. A conta de teste é compartilhada: use somente dados fictícios nela. O histórico fica guardado entre reinícios. Prazos definitivos de retenção, exclusão de cópias e canal de atendimento ainda precisam ser definidos pela administração.</p><h2>Crianças e adolescentes</h2><p>O tratamento deve respeitar o melhor interesse de crianças e adolescentes. A operação para esse público depende de definição da base legal, procedimento adequado à idade e comunicação com responsáveis quando aplicável. Esses procedimentos ainda estão em revisão: use somente dados de teste nesta versão.</p><h2>Seus direitos</h2><p>Você pode solicitar informações, acesso, correção e exclusão, observadas as condições legais. O canal específico e o responsável pelo tratamento ainda estão pendentes de definição. Esta página descreve o funcionamento atual e não certifica conformidade integral com a LGPD.</p><p><a href="https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes" target="_blank" rel="noopener noreferrer">Orientação da ANPD sobre crianças e adolescentes</a></p><a class="botao" href="#inicio">Voltar ao estudo</a>`);}
function navegar() {
  if(location.hash==='#privacidade') return privacidade();
  if (!painel) return login();
  simulado = null;
  const pagina = location.hash || '#inicio';
  if(pagina==='#dispositivos')return dispositivosPermitidos();
  const oficial = painel.catalogo?.origem === 'cofre';
  const quantidadeSimulado = Math.min(10, painel.questoes.length);
  menu.querySelectorAll('a').forEach(a => { if(a.hash === pagina) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  if(pagina === '#nota') {
    PUSimulador.mostrar(conteudo);
  } else if(pagina === '#questoes') {
    tela(`<h1>Continue seu ciclo de estudo.</h1>${densidades()}`);ligarDensidade();return;
  } else if(pagina === '#simulado') {
    tela(`<h1>Simulado curto</h1><p>Resolva ${quantidadeSimulado} questões ${oficial ? 'do banco do cofre' : 'demonstrativas, uma de cada área'}. Ao final, veja quantas acertou nesta rodada.</p><div class="nota">${oficial ? 'Rodada de prática com questões oficiais do cofre' : 'Simulado curto de demonstração'}, sem cronômetro e sem cálculo de nota TRI. As respostas enviadas ficam no histórico. Ao sair desta página, a contagem da rodada é encerrada; o progresso da densidade permanece salvo.</div><button id="comecar" ${quantidadeSimulado ? '' : 'disabled'}>Começar simulado curto</button>`);
    document.querySelector('#comecar').onclick=()=>{simulado={indice:0,acertos:0,ids:Array(quantidadeSimulado).fill(painel.densidade.proxima)}; abrir(simulado.ids[0]).catch(erro);};
  } else if(pagina === '#progresso') {
    tela(`<h1>Seu progresso</h1>${indicadores()}${perfilAluno()}${densidades()}<p>${painel.progresso.total ? 'Cada tentativa faz parte do seu histórico. Repetir uma questão também conta como uma nova resposta.' : 'Responda à primeira questão do ciclo para começar seu histórico.'}</p><a class="botao" href="#questoes">Praticar questões</a><div class="nota">Esses números representam tentativas e acertos nesta plataforma. Não são previsão de desempenho no ENEM.</div>`);
  } else {
    tela(`<p>Olá, ${escapar(painel.conta.nome)}.</p><h1>Continue seus estudos.</h1><p>Continue o ciclo de questões. Depois de responder, confira a alternativa correta e acompanhe seus acertos por assunto.</p><div class="acoes"><a class="botao" href="#questoes">Praticar agora</a><a class="botao discreto" href="#simulado">Fazer simulado curto</a><a class="botao discreto" href="#nota">Simular nota Enem</a></div>${indicadores()}<h2>Áreas do ciclo</h2><p>Matemática, Linguagens, Ciências Humanas e Ciências da Natureza.</p><div class="nota">${oficial ? `Banco do cofre com ${painel.questoes.length} questões disponíveis. Atualizado ao iniciar ou reiniciar o PU no PC.` : 'Catálogo inicial com conteúdo autoral demonstrativo. O banco de questões oficiais ainda não está incluído.'}</div>`);
  }
  ligarDensidade();
}
async function abrir(id) {
  aviso.textContent = 'Carregando questão…';
  const conhecida = painel?.questoes.find(q=>q.id===id);
  const q = conhecida?.enunciado && conhecida?.alternativas ? conhecida : await api('/api/questoes/' + id);
  tela(`<section class="questao" aria-label="Folha de questões"><div class="cabecalho-prova"><strong>Pé na Universidade</strong><span>${simulado ? 'Simulado curto' : 'Caderno de prática'}</span></div><p class="dados-questao">${escapar(q.area)}${simulado ? ` · Questão ${simulado.indice+1} de ${simulado.ids.length}` : ''}</p><h1>${escapar(q.titulo)}</h1>${q.oficial ? `<p class="secundario">${escapar(q.materia)}${q.revisar ? ' · Classificação de assunto em revisão' : ''}</p>` : ''}<p class="enunciado">${escapar(q.enunciado)}</p>${q.imagens?.length ? `<div class="originais"><p>${q.textoParcial ? 'A extração do texto não preservou todas as alternativas. Abra a imagem original antes de responder.' : 'Consulte a imagem original para conferir figuras, tabelas e fórmulas.'}</p><button type="button" id="ver-original">Ver imagem original da prova</button><p id="estado-original" role="status"></p><div id="imagens-originais"></div></div>` : ''}${q.fonte ? `<p><a href="${escapar(q.fonte)}" target="_blank" rel="noopener noreferrer">Abrir caderno oficial no Inep</a></p>` : ''}<form id="responder"><fieldset><legend>Selecione sua resposta</legend>${q.alternativas.map((a,i)=>`<label class="alternativa"><input type="radio" name="alternativa" value="${i}" required><span>${String.fromCharCode(65+i)}. ${escapar(a)}</span></label>`).join('')}</fieldset><button type="submit" ${q.textoParcial ? 'disabled' : ''}>Conferir resposta</button></form><div id="resultado" aria-live="polite"></div></section>`);
  const envio=crypto.randomUUID();
  let alternativaEnviada=null;
  const verOriginal = document.querySelector('#ver-original');
  if(verOriginal) verOriginal.onclick=async()=>{
    const destino=document.querySelector('#imagens-originais');
    const estado=document.querySelector('#estado-original');
    verOriginal.disabled=true;
    try {
      destino.replaceChildren();
      for(let indice=0;indice<q.imagens.length;indice++) {
        const info=q.imagens[indice];const blocos=[];
        for(let inicio=0;inicio<info.partes;inicio+=3) {
          estado.textContent=`Carregando imagem ${indice+1} de ${q.imagens.length}, parte ${inicio+1} de ${info.partes}…`;
          const partes=await Promise.all(Array.from({length:Math.min(3,info.partes-inicio)},(_,j)=>api('/api/questoes/'+id,{acao:'imagem',indice,parte:inicio+j})));
          if(!destino.isConnected) return;
          partes.forEach(parte=>blocos.push(parte.bloco));
        }
        const imagem=document.createElement('img');imagem.alt=`Imagem original ${indice+1} da questão ${q.titulo}`;
        imagem.src='data:image/png;base64,'+blocos.join('');
        await imagem.decode();destino.append(imagem);
      }
      estado.textContent='Imagens originais carregadas. Você pode conferir sua resposta.';
      document.querySelector('#responder button[type=submit]').disabled=false;
      verOriginal.hidden=true;
    } catch(e) {if(estado.isConnected){estado.textContent=mensagemErro(e);verOriginal.disabled=false;}}
  };
  document.querySelector('#responder').onsubmit=async evento=>{
    evento.preventDefault(); const form=evento.currentTarget; const botao=form.querySelector('button'); botao.disabled=true; botao.setAttribute('aria-busy','true'); botao.textContent='Conferindo…';
    try {
      alternativaEnviada ??= Number(new FormData(form).get('alternativa'));
      const r=await api('/api/questoes/'+id,{alternativa:alternativaEnviada,envio});
      form.querySelector('fieldset').disabled=true; botao.hidden=true;
      form.querySelectorAll('.alternativa').forEach((alternativa,indice)=>{
        if(indice===r.correta || alternativa.querySelector('input').checked){
          alternativa.dataset.correcao=indice===r.correta?'correta':'escolhida';
          const legenda=document.createElement('small'); legenda.className='correcao';
          legenda.textContent=indice===r.correta?'Resposta correta':'Sua resposta'; alternativa.querySelector('span').append(legenda);
        }
      });
      if(simulado && r.acerto) simulado.acertos++;
      if(r.acompanhamento){painel.densidade=r.acompanhamento.densidade;painel.perfil=r.acompanhamento.perfil;painel.progresso=r.progresso;}
      document.querySelector('#resultado').innerHTML=`<div class="resultado"><strong>${r.acerto ? 'Você acertou!' : 'Confira a correção.'}</strong><p>Alternativa correta: ${String.fromCharCode(65+r.correta)}.</p><p>${escapar(r.explicacao)}</p><p>Alternativa mais escolhida na aplicação original: dado indisponível. Pesquisa nos microdados do Inep pendente para este item.</p>${r.densidadeConcluida?'<p role="status"><strong>Densidade concluída: você respondeu às questões de todas as matérias deste ciclo.</strong></p>':''}</div>${simulado ? '<button id="proxima">Continuar simulado</button>' : '<a class="botao" href="#questoes">Continuar densidade</a>'}`;
      if(simulado) document.querySelector('#proxima').onclick=async()=>{
        simulado.indice++;
        if(simulado.indice < simulado.ids.length && painel.densidade.proxima) { try { await abrir(painel.densidade.proxima); } catch(e) { simulado.indice--; erro(e); } }
        else { tela(`<h1>Rodada concluída.</h1><p>Você acertou ${simulado.acertos} de ${simulado.ids.length} questões nesta rodada.</p><a class="botao" href="#progresso">Ver meu progresso</a>`); simulado=null; }
      };
    } catch(e) { erro(e); botao.disabled=false; botao.removeAttribute('aria-busy'); botao.textContent='Conferir resposta'; }
  };
}
document.querySelector('#sair').onclick=async()=>{try {await api('/api/sair',{}); painel=null;simulado=null;login();}catch(e){erro(e);}};
window.addEventListener('hashchange',navegar);
if (publico && conexao.habilitado && sessao) {
  menu.hidden = true; document.body.classList.add('sem-sessao');
  tela('<p role="status">Retomando seus estudos…</p>');
} else login();
if (publico) {
  if (conexao.habilitado && sessao) atualizar().then(navegar).catch(e=>{if(sessao){tela('<p>Não foi possível retomar agora.</p><button id="retomar">Tentar novamente</button>');document.querySelector('#retomar').onclick=()=>atualizar().then(navegar).catch(erro);erro(e);}});
} else {
  api('/api/configuracao').then(config => { perfilTeste = config.perfilTeste; return atualizar(); }).then(navegar).catch(e=>{login(); if(!e.message.includes('Entre na sua conta'))erro(e);});
}
// Navegar também quando o destino já é a seção selecionada.
document.addEventListener('click', evento => {
  const link = evento.target.closest('a[href^="#"]');
  if (link && ['#inicio','#questoes','#simulado','#nota','#progresso','#privacidade','#dispositivos'].includes(link.hash) && link.hash === location.hash) { evento.preventDefault(); navegar(); }
});

document.addEventListener('pointerdown',()=>{document.documentElement.dataset.entrada='ponteiro';});
document.addEventListener('keydown',()=>{document.documentElement.dataset.entrada='teclado';});

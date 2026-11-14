// Teste de navegador da plataforma fluida do PU, sem gastar tokens e sem tocar no banco real.
// Sobe o servidor com banco e catálogo temporários, abre o Chrome sem janela e percorre os fluxos de estudo.
// Uso: node tests/fluida-navegador.mjs [pasta-de-capturas]. Saída: uma linha "OK" ou "FALHA" por item.
// Dominique-Oliveira-Claude🤖🧡, 12/11/2026.
import {spawn, spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';
import {abrirChrome, dormir} from './cdp.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURAS = process.argv[2] || '';
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'pu-fluida-'));
const portaLivre = () => new Promise(ok => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const {port} = s.address(); s.close(() => ok(port)); }); });

// ---------- Catálogo sintético: quatro matérias, uma figura, um conjunto e texto quebrado como no PDF ----------
function png(largura, altura) {
  const crc = dados => { let c = ~0; for (const b of dados) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; } return ~c >>> 0; };
  const bloco = (tipo, dados) => { const corpo = Buffer.concat([Buffer.from(tipo), dados]); const tamanho = Buffer.alloc(4); tamanho.writeUInt32BE(dados.length); const soma = Buffer.alloc(4); soma.writeUInt32BE(crc(corpo)); return Buffer.concat([tamanho, corpo, soma]); };
  const cabecalho = Buffer.alloc(13); cabecalho.writeUInt32BE(largura, 0); cabecalho.writeUInt32BE(altura, 4); cabecalho[8] = 8; cabecalho[9] = 2;
  const linhas = Buffer.alloc((largura * 3 + 1) * altura, 0x99);
  for (let y = 0; y < altura; y++) linhas[y * (largura * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', cabecalho), bloco('IDAT', zlib.deflateSync(linhas)), bloco('IEND', Buffer.alloc(0))]);
}
const figura = png(120, 60); const hashFigura = crypto.createHash('sha256').update(figura).digest('hex');
fs.mkdirSync(path.join(pasta, 'catalogo/imagens'), {recursive: true});
fs.writeFileSync(path.join(pasta, 'catalogo/imagens', hashFigura + '.png'), figura);
const MATERIAS = [['Português', 'Linguagens'], ['Matemática', 'Matemática'], ['Física', 'Ciências da Natureza'], ['História', 'Ciências Humanas']];
const PLACEBO = 'Gabarito registrado no cofre a partir do caderno oficial. Ainda não há solução comentada para esta questão.';
const questoes = [];
for (let id = 1; id <= 24; id++) {
  const [materia, area] = MATERIAS[id % 4];
  questoes.push({id, chave: 'teste:' + id, area, materia, topico: `Assunto ${id % 2 ? 'ímpar' : 'par'} de ${materia}`, titulo: `Enem 2099 · Questão ${String(id).padStart(2, '0')}`, ano: 2099, numero: id, oficial: true, extrator: 2,
    enunciado: `Enunciado curto da questão ${id}.`, alternativas: ['alternativa um', 'alternativa dois', 'alternativa três', 'alternativa quatro', 'alternativa cinco'], correta: id % 5, explicacao: PLACEBO, imagens: [], textoParcial: false, textoComum: '', grupo: '', fonte: 'https://example.com/prova.pdf'});
}
const q = id => questoes.find(x => x.id === id);
q(2).explicacao = 'Explicação comentada da questão 2.';
q(5).enunciado = 'Observe a figura.\n[[midia:0]]\nO que a figura mostra?'; q(5).imagens = [{hash: hashFigura, tipo: 'image/png', partes: 1}];
q(7).enunciado = 'Texto longo copiado do caderno da prova, com linhas quebradas\npela coluna do PDF, que precisam voltar a ser um parágrafo só\nquando aparecem na tela do celular de quem estuda.\nSOBRENOME, N. Obra de teste. São Paulo: Editora, 2020.\nQual é o comando desta questão?';
for (const id of [21, 22]) Object.assign(q(id), {grupo: 'grupo-teste', grupoIds: [21, 22], textoComum: 'Texto comum às duas perguntas do conjunto.', materia: 'História', area: 'Ciências Humanas', topico: 'Conjunto de História'});
fs.writeFileSync(path.join(pasta, 'catalogo/atual.json'), JSON.stringify({formato: 1, questoes, anuladas: 0, revisar: 0, versao: 'fluida'}));

// ---------- Servidor do PU e servidor estático da entrada pública ----------
const porta = await portaLivre(); const portaPublica = await portaLivre();
const URL_LOCAL = `http://127.0.0.1:${porta}`; const URL_PUBLICA = `http://127.0.0.1:${portaPublica}`;
fs.mkdirSync(path.join(pasta, 'dados'));
const servidor = spawn('python3', [path.join(RAIZ, 'app/servidor.py')], {stdio: 'ignore', env: {...process.env, DADOS: path.join(pasta, 'dados'), CATALOGO: path.join(pasta, 'catalogo/atual.json'), PORTA: String(porta), ESCUTA: '127.0.0.1', ORIGEM: URL_LOCAL, PERFIL_TESTE: '0', AMBIENTES_INDIVIDUAIS: '0'}});
const INTERMEDIARIO = 'https://intermediario.teste';
const estatico = http.createServer((pedido, resposta) => {
  const caminho = decodeURIComponent(new URL(pedido.url, URL_PUBLICA).pathname);
  if (caminho === '/configuracao-publica.js') { resposta.writeHead(200, {'Content-Type': 'text/javascript'}); return resposta.end(`window.ENEM_PUBLICO = Object.freeze({habilitado: true, intermediario: '${INTERMEDIARIO}'});`); }
  const arquivo = path.join(RAIZ, caminho === '/' ? 'index.html' : caminho);
  if (!arquivo.startsWith(RAIZ) || !/^\/(index\.html)?$|^\/app\/public\/(?:(?:fontes|ilustracoes)\/)?[a-z0-9.-]+$|^\/manifest\.webmanifest$|^\/icones\/[a-z0-9.-]+$/.test(caminho) || !fs.existsSync(arquivo)) { resposta.writeHead(404); return resposta.end(); }
  resposta.writeHead(200, {'Content-Type': {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'}[path.extname(arquivo)]});
  // A política de conteúdo da entrada pública aponta para o intermediário real; no teste, para o simulado.
  resposta.end(caminho === '/' ? fs.readFileSync(arquivo, 'utf8').replace('https://enem-ginga-conexao.sabrinaconradoadv.chatgpt.site', INTERMEDIARIO) : fs.readFileSync(arquivo));
}).listen(portaPublica, '127.0.0.1');
for (let i = 0; i < 100; i++) { try { await fetch(URL_LOCAL + '/api/saude'); break; } catch { await dormir(50); } }

const sql = comando => { const r = spawnSync('python3', ['-c', `import sqlite3,sys,json\nc=sqlite3.connect(sys.argv[1])\nr=c.execute(sys.argv[2]).fetchall()\nc.commit()\nprint(json.dumps(r))`, path.join(pasta, 'dados/estudos.sqlite3'), comando], {encoding: 'utf8'}); if (r.status) throw new Error(r.stderr); return JSON.parse(r.stdout); };

// ---------- Roteiro ----------
const resultados = [];
const chrome = await abrirChrome();
let p = await chrome.novaPagina({largura: 390, altura: 844});
async function item(nome, passos) {
  try { await passos(); resultados.push([nome, true]); console.log('OK     ' + nome); }
  catch (e) { resultados.push([nome, false]); console.log('FALHA  ' + nome + ' :: ' + e.message.split('\n')[0]); if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'falha-' + nome.replace(/[^a-z0-9]+/gi, '-').slice(0, 50) + '.png')).catch(() => {}); }
}
const igual = (obtido, esperado, nome) => { if (JSON.stringify(obtido) !== JSON.stringify(esperado)) throw new Error(`${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`); };
const certo = (condicao, nome) => { if (!condicao) throw new Error(nome); };
const trocou = '(id => { const e = document.querySelector(".questao:not(.esqueleto)"); return Boolean(e) && Number(e.dataset.id) !== id; })';
const idAtual = () => p.avaliar('Number(document.querySelector(".questao")?.dataset.id || 0)');
const questaoPronta = () => p.esperar('document.querySelector(".questao:not(.esqueleto) #conferir, .questao:not(.esqueleto) #proxima")', 8000, 'questão pronta');
const marcar = (id, alternativa) => p.clicar(`input[name="alternativa-${id}"][value="${alternativa}"]`);
const errada = id => (q(id).correta + 1) % 5;
const hoje = async () => (await p.texto('.ritmo-hoje strong')).trim();
async function responder({acertar = true, chute = false} = {}) {
  await questaoPronta(); const id = await idAtual(); const ids = q(id).grupo ? q(id).grupoIds : [id];
  for (const cada of ids) await marcar(cada, acertar ? q(cada).correta : errada(cada));
  await p.clicar(chute ? '#chutei' : '#conferir');
  await p.esperar('document.querySelector("#proxima, #ver-resposta")');
  if (await p.existe('#ver-resposta')) await p.clicar('#ver-resposta');
  await p.esperar('document.querySelector("#proxima")');
  return id;
}
// Abre uma questão escolhida pelo teste, mesmo que a conta já a tenha respondido.
const abrir = async id => { await p.avaliar(`(() => { estado.primeira = ${id}; estado.puladas.clear(); estado.feitasSessao.delete(${id}); if (!painel.densidade.pendentes.includes(${id})) painel.densidade.pendentes.unshift(${id}); prefs.alvo.valor = 999; verEstudo(); })()`); await p.esperar(`Number(document.querySelector(".questao:not(.esqueleto)")?.dataset.id) === ${id}`, 8000, 'abrir a questão ' + id); };
const seguinte = async () => { const antes = await idAtual(); await p.clicar('#proxima'); await p.esperar(`document.querySelector(".marco") || (document.querySelector(".questao:not(.esqueleto)") && Number(document.querySelector(".questao").dataset.id) !== ${antes})`, 8000, 'próxima questão ou marco'); };
async function cadastrar(nome) {
  await p.ir(URL_LOCAL); await p.esperar('document.querySelector("#acesso")');
  await p.clicar('#trocar'); await p.preencher('#nome', nome); await p.preencher('#email', nome.toLowerCase().replace(/\W+/g, '') + '@example.com'); await p.preencher('#senha', 'Senha longa de teste 123!');
  await p.clicar('#acesso button[type=submit]'); await questaoPronta();
}

await item('entrada explica o PU antes do cadastro e deixa experimentar uma questão', async () => {
  await p.ir(URL_LOCAL); await p.esperar('document.querySelector("#acesso")');
  certo((await p.texto('.apresentacao')).includes('uma questão por vez'), 'apresentação');
  igual(await p.avaliar('document.querySelector("#menu").hidden'), true, 'menu escondido sem sessão');
  await p.clicar('#demonstracao input[value="0"]');
  certo((await p.texto('#retorno-demonstracao')).includes('A certa é a D'), 'correção da demonstração');
  igual(await p.avaliar('document.querySelector("#demonstracao .alternativa:nth-of-type(4)").dataset.correcao'), 'correta', 'alternativa certa marcada');
  await p.clicar('#quero-conta'); await p.esperar('document.querySelector("#nome")');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'entrada-390.png'));
});
await item('entrada sem rolagem lateral em 320, 360, 390, 412, 768 e 1280', async () => {
  for (const largura of [320, 360, 412, 768, 1280, 390]) { await p.tamanho(largura, 844); await dormir(120); certo(await p.semRolagemLateral(), 'rolagem lateral em ' + largura); }
});
// Nome acessível calculado pelo próprio Chrome (árvore de acessibilidade), para provar que o rótulo que vira não duplica.
const nomeAcessivel = async seletor => {
  const {root} = await p.s('DOM.getDocument', {depth: 0}); const {nodeId} = await p.s('DOM.querySelector', {nodeId: root.nodeId, selector: seletor});
  const {nodes} = await p.s('Accessibility.getPartialAXTree', {nodeId, fetchRelatives: false}); return nodes[0]?.name?.value ?? null;
};
await item('entrada nova: faixa que corre, selos fora da leitura e botão principal com um nome só', async () => {
  await p.tamanho(390, 844); await p.clicar('#trocar'); await p.esperar('document.querySelector("#acesso") && !document.querySelector("#nome")');
  igual(await p.avaliar('document.querySelectorAll(".faixa-corre").length'), 1, 'uma faixa que corre');
  igual(await p.avaliar('getComputedStyle(document.querySelector(".trilho")).animationName'), 'correr-faixa', 'faixa correndo');
  const velocidade = await p.avaliar('document.querySelector(".frases").offsetWidth / parseFloat(getComputedStyle(document.querySelector(".trilho")).animationDuration)');
  certo(velocidade > 30 && velocidade < 50, 'cerca de 40 px/s, veio ' + velocidade);
  igual(await p.avaliar('[...document.querySelectorAll(".frases")].map(l => l.getAttribute("aria-hidden"))'), [null, 'true'], 'cópia da faixa fora da leitura de tela');
  igual(await p.avaliar('getComputedStyle(document.querySelector(".faixa-corre")).overflowX'), 'clip', 'faixa recortada');
  const selos = await p.avaliar('[...document.querySelectorAll(".selos-cartaz")].map(s => ({oculto: s.getAttribute("aria-hidden"), desenhos: s.querySelectorAll("svg").length, noTitulo: Boolean(s.closest("h1"))}))');
  igual(selos, [{oculto: 'true', desenhos: 3, noTitulo: true}], 'selos encostados no título e fora da leitura');
  igual(await nomeAcessivel('.apresentacao h1'), 'Estude para o Enem uma questão por vez.', 'título sem os selos no nome');
  const botao = '#acesso button[type=submit]';
  igual(await p.avaliar(`[...document.querySelector("${botao}").querySelectorAll(".vira-a, .vira-b")].map(e => e.className + ":" + e.getAttribute("aria-hidden"))`), ['vira-a:null', 'vira-b:true'], 'rótulo duplicado com aria-hidden na cópia');
  igual(await nomeAcessivel(botao), 'Entrar', 'nome acessível único'); igual((await p.texto(botao)).trim(), 'Entrar', 'innerText único');
  igual(await p.avaliar('[...document.querySelectorAll("#menu a")].every(a => a.querySelector(".vira-b[aria-hidden=true]"))'), true, 'menu com o rótulo que vira');
  for (const largura of [320, 360, 390, 412, 768, 1280]) { await p.tamanho(largura, 844); await dormir(120); certo(await p.semRolagemLateral(), 'rolagem lateral na entrada nova em ' + largura); }
  // Com ponteiro fino, passar sobre o botão troca o rótulo; o nome acessível continua um só.
  if (await p.avaliar('matchMedia("(hover:hover) and (pointer:fine)").matches')) {
    const centro = await p.avaliar(`(() => { const e = document.querySelector("${botao}"); e.scrollIntoView({block: "center"}); const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; })()`);
    await p.s('Input.dispatchMouseEvent', {type: 'mouseMoved', x: centro.x, y: centro.y}); await dormir(900);
    igual(await p.avaliar(`getComputedStyle(document.querySelector("${botao} .vira-b")).visibility`), 'visible', 'cópia aparece no passar do ponteiro');
    igual(await nomeAcessivel(botao), 'Entrar', 'nome único com o rótulo virado');
    await p.s('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 1, y: 1});
  }
  // Foco pelo teclado também vira o rótulo (o Chrome sem janela não tem ponteiro fino).
  await p.tecla('x'); await p.avaliar(`document.querySelector("${botao}").focus()`); await dormir(900);
  igual(await p.avaliar(`[getComputedStyle(document.querySelector("${botao} .vira-b")).visibility, getComputedStyle(document.querySelector("${botao} .vira-a")).opacity]`), ['visible', '0'], 'rótulo virado no foco pelo teclado');
  igual(await nomeAcessivel(botao), 'Entrar', 'nome único com o rótulo virado'); igual((await p.texto(botao)).trim().startsWith('Entrar'), true, 'texto do botão');
  await p.avaliar('document.activeElement.blur()');
  await p.s('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  try {
    await dormir(100);
    igual(await p.avaliar('getComputedStyle(document.querySelector(".trilho")).animationName'), 'none', 'faixa parada com movimento reduzido');
    igual(await p.avaliar('getComputedStyle(document.querySelector(".trilho")).transform'), 'none', 'faixa no início');
    igual(await p.avaliar('[...document.querySelectorAll(".entrada > *")].map(e => getComputedStyle(e).animationName)'), ['none', 'none', 'none', 'none'], 'entrada sem animação');
  } finally { await p.s('Emulation.setEmulatedMedia', {features: []}); }
  await p.tamanho(390, 844); await dormir(100);
});
await item('cadastro cai direto numa questão curta, sem clique a mais', async () => {
  await cadastrar('Primeira');
  const id = await idAtual(); certo(id > 0 && !q(id).imagens.length && !q(id).grupo, 'primeira questão curta, veio ' + id);
  igual(await hoje(), '0 de 5', 'ritmo do dia');
  igual(await p.avaliar('document.querySelector("#conferir").disabled'), true, 'Conferir só depois de marcar');
  certo(!(await p.avaliar('fetch("/api/painel").then(r => r.text())')).includes('"correta"'), 'painel sem gabarito');
});
await item('menu embaixo no celular e no cabeçalho no computador, com cinco destinos', async () => {
  igual(await p.avaliar('[...document.querySelectorAll("#menu a")].map(a => a.innerText.trim())'), ['Estudar', 'Progresso', 'Simulado', 'Nota', 'Conta'], 'destinos');
  igual(await p.avaliar('getComputedStyle(document.querySelector("#menu")).position'), 'fixed', 'menu fixo no celular');
  certo(await p.avaliar('[...document.querySelectorAll("#menu a")].every(a => a.getBoundingClientRect().height >= 44)'), 'toque de 44 px');
  await p.tamanho(1280, 900); await dormir(100);
  igual(await p.avaliar('getComputedStyle(document.querySelector("#menu")).position'), 'static', 'menu no cabeçalho');
  await p.tamanho(390, 844); await dormir(100);
});
await item('erro: marca a escolhida, deixa tentar de novo e só então mostra a certa', async () => {
  const id = await idAtual(); await marcar(id, errada(id)); await p.clicar('#conferir');
  await p.esperar('document.querySelector("#ver-resposta")');
  certo((await p.texto('.correcao')).includes('Não foi essa'), 'aviso de erro');
  igual(await p.avaliar(`document.querySelectorAll('.alternativa[data-correcao=correta]').length`), 0, 'gabarito ainda escondido');
  await marcar(id, q(id).correta);
  await p.esperar('document.querySelector("#proxima")');
  certo((await p.texto('.correcao')).includes('Agora sim'), 'segunda tentativa certa');
  igual(await p.avaliar(`[...document.querySelectorAll('.alternativa[data-correcao]')].map(a => a.dataset.correcao).sort()`), ['correta', 'errada'], 'escolhida e certa marcadas');
  certo((await p.texto('.correcao')).includes('volta na sua revisão amanhã'), 'aviso de revisão');
  igual(await hoje(), '1 de 5', 'ritmo');
  igual(sql('SELECT COUNT(*) FROM respostas')[0][0], 1, 'segunda tentativa não é registrada');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'correcao-390.png'));
});
await item('acerto mostra Certa e a próxima questão já vem pronta', async () => {
  await seguinte(); const id = await responder();
  certo((await p.texto('.correcao')).includes('Certa!'), 'acerto'); igual(await hoje(), '2 de 5', 'ritmo');
  await dormir(350);
  igual(await p.avaliar('getComputedStyle(document.querySelector(".alternativa[data-correcao=correta]")).backgroundColor'), 'rgb(237, 243, 236)', 'alternativa certa em verde, mesmo marcada');
  certo((await p.texto('#anuncio')).includes('Certa'), 'resultado anunciado ao leitor de tela');
  certo(id !== 0, 'id');
});
await item('Chutei: acerto no chute vai para a revisão', async () => {
  await seguinte(); await responder({chute: true});
  certo((await p.texto('.correcao')).includes('Como foi chute'), 'aviso do chute');
  igual(sql('SELECT COUNT(*) FROM respostas WHERE chute=1 AND acerto=1')[0][0], 1, 'chute gravado');
  await p.avaliar('location.hash = "#progresso"'); await p.esperar('document.querySelector(".passo")');
  certo((await p.texto('#conteudo')).includes('2 questões estão no seu caderno de revisão'), 'caderno com erro e chute');
  await p.avaliar('location.hash = "#estudar"'); await questaoPronta();
});
await item('alternativa marcada continua lá ao sair e voltar', async () => {
  const id = await idAtual(); await marcar(id, 3);
  await p.avaliar('location.hash = "#conta"'); await p.esperar('document.querySelector("#sair")');
  await p.avaliar('location.hash = "#estudar"'); await questaoPronta();
  igual(await idAtual(), id, 'mesma questão'); igual(await p.avaliar(`document.querySelector('input[name="alternativa-${id}"][value="3"]').checked`), true, 'marcação preservada');
});
await item('Pular troca de questão sem registrar resposta', async () => {
  const id = await idAtual(); const antes = sql('SELECT COUNT(*) FROM respostas')[0][0];
  await p.clicar('#pular'); await p.esperar(`${trocou}(${id})`, 8000, "troca de questão");
  igual(sql('SELECT COUNT(*) FROM respostas')[0][0], antes, 'nada registrado');
});
await item('falha de rede não perde a marcação nem conta a resposta duas vezes', async () => {
  await questaoPronta(); const id = await idAtual(); const antes = sql('SELECT COUNT(*) FROM respostas')[0][0];
  await marcar(id, q(id).correta);
  await p.s('Network.emulateNetworkConditions', {offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
  await p.clicar('#conferir'); await p.esperar('document.querySelector("#retorno .engano")');
  certo((await p.texto('#retorno')).includes('não foi enviada'), 'aviso de envio');
  igual(await p.avaliar(`document.querySelector('input[name="alternativa-${id}"][value="${q(id).correta}"]').checked`), true, 'marcação mantida');
  await p.s('Network.emulateNetworkConditions', {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
  await p.clicar('#conferir'); await p.esperar('document.querySelector("#proxima")');
  igual(sql('SELECT COUNT(*) FROM respostas')[0][0], antes + 1, 'uma resposta só');
});
await item('meta do dia: ponto de parada com Mais 5, sem empurrar', async () => {
  await seguinte(); await responder(); igual(await hoje(), '5 questões', 'meta'); await seguinte();
  certo((await p.texto('.marco')).includes('Meta de hoje cumprida'), 'marco');
  certo((await p.texto('.marco')).includes('Encerrar por hoje'), 'opção de parar');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'meta-390.png'));
  await p.clicar('#mais-cinco'); await questaoPronta(); igual(await hoje(), '5 de 10', 'novo bloco');
  certo(await p.existe('.ritmo .selo.certo'), 'selo de meta cumprida');
});
await item('foco por matéria mostra só a matéria escolhida e mantém a densidade', async () => {
  await p.clicar('#abrir-foco'); await p.clicar('#painel-foco [data-materia="Física"]'); await questaoPronta();
  certo((await p.texto('.questao-topo .rotulo')).startsWith('Física'), 'questão de Física');
  const feitas = sql('SELECT feitos FROM ciclos')[0][0]; await responder();
  certo(JSON.parse(sql('SELECT feitos FROM ciclos')[0][0]).length === JSON.parse(feitas).length + 1, 'densidade andou no foco');
  await seguinte(); certo((await p.texto('.questao-topo .rotulo')).startsWith('Física'), 'segue em Física');
  await p.clicar('.modos [data-modo="misturado"]'); await questaoPronta();
});
await item('figura carrega sozinha e libera o Conferir', async () => {
  await abrir(5);
  await p.esperar('document.querySelector(".figura img")?.naturalWidth === 120', 8000, 'figura carregada');
  await marcar(5, q(5).correta); igual(await p.avaliar('document.querySelector("#conferir").disabled'), false, 'Conferir liberado');
  await p.clicar('#conferir'); await p.esperar('document.querySelector("#proxima")');
});
await item('texto do PDF vira parágrafo, com referência e comando separados', async () => {
  await abrir(7);
  igual(await p.avaliar('document.querySelector(".enunciado .paragrafo").innerText.includes("\\n")'), false, 'parágrafo sem quebra do PDF');
  igual(await p.texto('.enunciado .comando'), 'Qual é o comando desta questão?', 'comando'); certo((await p.texto('.enunciado .fonte')).startsWith('SOBRENOME'), 'referência');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'questao-390.png'));
  await responder();
  certo(!(await p.texto('.correcao')).includes('solução comentada'), 'acerto seguro não pede explicação');
});
await item('conjunto: duas perguntas respondidas juntas e corrigidas uma a uma', async () => {
  await abrir(21);
  certo((await p.texto('.texto-comum')).includes('Texto comum'), 'texto comum');
  await marcar(21, q(21).correta); igual(await p.avaliar('document.querySelector("#conferir").disabled'), true, 'falta a segunda');
  await marcar(22, errada(22)); await p.clicar('#conferir'); await p.esperar('document.querySelector("#proxima")');
  igual(await p.avaliar('[...document.querySelectorAll(".correcao")].map(c => c.innerText.includes("Certa!"))'), [true, false], 'correção por pergunta');
});
await item('explicação comentada aparece quando existe', async () => {
  await abrir(2);
  await marcar(2, errada(2)); await p.clicar('#conferir'); await p.clicar('#ver-resposta'); await p.esperar('document.querySelector("#proxima")');
  certo((await p.texto('.correcao')).includes('Explicação comentada da questão 2.'), 'explicação');
  certo(await p.existe('[data-treinar]'), 'atalho para treinar o assunto');
});
await item('progresso leva à próxima ação e ao treino por assunto', async () => {
  await p.avaliar('location.hash = "#progresso"'); await p.esperar('document.querySelector(".passo")');
  certo((await p.texto('h1')).includes('Seu progresso'), 'título'); certo(await p.existe('details.materia'), 'matérias');
  certo((await p.texto('#conteudo')).includes('não são nota TRI'), 'aviso de TRI mantido');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'progresso-390.png'));
  await p.avaliar('document.querySelector("details.materia").open = true'); await p.clicar('[data-treinar-materia]');
  await questaoPronta(); igual(await p.avaliar('document.querySelector("#abrir-foco").hasAttribute("data-ativo")'), true, 'foco ligado');
  certo((await p.texto('#abrir-foco')).includes(':'), 'foco no assunto');
  await p.clicar('.modos [data-modo="misturado"]'); await questaoPronta();
});
await item('revisão espaçada: o erro de ontem volta hoje com selo de revisão', async () => {
  sql('UPDATE respostas SET criada = criada - 86400');
  await p.recarregar(); await questaoPronta();
  const vencidas = await p.avaliar('painel.estudo.revisao.vencidas.length'); certo(vencidas >= 3, 'vencidas: ' + vencidas);
  certo((await p.texto('.modos [data-modo="revisao"]')).includes(String(vencidas)), 'contagem na ficha');
  igual(await hoje(), '0 de 5', 'dia novo começa do zero');
  await p.clicar('.modos [data-modo="revisao"]'); await questaoPronta();
  certo(await p.existe('.questao .selo.revisao'), 'selo de revisão');
  await responder(); igual(await p.avaliar('painel.estudo.revisao.vencidas.length'), vencidas - 1, 'revisão feita sai da fila do dia');
  await p.clicar('.modos [data-modo="misturado"]'); await questaoPronta();
});
await item('abre na hora com o que ficou guardado, mesmo com o servidor fora', async () => {
  await p.recarregar(); await questaoPronta(); const id = await idAtual();
  certo(await p.avaliar('Boolean(JSON.parse(localStorage.getItem("pu.painel.v2")).conta)'), 'painel guardado');
  certo(!(await p.avaliar('localStorage.getItem("pu.painel.v2") + localStorage.getItem("pu.questoes.v2")')).includes('"correta"'), 'sem gabarito no aparelho');
  await p.s('Network.setBlockedURLs', {urls: ['*/api/*']});
  try {
    await p.recarregar();
    await p.esperar('document.querySelector(".questao:not(.esqueleto) #conferir")', 3000, 'questão na tela sem rede');
    igual(await idAtual(), id, 'mesma questão de antes');
    await p.esperar('document.querySelector("#aviso").textContent.includes("conectar")', 4000, 'aviso de conexão');
  } finally { await p.s('Network.setBlockedURLs', {urls: []}); }
  await p.recarregar(); await questaoPronta();
});
await item('simulado: correção só no fim, retomada depois de recarregar e revisão das questões', async () => {
  await p.avaliar('location.hash = "#simulado"'); await p.clicar('#comecar');
  await p.esperar('document.querySelector(".simulado-topo")'); await questaoPronta();
  const ids = await p.avaliar('simulado.ids'); igual(ids.length, 10, 'dez questões'); certo(!ids.includes(21) && !ids.includes(22), 'sem conjuntos');
  certo(new Set(ids.slice(0, 4).map(id => q(id).area)).size === 4, 'quatro áreas nas quatro primeiras');
  for (let n = 0; n < 3; n++) { const id = await idAtual(); await marcar(id, n === 0 ? errada(id) : q(id).correta); await p.clicar('#conferir'); await p.esperar(`${trocou}(${id})`, 8000, "troca de questão"); igual(await p.existe('.alternativa[data-correcao]'), false, 'sem correção durante'); }
  await p.recarregar(); await p.esperar('document.querySelector("#continuar")');
  certo((await p.texto('#conteudo')).includes('questão 4 de 10'), 'retomada no ponto certo');
  await p.clicar('#continuar'); await questaoPronta();
  for (let n = 3; n < 9; n++) { const id = await idAtual(); await marcar(id, q(id).correta); await p.clicar('#conferir'); await p.esperar(`document.querySelector(".resultado-simulado, #tentar") || ${trocou}(${id})`, 12000, "troca de questão"); }
  // Última resposta com o servidor fora e a página recarregada no meio do envio: não pode travar nem perder a rodada.
  await dormir(600); const ultima = await idAtual(); await marcar(ultima, q(ultima).correta);
  await p.s('Network.setBlockedURLs', {urls: ['*/api/questoes/*']});
  try { await p.clicar('#conferir'); await p.esperar('document.querySelector("h1")?.innerText.includes("Corrigindo")', 5000, 'correção em andamento'); await p.recarregar(); }
  finally { await p.s('Network.setBlockedURLs', {urls: []}); }
  await p.esperar('document.querySelector(".resultado-simulado, #tentar")', 20000, 'resultado depois de recarregar');
  if (await p.existe('#tentar')) await p.clicar('#tentar');
  await p.esperar('document.querySelector(".resultado-simulado")', 12000, 'resultado');
  certo(!(await p.avaliar('localStorage.getItem("pu.simulado.v2")')).includes('enviando'), 'envio em andamento não é gravado');
  certo((await p.texto('h1')).includes('Você acertou 9 de 10'), 'placar: ' + await p.texto('h1'));
  igual(await p.avaliar('document.querySelectorAll(".linha-resultado[data-acerto=false]").length'), 1, 'uma errada');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'simulado-390.png'));
  await p.clicar('.linha-resultado[data-acerto=false] [data-rever]'); await p.esperar('document.querySelector("#voltar-resultado")');
  igual(await p.avaliar(`[...document.querySelectorAll('.alternativa[data-correcao]')].map(a => a.dataset.correcao).sort()`), ['correta', 'errada'], 'revisão marcada');
  await p.clicar('#voltar-resultado'); await p.esperar('document.querySelector(".resultado-simulado")');
});
await item('conta: meta do dia, dispositivos e saída que limpa o aparelho', async () => {
  await p.avaliar('location.hash = "#conta"'); await p.esperar('document.querySelector("[data-revogar]")');
  await p.clicar('[data-meta="3"]'); igual(await p.avaliar('JSON.parse(localStorage.getItem("pu.prefs.v1." + painel.conta.id)).meta'), 3, 'meta guardada por conta');
  certo((await p.texto('#dispositivos')).includes('este dispositivo'), 'dispositivo atual');
  // Lembrete diário: arquivo de calendário gerado no aparelho, sem pedido ao servidor.
  await p.avaliar('(() => { window.__ics = null; const original = URL.createObjectURL; URL.createObjectURL = b => { b.text().then(t => { window.__ics = t; }); return original.call(URL, b); }; HTMLAnchorElement.prototype.click = function () {}; })()');
  await p.preencher('#hora-lembrete', '07:30'); await p.clicar('#criar-lembrete'); await p.esperar('window.__ics');
  const ics = await p.avaliar('window.__ics'); certo(ics.includes('RRULE:FREQ=DAILY') && /DTSTART:\d{8}T073000/.test(ics) && /DTEND:\d{8}T074000/.test(ics) && ics.includes('BEGIN:VALARM'), 'evento diário às 07:30');
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'conta-390.png'));
  await p.clicar('#sair'); await p.esperar('document.querySelector("#acesso")');
  igual(await p.avaliar('[localStorage.getItem("pu.painel.v2"), localStorage.getItem("pu.questoes.v2"), localStorage.getItem("pu.simulado.v2")]'), [null, null, null], 'aparelho limpo');
  igual((await p.avaliar('fetch("/api/painel").then(r => r.status)')), 401, 'sessão encerrada no servidor');
});
await item('dados e segurança abre sem sessão e simulador de nota continua funcionando', async () => {
  await p.avaliar('location.hash = "#privacidade"'); await p.esperar('document.querySelector("h1")?.innerText.includes("Seus dados")');
  certo((await p.texto('#conteudo')).includes('Chutei'), 'texto atualizado');
  await cadastrar('Segunda'); await p.avaliar('location.hash = "#nota"'); await p.esperar('document.querySelector(".simulador")');
  certo(await p.semRolagemLateral(), 'simulador sem rolagem lateral');
});
await item('teclado no computador: letra marca, Enter confere e segue', async () => {
  await p.tamanho(1280, 900); await p.avaliar('location.hash = "#estudar"'); await questaoPronta();
  const id = await idAtual(); await p.tecla('abcde'[q(id).correta]);
  igual(await p.avaliar(`document.querySelector('input[name="alternativa-${id}"]:checked')?.value`), String(q(id).correta), 'letra marcou');
  await p.tecla('Enter'); await p.esperar('document.querySelector("#proxima")');
  await p.avaliar('document.activeElement.blur()'); await p.tecla('Enter'); await p.esperar(`${trocou}(${id})`, 8000, "troca de questão");
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'estudar-1280.png'));
  certo(await p.semRolagemLateral(), 'sem rolagem lateral');
});
await item('telas de estudo sem rolagem lateral em 320, 768 e 390', async () => {
  for (const largura of [320, 768, 390]) { await p.tamanho(largura, 844); await dormir(120); for (const destino of ['#estudar', '#progresso', '#simulado', '#conta']) { await p.avaliar(`location.hash = "${destino}"`); await dormir(250); certo(await p.semRolagemLateral(), `rolagem lateral em ${destino} a ${largura}`); } }
  await p.avaliar('location.hash = "#estudar"'); await questaoPronta();
  await dormir(400);
  const medida = await p.avaliar('(() => { const b = document.querySelector(".barra-acao").getBoundingClientRect(), m = document.querySelector("#menu").getBoundingClientRect(); return {barra: Math.round(b.bottom), menu: Math.round(m.top), janela: innerHeight, rolagem: Math.round(scrollY)}; })()');
  certo(medida.barra <= medida.menu + 1, 'barra de ação acima do menu: ' + JSON.stringify(medida));
  if (CAPTURAS) await p.captura(path.join(CAPTURAS, 'estudar-390.png'), false);
});
await item('telas de estudo sem faixa que corre e sem movimento acima de 0,4 s', async () => {
  for (const destino of ['#estudar', '#progresso', '#simulado', '#conta']) {
    await p.avaliar(`location.hash = "${destino}"`); await dormir(250);
    igual(await p.avaliar('Boolean(document.querySelector(".faixa-corre, .selos-cartaz"))'), false, 'faixa ou selos em ' + destino);
  }
  await p.avaliar('location.hash = "#estudar"'); await questaoPronta();
  const tempos = await p.avaliar(`[...document.querySelectorAll("#conteudo > *, .alternativa, .barra-acao button")].flatMap(e => { const c = getComputedStyle(e); return [...c.animationDuration.split(","), ...c.transitionDuration.split(",")].map(t => parseFloat(t) * (t.trim().endsWith("ms") ? 0.001 : 1)); })`);
  certo(Math.max(...tempos) <= 0.4, 'movimento mais longo: ' + Math.max(...tempos) + ' s');
  igual(await p.avaliar('Boolean(document.querySelector(".questao .vira"))'), false, 'rótulo que vira fora da folha da questão');
});
// Identidade da entrada levada às telas de dentro (12/11/2026): mesmas duas fontes, contorno de 1 px na cor do texto,
// faixa de areia na largura toda no topo de cada tela, um selo só nas telas de passagem, nada na folha da questão.
await item('telas de dentro com a identidade da entrada: fontes, contorno, faixa, selo e movimento', async () => {
  const TEXTO = 'rgb(47, 52, 55)'; const AREIA = 'rgb(247, 246, 243)';
  for (const largura of [390, 1280]) {
    await p.tamanho(largura, 900); await dormir(120);
    for (const destino of ['#estudar', '#progresso', '#simulado', '#nota', '#conta', '#privacidade']) {
      await p.avaliar(`location.hash = "${destino}"`); await dormir(450);
      const m = await p.avaliar(`(() => {
        const c = (e, pseudo) => getComputedStyle(e, pseudo);
        const familias = new Set([...document.querySelectorAll('body *')].filter(e => e.getClientRects().length).map(e => c(e).fontFamily.split(',')[0].trim().replace(/"/g, '')));
        const topo = document.querySelector('#conteudo > h1:not(.oculto), .simulador > h1, #conteudo > .ritmo');
        const fundo = topo ? c(topo, '::before') : null; const titulo = document.querySelector('#conteudo > h1:not(.oculto), .simulador > h1');
        return {familias: [...familias].sort(), topo: c(document.querySelector('.topo')).borderBottomColor,
          faixa: fundo && fundo.backgroundColor, larguraFaixa: Boolean(fundo) && parseFloat(fundo.width) >= innerWidth - 20,
          selo: titulo ? c(titulo, '::after').backgroundImage.startsWith('url("data:image/svg') : null, seloTempo: titulo ? parseFloat(c(titulo, '::after').animationDuration) : 0,
          seloNaQuestao: [...document.querySelectorAll('.questao, .questao *')].some(e => c(e, '::after').backgroundImage.includes('data:image/svg')),
          corre: Boolean(document.querySelector('.faixa-corre')), lateral: document.documentElement.scrollWidth <= document.documentElement.clientWidth};
      })()`);
      igual(m.familias, ['Iowan Old Style', 'SF Pro Display'], `duas fontes da entrada em ${destino} a ${largura}`);
      igual(m.topo, TEXTO, `contorno do topo em ${destino}`);
      igual(m.faixa, AREIA, `faixa de areia no topo de ${destino}`); igual(m.larguraFaixa, true, `faixa na largura toda em ${destino} a ${largura}`);
      igual(m.selo, destino === '#estudar' ? null : true, `selo só nas telas de passagem (${destino})`);
      certo(m.seloTempo <= 0.4, `selo assenta em até 0,4 s em ${destino}`);
      igual(m.seloNaQuestao, false, `folha da questão sem selo em ${destino}`); igual(m.corre, false, `sem faixa que corre em ${destino}`);
      igual(m.lateral, true, `sem rolagem lateral em ${destino} a ${largura}`);
    }
  }
  igual(await p.avaliar('getComputedStyle(document.querySelector("#menu")).borderTopColor'), TEXTO, 'contorno do menu');
  await p.s('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  try { await dormir(100); igual(await p.avaliar('getComputedStyle(document.querySelector("#conteudo > h1:not(.oculto)"), "::after").animationName'), 'none', 'selo parado com movimento reduzido'); }
  finally { await p.s('Emulation.setEmulatedMedia', {features: []}); }
  await p.tamanho(390, 844); await p.avaliar('location.hash = "#estudar"'); await questaoPronta();
});
await item('duas contas não se misturam', async () => {
  igual(sql("SELECT COUNT(*) FROM respostas r JOIN contas c ON c.id=r.conta WHERE c.nome='Segunda'")[0][0], 1, 'respostas da segunda conta');
  igual(await p.avaliar('painel.progresso.total'), 1, 'painel da segunda conta');
});
await item('dia de estudo segue o horário de Brasília em qualquer fuso do aparelho', async () => {
  await p.s('Emulation.setTimezoneOverride', {timezoneId: 'Asia/Tokyo'});
  try {
    igual(await p.avaliar('FORMATO_DIA.format(new Date("2026-11-13T02:30:00Z"))'), '2026-11-12', 'data em Brasília');
    igual(await p.avaliar('diaDaSemana("2026-11-12")'), 3, 'quinta-feira');
    igual(await p.avaliar('hojeLocal()'), await p.avaliar('painel.estudo.data'), 'mesmo dia do servidor');
    // Painel recém-chegado do servidor nunca é zerado pelo relógio do aparelho; só o guardado envelhece.
    igual(await p.avaliar('normalizar({estudo: {data: "2000-01-01", hoje: {respostas: 4, acertos: 2}, semana: [4,0,0,0,0,0,0], diaDaSemana: 0, revisao: {vencidas: [], caderno: 0}}}).estudo.hoje.respostas'), 4, 'dado do servidor preservado');
    igual(await p.avaliar('normalizar({estudo: {data: "2000-01-01", hoje: {respostas: 4, acertos: 2}, semana: [4,0,0,0,0,0,0], diaDaSemana: 0, revisao: {vencidas: [], caderno: 0}}}, true).estudo.hoje.respostas'), 0, 'painel guardado vira o dia');
  } finally { await p.s('Emulation.setTimezoneOverride', {timezoneId: ''}); }
});
await item('painel pedido antes de uma resposta não sobrescreve o resultado dela', async () => {
  const antes = await p.avaliar('painel.progresso.total');
  await p.avaliar('(async () => { const pedido = atualizar(); aplicarResultado({progresso: {total: 77, acertos: 1}}); await pedido; })()');
  igual(await p.avaliar('painel.progresso.total'), antes, 'painel velho descartado e pedido de novo');
});
const errosLocais = p.erros.filter(e => !/favicon|401 \(Unauthorized\)|ERR_INTERNET_DISCONNECTED|ERR_BLOCKED_BY_CLIENT|Failed to fetch/.test(e));
await item('nenhum erro de JavaScript nem recurso bloqueado pela política de conteúdo', async () => { igual(errosLocais, [], 'erros'); });
// Depois da conta de erros: os pedidos recusados de propósito abaixo deixam aviso de 404 no console.
await item('identidade de 14/11: logo da pata no topo, fontes servidas pelo site e variáveis de cor', async () => {
  const m = await p.avaliar(`(async () => {
    const svg = document.querySelector('.topo .simbolo svg'); const caminho = svg && svg.querySelector('path');
    const fonte = await fetch('/fontes/pu-texto.woff2');
    const recusas = await Promise.all(['/fontes/nao-existe.woff2', '/fontes/..%2Fservidor.py', '/fontes/sub/pu-texto.woff2', '/ilustracoes/x.js', '/servidor.py'].map(async u => (await fetch(u)).status));
    await document.fonts.load('16px "Atkinson Hyperlegible Next"');
    const raiz = getComputedStyle(document.documentElement);
    return {logo: Boolean(caminho) && caminho.getAttribute('fill-rule') === 'evenodd' && caminho.getAttribute('d').startsWith('M256 0a256'),
      largura: Math.round(svg.getBoundingClientRect().width), cor: getComputedStyle(svg).color,
      fonte: [fonte.status, fonte.headers.get('content-type')], recusas,
      carregada: [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Atkinson Hyperlegible Next' && f.status === 'loaded'),
      variaveis: ['--cor-acerto', '--cor-erro', '--noite-fundo', '--cor-marca'].map(v => raiz.getPropertyValue(v).trim())};
  })()`);
  igual(m.logo, true, 'círculo com a pata vazada no topo'); igual(m.largura, 32, 'símbolo de 32 px'); igual(m.cor, 'rgb(0, 0, 0)', 'círculo preto no topo');
  igual(m.fonte, [200, 'font/woff2'], 'fonte servida pelo próprio site'); igual(m.recusas, [404, 404, 404, 404, 404], 'só nomes simples em fontes/ e ilustracoes/');
  igual(m.carregada, true, 'fonte carrega com a política de conteúdo');
  igual(m.variaveis, ['#00695F', '#B3261E', '#000000', '#000000'], 'variáveis de cor da direção nova');
});

// ---------- Entrada pública: GitHub Pages + intermediário (simulado dentro do Chrome) ----------
await p.fechar();
p = await chrome.novaPagina({largura: 390, altura: 844});
const fila = new Map(); let pedidosPublicos = 0;
await p.s('Fetch.enable', {patterns: [{urlPattern: INTERMEDIARIO + '/*'}]});
const cors = [{name: 'Access-Control-Allow-Origin', value: URL_PUBLICA}, {name: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization'}, {name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS'}, {name: 'Content-Type', value: 'application/json'}];
const responderFetch = (requestId, status, corpo) => p.s('Fetch.fulfillRequest', {requestId, responseCode: status, responseHeaders: cors, body: Buffer.from(JSON.stringify(corpo)).toString('base64')});
const PERMITIDO = (metodo, caminho) => (metodo === 'GET' && ['/api/configuracao', '/api/painel', '/api/dispositivos'].includes(caminho)) || (metodo === 'POST' && ['/api/entrar', '/api/cadastro', '/api/sair', '/api/dispositivos'].includes(caminho)) || (['GET', 'POST'].includes(metodo) && /^\/api\/questoes\/[1-9][0-9]{0,5}$/.test(caminho));
const recusados = []; const maiores = [];
p.aoEvento('Fetch.requestPaused', async ({requestId, request}) => {
  try {
    const u = new URL(request.url);
    if (request.method === 'OPTIONS') return await p.s('Fetch.fulfillRequest', {requestId, responseCode: 204, responseHeaders: cors});
    if (u.pathname === '/pedido') {
      const corpo = JSON.parse(request.postData); pedidosPublicos++;
      // Mesma lista de operações do intermediário publicado: a interface não pode depender de rota nova.
      if (!PERMITIDO(corpo.metodo, corpo.caminho)) { recusados.push(`${corpo.metodo} ${corpo.caminho}`); return await responderFetch(requestId, 400, {erro: 'Operação não permitida.'}); }
      const r = await fetch(URL_LOCAL + corpo.caminho, {method: corpo.metodo, headers: {Origin: URL_LOCAL, 'Content-Type': 'application/json', Cookie: 'sessao=' + (corpo.token || '')}, body: corpo.metodo === 'POST' ? JSON.stringify(corpo.dados || {}) : undefined});
      const dados = await r.json();
      if (['/api/entrar', '/api/cadastro'].includes(corpo.caminho)) { const achado = (r.headers.get('set-cookie') || '').match(/sessao=([^;]+)/); if (achado) dados.sessao = achado[1]; }
      const resultado = {status: r.status, dados}; const tamanho = Buffer.byteLength(JSON.stringify(resultado));
      if (tamanho > 100000) maiores.push(`${corpo.caminho}: ${tamanho}`);
      const id = crypto.randomUUID(); fila.set(id, resultado);
      return await responderFetch(requestId, 202, {id, recibo: 'recibo-' + id});
    }
    if (u.pathname.startsWith('/resultado/')) { const id = u.pathname.split('/').pop(); const r = fila.get(id); fila.delete(id); return await responderFetch(requestId, r ? 200 : 404, r || {erro: 'Solicitação expirada.'}); }
    await responderFetch(requestId, 404, {erro: 'Operação não encontrada.'});
  } catch (e) { await p.s('Fetch.failRequest', {requestId, errorReason: 'Failed'}).catch(() => {}); }
});
await item('entrada pública: cadastro pelo intermediário cai direto na questão', async () => {
  await p.ir(URL_PUBLICA); await p.esperar('document.querySelector("#acesso")');
  igual(await p.avaliar('document.documentElement.dataset.publico'), '1', 'modo público');
  await p.clicar('#trocar'); await p.preencher('#nome', 'Publica'); await p.preencher('#email', 'publica@example.com'); await p.preencher('#senha', 'Senha longa de teste 123!');
  await p.clicar('#acesso button[type=submit]'); await questaoPronta();
  certo(/^[A-Za-z0-9_-]{20,100}$/.test(await p.avaliar('JSON.parse(localStorage.getItem("pu.sessao.v1")).token')), 'sessão guardada sem senha');
  certo(!(await p.avaliar('JSON.stringify(localStorage)')).includes('Senha longa'), 'senha fora do aparelho');
});
await item('entrada pública: responder e seguir gasta uma viagem só', async () => {
  await dormir(1200); const antes = pedidosPublicos;
  await responder(); await seguinte(); await questaoPronta();
  const gasto = pedidosPublicos - antes; certo(gasto <= 2, 'viagens para responder e abrir a próxima: ' + gasto);
  await dormir(800);
});
await item('entrada pública: recarregar mantém a sessão e abre na questão', async () => {
  await p.recarregar(); await questaoPronta(); igual(await hoje(), '1 de 5', 'ritmo preservado');
  await p.avaliar('location.hash = "#conta"'); await p.esperar('document.querySelector("[data-revogar]")');
  await p.clicar('#sair'); await p.esperar('document.querySelector("#acesso")');
  igual(await p.avaliar('localStorage.getItem("pu.sessao.v1")'), null, 'sessão apagada ao sair');
});
await item('entrada pública: só operações aceitas pelo intermediário e respostas abaixo de 100 KB', async () => { igual(recusados, [], 'operações recusadas'); igual(maiores, [], 'respostas grandes'); });
await item('entrada pública: logo da pata no topo, ícones do manifesto e as quatro fontes servidas pelo próprio site', async () => {
  // A política de conteúdo da entrada só deixa o navegador conversar com o intermediário: manifesto e ícones são conferidos daqui, como o GitHub Pages os serve.
  const pedir = async u => (await fetch(new URL(u, URL_PUBLICA + '/'))).status;
  const manifesto = await (await fetch(URL_PUBLICA + '/manifest.webmanifest')).json();
  igual(await Promise.all(manifesto.icons.map(i => pedir(i.src))), [200, 200, 200, 200], 'ícones do manifesto');
  igual(manifesto.icons.filter(i => i.purpose === 'maskable').length, 1, 'um ícone com máscara');
  const m = await p.avaliar(`(async () => {
    for (const f of ['16px "Atkinson Hyperlegible Next"', 'italic 16px "Atkinson Hyperlegible Next"', '700 40px "Bricolage Grotesque"', '20px "Newsreader"', '16px "JetBrains Mono"']) await document.fonts.load(f);
    return {favicon: document.querySelector('link[rel=icon]').getAttribute('href'), apple: document.querySelector('link[rel=apple-touch-icon]').getAttribute('href'),
      carregadas: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))].sort(),
      logo: Boolean(document.querySelector('.topo .simbolo svg path[fill-rule=evenodd]'))};
  })()`);
  igual(m.logo, true, 'logo da pata no topo'); igual([await pedir(m.favicon), await pedir(m.apple)], [200, 200], 'favicon e ícone da tela inicial');
  igual(m.carregadas, ['Atkinson Hyperlegible Next', 'Bricolage Grotesque', 'JetBrains Mono', 'Newsreader'], 'fontes carregadas');
});
await item('entrada pública sem erro de JavaScript', async () => { igual(p.erros.filter(e => !/favicon/.test(e)), [], 'erros'); });

await chrome.fechar(); servidor.kill(); estatico.close(); fs.rmSync(pasta, {recursive: true, force: true});
const falhas = resultados.filter(([, ok]) => !ok).length;
console.log(`\n${resultados.length - falhas} de ${resultados.length} itens passaram.`);
process.exit(falhas ? 1 : 0);

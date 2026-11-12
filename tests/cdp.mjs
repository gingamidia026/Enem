// Chrome sem janela pelo protocolo DevTools, com o WebSocket que já vem no Node. Sem npm install.
// Dominique-Oliveira-Claude🤖🧡, 12/11/2026.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dormir = ms => new Promise(ok => setTimeout(ok, ms));

export async function abrirChrome() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'pu-chrome-'));
  const processo = spawn(process.env.CHROME || '/usr/bin/google-chrome-stable', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
  const endereco = await new Promise((ok, falha) => {
    let texto = ''; const prazo = setTimeout(() => falha(new Error('Chrome não iniciou.')), 20000);
    processo.stderr.on('data', pedaco => { texto += pedaco; const achado = texto.match(/DevTools listening on (ws:\/\/\S+)/); if (achado) { clearTimeout(prazo); ok(achado[1]); } });
    processo.on('exit', () => falha(new Error('Chrome encerrou antes de abrir.')));
  });
  const ws = new WebSocket(endereco);
  await new Promise((ok, falha) => { ws.addEventListener('open', ok); ws.addEventListener('error', falha); });
  let numero = 0; const pendentes = new Map(); const ouvintes = new Set();
  ws.addEventListener('message', evento => {
    const m = JSON.parse(evento.data);
    if (m.id && pendentes.has(m.id)) { const {ok, falha} = pendentes.get(m.id); pendentes.delete(m.id); m.error ? falha(new Error(m.error.message)) : ok(m.result); }
    else ouvintes.forEach(f => f(m));
  });
  const enviar = (method, params = {}, sessionId) => new Promise((ok, falha) => { const id = ++numero; pendentes.set(id, {ok, falha}); ws.send(JSON.stringify({id, method, params, sessionId})); });
  async function novaPagina({largura = 390, altura = 844, celular = true} = {}) {
    const {targetId} = await enviar('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await enviar('Target.attachToTarget', {targetId, flatten: true});
    const s = (method, params) => enviar(method, params, sessionId);
    const erros = [];
    ouvintes.add(m => {
      if (m.sessionId !== sessionId) return;
      if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') erros.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    });
    await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable'); await s('Network.enable');
    const pagina = {
      erros, s,
      aoEvento(metodo, f) { ouvintes.add(m => { if (m.sessionId === sessionId && m.method === metodo) f(m.params); }); },
      async tamanho(l, a, movel = l < 800) { await s('Emulation.setDeviceMetricsOverride', {width: l, height: a, deviceScaleFactor: movel ? 2 : 1, mobile: movel}); await s('Emulation.setTouchEmulationEnabled', {enabled: movel}); },
      async avaliar(expressao) {
        const r = await s('Runtime.evaluate', {expression: expressao, awaitPromise: true, returnByValue: true});
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
      },
      async ir(url) { await s('Page.navigate', {url}); await pagina.esperar('document.readyState === "complete"'); },
      async recarregar() { await s('Page.reload'); await dormir(150); await pagina.esperar('document.readyState === "complete"'); },
      async esperar(expressao, prazo = 8000, nome = expressao) {
        const fim = Date.now() + prazo;
        while (Date.now() < fim) { try { if (await pagina.avaliar(`Boolean(${expressao})`)) return; } catch { /* página trocando */ } await dormir(60); }
        throw new Error('Tempo esgotado esperando: ' + nome);
      },
      texto: seletor => pagina.avaliar(`document.querySelector(${JSON.stringify(seletor)})?.innerText ?? null`),
      existe: seletor => pagina.avaliar(`Boolean(document.querySelector(${JSON.stringify(seletor)}))`),
      async clicar(seletor) { await pagina.esperar(`document.querySelector(${JSON.stringify(seletor)}) && !document.querySelector(${JSON.stringify(seletor)}).disabled`, 8000, 'clicável: ' + seletor); await pagina.avaliar(`document.querySelector(${JSON.stringify(seletor)}).click()`); },
      async clicarTexto(texto, seletor = 'button,a') { await pagina.esperar(`[...document.querySelectorAll(${JSON.stringify(seletor)})].some(e => e.innerText.trim().startsWith(${JSON.stringify(texto)}) && !e.disabled && e.offsetParent)`, 8000, 'texto: ' + texto); await pagina.avaliar(`[...document.querySelectorAll(${JSON.stringify(seletor)})].find(e => e.innerText.trim().startsWith(${JSON.stringify(texto)}) && !e.disabled && e.offsetParent).click()`); },
      async preencher(seletor, valor) { await pagina.esperar(`document.querySelector(${JSON.stringify(seletor)})`); await pagina.avaliar(`(() => { const e = document.querySelector(${JSON.stringify(seletor)}); e.value = ${JSON.stringify(valor)}; e.dispatchEvent(new Event('input', {bubbles: true})); })()`); },
      async tecla(key) { const codigo = key === 'Enter' ? 13 : key.toUpperCase().charCodeAt(0); for (const type of ['keyDown', 'keyUp']) await s('Input.dispatchKeyEvent', {type, key, code: key === 'Enter' ? 'Enter' : 'Key' + key.toUpperCase(), windowsVirtualKeyCode: codigo, text: type === 'keyDown' && key !== 'Enter' ? key : undefined}); },
      async captura(arquivo, inteira = true) {
        fs.mkdirSync(path.dirname(arquivo), {recursive: true});
        const {data} = await s('Page.captureScreenshot', {format: 'png', captureBeyondViewport: inteira});
        fs.writeFileSync(arquivo, Buffer.from(data, 'base64'));
      },
      semRolagemLateral: () => pagina.avaliar('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),
      async fechar() { await enviar('Target.closeTarget', {targetId}); }
    };
    await pagina.tamanho(largura, altura, celular);
    return pagina;
  }
  return {novaPagina, async fechar() { try { ws.close(); } catch { /* já fechado */ } processo.kill(); await dormir(200); fs.rmSync(perfil, {recursive: true, force: true}); }};
}
export {dormir};

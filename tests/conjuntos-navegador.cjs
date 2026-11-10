// Fixture de conjunto no Chrome. API simulada; persistência coberta em conjuntos.py.
const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 try {
 for(const largura of [390,768,1440]){
 const page=await browser.newPage({viewport:{width:largura,height:900}});
 const fonte=fs.readFileSync(require('node:path').join(__dirname,'../app/public/app.js'),'utf8');
 const abrir=fonte.slice(fonte.indexOf('async function abrir(id)'),fonte.indexOf("document.querySelector('#sair').onclick"));
 await page.route('https://pu.example/**',rota=>rota.fulfill({contentType:'text/html',body:'<html></html>'}));await page.goto('https://pu.example/');
 await page.setContent('<main id="conteudo"></main><p id="aviso"></p>');
 await page.addStyleTag({content:fs.readFileSync(require('node:path').join(__dirname,'../app/public/estilo.css'),'utf8')});
 await page.evaluate(abrir=>{
  window.simulado=null;window.aviso=document.querySelector('#aviso');window.escapar=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  window.tela=html=>document.querySelector('#conteudo').innerHTML=html;window.erro=e=>{throw e};window.pedidos=[];
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';
  const qs=[1,2,3,4,5].map(id=>({id,area:'Linguagens',titulo:'Questão '+id,enunciado:'Pergunta individual '+id+' [[midia:0]]',alternativas:['Primeira','Segunda','Terceira','Quarta','Quinta'],extrator:2,imagens:[{hash:'igual',partes:1}]}));
  window.painel={questoes:[]};
  window.api=async(caminho,dados)=>{
   pedidos.push({caminho,dados});
   if(!dados)return {...qs[0],grupo:'texto-1',textoComum:'Texto longo compartilhado com cinco perguntas.',grupoQuestoes:qs};
   if(dados.acao==='imagem')return {bloco:png};
   return {resultados:qs.map(q=>({id:q.id,acerto:true,correta:2,explicacao:'Correção individual.'})),acompanhamento:{densidade:{},perfil:{}},progresso:{total:5,acertos:5}};
  };
  window.eval(abrir+';window.abrir=abrir;');
 },abrir);
 await page.evaluate(()=>abrir(1));await page.waitForFunction(()=>!document.querySelector('#responder button').disabled);
 assert.equal(await page.locator('fieldset').count(),5);
 assert.equal(await page.locator('.texto-comum').count(),1);
 assert.equal(await page.locator('.midia-questao img').count(),5);
 assert.equal(await page.evaluate(()=>pedidos.filter(p=>p.dados?.acao==='imagem').length),1);
 for(const id of [1,2,3,4])await page.locator(`input[name="alternativa-${id}"][value="2"]`).check();
 await page.locator('#responder button').click();
 assert.equal(await page.evaluate(()=>pedidos.filter(p=>p.dados?.respostas).length),0);
 await page.locator('input[name="alternativa-5"][value="2"]').check();await page.locator('#responder button').click();
 await page.waitForFunction(()=>document.querySelector('#responder button').hidden);
 assert.equal(await page.evaluate(()=>pedidos.filter(p=>p.dados?.respostas).length),1);
 assert.equal(await page.locator('[data-correcao] strong').count(),5);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.close();console.log('OK: conjunto de cinco, envio único completo, figuras automáticas, contagem e largura '+largura);
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

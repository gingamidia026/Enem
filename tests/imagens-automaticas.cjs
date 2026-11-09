// Dominique-Oliveira-ChatGPT🤖💚: comportamento da questão no Chrome, com API simulada.
const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:390,height:900}});
 const fonte=fs.readFileSync(require('node:path').join(__dirname,'../app/public/app.js'),'utf8');
 const abrir=fonte.slice(fonte.indexOf('async function abrir(id)'),fonte.indexOf("document.querySelector('#sair').onclick"));
 await page.route('https://pu.example/**',rota=>rota.fulfill({contentType:'text/html',body:'<html></html>'}));
 await page.goto('https://pu.example/');
 await page.setContent('<main id="conteudo"></main><p id="aviso"></p>');
 await page.evaluate(abrir=>{
 window.simulado=null;window.aviso=document.querySelector('#aviso');
 window.escapar=s=>String(s).replaceAll('<','&lt;');
 window.tela=html=>document.querySelector('#conteudo').innerHTML=html;
 window.erro=e=>{throw e};
 window.pedidos=[];
 const imagem='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';
 window.api=async(caminho,dados)=>{pedidos.push({caminho,dados});return {bloco:imagem}};
 window.painel={questoes:[{id:1,titulo:'Com figura',area:'Teste',enunciado:'Observe',alternativas:['A','B'],textoParcial:true,imagens:[{partes:1}]},{id:2,titulo:'Sem figura',area:'Teste',enunciado:'Leia',alternativas:['A','B']}]};
 window.eval(abrir+';window.abrir=abrir;');
 },abrir);
 await page.evaluate(()=>abrir(1));
 await page.locator('#imagens-originais img').waitFor();
 assert.equal(await page.locator('#ver-original').count(),0);
 assert(await page.locator('#responder button').isEnabled());
 assert.equal(await page.evaluate(()=>pedidos.length),1);
 await page.evaluate(()=>abrir(2));
 assert.equal(await page.locator('.originais,img').count(),0);
 assert.equal(await page.evaluate(()=>pedidos.length),1);
 await page.evaluate(()=>abrir(1));
 await page.locator('#imagens-originais img').waitFor();
 assert.equal(await page.evaluate(()=>pedidos.length),2);
 console.log('OK: imagem automática, retorno à questão carrega novamente, questão sem imagem não requisita imagem, botão removido e resposta parcial liberada após carregar.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const net=require('node:net');
(async()=>{
 const pasta=fs.mkdtempSync(path.join(os.tmpdir(),'pu-simulador-'));
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const porta=socket.address().port;await new Promise(r=>socket.close(r));
 const origem=`http://127.0.0.1:${porta}`;
 const processo=spawn('python3',['app/servidor.py'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DADOS:pasta,PORTA:String(porta),ORIGEM:origem,PERFIL_TESTE:'1'},stdio:'ignore'});
 let browser;
 try {
  for(let i=0;i<100;i++){try{if((await fetch(origem+'/api/saude')).ok)break;}catch{} await new Promise(r=>setTimeout(r,50));}
  browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}});const erros=[];page.on('pageerror',e=>erros.push(e.message));
  await page.goto(origem);await page.getByLabel('Login',{exact:true}).fill('teste');await page.getByLabel('Senha',{exact:true}).fill('123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
  await page.locator('nav').getByRole('link',{name:'Simular nota Enem'}).click();
  await page.getByRole('heading',{name:'Simule sua nota Enem.'}).waitFor();
  for(const [id,valor] of Object.entries({linguagens:'800',humanas:'750',natureza:'800',matematica:'750',redacao:'850'})) await page.locator('#nota-'+id).fill(valor);
  await page.locator('#instituicao-0').fill('<img src=x onerror=alert(1)>');await page.locator('#curso-0').fill('Medicina');await page.locator('#modalidade-0').fill('Ampla concorrência');await page.locator('#edicao-0').fill('Referência de teste');await page.locator('#corte-0').fill('810');
  await page.getByText('Pesos por área da opção 1',{exact:true}).click();
  for(const id of ['linguagens','natureza','redacao']) await page.locator('#peso-0-'+id).fill('2');
  for(let i=1;i<3;i++){await page.getByRole('button',{name:'Adicionar opção',exact:true}).click();await page.locator('#instituicao-'+i).fill('Instituição teste '+i);}
  assert(await page.getByRole('button',{name:'Adicionar opção',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Calcular minha simulação'}).click();
  await page.getByRole('heading',{name:'Resultado da sua simulação'}).waitFor();
  assert.equal(await page.locator('.resultado-opcao').count(),3);
  assert.equal(await page.locator('.media-nota strong').first().innerText(),'800,00');
  assert.equal(await page.locator('.resultado-opcao img').count(),0);
  assert((await page.locator('.resultado-opcao').first().innerText()).includes('Faltam 10,00 pontos'));
  await page.locator('#instituicao-0').fill('Instituição de exemplo');
  await page.getByRole('button',{name:'Calcular minha simulação'}).click();
  for(const largura of [320,360,390,412,768,1440]) {
   await page.setViewportSize({width:largura,height:900});
   assert(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth),`rolagem lateral: ${largura}`);
   await page.evaluate(()=>scrollTo(0,0));
   if([390,768,1440].includes(largura)) await page.screenshot({path:path.resolve(__dirname,`../docs/simulador-nota-${largura}.png`),fullPage:true});
  }
  await page.locator('#nota-linguagens').fill('810,5');assert.equal(await page.locator('.resultado-opcao').count(),0);
  await page.getByRole('button',{name:'Calcular minha simulação'}).click();await page.getByRole('heading',{name:'Resultado da sua simulação'}).waitFor();
  await page.locator('nav').getByRole('link',{name:'Meu estudo',exact:true}).click();await page.locator('nav').getByRole('link',{name:'Simular nota Enem'}).click();assert.equal(await page.locator('#nota-linguagens').inputValue(),'810,5');
  await page.getByRole('button',{name:'Remover opção 3'}).click();assert.equal(await page.locator('.opcao-nota').count(),2);
  await page.getByText('Pesos por área da opção 1',{exact:true}).click();
  for(const id of ['linguagens','humanas','natureza','matematica','redacao']) await page.locator('#peso-0-'+id).fill('0');
  await page.getByRole('button',{name:'Calcular minha simulação'}).click();await page.locator('#erro-nota').getByText('Informe pelo menos um peso maior que zero.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Sair da conta'}).click();await page.getByLabel('Login',{exact:true}).fill('teste');await page.getByLabel('Senha',{exact:true}).fill('123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Simule sua nota Enem.'}).waitFor();assert.equal(await page.locator('#nota-linguagens').inputValue(),'');
  assert.deepEqual(erros,[]);
  console.log('OK: fluxo real/API temporária, três opções, cálculo, vírgula, erro de pesos, rascunho, saída, XSS, seis larguras e console.');
 } finally {if(browser)await browser.close();processo.kill();await new Promise(r=>processo.once('exit',r));fs.rmSync(pasta,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});

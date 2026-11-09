// Dominique-Oliveira-ChatGPT🤖💚: navegação responsiva com conta e banco temporários.
const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const dados=fs.mkdtempSync(path.join(os.tmpdir(),'pu-menu-'));
 const servidor=spawn('python3',[path.resolve(__dirname,'../app/servidor.py')],{env:{...process.env,DADOS:dados,PORTA:'18089',ORIGEM:'http://127.0.0.1:18089',PERFIL_TESTE:'0',PU_AMBIENTES:'0'},stdio:'ignore'});
 let navegador;
 try {
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:18089/api/saude')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  navegador=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
  const pagina=await navegador.newPage({viewport:{width:390,height:844}});
  const erros=[];pagina.on('pageerror',e=>erros.push(e.message));
  await pagina.goto('http://127.0.0.1:18089');
  await pagina.getByRole('heading',{name:'Entre para estudar'}).waitFor();
  assert.equal(await pagina.locator('#menuBotao').isVisible(),false);
  await pagina.getByRole('button',{name:'Quero criar uma conta'}).click();
  await pagina.getByLabel('Como você se chama?').fill('Estudante de teste');
  await pagina.getByLabel('E-mail',{exact:true}).fill('menu@example.invalid');
  await pagina.getByLabel('Senha',{exact:true}).fill('Senha temporária de teste 123!');
  await pagina.getByRole('button',{name:'Criar conta',exact:true}).click();
  await pagina.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
  for(const largura of [320,360,390,412,768,1440]) {
   await pagina.setViewportSize({width:largura,height:900});
   assert(await pagina.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth),`Rolagem em ${largura}`);
   if(largura<1280){
    assert.equal(await pagina.locator('#menu').isVisible(),false);
    await pagina.getByRole('button',{name:'Abrir menu',exact:true}).click();
    await pagina.getByRole('link',{name:'Meu progresso',exact:true}).click();
    await pagina.getByRole('heading',{name:'Seu progresso',exact:true}).waitFor();
    assert.equal(await pagina.locator('#menu').isVisible(),false);
    await pagina.getByRole('button',{name:'Abrir menu',exact:true}).click();
    await pagina.keyboard.press('Escape');
    assert.equal(await pagina.locator('#menuBotao').getAttribute('aria-expanded'),'false');
    assert.equal(await pagina.locator('#menuBotao').evaluate(e=>e===document.activeElement),true);
   } else {
    assert.equal(await pagina.locator('#menuBotao').isVisible(),false);
    assert.equal(await pagina.locator('#menu').isVisible(),true);
    const dimensoes=await pagina.locator('.topo').evaluate(e=>e.getBoundingClientRect().height);
    assert(dimensoes<100,`Topo com quebra: ${dimensoes}`);
   }
  }
  for(const destino of ['inicio','questoes','simulado','nota','progresso','privacidade','dispositivos']){
   await pagina.locator(`#menu a[href="#${destino}"]`).click();
   await pagina.waitForTimeout(150);
   assert.equal(await pagina.locator('#menu a[aria-current=page]').getAttribute('href'),'#'+destino);
   assert(await pagina.locator('h1').isVisible());
  }
  await pagina.getByRole('heading',{name:'Dispositivos autorizados',exact:true}).waitFor();
  await pagina.screenshot({path:path.resolve(__dirname,'../docs/menu-ginga-1440.png'),fullPage:true});
  await pagina.setViewportSize({width:390,height:844});
  await pagina.screenshot({path:path.resolve(__dirname,'../docs/menu-ginga-390.png'),fullPage:true});
  await pagina.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await pagina.getByRole('button',{name:'Sair da conta',exact:true}).click();
  await pagina.waitForTimeout(500);
  
  await pagina.getByRole('heading',{name:/Entre para estudar|Crie seu espaço/}).waitFor();
  assert.equal(await pagina.locator('#menuBotao').isVisible(),false);
  assert.deepEqual(erros,[]);
  console.log('OK Chrome: cadastro temporário, 6 larguras, 7 páginas, menu, Escape/foco, saída e console.');
 } finally {if(navegador)await navegador.close();servidor.kill();fs.rmSync(dados,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

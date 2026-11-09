const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME || '/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1100,height:900}});
 const erros=[]; page.on('pageerror',e=>erros.push(e.message));
 await page.goto('http://localhost:8088');
 await page.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 assert.equal(await page.getByText('Perfil de teste:',{exact:false}).count(),0);
 for(const largura of [320,390,768,1440]) {
   await page.setViewportSize({width:largura,height:900});
   assert(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth));
   await page.waitForTimeout(650);
   const centro=await page.locator('.formulario').evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)});
   assert(centro<2,`Login descentralizado: ${centro}`);
   if(largura===390) await page.screenshot({path:path.join(__dirname,'../docs/tela-login-390.png'),fullPage:true});
 }
 await page.getByLabel('Login',{exact:true}).fill('teste');
 await page.getByLabel('Senha',{exact:true}).fill('123');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
 await page.getByText('Olá, Teste.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Sair da conta'}).click();
 await page.getByRole('button',{name:'Quero criar uma conta'}).click();
 await page.getByLabel('Como você se chama?').fill('Estudante de teste');
 await page.getByLabel('E-mail',{exact:true}).fill(`teste${Date.now()}@example.com`);
 await page.getByLabel('Senha',{exact:true}).fill('Senha longa de teste 123!');
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await page.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
 // CSP bloqueia molduras; medir viewport real, celular primeiro.
 for(const largura of [320,360,390,412,768,1440]){
   await page.setViewportSize({width:largura,height:900});
   await page.goto('http://localhost:8088');
   await page.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
   const medidas=await page.locator('html').evaluate(e=>({largura:e.clientWidth,conteudo:e.scrollWidth}));
   assert(medidas.conteudo<=medidas.largura,JSON.stringify({largura,...medidas}));
   if([390,768,1440].includes(largura)) await page.screenshot({path:path.join(__dirname,`../docs/tela-${largura}.png`),fullPage:true});
 }
 await page.goto('http://localhost:8088/#questoes');
 await page.getByRole('button',{name:'Resolver questão'}).first().click();
 await page.getByLabel('C. R$ 60',{exact:true}).check();
 await page.getByRole('button',{name:'Conferir resposta'}).click();
 await page.getByText('Você acertou!',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Escolher outra questão'}).click();
 await page.getByRole('heading',{name:'Escolha o que praticar.'}).waitFor();
 await page.getByRole('link',{name:'Simulado curto',exact:true}).click();
 await page.getByRole('button',{name:'Começar simulado curto'}).click();
 for(let i=0;i<4;i++){
   await page.locator('input[type=radio]:enabled').first().check();
   await page.getByRole('button',{name:'Conferir resposta'}).click();
   await page.getByRole('button',{name:'Continuar simulado'}).click();
 }
 await page.getByRole('heading',{name:'Rodada concluída.'}).waitFor();
 await page.getByRole('link',{name:'Ver meu progresso'}).click();
 await page.getByRole('heading',{name:'Seu progresso'}).waitFor();
 await page.getByRole('button',{name:'Sair da conta'}).click();
 await page.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 assert.deepEqual(erros,[]);
 console.log('OK: login teste/123, tela de login responsiva, cadastro, treino, retorno à lista, simulado, progresso, saída, console e 6 larguras de viewport.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

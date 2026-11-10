// Banco real somente leitura, conta sintética em banco temporário separado.
const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});try{
 const origem=process.env.PU_ORIGEM_TESTE;assert(origem,'Defina PU_ORIGEM_TESTE para o servidor isolado');
 const catalogo=JSON.parse(fs.readFileSync(path.join(__dirname,'../.catalogo/atual.json')));
 const grupo=catalogo.questoes.find(q=>q.grupo);const tabela=catalogo.questoes.find(q=>q.ano===2024&&q.numero===139);
 const p=await b.newPage({viewport:{width:390,height:900}});const erros=[];p.on('pageerror',e=>erros.push(e.message));
 await p.goto(origem);await p.locator('#email').fill('teste');await p.locator('#senha').fill('123');await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
 const antes=await (await p.request.get(origem+'/api/painel')).json();
 await p.evaluate(id=>abrir(id),grupo.id);assert.equal(await p.locator('fieldset').count(),5);assert.equal(await p.locator('.texto-comum').count(),1);
 await p.screenshot({path:path.join(__dirname,'../docs/questoes-conjunto-real-390.png'),fullPage:true});
 for(const id of grupo.grupoIds)await p.locator(`input[name="alternativa-${id}"][value="0"]`).check();
 await p.getByRole('button',{name:'Conferir todas as respostas',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#responder button').hidden);
 const painel=await (await p.request.get(origem+'/api/painel')).json();assert.equal(painel.progresso.total,antes.progresso.total+5);
 await p.evaluate(id=>abrir(id),tabela.id);await p.locator('.midia-questao img').waitFor();await p.waitForFunction(()=>!document.querySelector('#responder button').disabled);
 assert.equal(await p.locator('.midia-questao img').count(),1);
 await p.screenshot({path:path.join(__dirname,'../docs/questao-tabela-real-390.png'),fullPage:true});
 for(const width of [390,768,1440]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(erros,[]);console.log('OK Chrome com fontes reais: cinco perguntas, um texto, cinco respostas individuais, tabela automática e três larguras. Banco de contas isolado.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

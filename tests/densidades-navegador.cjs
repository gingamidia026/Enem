const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));
 await page.goto('http://localhost:8088');await page.locator('#email').fill('teste');await page.locator('#senha').fill('123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
 const antes=await (await page.request.get('http://localhost:8088/api/painel')).json();
 const id=antes.densidade.proxima;assert(id);
 const dados={alternativa:0,envio:require('node:crypto').randomUUID()};
 for(let i=0;i<2;i++){
 const r=await page.request.post('http://localhost:8088/api/questoes/'+id,{headers:{Origin:'http://localhost:8088'},data:dados});assert.equal(r.status(),200);const corpo=await r.json();assert(corpo.acompanhamento);}
 const depois=await (await page.request.get('http://localhost:8088/api/painel')).json();assert.equal(depois.progresso.total,antes.progresso.total+1);assert.equal(depois.densidade.feitas,antes.densidade.feitas+1);
 await page.reload();await page.locator('a[href="#progresso"]').click();await page.getByRole('heading',{name:'Seu perfil de aprendizagem'}).waitFor();
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.screenshot({path:`docs/densidades-${width}.png`,fullPage:true});}
 await page.locator('#menu a[href="#questoes"]').click();await page.getByRole('button',{name:'Continuar densidade'}).click();await page.locator('#responder').waitFor();
 await page.locator('#menu a[href="#privacidade"]').click();await page.getByRole('heading',{name:'Seus dados e sua segurança'}).waitFor();
 assert.deepEqual(erros,[]);await browser.close();console.log('OK: envio idempotente real, perfil, ciclo, página de dados e larguras 390/768/1440 no Chrome.');
})().catch(e=>{console.error(e);process.exit(1)});

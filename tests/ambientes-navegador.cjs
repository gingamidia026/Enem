const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});const erros=[];page.on('pageerror',e=>erros.push(e.message));
  const origem=process.argv[2];
  await page.route('**/api/painel',async route=>{await new Promise(r=>setTimeout(r,600));await route.continue();});
  await page.goto(origem);
  await page.getByLabel('Login',{exact:true}).fill('lab1@example.invalid');
  await page.getByLabel('Senha',{exact:true}).fill('Senha sintética longa 123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByText('Estamos iniciando seu site personalizado. Por favor, aguarde.',{exact:true}).waitFor();
  await page.waitForURL('**/site/**');
  await page.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
  await page.getByRole('link',{name:'Meus dispositivos',exact:true}).click();
  await page.getByRole('heading',{name:'Dispositivos autorizados',exact:true}).waitFor();
  assert(await page.getByRole('button',{name:'Revogar acesso',exact:true}).count()>=2);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth));}
  await page.screenshot({path:'/tmp/pu-dispositivos.png',fullPage:true});
  assert.deepEqual(erros,[]);
  console.log('OK Chrome: espera, site individual, dispositivos e três larguras.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

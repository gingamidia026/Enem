const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const raiz=path.resolve(__dirname,'..');
async function preparar(page,habilitado=false){
 await page.route('https://gingamidia026.github.io/Enem/**',async route=>{
  const rota=new URL(route.request().url()).pathname.replace('/Enem/','');
  const arquivo=rota || 'index.html';
  const tipo=arquivo.endsWith('.css')?'text/css':arquivo.endsWith('.js')?'text/javascript':'text/html';
  const corpo=arquivo==='configuracao-publica.js' && habilitado ? 'window.ENEM_PUBLICO={habilitado:true,intermediario:"https://intermediario-enem.example"};' : fs.readFileSync(path.join(raiz,arquivo));
  await route.fulfill({contentType:tipo,body:corpo});
 });
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME || '/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));
 await preparar(page);await page.goto('https://gingamidia026.github.io/Enem/');
 await page.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 assert(await page.getByRole('button',{name:'Entrar',exact:true}).isDisabled());
 assert.equal(await page.locator('a[href*="localhost"]').count(),0);
 for(const largura of [320,360,390,412,768,1440]){
  await page.setViewportSize({width:largura,height:900});
  assert(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth));
  if([390,1440].includes(largura))await page.screenshot({path:path.join(raiz,`docs/tela-publica-${largura}.png`),fullPage:true});
 }
 // Simula somente o transporte externo; autenticação e respostas usam a API local real.
 const conectado=await browser.newPage({viewport:{width:390,height:900}});
 conectado.on('pageerror',e=>erros.push(e.message));await preparar(conectado,true);
 const resultados=new Map();let proximo=0;
 await conectado.route('https://intermediario-enem.example/**',async route=>{
  const req=route.request();const rota=new URL(req.url()).pathname;
  const headers={'Access-Control-Allow-Origin':'https://gingamidia026.github.io','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(rota==='/pedido'){
   const pedido=JSON.parse(req.postData());
   const r=await conectado.request.fetch('http://localhost:8088'+pedido.caminho,{method:pedido.metodo,headers:{Origin:'http://localhost:8088','Content-Type':'application/json',Cookie:'sessao='+(pedido.token||'')},data:pedido.metodo==='POST'?JSON.stringify(pedido.dados):undefined});
   const dados=await r.json();const cookie=r.headers()['set-cookie'];if(cookie&&/^sessao=[^;]/.test(cookie))dados.sessao=cookie.match(/^sessao=([^;]+)/)[1];
   const id=String(++proximo);resultados.set(id,{status:r.status(),dados});
   return route.fulfill({status:202,headers,body:JSON.stringify({id,recibo:'recibo-simulado'})});
  }
  const id=rota.split('/').pop();const dados=resultados.get(id);resultados.delete(id);
  return route.fulfill({status:dados?200:404,headers,body:JSON.stringify(dados||{erro:'Expirado'})});
 });
 await conectado.goto('https://gingamidia026.github.io/Enem/');
 await conectado.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 await conectado.getByLabel('Login',{exact:true}).fill('teste');await conectado.getByLabel('Senha',{exact:true}).fill('123');
 await conectado.getByRole('button',{name:'Entrar',exact:true}).click();
 await conectado.getByRole('heading',{name:'Continue seus estudos.'}).waitFor();
 assert(conectado.url().startsWith('https://gingamidia026.github.io/Enem/'));
 await conectado.getByRole('link',{name:'Questões',exact:true}).click();await conectado.getByRole('button',{name:'Resolver questão'}).first().click();
 await conectado.getByLabel('C. R$ 60',{exact:true}).check();await conectado.getByRole('button',{name:'Conferir resposta'}).click();
 await conectado.getByText('Você acertou!',{exact:true}).waitFor();
 await conectado.getByRole('button',{name:'Sair da conta'}).click();await conectado.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 assert.deepEqual(erros,[]);await browser.close();
 console.log('OK: Pages sem localhost, seis larguras, indisponibilidade explícita e fluxo público com transporte simulado/API real.');
})().catch(e=>{console.error(e);process.exit(1)});

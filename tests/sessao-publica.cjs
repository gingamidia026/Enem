// Dominique-Oliveira-ChatGPT🤖💚 — testes de regressão do navegador com transporte simulado.
const {chromium}=require(process.env.PLAYWRIGHT_MODULO || 'playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const navegador=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 const contexto=await navegador.newContext(); const pagina=await contexto.newPage();
 const token='sessao_simulada_de_teste_1234567890';let revogada=false;let redeFalhou=false;let pendente;let pedidos=0;
 const painel={conta:{nome:'Teste'},questoes:[{id:1,area:'Matemática',titulo:'Questão de teste',enunciado:'Quanto é um mais um?',alternativas:['Um','Dois']}],progresso:{total:0,acertos:0}};
 await contexto.route('https://pu.gingamidia.com/**',async rota=>{
  const url=new URL(rota.request().url());const arquivo=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','configuracao-publica.js','app/public/app.js','app/public/estilo.css','app/public/textura.svg'].includes(arquivo)) return rota.fulfill({status:404,body:''});
  await rota.fulfill({contentType:arquivo.endsWith('.js')?'text/javascript':arquivo.endsWith('.css')?'text/css':arquivo.endsWith('.svg')?'image/svg+xml':'text/html',body:fs.readFileSync(path.join(__dirname,'..',arquivo))});
 });
 await contexto.route('https://enem-ginga-conexao.sabrinaconradoadv.chatgpt.site/**',async rota=>{
  if(redeFalhou)return rota.abort('failed');
  if(rota.request().url().endsWith('/pedido')){
   pedidos++;pendente=rota.request().postDataJSON();
   return rota.fulfill({json:{id:'simulado',recibo:'simulado'}});
  }
  let dados,status=200;
  if(pendente.caminho==='/api/entrar') {revogada=false;dados={sessao:token,painel};}
  else if(pendente.caminho==='/api/sair') {revogada=true;dados={ok:true};}
  else if(pendente.caminho==='/api/painel' && pendente.token===token && !revogada)dados=painel;
  else {status=401;dados={erro:'Entre na sua conta para continuar.'};}
  await rota.fulfill({json:{status,dados}});
 });
 const inicio=()=>pagina.getByRole('heading',{name:'Vamos dar o próximo passo?'}).waitFor();
 const login=async()=>{await pagina.getByLabel('Login',{exact:true}).fill('teste');await pagina.getByLabel('Senha',{exact:true}).fill('123');await pagina.getByRole('button',{name:'Entrar',exact:true}).click();await inicio();};
 await pagina.goto('https://pu.gingamidia.com/');await login();
 assert.equal(pedidos,1,'login não deve buscar painel em segunda viagem');
 assert(await pagina.evaluate(()=>JSON.parse(localStorage.getItem('pu.sessao.v1')).expira>Date.now()+29*86400000));
 await pagina.getByRole('link',{name:'Questões',exact:true}).click();
 const antes=pedidos;await pagina.getByRole('button',{name:'Resolver questão'}).click();
 await pagina.getByText('Quanto é um mais um?',{exact:true}).waitFor();
 assert.equal(pedidos,antes,'abrir questão recebida dispensa rede');
 await pagina.getByRole('link',{name:'Meu estudo',exact:true}).click();
 assert(!await pagina.evaluate(()=>localStorage.getItem('pu.sessao.v1').includes('senha')));
 await pagina.reload();assert.equal(await pagina.getByRole('heading',{name:'Entre para estudar'}).count(),0);await inicio();
 await pagina.close();const outra=await contexto.newPage();await outra.goto('https://pu.gingamidia.com/');await outra.getByText('Olá, Teste.',{exact:true}).waitFor();
 await outra.getByRole('button',{name:'Sair da conta'}).click();await outra.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 assert.equal(await outra.evaluate(()=>localStorage.getItem('pu.sessao.v1')),null);
 await outra.reload();await outra.getByRole('heading',{name:'Entre para estudar'}).waitFor();
 await outra.evaluate(t=>localStorage.setItem('pu.sessao.v1',JSON.stringify({token:t,expira:Date.now()+60000})),token);
 await outra.reload();await outra.waitForTimeout(1400);assert.equal(await outra.evaluate(()=>localStorage.getItem('pu.sessao.v1')),null);
 await outra.evaluate(t=>localStorage.setItem('pu.sessao.v1',JSON.stringify({token:t,expira:Date.now()-1})),token);
 await outra.reload();await outra.waitForTimeout(700);assert.equal(await outra.evaluate(()=>localStorage.getItem('pu.sessao.v1')),null);
 redeFalhou=true;
 await outra.getByLabel('Login',{exact:true}).fill('teste');await outra.getByLabel('Senha',{exact:true}).fill('123');await outra.getByRole('button',{name:'Entrar',exact:true}).click();
 await outra.getByText('Não foi possível conectar ao PU. Verifique sua conexão e tente novamente.').waitFor();
 for(const width of [320,390,768,1440]){
  await outra.setViewportSize({width,height:1000});await outra.waitForTimeout(650);
  const medida=await outra.locator('.formulario').evaluate(e=>{const r=e.getBoundingClientRect();return {centro:Math.abs(r.x+r.width/2-innerWidth/2),rola:document.documentElement.scrollWidth>innerWidth};});
  assert(medida.centro<2&&!medida.rola,JSON.stringify(medida));
 }
 await navegador.close();console.log('OK: sessão pública após recarga e nova aba, saída, revogação, expiração, erro de rede em português e login centralizado em 4 larguras (transporte simulado).');
})().catch(e=>{console.error(e);process.exit(1)});

const ORIGEM = 'https://gingamidia026.github.io';
const agora = () => Math.floor(Date.now()/1000);
const permitido = (metodo,caminho) =>
  (metodo==='GET' && ['/api/configuracao','/api/painel'].includes(caminho)) ||
  (metodo==='POST' && ['/api/entrar','/api/cadastro','/api/sair'].includes(caminho)) ||
  (['GET','POST'].includes(metodo) && /^\/api\/questoes\/[1-9][0-9]{0,5}$/.test(caminho));
async function hash(valor) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(valor)))).map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function jsonPequeno(request,limite=20000) {
  if(Number(request.headers.get('Content-Length'))>limite)throw new Error('tamanho');
  const texto=await request.text();if(new TextEncoder().encode(texto).length>limite)throw new Error('tamanho');
  return JSON.parse(texto);
}
function responder(request,status,dados){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(request.headers.get('Origin')===ORIGEM){headers['Access-Control-Allow-Origin']=ORIGEM;headers['Vary']='Origin';headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type, Authorization';headers['Access-Control-Max-Age']='600';}
 return new Response(status===204?null:JSON.stringify(dados),{status,headers});
}
export default {
 async fetch(request,env){
  const rota=new URL(request.url).pathname; const tempo=agora();
  try {
   if(rota==='/')return responder(request,200,{servico:'Intermediário ENEM',dados:'Contas e histórico permanecem no contêiner local.'});
   if(!env.DB||!env.CHAVE_CONECTOR)return responder(request,503,{erro:'Conexão em configuração. Tente novamente mais tarde.'});
   const interno=rota.startsWith('/conector/');
   if(interno){
    const autorizacao=request.headers.get('Authorization')||'';
    if(await hash(autorizacao)!==await hash('Bearer '+env.CHAVE_CONECTOR))return responder(request,403,{erro:'Não autorizado.'});
   } else {
    if(request.headers.get('Origin')!==ORIGEM)return responder(request,403,{erro:'Origem não autorizada.'});
    if(request.method==='OPTIONS')return responder(request,204,null);
   }
   await env.DB.batch([env.DB.prepare('DELETE FROM fila WHERE expira<?').bind(tempo),env.DB.prepare('DELETE FROM limites WHERE expira<?').bind(tempo)]);
   if(interno && request.method==='POST' && rota==='/conector/retirar'){
    await env.DB.prepare('INSERT INTO conexao VALUES(1,?) ON CONFLICT(id) DO UPDATE SET ultima=excluded.ultima').bind(tempo).run();
    const linhas=await env.DB.prepare("UPDATE fila SET estado='retirado' WHERE id IN (SELECT id FROM fila WHERE estado='pendente' AND expira>=? LIMIT 8) RETURNING id,pedido").bind(tempo).all();
    const pedidos=(linhas.results||[]).map(linha=>({id:linha.id,...JSON.parse(linha.pedido)}));
    if(pedidos.length)await env.DB.batch(pedidos.map(p=>env.DB.prepare('UPDATE fila SET pedido=NULL WHERE id=?').bind(p.id)));
    return responder(request,200,{pedidos});
   }
   if(interno && request.method==='POST' && rota==='/conector/responder'){
    const corpo=await jsonPequeno(request,100000);
    if(typeof corpo.id!=='string'||!Number.isInteger(corpo.status)||corpo.status<200||corpo.status>599)return responder(request,400,{erro:'Resposta inválida.'});
    await env.DB.prepare("UPDATE fila SET estado='concluido',pedido=NULL,resultado=? WHERE id=? AND estado='retirado' AND expira>=?").bind(JSON.stringify({status:corpo.status,dados:corpo.dados}),corpo.id,tempo).run();
    return responder(request,200,{ok:true});
   }
   if(!interno && rota==='/estado' && request.method==='GET'){
    const ativo=await env.DB.prepare('SELECT ultima FROM conexao WHERE id=1').first();
    return responder(request,200,{disponivel:!!ativo && tempo-ativo.ultima<15});
   }
   if(!interno && rota==='/pedido' && request.method==='POST'){
    const corpo=await jsonPequeno(request);
    if(!permitido(corpo.metodo,corpo.caminho)|| (corpo.token && !/^[A-Za-z0-9_-]{20,100}$/.test(corpo.token)))return responder(request,400,{erro:'Operação não permitida.'});
    if(corpo.metodo==='POST' && (!corpo.dados||typeof corpo.dados!=='object'||Array.isArray(corpo.dados)))return responder(request,400,{erro:'Dados inválidos.'});
    const ativo=await env.DB.prepare('SELECT ultima FROM conexao WHERE id=1').first();
    if(!ativo||tempo-ativo.ultima>=15)return responder(request,503,{erro:'A plataforma está temporariamente indisponível. Tente novamente mais tarde.'});
    const ip=request.headers.get('CF-Connecting-IP')||'desconhecido';
    const chave=await hash(ip+':'+Math.floor(tempo/60));
    const limite=await env.DB.prepare('INSERT INTO limites VALUES(?,1,?) ON CONFLICT(chave) DO UPDATE SET total=total+1 RETURNING total').bind(chave,tempo+90).first();
    if(limite.total>60)return responder(request,429,{erro:'Muitas solicitações. Aguarde um minuto.'});
    const fila=await env.DB.prepare('SELECT COUNT(*) total FROM fila').first();
    if(fila.total>=100)return responder(request,503,{erro:'Muitas pessoas estudando agora. Tente novamente em instantes.'});
    const id=crypto.randomUUID(); const recibo=crypto.randomUUID()+crypto.randomUUID();
    await env.DB.prepare('INSERT INTO fila VALUES(?,?,\'pendente\',?,NULL,?)').bind(id,await hash(recibo),JSON.stringify(corpo),tempo+35).run();
    return responder(request,202,{id,recibo});
   }
   if(!interno && request.method==='GET' && /^\/resultado\/[a-f0-9-]{36}$/.test(rota)){
    const id=rota.split('/').pop(); const recibo=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
    const registro=await env.DB.prepare('SELECT estado FROM fila WHERE id=? AND recibo=? AND expira>=?').bind(id,await hash(recibo),tempo).first();
    if(!registro)return responder(request,404,{erro:'Solicitação expirada. Tente novamente.'});
    if(registro.estado!=='concluido')return responder(request,202,{aguarde:true});
    const linha=await env.DB.prepare("DELETE FROM fila WHERE id=? AND recibo=? AND estado='concluido' RETURNING resultado").bind(id,await hash(recibo)).first();
    return linha ? responder(request,200,JSON.parse(linha.resultado)) : responder(request,404,{erro:'Resposta já consultada.'});
   }
   return responder(request,404,{erro:'Operação não encontrada.'});
  }catch{return responder(request,500,{erro:'Não foi possível concluir. Tente novamente mais tarde.'});}
 }
};

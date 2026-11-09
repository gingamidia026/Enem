import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const origem='https://pu.gingamidia.com';
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../conexao-publica/drizzle/0000_fila_transitoria.sql',import.meta.url),'utf8'));
class Consulta{
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Consulta(this.sql,args);}
 async first(){return db.prepare(this.sql).get(...this.args)||null;}
 async all(){return {results:db.prepare(this.sql).all(...this.args)};}
 async run(){return db.prepare(this.sql).run(...this.args);}
}
const env={DB:{prepare:sql=>new Consulta(sql),batch:async consultas=>{db.exec('BEGIN');try{const r=[];for(const c of consultas)r.push(await c.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},CHAVE_CONECTOR:'chave-de-teste'};
const fonte=readFileSync(new URL('../conexao-publica/worker/index.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fonte).toString('base64'))).default;
async function pedir(rota,{metodo='GET',dados,interno=false,recibo,origin=origem}={}){
 const headers={Origin:origin,'Content-Type':'application/json'};
 if(interno)headers.Authorization='Bearer '+env.CHAVE_CONECTOR;
 if(recibo)headers.Authorization='Bearer '+recibo;
 const r=await worker.fetch(new Request('https://intermediario.example'+rota,{method:metodo,headers,body:dados===undefined?undefined:JSON.stringify(dados)}),env);
 return {status:r.status,dados:r.status===204?null:await r.json(),headers:r.headers};
}
for(const origin of [origem,'https://gingamidia026.github.io']) {
 const r=await pedir('/pedido',{metodo:'OPTIONS',origin});
 assert.equal(r.status,204); assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
}
for(const origin of ['http://pu.gingamidia.com','https://pu.gingamidia.com.outro.example','null']) {
 const r=await pedir('/pedido',{metodo:'OPTIONS',origin});
 assert.equal(r.status,403); assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
}
assert.equal((await pedir('/estado',{origin:'https://outro.example'})).status,403);
assert.equal((await pedir('/conector/retirar',{metodo:'POST',dados:{}})).status,403);
assert.equal((await pedir('/pedido',{metodo:'POST',dados:{metodo:'GET',caminho:'/api/painel'}})).status,503);
await pedir('/conector/retirar',{metodo:'POST',interno:true,dados:{}});
assert.equal((await pedir('/estado')).dados.disponivel,true);
assert.equal((await pedir('/pedido',{metodo:'POST',dados:{metodo:'POST',caminho:'/api/terminal',dados:{comando:'id'}}})).status,400);
const enviado=await pedir('/pedido',{metodo:'POST',dados:{metodo:'POST',caminho:'/api/entrar',dados:{email:'teste',senha:'123'}}});
assert.equal(enviado.status,202);
const {id,recibo}=enviado.dados;
assert.equal((await pedir('/resultado/'+id,{recibo:'errado'})).status,404);
const retirado=await pedir('/conector/retirar',{metodo:'POST',interno:true,dados:{}});
assert.equal(retirado.dados.pedidos[0].dados.email,'teste');
assert.equal(db.prepare('SELECT pedido FROM fila WHERE id=?').get(id).pedido,null);
assert.equal((await pedir('/conector/retirar',{metodo:'POST',interno:true,dados:{}})).dados.pedidos.length,0);
await pedir('/conector/responder',{metodo:'POST',interno:true,dados:{id,status:200,dados:{nome:'Teste',sessao:'token-de-teste'}}});
const resultado=await pedir('/resultado/'+id,{recibo});
assert.equal(resultado.status,200);assert.equal(resultado.dados.dados.nome,'Teste');
assert.equal(resultado.headers.get('Access-Control-Allow-Origin'),origem);
assert.equal(db.prepare('SELECT COUNT(*) total FROM fila').get().total,0);
assert.equal((await pedir('/resultado/'+id,{recibo})).status,404);
db.prepare('INSERT INTO fila VALUES(?,?,?,?,?,?)').run('expirado','x','pendente','sensivel',null,0);
await pedir('/estado');assert.equal(db.prepare('SELECT COUNT(*) total FROM fila').get().total,0);
db.close();
console.log('OK: origem, autenticação do conector, lista de operações, fila única, sigilo do recibo, consumo e expiração.');

#!/usr/bin/env python3
"""Exporta questões do cofre sem IA, rede, execução de Markdown ou acesso às contas."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile

RAIZ = Path(__file__).resolve().parents[1]
PADRAO_COFRE = '/home/dominique/backup/Estudos/Vestibular'

def atomico(caminho, dados):
    fd, nome = tempfile.mkstemp(dir=caminho.parent, prefix='.temporario-')
    try:
        with os.fdopen(fd, 'wb') as f:
            os.fchmod(f.fileno(), 0o644)
            f.write(dados); f.flush(); os.fsync(f.fileno())
        os.replace(nome, caminho)
    finally:
        if os.path.exists(nome): os.unlink(nome)

def texto_meta(texto):
    if not texto.startswith('---\n'): raise ValueError('Cabeçalho YAML ausente')
    partes = texto.split('---', 2)
    if len(partes) < 3: raise ValueError('Cabeçalho incompleto')
    meta = {}
    for linha in partes[1].splitlines():
        achado = re.match(r'^([^\s:][^:]*):\s*(.*?)\s*$', linha)
        if achado:
            k,v = achado.groups()
            if v.startswith('"'):
                v = json.loads(v)
            elif v.startswith("'") and v.endswith("'"): v = v[1:-1].replace("''", "'")
            meta[k] = str(v)
    return meta, partes[2]

def sincronizar(cofre, destino):
    cofre = cofre.resolve()
    questoes = cofre / 'Provas Enem/Questões'
    imagens = cofre / 'Matérias/Flashcards/Imagens exercícios'
    if not questoes.is_dir() or not (cofre/'Leia-me.md').is_file():
        raise ValueError('Cofre indisponível ou raiz incorreta. Catálogo anterior preservado.')
    destino.mkdir(parents=True, exist_ok=True)
    with (destino/'sincronizacao.lock').open('a') as trava:
        fcntl.flock(trava, fcntl.LOCK_EX)
        anterior = json.loads((destino/'atual.json').read_text()) if (destino/'atual.json').exists() else {}
        registro = dict(anterior.get('registro', {}))
        proximo = max([999, *registro.values()])+1
        itens=[]; chaves=set(); arquivos={}; anuladas=0; revisao=0
        for nota in sorted(questoes.rglob('*.md')):
            if nota.is_symlink() or not nota.resolve().is_relative_to(questoes.resolve()):
                raise ValueError(f'Questão fora da pasta autorizada: {nota.name}')
            if nota.stat().st_size > 200000: raise ValueError(f'Nota muito grande: {nota.name}')
            try:
                meta, corpo = texto_meta(nota.read_text())
                ano=int(meta['ano']);dia=int(meta['dia']);numero=int(meta['questão'])
                caderno=re.match(r'^([0-9]+)(?:\s|$)',meta['caderno'])
                if not caderno or not 2000 <= ano <= 2999 or dia not in (1,2) or not 1 <= numero <= 180:
                    raise ValueError('Identificação inválida')
                caderno=int(caderno[1]); chave=f'enem:{ano}:{dia}:{caderno}:{numero}'
                if chave in chaves: raise ValueError('Identificação duplicada')
                chaves.add(chave)
                if meta.get('anulada','false') not in ('true','false') or meta.get('revisar','false') not in ('true','false'):
                    raise ValueError('anulada/revisar devem ser true ou false')
                if meta.get('anulada')=='true': anuladas+=1;continue
                gabarito=meta.get('gabarito','')
                if gabarito not in list('ABCDE'): raise ValueError('Gabarito ausente ou inválido')
                if '\n## Texto\n' not in corpo: raise ValueError('Seção Texto ausente')
                texto=corpo.split('\n## Texto\n',1)[1].strip()
                comum=corpo.split('\n## Texto comum\n',1)[1].split('\n## Texto\n',1)[0].strip() if '\n## Texto comum\n' in corpo else ''
                marcas=list(re.finditer(r'^([A-E])(?:[ \t]+|(?=\n|$))',texto,re.M))[-5:]
                texto_parcial = [m[1] for m in marcas] != list('ABCDE')
                if meta.get('extrator') == '2' and texto_parcial:
                    raise ValueError('Questão corrigida sem alternativas completas')
                alternativas = [f'Alternativa {letra} (veja a imagem original)' for letra in 'ABCDE'] if texto_parcial else [texto[m.end():marcas[i+1].start() if i<4 else len(texto)].strip() for i,m in enumerate(marcas)]
                if not all(alternativas): raise ValueError('Alternativa vazia')
                enunciado=texto.strip() if texto_parcial else texto[:marcas[0].start()].strip()
                enunciado=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', enunciado)
                if not enunciado: raise ValueError('Enunciado vazio')
                refs=[]
                nomes=list(dict.fromkeys(re.findall(r'!\[\[([^]|]+)',corpo)))
                for imagem in nomes:
                    if not re.fullmatch(r'[A-Za-z0-9_-]+\.png',imagem): raise ValueError('Nome de imagem inválido')
                    f=imagens/imagem
                    if f.is_symlink() or not f.resolve().is_relative_to(imagens.resolve()) or not f.is_file(): raise ValueError('Imagem ausente ou fora da pasta autorizada')
                    dados=f.read_bytes()
                    if not dados.startswith(b'\x89PNG\r\n\x1a\n') or len(dados)>8*1024*1024: raise ValueError('PNG inválido ou acima de 8 MB')
                    sha=hashlib.sha256(dados).hexdigest();arquivos[sha]=dados
                    refs.append({'hash':sha,'tipo':'image/png','partes':(len(dados)+49151)//49152})
                def midias_embutidas(t):
                    return re.sub(r'!\[\[([^]|]+)(?:\|[^]]*)?\]\]',lambda m:'[[midia:'+str(nomes.index(m[1]))+']]',t)
                enunciado=midias_embutidas(enunciado)
                alternativas=[midias_embutidas(a) for a in alternativas]
                comum=midias_embutidas(comum)
                if texto_parcial and not refs: raise ValueError('Extração parcial sem imagem original')
                if chave not in registro:
                    if proximo > 999999: raise ValueError('Limite de identificadores atingido')
                    registro[chave]=proximo;proximo+=1
                revisar=meta.get('revisar')=='true';revisao+=int(revisar)
                itens.append({'id':registro[chave],'chave':chave,'area':meta['área'],'titulo':f'Enem {ano} · Questão {numero:02d}',
                    'ano':ano,'dia':dia,'numero':numero,'caderno':caderno,'materia':meta.get('matéria',''),
                    'topico':meta.get('tópico',''),'assunto':meta.get('assunto',''),'conteudo':meta.get('conteúdo',''),
                    'revisar':revisar,'oficial':True,'enunciado':enunciado,'alternativas':alternativas,'correta':ord(gabarito)-65,
                    'explicacao':'Gabarito registrado no cofre a partir do caderno oficial. Ainda não há solução comentada para esta questão.',
                    'imagens':refs,'textoParcial':texto_parcial,'textoComum':comum,'grupo':meta.get('grupo',''),
                    'extrator':int(meta.get('extrator','1')),'origemArquivo':meta.get('origem_arquivo',''),
                    'fonte':f'https://download.inep.gov.br/enem/provas_e_gabaritos/{ano}_PV_impresso_D{dia}_CD{caderno}.pdf'})
            except (KeyError, ValueError, TypeError, OSError) as e:
                raise ValueError(f'{nota.name}: {e}. Catálogo anterior preservado.') from e
        grupos={}
        for q in itens:
            if q['grupo']:
                if not q['textoComum']: raise ValueError('Grupo sem texto comum')
                grupos.setdefault(q['grupo'],[]).append(q)
        for grupo, membros in grupos.items():
            textos={q['textoComum'] for q in membros}
            if len(textos)!=1: raise ValueError('Texto compartilhado inconsistente: '+grupo)
            faixa=re.search(r':Q(\d+)a(\d+)$',grupo)
            if not faixa or not set(range(int(faixa[1]),int(faixa[2])+1)).issubset({q['numero'] for q in membros}):
                raise ValueError('Grupo incompleto: '+grupo)
            ids=[q['id'] for q in sorted(membros,key=lambda q:q['numero'])]
            for q in membros: q['grupoIds']=ids
        velho={q['chave'] for q in anterior.get('questoes',[])};novo={q['chave'] for q in itens}
        catalogo={'formato':1,'registro':registro,'questoes':itens,'anuladas':anuladas,'revisar':revisao}
        assinatura=json.dumps(catalogo,ensure_ascii=False,sort_keys=True).encode();catalogo['versao']=hashlib.sha256(assinatura).hexdigest()
        # Imagens imutáveis e registro completo são publicados antes da troca atômica do índice.
        (destino/'imagens').mkdir(exist_ok=True)
        for sha,dados in arquivos.items():
            arquivo=destino/'imagens'/f'{sha}.png'
            if not arquivo.exists(): atomico(arquivo,dados)
            arquivo.chmod(0o644)
        atomico(destino/'atual.json',json.dumps(catalogo,ensure_ascii=False).encode())
        resumo={'total':len(itens),'adicionadas':len(novo-velho),'removidas':len(velho-novo),'anuladas':anuladas,'revisar':revisao,'versao':catalogo['versao'][:12]}
        print('Questões sincronizadas, sem IA: '+json.dumps(resumo,ensure_ascii=False))
        return resumo

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cofre',type=Path,default=Path(os.environ.get('PU_COFRE_VESTIBULAR',PADRAO_COFRE)))
    parser.add_argument('--destino',type=Path,default=RAIZ/'.catalogo')
    args=parser.parse_args()
    try: sincronizar(args.cofre,args.destino)
    except (ValueError,OSError,json.JSONDecodeError) as erro:
        print('Não foi possível sincronizar: '+str(erro),file=sys.stderr);sys.exit(1)

"""Regressões com fontes locais reais. Sem rede, IA ou alterações no cofre."""
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
import shutil
from unittest.mock import patch

RAIZ=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(RAIZ/'ferramentas/importar-prova'))
import importar
import fitz

class Extracao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.destino=Path(cls.tmp.name)
        cls.lotes={}
        for ano,dia,nums in [(2024,1,{1,2,3,6}), (2024,2,{92,127,136,137,138,139,140,141,148,175}), (2025,1,{6,7,8,9,10}), (2025,2,{124,138,153,155,157,160,169})]:
            pdf=importar.PROVAS/f'{ano}_PV_impresso_D{dia}_CD{1 if dia==1 else 7}.pdf'
            if not pdf.exists(): raise unittest.SkipTest('Fontes reais não disponíveis nesta instalação')
            cls.lotes[ano,dia]=importar.recortar(pdf,ano,cls.destino,nums)
    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()
    def q(self,ano,dia,n):return next(q for q in self.lotes[ano,dia] if q['n']==n)
    def test_texto_sem_imagem_nao_recebe_enfeite(self):
        self.assertEqual(self.q(2024,2,137)['imagens'],[])
        self.assertEqual(self.q(2024,1,6)['imagens'],[])
    def test_cropbox_nao_desloca_figura(self):
        q=self.q(2024,1,1);self.assertEqual(len(q['imagens']),1)
        self.assertIn('![[',q['texto']);self.assertIn('citações atribuídas',q['texto'])
        from PIL import Image
        with Image.open(self.destino/q['imagens'][0]) as img:self.assertGreater(img.height,900)
    def test_tabela_conservada_sem_duplicacao(self):
        q=self.q(2024,2,139);self.assertEqual(len(q['imagens']),1)
        self.assertNotIn('Preços dos componentes',q['texto'])
        self.assertIn('O artesão efetuará',q['texto'])
    def test_alternativas_graficas_em_duas_colunas(self):
        q=self.q(2024,2,127)
        opcoes=[m for m in q['midias'] if m.get('alternativa')]
        self.assertEqual([m['alternativa'] for m in opcoes],list('ABCDE'))
        for m in opcoes:self.assertGreater(m['caixa'][2]-m['caixa'][0],90)
    def test_formulas_preservadas_e_cinco_opcoes(self):
        for ano,dia,n in [(2024,2,92),(2024,2,148),(2024,2,175),(2025,2,157)]:
            q=self.q(ano,dia,n)
            self.assertEqual(re.findall(r'^([A-E])(?:\s|$)',q['texto'],re.M)[-5:],list('ABCDE'))
            self.assertTrue(q['imagens'])
    def test_texto_comum_e_cinco_ids_individuais(self):
        qs=self.lotes[2025,1]
        self.assertEqual(len({q['grupo'] for q in qs}),1)
        self.assertEqual(len({q['texto_comum'] for q in qs}),1)
        self.assertTrue(qs[0]['texto_comum'])
        self.assertEqual({q['n'] for q in qs},{6,7,8,9,10})
    def test_midias_referenciadas_existem(self):
        for qs in self.lotes.values():
            for q in qs:
                refs=re.findall(r'!\[\[([^]]+)\]\]',q['texto']+q['texto_comum'])
                self.assertEqual(set(refs),set(q['imagens']))
                for nome in refs:self.assertTrue((self.destino/nome).is_file())
    def test_nenhuma_saida_incompleta_nas_amostras(self):
        for qs in self.lotes.values():self.assertTrue(all(q['completa'] for q in qs))
    def test_repetir_extracao_e_deterministico(self):
        pdf=importar.PROVAS/'2024_PV_impresso_D2_CD7.pdf'
        atual=importar.recortar(pdf,2024,self.destino,{139})[0]
        self.assertEqual(atual,self.q(2024,2,139))
    def test_corrigir_nao_toca_nas_notas_originais(self):
        fonte=importar.QUESTOES/'2024/2024-Q139.md';antes=fonte.read_bytes()
        resultado=importar.cmd_corrigir(importar.PROVAS/'2024_PV_impresso_D2_CD7.pdf',self.destino/'correcao',{139})
        self.assertEqual(resultado['aprovadas'],[139]);self.assertEqual(fonte.read_bytes(),antes)
        corrigida=(self.destino/'correcao/Provas Enem/Questões/2024/2024-Q139.md').read_text()
        self.assertNotIn('![[2024-Q139-1.png]]',corrigida)
        self.assertIn('origem_sha256:',corrigida)
    def test_aplicacao_preserva_carta_historico_e_tem_copia(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz=Path(tmp);cofre=raiz/'cofre';provas=cofre/'Provas Enem';notas=provas/'Questões'
            flash=cofre/'Matérias/Flashcards';imagens=flash/'Imagens exercícios'
            (notas/'2024').mkdir(parents=True);flash.mkdir(parents=True)
            nome='2024-Q139';nota=notas/'2024'/f'{nome}.md'
            original=(importar.QUESTOES/'2024'/f'{nome}.md').read_bytes().replace(b'extrator: 2\n',b'');nota.write_bytes(original)
            fonte=provas/'2024_PV_impresso_D2_CD7.pdf';shutil.copy2(importar.PROVAS/fonte.name,fonte)
            carta=flash/'teste.md';carta.write_text('![[2024-Q139-1.png]] :: C\n<!--SR:!2026-11-09,10,250-->\n')
            saida=raiz/'preparada'
            with patch.multiple(importar,COFRE=cofre,PROVAS=provas,QUESTOES=notas,FLASHCARDS=flash,IMAGENS=imagens):
                importar.cmd_corrigir(fonte,saida,{139})
                copia=importar.aplicar_correcao(saida)
                self.assertEqual((copia/'Provas Enem/Questões/2024/2024-Q139.md').read_bytes(),original)
                self.assertIn('<!--SR:!2026-11-09,10,250-->',carta.read_text())
                self.assertIn('O artesão efetuará',carta.read_text())
                self.assertNotIn('![[2024-Q139-1.png]]',carta.read_text())
                with self.assertRaises(ValueError):importar.aplicar_correcao(saida)
    def test_questao_grafica_com_letras_isoladas(self):
        qs=importar.recortar(importar.PROVAS/'2024_PV_impresso_D2_CD7.pdf',2024,self.destino,{112})
        q=qs[0];self.assertTrue(q['completa'])
        self.assertEqual(len([m for m in q['midias'] if m.get('alternativa')]),5)

if __name__=='__main__':unittest.main(verbosity=2)

# Verb Lab v40 — Relatório de Implementação

**Data:** 24/10/2026
**Autor:** agente de implementação (assistido)
**Repositório (novo, privado, secundário):** `lrfsantos/vlabtest`
**URL publicada:** https://lrfsantos.github.io/vlabtest/
**Branch:** `main` · **Último commit:** `4c22914a973c50db2dc1f4edfe11e5778bbd83c6`

> Nota importante: por decisão do usuário, **o repositório oficial (GitHub Pages existente) não foi tocado**. Todo o trabalho foi feito em um repositório novo e **privado** (`vlabtest`) para teste, exatamente como solicitado.

> **Feedback de auditoria do usuário — interface densa (a registrar):** o usuário relatou que a interface está **muito cheia ("too crowded"), especialmente no modo Avançado**. Este relatório documenta a causa com evidência na seção **I. Observação de UX — interface densa** e recomenda correções; o ajuste em si ainda **não** foi implementado nesta entrega.

---

## A. Resumo

- Entreguei uma reestruturação completa do **Verb Lab v39** para um site estático **v40** (HTML/CSS/JS/JSON), mantendo as funcionalidades úteis do original e corrigindo os problemas conhecidos.
- Novo currículo com as **12 formas centrais** dos tempos verbais + **7 construções relacionadas**, cada uma com lição completa (usos, formação, concordância, ortografia, pronúncia, erros comuns de brasileiros, contrastes, exemplos, prática guiada e quiz de revisão).
- Quizzes **estritamente focados**: um quiz testa apenas a forma selecionada.
- Dificuldade **significativa**: o nível muda quais perguntas aparecem (básico/intermediário/avançado), comprovado em teste de navegador (quiz "Começando" = 3 perguntas só-básicas; "Avançado" = 6 com básica+intermediária+avançada).
- Pronúncia contextual: o aviso do "i" final só aparece para palavras específicas da lista, nunca como dica global.
- Testes automatizados (Node) e verificação em navegador (Edge headless via CDP) passando, tanto local quanto no site publicado.
- Publicado e verificado em https://lrfsantos.github.io/vlabtest/.

---

## B. Achados da auditoria

### Confirmados no código v39

1. **`keepQuestions(n)` usava `MICRO.slice()` diretamente**, ignorando o filtro de nível de `microPool()`. Confirmado. (Corrigido: o modo misto agora monta o pool respeitando o nível e é claramente rotulado como misto.)
2. **`makeQuiz()` adicionava micro-lições de outros tempos** a quizzes focados de `pres`/`past`/`part` para níveis não-básicos. Confirmado. Um quiz de Passado podia conter presente perfect ou presente simples. (Corrigido: quizzes focados usam **somente** as perguntas da lição selecionada; conteúdo misto existe apenas no modo explícito "Keep Your English".)
3. **Aviso do "i" final repetido e fora de contexto.** O lembrete era inserido na dica geral de TODAS as abas ("não invente um i no final: want → uânt") e também em `pronCue`. Confirmado. (Corrigido: regra movida para `data/br-tips.json` em `+final-i.words`; o app só mostra para palavras dessa lista, na forma em foco.)
4. **CSP `script-src 'unsafe-inline'` sem `'self'`.** Confirmado. (Corrigido: JS movido para `assets/app.js` externo e CSP atualizado para `script-src 'self'`.)
5. **Chaves de localStorage ainda `verb-lab-v36-*`** apesar do v39. Confirmado (versão obsoleta). (Corrigido: migração segura v36→v40 no boot; nenhum `localStorage.clear()`.)
6. **Perguntas ambíguas** (ex.: "I ___ my keys. Can you help me?"). As novas perguntas usam instrução com a forma-alvo nomeada e contexto suficiente para uma resposta defensável.

### Verificados e não confirmados / despropositados

- **Autoteste interno**: existe, mas não provava precisão semântica nem foco curricular — confirmado que era apenas estrutural. Agora o autoteste cobre espaços, vazamento de resposta, opções, foco e `accept`.
- **Service worker / manifest / ícones**: presentes no v39; não havia `sw.js`/manifest separados em Downloads. Recriei ambos com cache versionado v40 e caminhos relativos.
- **`GER_OVERRIDE` etc.**: dados extraídos e preservados nos JSON de dados (não usados diretamente pelo app novo, mas mantidos como base).

---

## C. Mudanças feitas

### Estrutura final

```
verb-lab/
├── index.html                    CSP atualizada, sem handlers inline
├── assets/
│   ├── styles.css                estilos (reaproveitados + novos)
│   └── app.js                    lógica do app (carrega JSON)
├── data/
│   ├── curriculum.json           4 grupos + 19 formas/construções
│   ├── lessons/*.json            19 lições (12 formas + 7 relacionadas)
│   ├── verbs.json, prep.json, pronunciation.json, br-tips.json,
│   ├── collocations.json, micro-keep.json, stative.json, alt-forms.json
├── tests/
│   └── content-validation.js     testes Node
├── manifest.webmanifest
├── sw.js                         cache versionado v40
├── icon-192.png, icon-512.png
├── LICENSE.txt                   PolyForm Noncommercial 1.0.0 (texto oficial)
├── README.md
└── baseline-verb-lab-v39.html    original preservado (commit separado)
```

### Mudanças por arquivo

- **`index.html`** (novo): estrutura enxuta; CSP `script-src 'self'`; sem atributos `onclick`/`oninput` inline; todas as ações via delegação de eventos em `app.js`.
- **`assets/app.js`** (novo, ~54 KB): carregamento de dados por `fetch`, renderização de lições, quiz focados, dificuldade, pronúncia contextual, exploração de verbos, tabela de irregulares, Keep Your English (misto explícito), revisão de erros, XP/sequência, temas, tamanho de texto, espaçamento, PWA e autoteste.
- **`assets/styles.css`** (novo): extraído do v39 + classes novas para lições/módulos.
- **`data/lessons/*.json`** (19 novos): conteúdo do currículo.
- **`tests/content-validation.js`** (novo): 28 verificações.
- **`manifest.webmanifest`, `sw.js`** (novos): cache `verb-lab-v40-v1`, `start_url` e `scope` relativos.
- **`LICENSE.txt`** (novo): texto oficial da PolyForm Noncommercial License 1.0.0 (baixado de polyformproject.org), preservando o licenciamento citado no v39.
- **`README.md`** (novo): instruções de execução/teste/publicação.

### Compatibilidade/migração

- Migração automática `verb-lab-v36-*` → `verb-lab-v40-*` (XP, sequência, nível, tema, tamanho de texto, erros) sem apagar nada.
- Service worker com **cache versionado** para não prender versões antigas; remove caches obsoletos no `activate`.
- Todos os caminhos de assets/JSON são **relativos**, funcionando sob `/vlabtest/`.

---

## D. Currículo e conteúdo

### 12 formas centrais (grupos Presente/Passado/Futuro)

1. Present Simple
2. Present Continuous
3. Present Perfect
4. Present Perfect Continuous
5. Past Simple
6. Past Continuous
7. Past Perfect
8. Past Perfect Continuous
9. Future Simple (will)
10. Future Continuous
11. Future Perfect
12. Future Perfect Continuous

### Construções relacionadas (grupo separado, não contadas nas 12)

- `be going to`
- Presente com valor de futuro (arrangements/schedules)
- Modais
- Condicionais
- Voz passiva
- Verb patterns (-ing / to + base)
- Phrasal verbs e combinações

### Estrutura de cada lição

Usos e significados · Formação (afirmativa, negativa, perguntas, respostas curtas) · Concordância · Ortografia · Pronúncia · Erros comuns de brasileiros · Contrastes · Exemplos com tradução · Prática guiada (8 itens) · Quiz de revisão (8–10 itens).

Total: **334 perguntas** validadas (prática guiada + revisão), cada uma com prompt, resposta canônica, opções/`accept`, tradução, explicação e dificuldade (`basic`/`intermediate`/`advanced`).

### Validação de conteúdo

- Teste Node verifica JSON bem formado, campos obrigatórios, IDs únicos, opções com a resposta presente e sem duplicatas, exatamente 1–2 espaços `___`, resposta que não vaza na pergunta (para itens de diálogo, só a cláusula `B:` é inspecionada), `accept` contendo a resposta canônica, referências válidas de currículo e CSP.
- **Limitação honesta**: a naturalidade/idiomaticidade do inglês e das traduções foi revisada manualmente item a item durante a escrita; testes automatizados não decidem naturalidade. As perguntas de "resposta curta" (`A: ... B: Yes, I ___`) são marcadas para a inspeção ignorar o texto da pergunta `A:`.
- Foco: verificação automatizada de que nenhuma pergunta de uma lição referencia `targetForm`/`lessonId` de outra forma.

---

## E. Evidência de testes

### Comandos

- `node tests/content-validation.js` → **28 pass, 0 fail, 0 skip** (local).
- Verificação em navegador real: **Edge headless via Chrome DevTools Protocol** (scripts em `%TEMP%\opencode\cdp-*.mjs`) contra servidor local e contra o site publicado.

### Testes de navegador executados (locais e/ou no site)

- Carregamento com dados novos e com dados salvos (migração v36→v40).
- Lição renderizada (conteúdo > 500 chars).
- Quiz focado: ao selecionar Past Simple, todas as perguntas são `past-simple`; tag de alvo "Passado Simples".
- Dificuldade: "Começando" → 3 perguntas só-básicas; "Avançado" → 6 com básica+intermediária+avançada. **O nível muda o conteúdo.**
- Resposta correta → feedback, XP; navegação até o fim; tela de resultado.
- Keep Your English: 6 perguntas, todas `mixed`, tag "Misto • Keep Your English".
- Autoteste no navegador: **9/9 verificações ok, nenhuma falha** (local e publicado).
- Erros de console/rede: **0** em todos os roteiros.

### Dispositivos/viewports

- Apenas desktop headless (900×1200). **Não testado** em dispositivos móveis reais nem em outros navegadores (limitação declarada).

### Verificação da publicação

- `https://lrfsantos.github.io/vlabtest/`: index, CSS, JS, manifest, sw.js, ícones, curriculum.json, verbs.json e todas as lições → **HTTP 200**.
- Roteiro CDP no site publicado: página renderiza, 4 grupos, quiz focado funciona, autoteste 9/9, **0 erros de console/rede**.

---

## F. Passos GitHub/deploy

- **Repositório:** `lrfsantos/vlabtest` (novo, **privado**, secundário).
- **Branch:** `main`.
- **Commits:**
  - `88687d7` chore: guarda baseline original v39 e handoff
  - `4c22914` feat: reestrutura como site estático v40 ... (HEAD)
- **Deploy:** GitHub Pages, branch `main`, pasta `/ (root)` — configurado manualmente pelo usuário no repositório `vlabtest`.
- **Resultado observado:** site no ar em https://lrfsantos.github.io/vlabtest/, assets 200, autoteste ok, sem erros de console.
- **O que o agente NÃO fez:** o usuário executou manualmente o push e a configuração do Pages (o agente não tem autenticação no navegador do usuário). A autenticação via API foi tentada com credencial de senha e rejeitada (GitHub exige Personal Access Token desde 2021); isso foi comunicado e o usuário seguiu o passo a passo com token.

---

## G. Limitações e trabalho restante

- **Dispositivos reais:** não testado em celular/tablet físico nem em Safari/Firefox.
- **Naturalidade linguística:** revisada manualmente durante a escrita, mas uma segunda passada humana do inglês/traduções ainda é recomendada antes de uso amplo em sala.
- **Original oficial intocado:** a página oficial continua como estava; esta entrega é só no `vlabtest` (por decisão do usuário).
- **Próximos passos prioritários:**
  1. Testar em um celular real (Chrome/Safari) e no modo offline (service worker).
  2. Revisar por um professor falante de inglês o texto das 19 lições e as 334 perguntas.
  3. Se quiser promover ao site oficial, repetir o push/Pages lá (caminho relativo já suporta outro subpath).

---

## H. Instruções de reprodução

### Rodar localmente

```powershell
cd C:\Users\luiza\Documents\verb-lab
node server.js        # ou: python -m http.server 8000
# abrir http://localhost:8370  (server.js usa a porta 8370)
```

O app precisa de um servidor estático (fetch de JSON); não funciona por `file://`.

### Rodar os testes

```powershell
cd C:\Users\luiza\Documents\verb-lab
node tests/content-validation.js
```

### Publicar (caso queira reproduzir)

1. Crie um repositório privado vazio no GitHub.
2. `git remote add origin https://github.com/<usuário>/<repo>.git`
3. `git push -u origin main`
4. Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
5. Site em `https://<usuário>.github.io/<repo>/`.

### Requisitos

- Node.js (para testes; o site em si não precisa).
- Git (para versionamento).
- Token GitHub com escopo `repo` para push (senha não é aceita).

---

## I. Observação de UX — interface densa (feedback do usuário, pendente de ajuste)

**Status:** observação registrada para auditoria; **correção não implementada** nesta entrega.

### O que o usuário relatou

> "A interface está muito cheia (too crowded), especialmente no modo Avançado."

### Causa (com evidência)

1. **Cada lição renderiza as 10 seções empilhadas verticalmente** em uma página única sem dobra/paginação: Usos, Formação (4 subseções), Concordância, Ortografia, Pronúncia, Erros comuns, Contrastes, Exemplos, Prática guiada e Quiz. A lista abaixo mostra o volume real por lição (contagem de itens por seção):

```
present-simple      meaningUses(4) formation(4) subjectAgreement(3) spelling(3)
                    pronunciation(2) commonErrors(3) contrast(1) examples(5)
                    guidedPractice(8) reviewQuiz(10)      ← 10 seções, 43 itens
present-continuous  … 10 seções, 43 itens
past-simple         … 10 seções, 43 itens
… (19 lições)
TOTAL: 686 itens de conteúdo no currículo
```

2. **Modo Avançado = tudo ligado:** o welcome/picker, no nível Avançado, ativa os **4 grupos** (Presente, Passado, Futuro, Construções relacionadas) = **19 abas/formas** visíveis, e cada lição inteira fica aberta. É a combinação mais densa do app.

3. **Barra de abas dupla:** tabs de grupo (4) + tabs de forma (4) + CTA fixo no rodapé + cabeçalho com controles → muita informação na mesma tela.

### Impacto observado

- Rolagem muito longa por lição; alto custo visual para localizar uma seção específica.
- No modo Avançado, a navegação entre 19 formas é cansativa.

### Correções recomendadas (priorizadas)

1. **Seções recolhíveis por padrão** (accordion `<details>` por seção, só "Usos" e "Exemplos" abertos) — reduz drasticamente a densidade sem perder conteúdo. Baixo custo, alto ganho.
2. **Picker por default com menos grupos** no nível Avançado (ex.: começar com Presente+Passado, deixar Futuro/Relacionadas opcionais) — reduz 19 abas para 8.
3. **Cabeçalho mais enxuto no modo Avançado** (controles de texto/tema em um menu, não na barra principal).
4. **Resumo da lição** (2–3 linhas) no topo com link "Ver lição completa", em vez de tudo aberto.

### Recomendação de auditoria

Conferir se a densidade viola a diretriz do briefing "Keep the UI concise" (regra 6) e priorizar a correção 1 (accordion) antes da próxima revisão, pois afeta todas as lições e todos os níveis.

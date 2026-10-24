# Verb Lab

Aplicativo estático (HTML/CSS/JS/JSON) para praticar verbos e tempos verbais em inglês, em português brasileiro. Feito para estudo livre e não comercial.

## Licença

PolyForm Noncommercial License 1.0.0. Veja `LICENSE.txt`.

## Estrutura

```
verb-lab/
├── index.html              entrada (CSP atualizada para scripts externos)
├── assets/
│   ├── styles.css          estilos
│   └── app.js              lógica do app (carrega os JSON)
├── data/
│   ├── curriculum.json     grupos e ordem das formas
│   ├── lessons/            uma lição por forma/construção (12 formas + 7 relacionadas)
│   ├── verbs.json          inventário de verbos (base, -s, -ing, passado, particípio)
│   ├── prep.json           combinações verbo + preposição
│   ├── pronunciation.json  guias de pronúncia
│   ├── br-tips.json        dicas para brasileiros + regra do "i" final (contextual)
│   ├── collocations.json   combinações úteis
│   ├── micro-keep.json     perguntas do modo misto Keep Your English
│   ├── stative.json        verbos de estado
│   └── alt-forms.json      formas alternativas aceitas
├── tests/
│   └── content-validation.js  testes de conteúdo e estrutura
├── manifest.webmanifest
├── sw.js                   service worker (cache versionado v40)
├── icon-192.png
├── icon-512.png
├── LICENSE.txt
└── README.md
```

## Currículo

As 12 formas centrais dos tempos verbais, organizadas em 4 grupos:

- **Presente:** Present Simple, Present Continuous, Present Perfect, Present Perfect Continuous
- **Passado:** Past Simple, Past Continuous, Past Perfect, Past Perfect Continuous
- **Futuro:** Future Simple (will), Future Continuous, Future Perfect, Future Perfect Continuous
- **Construções relacionadas:** be going to, presente com valor de futuro, modais, condicionais, voz passiva, verb patterns, phrasal verbs

Cada lição inclui: usos, formação (afirmativa/negativa/perguntas), concordância, ortografia, pronúncia, erros comuns de brasileiros, contrastes, exemplos com tradução, prática guiada e quiz de revisão.

## Como rodar localmente

O app carrega os dados via `fetch`, então precisa de um servidor estático (não funciona direto por `file://`).

```powershell
# a partir da pasta verb-lab
python -m http.server 8000
# ou
npx serve .
# depois abra http://localhost:8000
```

## Testes

```powershell
node tests/content-validation.js
```

Os testes validam: JSON bem formado, campos obrigatórios, IDs duplicados, opções com resposta presente e sem duplicatas, perguntas com exatamente um espaço `___`, resposta que não vaza na pergunta, `accept` coerente com a resposta canônica, referências a formas válidas, e o CSP contendo `script-src 'self'`.

## Publicar no GitHub Pages

1. Crie um repositório com este conteúdo na branch `main` (ou `gh-pages`).
2. Em **Settings → Pages**, escolha *Deploy from a branch* e a branch `main`, pasta `/ (root)`.
3. O site fica em `https://<usuário>.github.io/<repositório>/`. Como todos os caminhos são relativos, funciona no subpath.
4. O service worker usa caminhos relativos e cache versionado (`verb-lab-v40-v1`).

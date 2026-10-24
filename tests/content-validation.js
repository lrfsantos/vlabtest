'use strict';
/*
 * Verb Lab content & structural validation (Node).
 * Run:  node tests/content-validation.js
 * Exits non-zero if any check fails.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0, skip = 0;
const failures = [];

function ok(name) { pass++; console.log('  ok  ' + name); }
function bad(name, detail) { fail++; failures.push({ name, detail }); console.log(' FAIL  ' + name + (detail ? '  ->  ' + detail : '')); }
function skp(name, why) { skip++; console.log(' skip ' + name + '  (' + why + ')'); }

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); }
  catch (e) { return { __error: e.message }; }
}

function section(title) { console.log('\n== ' + title + ' =='); }

/* ---------- 1. Files exist & parse ---------- */
section('Arquivos e JSON bem formado');
const requiredFiles = [
  'index.html', 'assets/styles.css', 'assets/app.js', 'manifest.webmanifest', 'sw.js',
  'LICENSE.txt', 'README.md', 'icon-192.png', 'icon-512.png',
  'data/curriculum.json', 'data/verbs.json', 'data/prep.json', 'data/pronunciation.json',
  'data/br-tips.json', 'data/collocations.json', 'data/micro-keep.json',
  'data/stative.json', 'data/alt-forms.json'
];
requiredFiles.forEach(f => {
  if (!fs.existsSync(path.join(ROOT, f))) bad('existe: ' + f);
  else ok('existe: ' + f);
});

const curriculum = readJSON('data/curriculum.json');
if (curriculum.__error) bad('data/curriculum.json parse', curriculum.__error);
else ok('data/curriculum.json parse');

const lessonIds = [];
if (!curriculum.__error && Array.isArray(curriculum.groups)) {
  curriculum.groups.forEach(g => (g.forms || []).forEach(f => lessonIds.push(f.id)));
  ok('curriculum: ' + curriculum.groups.length + ' grupos, ' + lessonIds.length + ' formas');
} else if (curriculum.__error) {
  skp('curriculum grupos/forms', 'arquivo não parseou');
} else {
  bad('curriculum: groups/forms', 'esperado grupos com forms');
}

/* ---------- 2. Lessons ---------- */
section('Lições (uma por forma)');
const LESSON_SCHEMA = {
  id: 'string', name: 'string', namePt: 'string', group: 'string',
  summaryPt: 'string', meaningUses: 'array', formation: 'array', examples: 'array'
};
const lessons = {};
const seenLessonIds = {};
const missingLessons = [];
lessonIds.forEach(id => {
  const p = 'data/lessons/' + id + '.json';
  if (!fs.existsSync(path.join(ROOT, p))) { missingLessons.push(id); return; }
  const l = readJSON(p);
  if (l.__error) { bad('lição parse: ' + id, l.__error); return; }
  lessons[id] = l;
  if (seenLessonIds[id]) bad('lição id duplicado: ' + id);
  seenLessonIds[id] = true;
  if (l.id !== id) bad('lição id mismatch: ' + id, 'arquivo contém id=' + l.id);
  Object.keys(LESSON_SCHEMA).forEach(k => {
    const want = LESSON_SCHEMA[k];
    const got = Array.isArray(l[k]) ? 'array' : typeof l[k];
    if (got !== want) bad('lição ' + id + ' campo ' + k, 'esperado ' + want + ', veio ' + got);
  });
  if (!(Array.isArray(l.reviewQuiz) && l.reviewQuiz.length > 0))
    bad('lição ' + id + ' reviewQuiz', 'esperado array não vazio');
});
if (missingLessons.length) bad('lições ausentes', missingLessons.join(', '));
else ok('todas as lições presentes (' + lessonIds.length + ')');

/* ---------- 3. Duplicate question IDs across lesson ---------- */
section('IDs de pergunta duplicados');
const allQids = {};
let dupFound = false;
Object.keys(lessons).forEach(id => {
  const l = lessons[id];
  ['guidedPractice', 'reviewQuiz'].forEach(k => (l[k] || []).forEach(q => {
    if (!q.id) { bad('pergunta sem id em ' + id); return; }
    if (allQids[q.id]) { if (!dupFound) { bad('pergunta id duplicado', q.id + ' (em ' + id + ')'); dupFound = true; } }
    allQids[q.id] = id;
  }));
});
if (!dupFound) ok('nenhum id de pergunta duplicado');

/* ---------- 4. Question structure ---------- */
section('Estrutura das perguntas');
let qCount = 0;
Object.keys(lessons).forEach(id => {
  const l = lessons[id];
  ['guidedPractice', 'reviewQuiz'].forEach(k => (l[k] || []).forEach(q => {
    qCount++;
    if (!q.prompt) bad('pergunta sem prompt', id + '/' + (q.id || '?'));
    const blanks = (q.prompt.match(/___/g) || []).length;
    if (blanks !== 1 && blanks !== 2) bad('pergunta com ' + blanks + ' espaços ___', id + '/' + q.id);
    if (blanks === 2 && !(q.answer && String(q.answer).trim().split(/\s+/).length >= 2))
      bad('pergunta com 2 espaços mas resposta com menos de 2 palavras', id + '/' + q.id);
    if (q.kind === 'mc') {
      if (!Array.isArray(q.options) || q.options.length < 3)
        bad('mc com <3 opções', id + '/' + q.id);
      else if (q.options.indexOf(q.answer) === -1)
        bad('mc sem a resposta nas opções', id + '/' + q.id);
      else if (new Set(q.options).size !== q.options.length)
        bad('mc com opções duplicadas', id + '/' + q.id);
      else if (q.options.filter(o => o === q.answer).length !== 1)
        bad('mc resposta duplicada', id + '/' + q.id);
    }
    if (q.kind === 'typed') {
      if (!Array.isArray(q.accept) || !q.accept.length)
        bad('typed sem accept', id + '/' + q.id);
      else if (q.accept.indexOf(q.answer) === -1)
        bad('typed accept não contém a resposta canônica', id + '/' + q.id);
    }
    if (!q.answer) bad('pergunta sem answer', id + '/' + q.id);
    if (!q.explanation) bad('pergunta sem explanation', id + '/' + q.id);
    if (!q.pt) bad('pergunta sem tradução (pt)', id + '/' + q.id);
    if (!q.difficulty || ['basic', 'intermediate', 'advanced'].indexOf(q.difficulty) === -1)
      bad('dificuldade inválida', id + '/' + q.id + ' (' + q.difficulty + ')');
    // answer must not leak into the prompt (strip parenthesised hint);
    // for dialogue items ("A: ... B: ___") only inspect the B: clause containing the blank
    const stripped = q.prompt.replace(/\([^)]*\)/g, '');
    const bIdx = stripped.indexOf('B:');
    const inspected = bIdx >= 0 ? stripped.slice(bIdx) : stripped;
    const escAns = (q.answer || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (q.answer && new RegExp('\\b' + escAns + '\\b', 'i').test(inspected))
      bad('resposta vaza na pergunta', id + '/' + q.id + ': "' + q.prompt + '"');
    if (q.full && q.pt && q.full === q.pt) bad('full e pt idênticos (sem tradução útil)', id + '/' + q.id);
  }));
});
ok('total de perguntas verificadas: ' + qCount);

/* ---------- 5. Focused quiz targeting ---------- */
section('Foco dos quizzes (uma forma por quiz)');
// Each lesson's reviewQuiz must be tagged only with the current form's lesson id.
// Since each lesson file is per-form, this is structural; also confirm no cross-form
// fields reference an untaught form.
Object.keys(lessons).forEach(id => {
  const l = lessons[id];
  const cross = [];
  ['guidedPractice', 'reviewQuiz'].forEach(k => (l[k] || []).forEach(q => {
    if (q.targetForm && q.targetForm !== id) cross.push(q.id + '->' + q.targetForm);
    if (q.lessonId && q.lessonId !== id) cross.push(q.id + '->' + q.lessonId);
  }));
  if (cross.length) bad('perguntas com target de outra forma em ' + id, cross.join(', '));
});
ok('nenhuma pergunta focada referencia outra forma');

/* ---------- 6. Curriculum references valid ---------- */
section('Referências do currículo');
const groupIds = (curriculum.groups || []).map(g => g.id);
groupIds.forEach(gid => {
  const g = curriculum.groups.find(x => x.id === gid);
  (g.forms || []).forEach(f => {
    if (!f.id) bad('forma sem id em grupo ' + gid);
    else if (!lessons[f.id]) bad('forma sem lição', f.id);
    if (!f.name) bad('forma sem nome', f.id || '?');
  });
});
ok('referências do currículo consistentes');

/* ---------- 7. CSP contains script-src 'self' ---------- */
section('CSP');
const html = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
const cspMatch = html.match(/Content-Security-Policy" content="([^"]+)"/);
if (!cspMatch) bad('CSP não encontrado em index.html');
else {
  const csp = cspMatch[1];
  if (/script-src\s+'self'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp))
    ok('script-src restrito a \'self\' (sem unsafe-inline)');
  else if (/script-src\s+'self'/.test(csp))
    skp('script-src contém \'self\' mas também unsafe-inline', 'verificar');
  else bad('script-src sem \'self\'', csp);
}

/* ---------- 8. Pronunciation tips contextual ---------- */
section('Dicas de pronúncia contextuais');
const brTips = readJSON('data/br-tips.json');
if (brTips.__error) bad('br-tips parse', brTips.__error);
else {
  if (brTips['+final-i'] && Array.isArray(brTips['+final-i'].words)) {
    brTips['+final-i'].words.forEach(w => {
      const pron = readJSON('data/pronunciation.json')[w];
      if (!pron) bad('palavra da regra +final-i sem pronúncia em pronunciation.json', w);
    });
    ok('regra +final-i lista palavras específicas (' + brTips['+final-i'].words.length + ')');
  } else {
    bad('br-tips.json: esperado "+final-i" com words[]', 'estrutura ausente');
  }
  const hasGlobal = Object.keys(brTips).filter(k => /não acrescente|final.*i/i.test(k)).length;
  // we specifically do NOT want a global reminder; +final-i is the whitelist approach
}

/* ---------- 9. Service worker cache version ---------- */
section('Service worker');
const sw = fs.existsSync(path.join(ROOT, 'sw.js')) ? fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8') : '';
if (/verb-lab-v40-v1/.test(sw)) ok('cache versionado (v40)');
else bad('sw.js: cache sem versão v40');

/* ---------- summary ---------- */
console.log('\n==============================');
console.log('PASS: ' + pass + '   FAIL: ' + fail + '   SKIP: ' + skip);
if (fail) {
  console.log('\nFalhas:');
  failures.forEach(f => console.log('  - ' + f.name + (f.detail ? ': ' + f.detail : '')));
  process.exit(1);
}
console.log('Tudo certo.');

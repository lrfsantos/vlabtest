'use strict';
/* Verb Lab v40 - curriculum-driven static app. All actions via data-action delegation. */
var VL = {};
window.VL = VL;

/* ---------- tiny utils ---------- */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function dayStr(off){var d=new Date();d.setDate(d.getDate()+(off||0));return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function simpleHash(s){var h=0;for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))%1000000007;}return h;}
function simpleShuffle(arr,seed){var a=arr.slice();var t=(seed>>>0)+0x6D2B79F5;function r(){t+=0x6D2B79F5;var x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;}for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}return a;}
function $(id){return document.getElementById(id);}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show');},2600);}
function storageGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function storageSet(k,v){try{localStorage.setItem(k,String(v));}catch(e){}}
function storageRemove(k){try{localStorage.removeItem(k);}catch(e){}}

/* ---------- storage migration: v36 -> v40 (safe, one-time) ---------- */
var STORE_PREFIX='verb-lab-v40-';
(function(){
  try{
    var oldPrefix='verb-lab-v36-';
    var keys=['tabs','tab','level','keep','guide','ts','theme','spacing','no-confetti','seen','wrong','xp','streak','last','done','prev','prev-prep'];
    keys.forEach(function(k){
      var oldV=localStorage.getItem(oldPrefix+k);
      var newV=localStorage.getItem(STORE_PREFIX+k);
      if(oldV!==null && newV===null){ localStorage.setItem(STORE_PREFIX+k, oldV); }
    });
  }catch(e){}
})();

var storageOK=(function(){try{localStorage.setItem('vl-test','1');localStorage.removeItem('vl-test');return true;}catch(e){return false;}})();

/* ---------- data ---------- */
var DATA={curriculum:null,verbs:[],prep:[],pron:{},brTips:{},colloc:{},micro:[],stative:[],lessons:{}};

function loadJSON(path){
  return fetch(path,{cache:'no-cache'}).then(function(r){
    if(!r.ok) throw new Error('HTTP '+r.status+' for '+path);
    return r.json();
  });
}

function loadLesson(id){
  return loadJSON('data/lessons/'+id+'.json').then(function(lesson){
    DATA.lessons[lesson.id]=lesson;
    return lesson;
  });
}

/* ---------- state ---------- */
var LEARNER_LEVEL='basic';
try{LEARNER_LEVEL=storageGet(STORE_PREFIX+'level')||'basic';}catch(e){}
function levelLabel(){return LEARNER_LEVEL==='basic'?'Começando':LEARNER_LEVEL==='intermediate'?'Construindo':'Avançado';}

var activeGroup='present', activeForm=null;
var seen={}, wrong={}, xp=0, streak=0, lastDate='';
var today=dayStr(0), yesterday=dayStr(-1);
try{seen=JSON.parse(storageGet(STORE_PREFIX+'seen')||'{}')||{};}catch(e){seen={};}
try{wrong=JSON.parse(storageGet(STORE_PREFIX+'wrong')||'{}')||{};}catch(e){wrong={};}
try{xp=parseInt(storageGet(STORE_PREFIX+'xp')||'0',10)||0;}catch(e){xp=0;}
try{streak=parseInt(storageGet(STORE_PREFIX+'streak')||'0',10)||0;}catch(e){streak=0;}
try{lastDate=storageGet(STORE_PREFIX+'last')||'';}catch(e){lastDate='';}
if(lastDate && lastDate!==today && lastDate!==yesterday){ streak=0; }
var doneScores={};
try{var dd=JSON.parse(storageGet(STORE_PREFIX+'done')||'null'); if(dd&&dd.date===today&&dd.scores) doneScores=dd.scores;}catch(e){}
function save(){
  try{
    localStorage.setItem(STORE_PREFIX+'seen',JSON.stringify(seen));
    localStorage.setItem(STORE_PREFIX+'wrong',JSON.stringify(wrong));
    localStorage.setItem(STORE_PREFIX+'xp',String(xp));
    localStorage.setItem(STORE_PREFIX+'streak',String(streak));
    localStorage.setItem(STORE_PREFIX+'last',String(lastDate||''));
    localStorage.setItem(STORE_PREFIX+'done',JSON.stringify({date:today,scores:doneScores}));
  }catch(e){}
}
function seenKey(form){return today+'_'+form+'_seen';}
function isLessonSeen(form){return !!seen[seenKey(form)];}
function markLessonSeen(form){if(!seen[seenKey(form)]){seen[seenKey(form)]=true;save();updateProgress();}}

/* ---------- speech ---------- */
var speechVoice=null, localEnVoices=[];
function initVoices(){
  try{
    var voices=window.speechSynthesis?window.speechSynthesis.getVoices():[];
    if(voices.length){
      localEnVoices=voices.filter(function(v){return v.localService&&v.lang&&v.lang.toLowerCase().startsWith('en');});
      speechVoice=voices.find(function(v){return v.lang&&v.lang.toLowerCase().replace('_','-')==='en-us'&&v.localService;})
        ||voices.find(function(v){return v.lang&&v.lang.toLowerCase().replace('_','-')==='en-us';})
        ||localEnVoices[0]||voices.find(function(v){return v.lang&&v.lang.toLowerCase().startsWith('en');})||null;
    }
  }catch(e){}
}
if('speechSynthesis' in window){initVoices();window.speechSynthesis.onvoiceschanged=initVoices;}
function speak(text,btn,rate){
  try{
    if(!('speechSynthesis' in window)){toast('Áudio não suportado neste navegador');return;}
    var synth=window.speechSynthesis;
    if(synth.paused) synth.resume();
    synth.cancel();
    if(btn){btn.classList.add('playing');if(rate<0.9)toast('Devagar — preste atenção: '+text);}
    setTimeout(function(){
      try{
        var u=new SpeechSynthesisUtterance(text);
        u.lang='en-US';
        var r=(typeof rate==='number'&&!isNaN(rate))?rate:1.0;
        u.rate=r;u.volume=1;u.pitch=1;
        if(r<0.9){if(localEnVoices&&localEnVoices.length)u.voice=localEnVoices[0];else if(speechVoice&&speechVoice.localService)u.voice=speechVoice;}
        else{if(speechVoice)u.voice=speechVoice;}
        if(btn){u.onend=function(){btn.classList.remove('playing');};u.onerror=function(ev){btn.classList.remove('playing');if(ev&&(ev.error==='interrupted'||ev.error==='canceled'))return;toast('Não consegui tocar o áudio.');};}
        synth.speak(u);
      }catch(e2){if(btn)btn.classList.remove('playing');}
    },90);
  }catch(e){if(btn)btn.classList.remove('playing');toast('Erro no áudio');}
}
function speakerBtn(text,label){
  var ico='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>';
  return '<button type="button" class="speaker" data-say="'+esc(text)+'" data-rate="1.0" aria-label="Ouvir">'+ico+'<span>'+(label||'Ouvir')+'</span></button>';
}

/* ---------- pronunciation (data-driven, contextual) ---------- */
function pronFor(word){
  if(!word) return '';
  return DATA.pron[word]||DATA.pron[String(word).toLowerCase()]||'';
}
function pronLine(word){var p=pronFor(word);return p?'<span class="pron" lang="pt-BR">'+esc(p)+'</span>':'';}
/* The anti-"i" reminder only for specific words whose final consonant invites an
   extra Brazilian "i" (e.g. want). Config lives in data/br-tips.json under "+final-i". */
function noExtraIHint(word,force){
  var p=pronFor(word); if(!p) return '';
  var cfg=DATA.brTips&&DATA.brTips['+final-i'];
  if(!cfg||!cfg.words) return '';
  if(!force && cfg.words.indexOf(word)===-1) return '';
  if(!force && /[aeiouáéíóúâêôãõ]$/.test(p)) return '';
  return '<div class="pron-tip"><b>Não acrescente um “i” no final.</b> '+esc(word)+' → '+esc(p)+', não “'+esc(p)+'i”.</div>';
}
function pronCue(word){return pronLine(word)+noExtraIHint(word);}

/* ---------- rendering ---------- */
function renderHeader(){
  $('title').textContent='Verb Lab';
  $('sub').textContent='Currículo de tempos verbais • '+levelLabel().toLowerCase();
  var xpP=$('xpPill'); if(xpP) xpP.textContent=xp+' XP';
  var lp=$('levelPill'); if(lp) lp.textContent=levelLabel();
  var sp=$('streakPill');
  if(sp){ if(streak>0){sp.classList.add('show'); var sn=$('streakNum'); if(sn) sn.textContent=streak;} else {sp.classList.remove('show');} }
}

function renderTabs(){
  var el=$('tabs'),h='';
  (DATA.curriculum.groups||[]).forEach(function(g){
    h+='<button class="tab '+(g.id===activeGroup?'active':'')+'" data-action="group" data-arg="'+esc(g.id)+'"'+(g.id===activeGroup?' aria-current="true"':'')+'>'+esc(g.name)+'</button>';
  });
  el.innerHTML=h;
}

function formsOf(group){var g=(DATA.curriculum.groups||[]).find(function(x){return x.id===group;});return g?g.forms||[]:[];}

function renderContent(){
  var forms=formsOf(activeGroup);
  if(activeForm && !forms.some(function(f){return f.id===activeForm;})) activeForm=null;
  if(!activeForm && forms.length) activeForm=forms[0].id;
  if(activeGroup==='related'){ renderRelatedModules(forms); return; }
  renderFormList(forms);
}

function renderFormList(forms){
  var content=$('content');
  if(!forms.length){content.innerHTML='<p style="color:var(--muted)">Nenhuma forma neste grupo.</p>';return;}
  var h='<div class="tabs form-tabs">';
  forms.forEach(function(f){
    h+='<button class="form-tab '+(f.id===activeForm?'active':'')+'" data-action="form" data-arg="'+esc(f.id)+'"'+(f.id===activeForm?' aria-current="true"':'')+'>'+esc(f.name)+'</button>';
  });
  h+='</div><div id="lesson"></div>';
  content.innerHTML=h;
  renderLesson(DATA.lessons[activeForm]);
}

function renderRelatedModules(forms){
  var content=$('content');
  var h='<div class="module-list">';
  forms.forEach(function(f){
    var lesson=DATA.lessons[f.id];
    if(!lesson) return;
    h+='<div class="module"><span class="m-group">construção relacionada</span><h2>'+esc(lesson.name)+'</h2>'
      +'<p class="m-sum">'+esc(lesson.summaryPt||'')+'</p>'
      +'<div class="m-actions"><button class="btn-primary" data-action="form" data-arg="'+esc(f.id)+'">Lição</button>'
      +'<button class="btn-primary" data-action="quiz" data-arg="'+esc(f.id)+'" data-arg2="review">Praticar</button></div></div>';
  });
  h+='</div>';
  content.innerHTML=h;
}

function lessonSeenNote(form){
  if(isLessonSeen(form)) return '<span class="quiz-target" style="float:right">✓ visto</span>';
  return '';
}

function renderLesson(lesson){
  if(!lesson) return;
  var el=$('lesson'); if(!el) return;
  var h='<div class="lesson">';
  h+='<span class="lesson-label">'+esc(lesson.namePt)+'</span> '+lessonSeenNote(lesson.id);
  h+='<p class="m-sum">'+esc(lesson.summaryPt||'')+'</p>';

  h+='<div class="ls-head">Usos e significados<span class="en">Meaning and uses</span></div>';
  (lesson.meaningUses||[]).forEach(function(u){
    h+='<div class="ls-row"><b>'+esc(u.pt)+'</b><div class="ls-ex"><div class="en" lang="en">'+esc(u.en)+'</div><div class="pt">'+esc(u.enPt||'')+'</div></div></div>';
  });

  h+='<div class="ls-head">Formação<span class="en">Formation</span></div>';
  (lesson.formation||[]).forEach(function(s){
    h+='<div class="ls-row"><b>'+esc(s.section)+'</b><div style="color:var(--muted)">'+esc(s.pt||'')+'</div>';
    if(s.pattern)h+='<div class="ls-pattern">'+esc(s.pattern)+'</div>';
    (s.examples||[]).forEach(function(ex){h+='<div class="ls-ex"><div class="en" lang="en">'+esc(ex.en)+'</div><div class="pt">'+esc(ex.pt||'')+'</div></div>';});
    h+='</div>';
  });

  if(lesson.subjectAgreement&&lesson.subjectAgreement.length){
    h+='<div class="ls-head">Concordância<span class="en">Subject agreement</span></div>';
    (lesson.subjectAgreement||[]).forEach(function(s){h+='<div class="ls-row"><b>'+esc(s.pt)+'</b><div class="ls-ex"><div class="en" lang="en">'+esc(s.example||'')+'</div></div></div>';});
  }
  if(lesson.spelling&&lesson.spelling.length){
    h+='<div class="ls-head">Ortografia<span class="en">Spelling</span></div>';
    (lesson.spelling||[]).forEach(function(s){h+='<div class="ls-row"><b>'+esc(s.pt)+'</b><div class="ls-ex"><div class="en" lang="en">'+esc(s.example||'')+'</div></div></div>';});
  }
  if(lesson.pronunciation&&lesson.pronunciation.length){
    h+='<div class="ls-head">Pronúncia<span class="en">Pronunciation</span></div>';
    (lesson.pronunciation||[]).forEach(function(s){h+='<div class="ls-row"><b>'+esc(s.pt)+'</b><div class="ls-ex"><div class="en" lang="en">'+esc(s.example||'')+'</div></div></div>';});
  }
  if(lesson.commonErrors&&lesson.commonErrors.length){
    h+='<div class="ls-head">Erros comuns de quem fala português<span class="en">Common learner errors</span></div>';
    (lesson.commonErrors||[]).forEach(function(s){
      h+='<div class="ls-row"><b>'+esc(s.pt||'')+'</b>'
        +'<div class="ls-ex"><div class="en"><span class="ls-wrong">'+esc(s.wrong||'')+'</span> → <span class="ls-right">'+esc(s.right||'')+'</span></div></div></div>';
    });
  }
  if(lesson.contrast&&lesson.contrast.length){
    h+='<div class="ls-head">Compare<span class="en">Contrast</span></div>';
    (lesson.contrast||[]).forEach(function(s){
      h+='<div class="ls-row"><b>'+esc(s.pt||'')+'</b><div class="ls-ex"><div class="en" lang="en">'+esc(s.en||'')+'</div><div class="pt">'+esc(s.enPt||'')+'</div></div></div>';
    });
  }
  h+='<div class="ls-head">Exemplos<span class="en">Examples</span></div>';
  (lesson.examples||[]).forEach(function(ex){
    h+='<div class="ls-row"><div class="ls-ex"><div class="en" lang="en">'+esc(ex.en)+'</div><div class="pt">'+esc(ex.pt||'')+'</div></div></div>';
  });

  if(lesson.guidedPractice&&lesson.guidedPractice.length){
    h+='<div class="ls-head">Prática guiada<span class="en">Guided practice</span></div>';
    (lesson.guidedPractice||[]).forEach(function(q,i){
      var ans=q.answer||(q.options&&q.options[0])||'';
      h+='<div class="ls-row"><b>'+esc(lesson.namePt)+'</b><div class="focused-prompt" lang="en">'+esc(q.prompt)+'</div>'
        +'<div class="pt">'+esc(q.pt||'')+'</div>'
        +'<div style="margin-top:6px"><button class="chip" data-action="reveal" data-arg="'+esc(lesson.id+'-g'+i)+'">Ver resposta</button>'
        +' <span class="reveal-answer" id="reveal-'+esc(lesson.id+'-g'+i)+'" hidden><b>'+esc(ans)+'</b> — '+esc(q.explanation||'')+'</span></div></div>';
    });
  }
  h+='</div>';
  el.innerHTML=h;
  markLessonSeen(lesson.id);
}

/* ---------- quiz engine (strict targeting) ---------- */
var quiz=[],qIdx=0,qScore=0,xpEarned=0,quizMode=null,quizFormId=null,reviewMode=false,justFinished=false,curOpts=[];
var QN=6;

function difficultySet(){
  if(LEARNER_LEVEL==='basic') return ['basic'];
  if(LEARNER_LEVEL==='intermediate') return ['basic','intermediate'];
  return ['basic','intermediate','advanced'];
}

/* A focused quiz only uses questions whose lesson id matches the selected form. */
function questionsFor(formId,scope){
  var lesson=DATA.lessons[formId];
  if(!lesson) return [];
  var pool=scope==='guided'?(lesson.guidedPractice||[]):(lesson.reviewQuiz||[]);
  var diffSet=difficultySet();
  return pool.filter(function(q){return diffSet.indexOf(q.difficulty)!==-1;});
}

/* "Keep Your English": explicitly a MIXED maintenance mode, clearly labeled. */
function keepQuestions(n){
  var diffSet=difficultySet();
  var pool=[];
  (DATA.curriculum.groups||[]).forEach(function(g){
    (g.forms||[]).forEach(function(f){
      var l=DATA.lessons[f.id];
      if(!l) return;
      (l.reviewQuiz||[]).forEach(function(q){if(diffSet.indexOf(q.difficulty)!==-1) pool.push({q:q,form:f});});
    });
  });
  DATA.micro.forEach(function(m){pool.push({q:toMicroQ(m),form:{id:'keep',name:'Keep'}});});
  var sh=simpleShuffle(pool,Math.floor(Math.random()*4294967296));
  return sh.slice(0,Math.min(n,pool.length)).map(function(x){return buildQFromItem(x.q,x.form,true);});
}

function toMicroQ(m){
  return {id:'micro-'+simpleHash(m.prompt),kind:'mc',difficulty:m.level==='advanced'?'advanced':'intermediate',
    prompt:m.prompt,options:[m.ans].concat((m.bad||[]).slice(0,3)),answer:m.ans,full:m.full,pt:m.pt,explanation:m.note};
}

function buildQFromItem(q,form,mixed){
  var out={id:q.id||(form.id+'-'+simpleHash(q.prompt)),form:form,mixed:!!mixed,
    kind:q.kind||'mc',prompt:q.prompt,answer:q.answer,options:(q.options||[]).slice(),
    accept:q.accept||[q.answer],full:q.full||q.answer,pt:q.pt||'',explanation:q.explanation||'',difficulty:q.difficulty||'basic'};
  if(out.kind==='mc'&&out.options.indexOf(out.answer)===-1) out.options.unshift(out.answer);
  return out;
}

function makeQuiz(formId,scope,mixed){
  if(mixed){quiz=keepQuestions(6);QN=quiz.length;return quiz;}
  var src=questionsFor(formId,scope);
  var target=scope==='guided'?Math.min(4,src.length):Math.min(6,Math.max(2,src.length));
  var sh=simpleShuffle(src,Math.floor(Math.random()*4294967296));
  quiz=sh.slice(0,target).map(function(q){return buildQFromItem(q,{id:formId,name:formId});});
  QN=quiz.length;
  return quiz;
}

function openQuiz(formId,scope){
  quizFormId=formId;quizMode=scope||'review';
  reviewMode=!!doneScores[formId];
  makeQuiz(formId,scope,false);
  qIdx=0;qScore=0;xpEarned=0;
  $('quiz').classList.add('open');
  showQ();
}
function openKeep(){
  quizFormId='keep';quizMode='keep';reviewMode=false;
  makeQuiz(null,null,true);
  qIdx=0;qScore=0;xpEarned=0;
  $('quiz').classList.add('open');
  showQ();
}

function lessonNamePt(id){var l=DATA.lessons[id];return l?l.namePt:(id==='keep'?'Keep Your English':id);}

function showQ(){
  var q=quiz[qIdx];
  $('qbar').style.width=((qIdx)/quiz.length*100)+'%';
  $('qcount').textContent=(qIdx+1)+' / '+quiz.length;
  var targetTag=q.mixed
    ?'<span class="keep-target">Misto • Keep Your English</span>'
    :'<span class="quiz-target">'+esc(lessonNamePt(q.form.id))+'</span>';
  if(q.kind==='typed'){
    $('quizBody').innerHTML=targetTag+'<div class="q-prompt"><span>'+esc(q.prompt)+'</span></div>'
      +'<div class="typed-wrap"><input id="typedAnswer" class="typed-input" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="24" aria-label="Sua resposta" placeholder="Digite sua resposta"><button class="btn-primary" data-action="submitTyped" style="margin-top:12px;height:52px">Verificar</button></div>';
    var input=$('typedAnswer');
    input.addEventListener('keydown',function(e){if(e.key==='Enter')submitTyped();});
    setTimeout(function(){input.focus();},0);
    return;
  }
  var opts=simpleShuffle(q.options,Math.floor(Math.random()*4294967296)).slice(0,4);
  curOpts=opts;
  var html=targetTag+'<div class="q-prompt"><span>'+esc(q.prompt)+'</span></div><div class="q-opts" style="margin-top:14px">';
  for(var i=0;i<opts.length;i++){html+='<button class="q-opt" data-action="answer" data-arg="'+i+'"><span>'+esc(opts[i])+'</span><span>→</span></button>';}
  $('quizBody').innerHTML=html+'</div>';
}
function normalizeAnswer(s){return String(s||'').trim().replace(/\s+/g,' ').toLowerCase().replace(/[.,!?;:']/g,'');}
function submitTyped(){
  var input=$('typedAnswer'); if(!input) return;
  var value=input.value.trim(); if(!value) return;
  var q=quiz[qIdx];
  var correct=q.accept.some(function(a){return normalizeAnswer(a)===normalizeAnswer(value);});
  handleAnswer(q,correct,value);
}
function answerAt(i){
  var q=quiz[qIdx],opt=curOpts[i];
  handleAnswer(q,opt===q.answer,opt);
}
function handleAnswer(q,correct,attempted){
  if(correct){
    qScore++;
    if(!reviewMode) xpEarned+=(q.tries===0?10:5);
    if(wrong[q.id]){ wrong[q.id]--; if(wrong[q.id]<=0) delete wrong[q.id]; }
  }else{
    q.tries=(q.tries||0)+1;
    wrong[q.id]=(wrong[q.id]||0)+1;
    if(q.tries<2){
      if(q.kind==='typed'){
        $('quizBody').innerHTML='<div style="margin-top:12px;background:var(--yellow-bg);border:1px solid var(--yellow-line);border-radius:12px;padding:10px 12px;font-size:.9rem;font-weight:800" role="alert">Quase — tenta de novo</div>'
          +'<div class="typed-wrap"><input id="typedAnswer" class="typed-input" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="24" aria-label="Sua resposta" placeholder="Digite sua resposta" inputmode="text"><button class="btn-primary" data-action="submitTyped" style="margin-top:12px;height:52px">Verificar</button></div>';
        var ri=$('typedAnswer');ri.addEventListener('keydown',function(e){if(e.key==='Enter')submitTyped();});setTimeout(function(){ri.focus();},0);
      }else{
        var remaining=curOpts.filter(function(o){return o!==attempted;});
        curOpts=remaining;
        var html='<div style="margin-top:12px;background:var(--yellow-bg);border:1px solid var(--yellow-line);border-radius:12px;padding:10px 12px;font-size:.9rem;font-weight:800" role="alert">Quase — tenta outra</div><div class="q-opts" style="margin-top:14px">';
        for(var i=0;i<remaining.length;i++){html+='<button class="q-opt" data-action="answer" data-arg="'+i+'"><span>'+esc(remaining[i])+'</span><span>→</span></button>';}
        $('quizBody').innerHTML=html+'</div>';
      }
      save(); return;
    }
  }
  save();
  var gain=(q.tries===0?10:5);
  var html='<div style="font-weight:900;font-size:1.375rem">'+(correct?'✓ Boa!':'✕ Quase.')+'</div>';
  if(correct&&!reviewMode)html+='<div class="xp-badge" style="margin-top:8px">+'+gain+' XP</div>';
  else if(!correct)html+='<div style="margin-top:6px;color:var(--muted);font-size:.9rem;font-weight:700">A resposta era <b>'+esc(q.answer)+'</b>.</div>';
  html+='<div class="feedback" style="margin-top:12px"><div style="display:flex;align-items:flex-start;gap:12px"><div style="font-weight:900;font-size:1.0625rem;flex:1;min-width:0;overflow-wrap:anywhere">'+esc(q.full)+'</div><div style="display:flex;gap:8px;flex:none">'+speakerBtn(q.full,'')+'</div></div>'
    +'<div style="margin-top:8px;color:var(--muted);font-size:.9rem;font-weight:700">'+esc(q.pt||'')+'</div>'
    +'<div style="margin-top:8px">'+esc(q.explanation||'')+'</div>'
    +noExtraIHint(q.answer,false)
    +'</div>'
    +'<button class="btn-primary" data-action="nextQ" style="margin-top:16px;height:52px">Continuar</button>';
  $('quizBody').innerHTML=html;
}
function nextQ(){
  qIdx++;
  if(qIdx<quiz.length){showQ();return;}
  $('qbar').style.width='100%';
  var scoreText=qScore+' / '+quiz.length;
  if(!reviewMode){
    xp+=xpEarned;
    if(lastDate!==today){streak=(lastDate===yesterday)?streak+1:1;lastDate=today;}
    if(quizFormId&&quizFormId!=='keep')doneScores[quizFormId]=scoreText;
  }
  save();
  var badge=reviewMode?'revisão • sem XP':'+'+xpEarned+' XP';
  $('quizBody').innerHTML='<div style="text-align:center;padding:10px"><div class="done-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l3 3 5-6"/></svg></div><div style="font-size:1.625rem;font-weight:900;margin-top:8px" aria-live="polite">'+scoreText+'</div><div style="margin-top:6px" class="xp-badge">'+badge+'</div><button class="btn-primary" data-action="finishQuiz" style="margin-top:18px">Fechar</button></div>';
}
function finishQuiz(){ closeQuiz(); justFinished=true; showDone(); renderHeader(); renderTabs(); renderContent(); updateProgress(); }
function quitQuiz(){ if(qIdx>=quiz.length){ finishQuiz(); return; } if(confirm('Sair agora? Você perde o XP desta rodada.')) closeQuiz(); }
function closeQuiz(){ $('quiz').classList.remove('open'); updateMissedBtn(); }
function showDone(){
  $('doneScore').textContent=qScore+' / '+quiz.length;
  $('doneXP').textContent=(quizFormId==='keep'?'Keep Your English':lessonNamePt(quizFormId))+' • '+(reviewMode?'revisão • sem XP':'+'+xpEarned+' XP')+' • Total: '+xp+' XP';
  $('doneStreak').textContent=streak;
  $('doneLevel').textContent='Lv '+(Math.floor(xp/100)+1);
  var xpInLevel=xp%100;
  var bar=$('doneBar'); if(bar) bar.style.width=xpInLevel+'%';
  var lvlText=$('doneLevelText'); if(lvlText) lvlText.textContent=xpInLevel+' / 100 XP → Lv '+(Math.floor(xp/100)+2);
  $('doneText').textContent=summaryText();
  $('doneScreen').classList.add('show');
  launchConfetti();
}
function summaryText(){
  var names=quiz.map(function(q){return lessonNamePt(q.form.id);}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' • ');
  return (quizMode==='keep'?'Misto de revisão • ':'')+names+' • '+quiz.length+' perguntas';
}
window.VL.closeDone=function(){ $('doneScreen').classList.remove('show'); justFinished=false; };

/* ---------- explore verbs ---------- */
var currentCat='Todos';
function openExplore(){ $('explore').classList.add('open'); renderExplore(); }
function closeExplore(){ $('explore').classList.remove('open'); }
function renderExplore(){
  var cats=['Todos','Irregulares','Rotina','Casa','Trabalho','Pessoas','Movimento'];
  var html='';
  for(var i=0;i<cats.length;i++){ html+='<button class="chip '+(currentCat===cats[i]?'active':'')+'" data-action="setCat" data-arg="'+esc(cats[i])+'">'+cats[i]+'</button>'; }
  $('chips').innerHTML=html;
  filterExplore();
}
function setCat(c){ currentCat=c; renderExplore(); }
function filterExplore(){
  var q=($('searchInput').value||'').toLowerCase().trim();
  var list=DATA.verbs.filter(function(v){
    if(currentCat==='Irregulares'){ if(!v.irr) return false; }
    else if(currentCat!=='Todos' && v.cat!==currentCat) return false;
    if(!q) return true;
    return (v.base||'').toLowerCase().indexOf(q)>-1 || (v.pt||'').toLowerCase().indexOf(q)>-1
      || (v.exEn||'').toLowerCase().indexOf(q)>-1 || (v.past||'').toLowerCase().indexOf(q)>-1
      || (v.part||'').toLowerCase().indexOf(q)>-1;
  });
  var html='';
  list.forEach(function(v){
    html+='<button type="button" class="explore-item" data-action="verb" data-arg="'+esc(v.id)+'"><div><b>'+esc(v.base)+'</b> <small>— '+esc(v.pt)+'</small><div style="font-size:.9rem;color:#6B7280;font-weight:600;margin-top:2px">'+esc(v.base)+' • '+esc(v.pastFull)+' • '+esc(v.part)+'</div></div><div style="font-size:.9rem">→</div></button>';
  });
  $('exploreList').innerHTML=html || '<div style="padding:20px;text-align:center;color:var(--muted);font-size:.9rem">Nenhum verbo encontrado</div>';
}
function verbBadge(v){
  return '<span class="badge '+(v.irr?'irr':'')+'">'+(v.irr?'irregular':'regular +ed')+'</span>';
}
function openVerb(id){
  var v=DATA.verbs.find(function(x){return x.id===id;});
  if(!v) return;
  closeExplore();
  var old=$('exploreCard'); if(old) old.remove();
  var forms='';
  [[ 'base','I '+v.base],[ 'he / she / it','She '+v.third],[ 'gerúndio (-ing)',v.ing],[ 'passado simples',v.pastFull],[ 'particípio passado',v.part]].forEach(function(f){
    forms+='<div class="box"><b>'+f[0]+'</b><span>'+esc(f[1])+'</span>'+pronLine(f[1].split(' ').pop())+'</div>';
  });
  var cardHtml='<div class="card" id="exploreCard" style="border-color:var(--ink);box-shadow:var(--shadow)">'
    +'<div class="card-top"><div>'+verbBadge(v)+'</div><button class="icon-btn" style="width:44px;height:44px" data-action="closeCard" aria-label="fechar">✕</button></div>'
    +'<div class="big-wrap"><div><div class="big" lang="en">'+esc(v.base)+'</div>'+pronCue(v.base)+'</div>'+speakerBtn(v.exEn)+'</div><div class="pt">'+esc(v.pt)+'</div>'
    +'<div class="ex"><div class="en" lang="en">'+esc(v.exEn)+'</div><div class="pt-br">'+esc(v.exPt)+'</div></div>'
    +'<div style="margin-top:12px">'+forms+'</div></div>';
  $('content').insertAdjacentHTML('afterbegin', cardHtml);
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- chart (irregulars) ---------- */
function openChart(){
  var irr=DATA.verbs.filter(function(v){return v.irr;}).sort(function(a,b){return a.base<b.base?-1:1;});
  var rows=irr.map(function(v){
    function c(w){return '<td><b>'+esc(w)+'</b><small>'+esc(pronFor(w)||'')+'</small></td>';}
    return '<tr>'+c(v.base)+c(v.pastFull)+c(v.part)+'<td>'+esc(v.pt)+'</td></tr>';
  }).join('');
  showOv('chart','<div class="done-card chart-card"><div class="set-h"><b>Verbos irregulares</b><span class="noprint"><button class="link-btn" data-action="printChart">Imprimir</button> <button class="link-btn" data-action="closeOv" data-arg="chart">Fechar</button></span></div><table class="chart-t"><thead><tr><th>Base</th><th>Passado</th><th>Particípio</th><th>PT</th></tr></thead><tbody>'+rows+'</tbody></table></div>');
}
function printChart(){ window.print(); }

/* ---------- settings / picker / welcome ---------- */
function openSettings(){
  var themeCur=(function(){try{return storageGet(STORE_PREFIX+'theme')||'auto';}catch(e){return 'auto';}})();
  var noConf=(function(){try{return storageGet(STORE_PREFIX+'no-confetti')==='1';}catch(e){return false;}})();
  var spacingWide=document.body.classList.contains('spacing-wide');
  var cl=['present','past','future','related'].map(function(id){return '<label class="cl"><input type="checkbox" id="grp_'+id+'" '+(groupsOn().indexOf(id)>-1?'checked':'')+'> '+esc(groupName(id))+'</label>';}).join('');
  showOv('settings','<div class="done-card set-card"><div class="set-h"><b>Opções</b><button class="icon-btn" data-action="closeOv" data-arg="settings" aria-label="fechar">✕</button></div>'
   +sec('Texto','<div class="row"><button class="icon-btn" data-action="ts" data-arg="-1" aria-label="texto menor">A−</button><b id="tsVal">'+Math.round(TS_STEPS[tsIdx]*100)+'%</b><button class="icon-btn" data-action="ts" data-arg="1" aria-label="texto maior">A+</button></div><div style="margin-top:10px"><label class="cl"><input type="checkbox" id="spacingChk" '+(spacingWide?'checked':'')+' > Espaçamento amplo (dislexia)</label></div>')
   +sec('Tema','<div class="row" style="flex-wrap:wrap;gap:8px"><button class="chip '+(themeCur==='auto'?'active':'')+'" data-action="theme" data-arg="auto">Auto</button><button class="chip '+(themeCur==='light'?'active':'')+'" data-action="theme" data-arg="light">Claro</button><button class="chip '+(themeCur==='dark'?'active':'')+'" data-action="theme" data-arg="dark">Escuro</button><button class="chip '+(themeCur==='high'?'active':'')+'" data-action="theme" data-arg="high">Alto contraste</button></div><div style="margin-top:10px"><label class="cl"><input type="checkbox" id="confChk" '+(noConf?'checked':'')+' > Sem confete</label></div>')
   +sec('Nível de dificuldade','<p style="font-size:.9rem;color:var(--muted)">O nível muda quais perguntas aparecem nos quizzes focados.</p><div class="level-choice">'
     +'<button class="'+(LEARNER_LEVEL==='basic'?'on':'')+'" data-action="level" data-arg="basic"><b>Começando</b><small>Formas básicas e reconhecimento</small></button>'
     +'<button class="'+(LEARNER_LEVEL==='intermediate'?'on':'')+'" data-action="level" data-arg="intermediate"><b>Construindo</b><small>Contexto, negativas e perguntas</small></button>'
     +'<button class="'+(LEARNER_LEVEL==='advanced'?'on':'')+'" data-action="level" data-arg="advanced"><b>Avançado</b><small>Distinções mais finas</small></button></div>')
   +sec('Verbos irregulares','<button class="btn-primary" data-action="openChart">Ver / imprimir tabela</button>')
   +sec('Privacidade','<p>Nenhum dado sai do seu aparelho. XP e escolhas ficam só neste navegador.</p>')
   +sec('Avançado','<button class="link-btn" data-action="selftest">Autoteste do conteúdo</button> <button class="link-btn" data-action="resetAll">Apagar meu progresso</button><p style="margin-top:8px">Versão v40 • localStorage</p>')
   +'</div>');
}
function groupsOn(){
  var s=storageGet(STORE_PREFIX+'groups');
  if(s){ try{var a=JSON.parse(s); if(Array.isArray(a)&&a.length) return a.filter(function(id){return (DATA.curriculum.groups||[]).some(function(g){return g.id===id;});});}catch(e){} }
  return (DATA.curriculum.groups||[]).map(function(g){return g.id;});
}
function groupName(id){var g=(DATA.curriculum.groups||[]).find(function(x){return x.id===id;});return g?g.name:id;}
function setGroups(ids){ if(!ids.length) return; storageSet(STORE_PREFIX+'groups',JSON.stringify(ids)); }
function visibleGroups(){ return groupsOn(); }

function openPicker(){
  var cl=['present','past','future','related'].map(function(id){
    return '<button class="pick '+(groupsOn().indexOf(id)>-1?'on':'')+'" data-action="toggleGroup" data-arg="'+id+'"><span class="pk" data-pk="'+id+'">'+(groupsOn().indexOf(id)>-1?'✓':'')+'</span><span><b>'+esc(groupName(id))+'</b> <small>'+esc((function(){var g=(DATA.curriculum.groups||[]).find(function(x){return x.id===id;});return g?g.desc:'';})())+'</small></span></button>';
  }).join('');
  showOv('picker','<div class="done-card" style="max-width:460px;text-align:left"><div style="font-size:1.375rem;font-weight:900;letter-spacing:-.03em">O que você quer estudar?</div><div style="font-size:.9rem;color:var(--muted);font-weight:600;margin-top:6px">Escolha uma ou mais áreas.</div>'+cl+'<button class="btn-primary" style="margin-top:16px" data-action="confirmPick">Começar</button></div>');
}
function toggleGroup(id){
  var arr=groupsOn();
  var i=arr.indexOf(id);
  if(i>-1) arr.splice(i,1); else arr.push(id);
  setGroups(arr);
  var el=$('picker').querySelector('[data-pk="'+id+'"]');
  if(el){ el.textContent=arr.indexOf(id)>-1?'✓':''; el.closest('.pick').classList.toggle('on',arr.indexOf(id)>-1); }
}
function confirmPick(){
  var arr=groupsOn();
  if(!arr.length){ toast('Escolha pelo menos uma área'); return; }
  if(arr.indexOf(activeGroup)===-1){ activeGroup=arr[0]; activeForm=null; }
  closeOv('picker');
  refreshAll();
}
function openWelcome(){
  welcomeMode=LEARNER_LEVEL;
  drawWelcome();
  $('welcome').classList.add('show');
}
function drawWelcome(){
  var modes=[
   {id:'basic',name:'Começando',sub:'Formas básicas e reconhecimento',ex:'She works • I worked',detail:'Present simple e passado simples'},
   {id:'intermediate',name:'Construindo',sub:'Contexto, negativas e perguntas',ex:'has gone • was working',detail:'Perfect, contínuos e combinações'},
   {id:'advanced',name:'Avançado',sub:'Distinções mais finas',ex:'had been • would have',detail:'Todo o currículo de 12 formas'}
  ];
  var h='';
  modes.forEach(function(m){
    h+='<button type="button" class="welcome-choice '+(welcomeMode===m.id?'on':'')+'" data-action="chooseWelcome" data-arg="'+m.id+'"><div class="wc-top"><b>'+m.name+'</b><span class="wc-check">'+(welcomeMode===m.id?'✓':'')+'</span></div><small>'+m.sub+'</small><small style="display:block;margin-top:4px;color:var(--accent-ink);font-weight:700">'+m.ex+'</small><small style="display:block;margin-top:2px;opacity:.8">'+m.detail+'</small></button>';
  });
  $('welcomeGrid').innerHTML=h;
  var b=$('welcomeStart'); if(b) b.disabled=false;
}
var welcomeMode='basic';
function chooseWelcome(id){ welcomeMode=id; drawWelcome(); }
function confirmWelcome(){
  LEARNER_LEVEL=welcomeMode;
  storageSet(STORE_PREFIX+'level',LEARNER_LEVEL);
  var gs=(LEARNER_LEVEL==='basic')?['present','past']:(LEARNER_LEVEL==='intermediate')?['present','past','future']:['present','past','future','related'];
  setGroups(gs);
  activeForm=null;
  if(gs.indexOf(activeGroup)===-1) activeGroup=gs[0];
  $('welcome').classList.remove('show');
  refreshAll();
}
function openMissed(){
  var ids=missedIds();
  if(!ids.length){ toast('Nenhum erro para revisar'); return; }
  var items=ids.slice(0,6).map(function(id){ return findQuestionById(id); }).filter(Boolean);
  if(!items.length){ toast('Nenhum erro para revisar'); return; }
  quiz=items.map(function(x){ return buildQFromItem(x.q,x.form,false); });
  QN=quiz.length; quizFormId='missed'; quizMode='missed'; reviewMode=true;
  qIdx=0;qScore=0;xpEarned=0;
  $('quiz').classList.add('open'); showQ();
}
function findQuestionById(id){
  if(String(id).indexOf('micro-')===0){
    var m=DATA.micro.find(function(x){return 'micro-'+simpleHash(x.prompt)===id;});
    if(m) return {q:toMicroQ(m),form:{id:'keep',name:'Keep'}};
    return null;
  }
  var found=null;
  (DATA.curriculum.groups||[]).forEach(function(g){
    (g.forms||[]).forEach(function(f){
      var l=DATA.lessons[f.id]; if(!l) return;
      var pool=(l.reviewQuiz||[]).concat(l.guidedPractice||[]);
      pool.forEach(function(q){ if(q.id===id) found={q:q,form:f}; });
    });
  });
  return found;
}
function missedIds(){
  return Object.keys(wrong).filter(function(k){return wrong[k]>0;}).sort(function(a,b){return wrong[b]-wrong[a];});
}
function updateMissedBtn(){
  var n=missedIds().length;
  var b=$('menuMissedBtn'); if(b){ b.style.display=n?'block':'none'; b.textContent='Revisar erros ('+n+')'; }
}

/* ---------- selftest ---------- */
function runSelfTest(){
  var R={blank:[],leak:[],dup:[],opts:[],agree:[],pron:[],err:[],focused:[],mismatch:[]};
  (DATA.curriculum.groups||[]).forEach(function(g){
    (g.forms||[]).forEach(function(f){
      var l=DATA.lessons[f.id]; if(!l) return;
      var all=(l.reviewQuiz||[]).concat(l.guidedPractice||[]);
      all.forEach(function(q){
        if(!q.prompt) R.err.push(f.id+'/'+q.id+': sem prompt');
        var blanks=(q.prompt.match(/___/g)||[]).length;
        if(blanks!==1&&blanks!==2) R.blank.push(f.id+'/'+q.id);
        if(q.kind==='mc'){
          if(!q.options||q.options.indexOf(q.answer)===-1) R.opts.push(f.id+'/'+q.id+': resposta fora das opções');
          else if(q.options.filter(function(o){return o===q.answer;}).length>1) R.opts.push(f.id+'/'+q.id+': resposta duplicada');
          else if(new Set(q.options).size!==q.options.length) R.opts.push(f.id+'/'+q.id+': opções duplicadas');
        }
        if(q.accept&&q.accept.indexOf(q.answer)===-1) R.mismatch.push(f.id+'/'+q.id+': accept sem a resposta canônica');
        var stripped=q.prompt.replace(/\([^)]*\)/g,'');
        var bIdx=stripped.indexOf('B:');
        var inspected=bIdx>=0?stripped.slice(bIdx):stripped;
        if(q.full&&new RegExp('\\b'+q.answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(inspected)) R.leak.push(f.id+'/'+q.id+': '+q.prompt);
      });
    });
  });
  var names={blank:'Cada pergunta tem exatamente um espaço',leak:'A resposta não aparece na pergunta',dup:'Sem duplicatas de texto',opts:'Opções válidas (resposta presente, sem duplicatas)',agree:'Concordância',pron:'Pronúncia para todas as formas',err:'Sem erros estruturais',focused:'Quizzes focados por forma',mismatch:'accept inclui a resposta canônica'};
  var fails=0, h='<div class="done-card set-card"><div class="set-h"><b>Autoteste</b><button class="icon-btn" data-action="closeOv" data-arg="selftest" aria-label="fechar">✕</button></div>';
  Object.keys(names).forEach(function(k){
    var bad=R[k], ok=!bad.length; if(!ok) fails++;
    h+='<div class="st-row '+(ok?'ok':'bad')+'"><b>'+(ok?'✓':'✗')+' '+names[k]+'</b>'+(ok?'':' ('+bad.length+')<div class="st-list">'+bad.slice(0,12).map(esc).join('<br>')+(bad.length>12?'<br>…':'')+'</div>')+'</div>';
  });
  h+='<p style="margin-top:12px;font-weight:800">'+(fails?fails+' verificação(ões) com problema.':'Tudo certo ✓')+'</p></div>';
  showOv('selftest',h);
  return {fails:fails,R:R};
}

/* ---------- overlays / sheets ---------- */
function showOv(id,h){ var e=$(id); e.innerHTML=h; e.classList.add('show'); }
function closeOv(id){ $(id).classList.remove('show'); }
function sec(t,b){ return '<div class="set-sec"><h3>'+t+'</h3>'+b+'</div>'; }

function openHelp(){
  closeMenu();
  showOv('help','<div class="done-card set-card"><div class="set-h"><b>Ajuda</b><button class="icon-btn" data-action="closeOv" data-arg="help" aria-label="Fechar">✕</button></div>'
   +'<div class="faq">'
   +'<details><summary>O que é este currículo?</summary><p>São as 12 formas centrais dos tempos verbais (4 presentes, 4 passados, 4 futuros), além de construções relacionadas. Cada lição tem explicação, exemplos, erros comuns e prática.</p></details>'
   +'<details><summary>O quiz é focado em quê?</summary><p>Um quiz focado testa apenas a forma selecionada. O modo Keep Your English é uma revisão mista, claramente marcada.</p></details>'
   +'<details><summary>O que o nível muda?</summary><p>O nível (Começando/Construindo/Avançado) muda quais perguntas aparecem: básicas, intermediárias ou avançadas.</p></details>'
   +'<details><summary>Não ouço o áudio</summary><p>Aumente o volume e, no iPhone, desligue o modo silencioso. A voz vem do seu aparelho: use Chrome, Edge ou Safari atualizados.</p></details>'
   +'<details><summary>Meu XP sumiu</summary><p>O progresso fica salvo só neste navegador e neste aparelho. Limpar os dados do navegador ou usar aba anônima começa do zero.</p></details>'
   +'<details><summary>O texto cansa a vista</summary><p>Use A− e A+ no topo. Em Opções há tema escuro, alto contraste e espaçamento maior.</p><button class="chip" data-action="openSettings">Abrir Opções</button></details>'
   +'<details><summary>Como instalar no celular</summary><p>Android (Chrome): menu ⋮ → Instalar app. iPhone (Safari): Compartilhar → Adicionar à Tela de Início.</p></details>'
   +'</div></div>');
}

/* ---------- confetti ---------- */
function launchConfetti(){
  try{ if(storageGet(STORE_PREFIX+'no-confetti')==='1') return; }catch(e){}
  var c=$('confetti'); if(!c) return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx=c.getContext('2d'); if(!ctx) return;
  c.width=c.offsetWidth; c.height=c.offsetHeight;
  var pieces=[];
  for(var i=0;i<30;i++){ pieces.push({x:Math.random()*c.width,y:Math.random()*-20,r:Math.random()*6+2,color:'hsl('+(Math.random()*40+20)+',90%,60%)',vx:(Math.random()-0.5)*2,vy:Math.random()*1.5+1}); }
  var anim;
  function draw(){ ctx.clearRect(0,0,c.width,c.height); for(var k=0;k<pieces.length;k++){ var p=pieces[k]; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill(); p.x+=p.vx; p.y+=p.vy; p.vy+=0.06; if(p.y>c.height) p.y=-10; } anim=requestAnimationFrame(draw); }
  draw();
  setTimeout(function(){ cancelAnimationFrame(anim); ctx.clearRect(0,0,c.width,c.height); },1800);
}

/* ---------- text size / theme / spacing ---------- */
var APP_VERSION='v40';
var TS_STEPS=[1,1.15,1.35,1.6,2.0], tsIdx=0;
try{tsIdx=parseInt(storageGet(STORE_PREFIX+'ts')||'0',10)||0;}catch(e){}
if(tsIdx<0||tsIdx>=TS_STEPS.length) tsIdx=0;
function applyTS(){ document.documentElement.classList.toggle('big-text',TS_STEPS[tsIdx]>=1.6); document.documentElement.style.fontSize=(18*TS_STEPS[tsIdx])+'px'; }
applyTS();
function setTS(d){
  tsIdx=Math.max(0,Math.min(TS_STEPS.length-1,tsIdx+d));
  storageSet(STORE_PREFIX+'ts',String(tsIdx));
  applyTS();
  var e=$('tsVal'); if(e) e.textContent=Math.round(TS_STEPS[tsIdx]*100)+'%';
  toast('Texto '+Math.round(TS_STEPS[tsIdx]*100)+'%');
}
function applyTheme(t){
  document.documentElement.classList.remove('theme-light','theme-dark','theme-high');
  if(t==='light') document.documentElement.classList.add('theme-light');
  else if(t==='dark') document.documentElement.classList.add('theme-dark');
  else if(t==='high') document.documentElement.classList.add('theme-high');
}
(function(){
  try{
    var th=storageGet(STORE_PREFIX+'theme');
    if(!th){ if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches) th='dark'; else th='auto'; }
    if(th&&th!=='auto') applyTheme(th);
  }catch(e){}
})();
function setTheme(t){
  applyTheme(t);
  storageSet(STORE_PREFIX+'theme',t);
  toast('Tema: '+t);
}
function toggleSpacing(chk){
  if(chk&&chk.checked){ document.body.classList.add('spacing-wide'); storageSet(STORE_PREFIX+'spacing','1'); }
  else { document.body.classList.remove('spacing-wide'); storageSet(STORE_PREFIX+'spacing','0'); }
}
function toggleConfetti(chk){
  if(chk&&chk.checked) storageSet(STORE_PREFIX+'no-confetti','1');
  else storageRemove(STORE_PREFIX+'no-confetti');
}
(function(){
  try{
    if(storageGet(STORE_PREFIX+'spacing')==='1') document.body.classList.add('spacing-wide');
  }catch(e){}
})();
function resetAll(){
  if(!confirm('Apagar XP, sequência e escolhas deste aparelho?')) return;
  try{ localStorage.removeItem(STORE_PREFIX+'seen'); localStorage.removeItem(STORE_PREFIX+'wrong');
    localStorage.removeItem(STORE_PREFIX+'xp'); localStorage.removeItem(STORE_PREFIX+'streak');
    localStorage.removeItem(STORE_PREFIX+'last'); localStorage.removeItem(STORE_PREFIX+'done');
    localStorage.removeItem(STORE_PREFIX+'level'); localStorage.removeItem(STORE_PREFIX+'groups');
    localStorage.removeItem(STORE_PREFIX+'ts'); localStorage.removeItem(STORE_PREFIX+'theme'); }catch(e){}
  location.reload();
}

/* ---------- guide (simple, non-blocking) ---------- */
var guideOn=false;
function startGuide(){
  closeMenu();
  guideOn=true;
  toast('Guia: use as abas para escolher uma forma. Depois toque em Praticar.');
  setTimeout(function(){ guideOn=false; },8000);
}
function endGuide(){ guideOn=false; }

/* ---------- hints ---------- */
var HINTS={
  xp:['XP','Pontos que você ganha ao acertar. Ficam salvos só neste aparelho. Nada é enviado.'],
  streak:['Sequência','Dias seguidos em que você praticou. Pratique um pouco por dia para manter.']
};
function showHint(btn){
  var d=HINTS[btn.getAttribute('data-hint')]; if(!d) return;
  var hs=$('hintSheet');
  hs.innerHTML='<div class="coach-title">'+d[0]+'</div><p class="coach-text">'+d[1]+'</p><div class="coach-actions"><button type="button" class="btn-primary" data-action="closeHint">Entendi</button></div>';
  hs.hidden=false;
  var ok=hs.querySelector('button'); if(ok) ok.focus();
}
function closeHint(){ $('hintSheet').hidden=true; }

/* ---------- reset progress per day ---------- */
document.addEventListener('visibilitychange',function(){ if(!document.hidden && dayStr(0)!==today) location.reload(); });

/* ---------- updateProgress (adapted) ---------- */
function updateProgress(){
  var btn=$('practiceBtn'); if(!btn) return;
  var lesson=activeForm?DATA.lessons[activeForm]:null;
  var canPractice=!!lesson && (lesson.reviewQuiz||[]).length>0;
  btn.disabled=!canPractice;
  btn.setAttribute('data-action',canPractice?'quiz':'');
  btn.setAttribute('data-arg',activeForm||'');
  btn.setAttribute('data-arg2','review');
  $('practiceLabel').textContent=canPractice?'Praticar':(activeGroup==='related'?'Ver lições':'Lição');
  $('xpGain').textContent=canPractice?'até +60 XP':'';
  $('hint').textContent=canPractice?'Quiz focado em '+(lesson?lesson.namePt:''):'Leia a lição antes de praticar.';
}

/* ---------- menu ---------- */
function toggleMenu(){
  var sh=$('menuSheet'), ov=$('menuOverlay');
  if(!sh||!ov) return;
  var open=sh.classList.contains('show');
  if(open){ closeMenu(); }
  else {
    sh.classList.add('show'); ov.classList.add('show');
    var mb=$('menuBtn'); if(mb) mb.setAttribute('aria-expanded','true');
    var f=sh.querySelector('button'); if(f) f.focus();
  }
}
function closeMenu(){
  var sh=$('menuSheet'), ov=$('menuOverlay');
  if(sh) sh.classList.remove('show');
  if(ov) ov.classList.remove('show');
  var mb=$('menuBtn'); if(mb) mb.setAttribute('aria-expanded','false');
}

/* ---------- refresh / routing ---------- */
function refreshAll(){
  renderHeader();
  renderTabs();
  renderContent();
  updateProgress();
  if(!storageOK){
    var subEl=$('sub');
    if(subEl && subEl.textContent.indexOf('Aviso')===-1){
      subEl.textContent=subEl.textContent+' • Aviso: este navegador não está salvando o progresso';
    }
  }
  updateMissedBtn();
}

function switchGroup(id){
  if(id===activeGroup) return;
  activeGroup=id; activeForm=null;
  storageSet(STORE_PREFIX+'tab',id);
  refreshAll();
  window.scrollTo(0,0);
}
function switchForm(id){
  activeForm=id;
  storageSet(STORE_PREFIX+'form',id);
  renderContent();
  updateProgress();
  window.scrollTo(0,0);
}

/* ---------- global action delegation ---------- */
var ACTIONS={
  group:function(arg){ switchGroup(arg); },
  form:function(arg){ switchForm(arg); },
  quiz:function(arg,arg2){ openQuiz(arg,arg2||'review'); },
  reveal:function(arg){
    var el=$('reveal-'+arg); if(el) el.hidden=!el.hidden;
  },
  answer:function(arg){ answerAt(parseInt(arg,10)); },
  submitTyped:submitTyped,
  nextQ:nextQ,
  finishQuiz:finishQuiz,
  quitQuiz:quitQuiz,
  closeDone:function(){ $('doneScreen').classList.remove('show'); justFinished=false; },
  closeQuiz:closeQuiz,
  openKeep:openKeep,
  openMissed:openMissed,
  openExplore:openExplore,
  closeExplore:closeExplore,
  setCat:setCat,
  verb:openVerb,
  closeCard:function(){ var el=$('exploreCard'); if(el) el.remove(); },
  openChart:openChart,
  printChart:printChart,
  openSettings:openSettings,
  openHelp:openHelp,
  openPicker:openPicker,
  toggleGroup:toggleGroup,
  confirmPick:confirmPick,
  chooseWelcome:chooseWelcome,
  confirmWelcome:confirmWelcome,
  openWelcome:openWelcome,
  toggleMenu:toggleMenu,
  closeMenu:closeMenu,
  startGuide:startGuide,
  endGuide:endGuide,
  openTutorial:startGuide,
  closeHint:closeHint,
  ts:function(arg){ setTS(parseInt(arg,10)); },
  theme:function(arg){ setTheme(arg); },
  level:function(arg){
    LEARNER_LEVEL=arg;
    storageSet(STORE_PREFIX+'level',LEARNER_LEVEL);
    refreshAll();
    var s=$('settings'); if(s) openSettings();
    toast('Nível: '+levelLabel());
  },
  selftest:runSelfTest,
  resetAll:resetAll,
  closeOv:closeOv
};

document.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('[data-action]'):null;
  if(b){
    var act=b.getAttribute('data-action');
    if(ACTIONS[act]){ ACTIONS[act](b.getAttribute('data-arg'), b.getAttribute('data-arg2')); return; }
  }
  var say=e.target.closest?e.target.closest('[data-say]'):null;
  if(say){
    var txt=say.getAttribute('data-say')||'';
    var rateAttr=say.getAttribute('data-rate');
    var rate=rateAttr!==null?parseFloat(rateAttr):1.0;
    if(isNaN(rate))rate=1.0;
    speak(txt,say,rate);
    return;
  }
  var hint=e.target.closest?e.target.closest('.hint'):null;
  if(hint){ showHint(hint); return; }
  if(e.target.closest('#hintSheet')){ return; }
  if(!e.target.closest('#hintSheet')){ closeHint(); }
});

/* checkbox delegated change */
document.addEventListener('change',function(e){
  var el=e.target;
  if(!el.id) return;
  if(el.id==='spacingChk') toggleSpacing(el);
  else if(el.id==='confChk') toggleConfetti(el);
});

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if(!$('hintSheet').hidden){ closeHint(); return; }
    if($('menuSheet').classList.contains('show')){ closeMenu(); return; }
    if($('quiz').classList.contains('open')){ quitQuiz(); return; }
    if($('explore').classList.contains('open')){ closeExplore(); return; }
    ['help','selftest','chart','settings','picker'].forEach(function(id){ if($(id).classList.contains('show')) closeOv(id); });
    return;
  }
  if(!$('quiz').classList.contains('open')) return;
  var n=parseInt(e.key,10), opts=document.querySelectorAll('#quizBody .q-opt');
  if(n>=1 && n<=opts.length){ opts[n-1].click(); }
  else if(e.key==='Enter' && document.activeElement.tagName!=='BUTTON'){
    var c=document.querySelector('#quizBody .btn-primary'); if(c) c.click();
  }
});

/* ---------- focus trap ---------- */
(function(){
  var order=['quiz','explore','doneScreen','picker','settings','chart','selftest','help','welcome'], saved={};
  function el(id){return $(id);}
  function isOpen(e){return !!e&&(e.classList.contains('show')||e.classList.contains('open'));}
  function focusables(c){return Array.prototype.filter.call(c.querySelectorAll('button,input,select,textarea,summary,[href]'),function(n){return !n.disabled&&n.offsetParent!==null;});}
  order.forEach(function(id){
    var e=el(id); if(!e) return;
    var was=isOpen(e);
    new MutationObserver(function(){
      var now=isOpen(e);
      if(now&&!was){ saved[id]=document.activeElement; if(id!=='quiz'){ setTimeout(function(){ var f=focusables(e)[0]; if(f) f.focus(); },30); } }
      else if(!now&&was){ var p=saved[id]; if(p&&p!==document.body&&document.contains(p)&&p.focus){ try{p.focus();}catch(x){} } }
      was=now;
    }).observe(e,{attributes:true,attributeFilter:['class']});
  });
  document.addEventListener('keydown',function(ev){
    var top=null;
    order.forEach(function(id){ if(isOpen(el(id))) top=el(id); });
    var ms=$('menuSheet');
    if(ev.key==='Escape'&&ms&&ms.classList.contains('show')){ closeMenu(); return; }
    if(ev.key!=='Tab'||!top) return;
    var f=focusables(top); if(!f.length) return;
    var first=f[0], last=f[f.length-1], a=document.activeElement;
    if(!top.contains(a)){ first.focus(); ev.preventDefault(); }
    else if(ev.shiftKey&&a===first){ last.focus(); ev.preventDefault(); }
    else if(!ev.shiftKey&&a===last){ first.focus(); ev.preventDefault(); }
  });
})();

/* ---------- init ---------- */
function loadAll(){
  var lessonIds=[];
  (DATA.curriculum.groups||[]).forEach(function(g){ (g.forms||[]).forEach(function(f){ lessonIds.push(f.id); }); });
  var promises=[
    loadJSON('data/verbs.json').then(function(d){DATA.verbs=d;}),
    loadJSON('data/prep.json').then(function(d){DATA.prep=d;}),
    loadJSON('data/pronunciation.json').then(function(d){DATA.pron=d;}),
    loadJSON('data/br-tips.json').then(function(d){DATA.brTips=d;}),
    loadJSON('data/collocations.json').then(function(d){DATA.colloc=d;}),
    loadJSON('data/micro-keep.json').then(function(d){DATA.micro=d;}),
    loadJSON('data/stative.json').then(function(d){DATA.stative=d;}),
    loadJSON('data/alt-forms.json').then(function(d){DATA.alt=d;})
  ];
  lessonIds.forEach(function(id){ promises.push(loadLesson(id)); });
  return Promise.all(promises);
}

function boot(){
  var cur=null;
  try{ cur=loadJSON('data/curriculum.json'); }catch(e){}
  cur.then(function(d){
    DATA.curriculum=d;
    var savedGroup=storageGet(STORE_PREFIX+'tab');
    if(savedGroup && (d.groups||[]).some(function(g){return g.id===savedGroup;})) activeGroup=savedGroup;
    var gs=groupsOn();
    if(gs.length && gs.indexOf(activeGroup)===-1) activeGroup=gs[0];
    return loadAll();
  }).then(function(){
    refreshAll();
    if(!storageGet(STORE_PREFIX+'groups') && !storageGet(STORE_PREFIX+'level')) { setTimeout(openWelcome, 150); }
    if(/[?&]test=1/.test(location.search)) setTimeout(runSelfTest, 300);
  }).catch(function(err){
    var content=$('content');
    if(content) content.innerHTML='<div class="card"><b>Não consegui carregar os dados.</b><p style="color:var(--muted)">Abra o app por um servidor estático (ex.: GitHub Pages ou localhost). Erro: '+esc(err.message)+'</p></div>';
  });
}

/* service worker registration */
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
  window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}

boot();



/* test hook */
VL.__state=function(){return {quiz:quiz,qIdx:qIdx,qScore:qScore,activeForm:activeForm,activeGroup:activeGroup};};


/* expose for testing / URL param */
VL.runSelfTest=runSelfTest;
VL.openKeep=openKeep;
VL.refreshAll=refreshAll;


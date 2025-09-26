/* TrickTrix - Shared JS
   Handles: login validation, teacher add/list, student & kids quiz engine, timer, popup, result, certificate
*/

/* ---------- storage keys ---------- */
const KEY_TEACH = 'tricktrix_questions'; // stores array of questions: {type:'student'|'kids', q, options[], answer:'A'|'B'.., img:''}
const KEY_USER = 'tricktrix_user';
const KEY_RESULT = 'tricktrix_result';

/* ---------- default sample questions ---------- */
const SAMPLE_STUDENT = [
  {type:'student', q:'What is 5 + 3?', options:['5','7','8','9'], answer:'C', img:''},
  {type:'student', q:'Capital of India?', options:['Mumbai','New Delhi','Kolkata','Chennai'], answer:'B', img:''},
  {type:'student', q:'HTML stands for?', options:['High Text...', 'Hyper Text Markup Language','Home Tool Markup','None'], answer:'B', img:''}
];
const SAMPLE_KIDS = [
  {type:'kids', q:'1 + 1 = ?', options:['1','2','3','4'], answer:'B', img:''},
  {type:'kids', q:'Which is a cat?', options:['🐶 Dog','🐱 Cat','🐮 Cow','🐔 Bird'], answer:'B', img:''},
  {type:'kids', q:'Which fruit is shown?', options:['Apple','Banana','Orange','Grapes'], answer:'A', img:'https://i.imgur.com/4AiXzf8.jpeg'}
];

/* ---------- UTIL ---------- */
function getStoredQuestions(){
  const raw = localStorage.getItem(KEY_TEACH);
  if(!raw) {
    const defaults = SAMPLE_STUDENT.concat(SAMPLE_KIDS);
    localStorage.setItem(KEY_TEACH, JSON.stringify(defaults));
    return defaults;
  }
  try { return JSON.parse(raw); } catch(e){ return []; }
}
function saveStoredQuestions(arr){ localStorage.setItem(KEY_TEACH, JSON.stringify(arr)); }

function addTeacherQuestion(obj){
  const arr = getStoredQuestions();
  arr.push(obj);
  saveStoredQuestions(arr);
}

function clearTeacherQuestions(){ localStorage.removeItem(KEY_TEACH); }

/* ---------- LOGIN ---------- */
function handleLogin(e){
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const roll = document.getElementById('roll').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const role = document.getElementById('roleSelect').value;

  const err = document.getElementById('loginError');
  err.style.display='none';

  if(!name || name.length < 2){ showLoginError('Enter a valid name'); return false; }
  if((role==='student' || role==='kids') && !roll){ showLoginError('Enter roll/class for student/kids'); return false; }
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showLoginError('Email not valid'); return false; }
  if(phone && !/^\d{10}$/.test(phone)){ showLoginError('Phone must be 10 digits'); return false; }

  const user = { name, roll, email, phone, role };
  sessionStorage.setItem(KEY_USER, JSON.stringify(user));
  // goto appropriate page
  if(role === 'teacher') location.href = 'teacher.html';
  else if(role === 'kids') location.href = 'kids.html';
  else location.href = 'student.html';
  return false;
}
function showLoginError(msg){
  const err = document.getElementById('loginError');
  if(err){ err.innerText = msg; err.style.display='block'; }
}

/* ---------- TEACHER RENDER ---------- */
function renderTeacherList(){
  const list = getStoredQuestions();
  const container = document.getElementById('qList');
  if(!container) return;
  if(list.length === 0){ container.innerHTML = '<p class="small muted">No questions saved.</p>'; return; }
  container.innerHTML = list.map((q,i)=>`
    <div class="qcard">
      <div>
        <strong>${i+1}. [${q.type}]</strong> ${escapeHtml(q.q)}<br/><small>${q.options.join(' | ')} — Answer: ${q.answer}${q.img? ' • image':''}</small>
      </div>
      <div>
        <button class="btn small" onclick="deleteQuestion(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}
function deleteQuestion(index){
  const a = getStoredQuestions(); a.splice(index,1); saveStoredQuestions(a); renderTeacherList();
}

/* ---------- QUIZ ENGINE (student/kids) ---------- */
let quizState = { list:[], index:0, score:0, wrong:0, timerId:null, timeLeft:30, role:'student' };

function loadQuizPage(role){
  // role param (student/kids)
  const user = JSON.parse(sessionStorage.getItem(KEY_USER) || 'null');
  if(!user){
    alert('Please login first.');
    location.href = 'login.html';
    return;
  }
  document.getElementById('userInfo')?.innerText = `${user.name} ${user.roll? ' • '+user.roll : ''}`;
  document.getElementById('userInfoKids')?.innerText = `${user.name} ${user.roll? ' • '+user.roll : ''}`;

  quizState.role = role;
  // load questions of that type
  const all = getStoredQuestions();
  let arr = all.filter(q=>q.type === role);
  if(!arr || arr.length === 0){
    arr = role === 'kids' ? SAMPLE_KIDS : SAMPLE_STUDENT;
  }
  shuffle(arr);
  quizState.list = arr;
  quizState.index = 0; quizState.score = 0; quizState.wrong = 0;
  showQuestion();
}

function showQuestion(){
  clearTimer();
  const qObj = quizState.list[quizState.index];
  if(!qObj){ finishQuizNow(); return; }

  // page-specific render
  if(quizState.role === 'student'){
    document.getElementById('qNumber').innerText = `Question ${quizState.index+1} of ${quizState.list.length}`;
    document.getElementById('qText').innerText = qObj.q;
    const img = document.getElementById('qImg');
    if(qObj.img){ img.src = qObj.img; img.classList.remove('hidden'); } else img.classList.add('hidden');

    const opts = document.getElementById('options');
    opts.innerHTML = '';
    qObj.options.forEach((opt,i)=>{
      const b = document.createElement('button'); b.innerText = opt; b.onclick = ()=>selectAnswer(String.fromCharCode(65+i), b, qObj); opts.appendChild(b);
    });
    document.getElementById('progressText').innerText = `${quizState.index+1}/${quizState.list.length}`;
  } else {
    // kids
    document.getElementById('kidsNumber').innerText = `Question ${quizState.index+1} of ${quizState.list.length}`;
    document.getElementById('kidsQText').innerText = qObj.q;
    const kimg = document.getElementById('kidsImg');
    if(qObj.img){ kimg.src = qObj.img; kimg.classList.remove('hidden'); } else { kimg.classList.add('hidden'); }
    const kopts = document.getElementById('kidsOptions');
    kopts.innerHTML = '';
    qObj.options.forEach((opt,i)=>{
      const btn = document.createElement('button'); btn.innerText = opt; btn.onclick = ()=>selectAnswerKids(String.fromCharCode(65+i), btn, qObj); kopts.appendChild(btn);
    });
  }

  // timer
  quizState.timeLeft = 30;
  updateTimerDisplay();
  quizState.timerId = setInterval(()=>{
    quizState.timeLeft--;
    updateTimerDisplay();
    if(quizState.timeLeft <= 0){ clearInterval(quizState.timerId); showPopup('Time up!', 'orange'); setTimeout(()=>{ markWrongForTimeout(); }, 700); }
  },1000);
}

function updateTimerDisplay(){
  if(quizState.role==='student') document.getElementById('timer').innerText = quizState.timeLeft;
  else document.getElementById('timerKids').innerText = quizState.timeLeft;
}

function selectAnswer(letter, btn, qObj){
  clearTimer();
  // disable other options
  Array.from(document.getElementById('options').children).forEach(b=>b.disabled=true);
  if(letter === qObj.answer){
    btn.classList.add('correct'); quizState.score++; showPopup('Correct!', 'limegreen');
  } else {
    btn.classList.add('wrong'); quizState.wrong++;
    // highlight correct
    const correctIndex = qObj.answer.charCodeAt(0) - 65;
    const children = document.getElementById('options').children;
    if(children[correctIndex]) children[correctIndex].classList.add('correct');
    showPopup('Wrong!', 'crimson');
  }
  setTimeout(()=>{ nextQuestion(); }, 700);
}

function selectAnswerKids(letter, btn, qObj){
  clearTimer();
  Array.from(document.getElementById('kidsOptions').children).forEach(b=>b.disabled=true);
  if(letter === qObj.answer){
    btn.classList.add('correct'); quizState.score++; showPopup('Correct!', 'limegreen');
  } else {
    btn.classList.add('wrong'); quizState.wrong++;
    const correctIndex = qObj.answer.charCodeAt(0)-65;
    const children = document.getElementById('kidsOptions').children;
    if(children[correctIndex]) children[correctIndex].classList.add('correct');
    showPopup('Wrong!', 'crimson');
  }
  setTimeout(()=>{ kidsNext(); }, 700);
}

function nextQuestion(){
  if(quizState.index < quizState.list.length - 1){ quizState.index++; showQuestion(); } else finishQuizNow();
}
function prevQuestion(){ if(quizState.index>0){ quizState.index--; showQuestion(); } }

function kidsNext(){ // same as next but role aware
  if(quizState.index < quizState.list.length - 1){ quizState.index++; showQuestion(); } else finishQuizNow();
}
function kidsPrev(){ if(quizState.index>0){ quizState.index--; showQuestion(); } }

function markWrongForTimeout(){ quizState.wrong++; if(quizState.index < quizState.list.length -1) { quizState.index++; showQuestion(); } else finishQuizNow(); }

function finishQuizNow(){
  clearTimer();
  const user = JSON.parse(sessionStorage.getItem(KEY_USER) || '{}');
  const result = { name: user.name || 'Guest', role: quizState.role, correct: quizState.score, wrong: quizState.wrong, total: quizState.list.length, timestamp: new Date().toISOString() };
  sessionStorage.setItem(KEY_RESULT, JSON.stringify(result));
  // set cert data too
  localStorage.setItem('tr_cert', JSON.stringify(result));
  location.href = 'result.html';
}
function finishQuiz(){ finishQuizNow(); }

/* ---------- RESULT PAGE ---------- */
function renderResultPage(){
  const r = JSON.parse(sessionStorage.getItem(KEY_RESULT) || 'null');
  const area = document.getElementById('resultArea');
  if(!r){ area.innerHTML = '<p>No result available.</p>'; return; }
  const pct = Math.round((r.correct / r.total) * 100);
  area.innerHTML = `
    <p><strong>${r.name}</strong></p>
    <p>Total: ${r.total} &nbsp; Correct: ${r.correct} &nbsp; Wrong: ${r.wrong}</p>
    <p>Score: <strong>${pct}%</strong></p>
    <p>${pct >= 70 ? 'Great job! 🎉' : 'Good attempt — keep practicing!'}</p>
  `;
}

/* ---------- Popup helper ---------- */
function showPopup(text, color){
  // create popup element or reuse
  let pop = document.getElementById('globalPopup');
  if(!pop){
    pop = document.createElement('div'); pop.id = 'globalPopup'; pop.className='popup'; document.body.appendChild(pop);
  }
  pop.innerText = text; pop.style.background = color || 'limegreen'; pop.classList.remove('hidden');
  setTimeout(()=>{ pop.classList.add('hidden'); }, 900);
}

/* ---------- teacher utilities for render ---------- */
function renderTeacherList(){
  // called on teacher page load
  const list = getStoredQuestions();
  const container = document.getElementById('qList');
  if(!container) return;
  if(list.length===0){ container.innerHTML = `<p class="small muted">No questions saved yet.</p>`; return; }
  container.innerHTML = list.map((q,i)=>`<div class="qcard"><div><strong>${i+1}.</strong> [${q.type}] ${escapeHtml(q.q)}<br/><small>${q.options.join(' | ')} — ${q.answer}${q.img? ' • image':''}</small></div><div><button class="btn small" onclick="deleteQuestion(${i})">Delete</button></div></div>`).join('');
}

/* ---------- helper functions ---------- */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }
function escapeHtml(text){ return (text||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

/* ---------- page-specific initializations ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const path = window.location.pathname.split('/').pop();

  if(path === 'teacher.html'){ renderTeacherList(); }
  // if on login page, nothing to init
  if(path === 'student.html'){ /* student page loaded via loadQuizPage('student') in html */ }
  if(path === 'kids.html'){ /* kids page loaded via loadQuizPage('kids') in html */ }
  if(path === 'result.html'){ /* render handled in result.html script */ }
});

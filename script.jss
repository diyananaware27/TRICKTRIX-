function showForm(role) {
  document.getElementById("student-form").classList.add("hidden");
  document.getElementById("teacher-form").classList.add("hidden");
  document.getElementById("kids-form").classList.add("hidden");
  document.getElementById(role + "-form").classList.remove("hidden");
}

function validateStudent() {
  let name = document.getElementById("sname").value.trim();
  let roll = document.getElementById("sroll").value.trim();
  let email = document.getElementById("semail").value.trim();
  let phone = document.getElementById("sphone").value.trim();

  if (name.length < 3) { alert("Not valid: Name"); return false; }
  if (!/^[0-9]+$/.test(roll)) { alert("Not valid: Roll No"); return false; }
  if (!email.includes("@")) { alert("Not valid: Email"); return false; }
  if (phone.length != 10) { alert("Not valid: Phone"); return false; }

  localStorage.setItem("studentName", name);
  window.location.href = "quiz.html";
  return false;
}

function saveQuestion() {
  let q = document.getElementById("tquestion").value;
  let o1 = document.getElementById("toption1").value;
  let o2 = document.getElementById("toption2").value;
  let o3 = document.getElementById("toption3").value;
  let o4 = document.getElementById("toption4").value;
  let ans = document.getElementById("tanswer").value;

  let questions = JSON.parse(localStorage.getItem("questions") || "[]");
  questions.push({q, options:[o1,o2,o3,o4], ans});
  localStorage.setItem("questions", JSON.stringify(questions));
  alert("Question Added!");
  return false;
}

let currentQ = 0, score = 0, timeLeft = 30;

function loadQuestion() {
  let questions = JSON.parse(localStorage.getItem("questions") || "[]");
  if (questions.length === 0) {
    questions = [
      {q:"2+2=?", options:["3","4","5","6"], ans:"4"},
      {q:"Capital of India?", options:["Delhi","Mumbai","Kolkata","Pune"], ans:"Delhi"}
    ];
  }

  if (currentQ >= questions.length) {
    localStorage.setItem("finalScore", score + "/" + questions.length);
    window.location.href = "result.html";
    return;
  }

  document.getElementById("question").innerText = questions[currentQ].q;
  let optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  questions[currentQ].options.forEach(opt => {
    let btn = document.createElement("button");
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(opt, questions[currentQ].ans);
    optionsDiv.appendChild(btn);
  });

  timeLeft = 30;
  startTimer();
}

function startTimer() {
  let timer = setInterval(() => {
    if (document.getElementById("time")) {
      document.getElementById("time").innerText = timeLeft;
    }
    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion();
    }
    timeLeft--;
  }, 1000);
}

function checkAnswer(selected, correct) {
  let popup = document.getElementById("popup");
  if (selected === correct) {
    score++;
    popup.innerText = "Correct!";
    popup.style.background = "lightgreen";
  } else {
    popup.innerText = "Wrong!";
    popup.style.background = "red";
  }
  popup.classList.remove("hidden");
  setTimeout(() => popup.classList.add("hidden"), 1000);
  nextQuestion();
}

function nextQuestion() {
  currentQ++;
  loadQuestion();
}

if (window.location.pathname.includes("quiz.html")) {
  window.onload = loadQuestion;
}

if (window.location.pathname.includes("result.html")) {
  window.onload = () => {
    document.getElementById("final-score").innerText = "Your Score: " + localStorage.getItem("finalScore");
    document.getElementById("cert-name").innerText = localStorage.getItem("studentName");
  };
}

function startKidsQuiz() {
  window.location.href = "quiz.html";
  return false;
                                                  }

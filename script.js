// ---- CONFIGURABLE COLORES PASTEL ----
const pastelColors = [
  "#b5ead7", "#c7ceea", "#ffdac1", "#f9b5ac", "#b2cefe", "#ffd6e0",
  "#fff1ba", "#c7eae4", "#ffc6ff", "#f8e9a1", "#a9def9", "#e2f0cb"
];

let participants = [
  "Kevin", "Ana", "Luis", "Diana"
];

let winnersHistory = [];
let rotation = 0; // En grados
let spinning = false;
let slowRotationId = null;
let lastWinner = null;

const CONFETTI_ANIMATION_TIME = 7000; // ms - duración del confeti y mensaje ganador

// ----------- DIBUJAR RULETA -----------
const wheel = document.getElementById('wheel');
const wheelContainer = document.getElementById('wheel-container');

function drawWheel() {
  wheel.innerHTML = "";
  const count = participants.length;
  if (count === 0) return;
  const cx = 250, cy = 250, r = 240;
  for (let i = 0; i < count; i++) {
    const startAngle = (2 * Math.PI / count) * i;
    const endAngle = startAngle + 2 * Math.PI / count;
    // Generar puntos para SVG Path
    const x1 = cx + r * Math.cos(startAngle - Math.PI/2);
    const y1 = cy + r * Math.sin(startAngle - Math.PI/2);
    const x2 = cx + r * Math.cos(endAngle - Math.PI/2);
    const y2 = cy + r * Math.sin(endAngle - Math.PI/2);

    // Path del segmento
    const largeArcFlag = (2 * Math.PI / count) > Math.PI ? 1 : 0;
    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z"
    ].join(" ");
    const color = pastelColors[i % pastelColors.length];
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", color);
    wheel.appendChild(path);

    // Texto
    const midAngle = startAngle + Math.PI / count;
    const tx = cx + (r * 0.65) * Math.cos(midAngle - Math.PI/2);
    const ty = cy + (r * 0.65) * Math.sin(midAngle - Math.PI/2);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", tx);
    text.setAttribute("y", ty);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "#22223b");
    text.setAttribute("font-size", "20");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("font-family", "Montserrat, Arial, sans-serif");
    text.setAttribute("transform", `rotate(${(startAngle+endAngle)/2 * 180/Math.PI}, ${tx}, ${ty})`);
    text.textContent = participants[i];
    wheel.appendChild(text);
  }
  wheel.style.transform = `rotate(${rotation}deg)`;
}
drawWheel();

// ----------- ANIMACIÓN LENTA -----------
function startSlowRotation() {
  if (slowRotationId) return;
  let lastTime = null;
  function animate(time) {
    if (!lastTime) lastTime = time;
    const delta = (time - lastTime);
    rotation = (rotation + delta * 0.008) % 360;
    wheel.style.transform = `rotate(${rotation}deg)`;
    lastTime = time;
    slowRotationId = requestAnimationFrame(animate);
  }
  slowRotationId = requestAnimationFrame(animate);
}
function stopSlowRotation() {
  if (slowRotationId) {
    cancelAnimationFrame(slowRotationId);
    slowRotationId = null;
  }
}
startSlowRotation();

// ----------- SPIN BUTTON -----------
const spinBtn = document.getElementById("spin-btn");
const winnerNameDiv = document.getElementById("winner-name");

spinBtn.addEventListener("click", spin);

function spin() {
  if (spinning || participants.length === 0) return;
  spinning = true;
  stopSlowRotation();

  // Elegir ganador (aleatorio)
  const count = participants.length;
  const randomIdx = Math.floor(Math.random() * count);

  // Calcular ángulo destino para ese segmento
  const segmentAngle = 360 / count;
  // Girar varias vueltas antes de detenerse, llegar al centro del segmento
  const minTurns = 5;
  const randomOffset = Math.random() * segmentAngle * 0.6 - segmentAngle*0.3; // Para no caer siempre en el centro
  const targetRotation =
    360 * minTurns +
    (360 - (segmentAngle * randomIdx + segmentAngle/2 + randomOffset));

  animateSpin(rotation, targetRotation, randomIdx);
}

// ----------- ANIMACIÓN DE GIRO -----------
function animateSpin(from, to, winnerIdx) {
  const duration = 5000; // ms, duración del giro
  const start = performance.now();
  let soundPlayed = false;

  function animate(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    // EaseOut cubic
    const eased = 1 - Math.pow(1-t, 3);
    rotation = from + (to-from) * eased;
    wheel.style.transform = `rotate(${rotation%360}deg)`;

    // Cuando esté por detenerse (últimos 12%)
    if (t > 0.88 && !soundPlayed) {
      playHorn();
      soundPlayed = true;
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      showWinner(winnerIdx);
      setTimeout(() => {
        spinning = false;
        startSlowRotation();
      }, CONFETTI_ANIMATION_TIME + 1000); // espera a que termine confeti + extra
    }
  }
  requestAnimationFrame(animate);
}

// ----------- GANADOR -----------
function showWinner(idx) {
  lastWinner = participants[idx];
  winnerNameDiv.textContent = `🏅 ${participants[idx]} 🏅`;
  winnerNameDiv.style.opacity = 1;
  launchConfetti(() => {
    winnerNameDiv.style.opacity = 0;
    removeParticipant(idx);
    addToHistory(lastWinner);
    drawWheel();
    renderParticipantsList();
  });
}

// ----------- PARTICIPANTES: CRUD + DND -----------
const participantsListDiv = document.getElementById('participants-list');
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');

function renderParticipantsList() {
  participantsListDiv.innerHTML = "";
  participants.forEach((name, i) => {
    const el = document.createElement('div');
    el.className = "participant";
    el.draggable = true;

    // Drag & drop handlers
    el.addEventListener('dragstart', e => {
      el.classList.add("dragging");
      e.dataTransfer.setData("text/plain", i);
    });
    el.addEventListener('dragend', () => el.classList.remove("dragging"));

    // Nombre editable
    const nameSpan = document.createElement('span');
    nameSpan.className = "participant-name";
    nameSpan.textContent = name;
    el.appendChild(nameSpan);

    // Editar
    const editBtn = document.createElement('button');
    editBtn.className = "action-btn edit";
    editBtn.title = "Editar";
    editBtn.textContent = "✏️";
    editBtn.onclick = () => editParticipant(i, nameSpan, el);
    el.appendChild(editBtn);

    // Eliminar
    const deleteBtn = document.createElement('button');
    deleteBtn.className = "action-btn delete";
    deleteBtn.title = "Eliminar";
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = () => { removeParticipant(i); drawWheel(); renderParticipantsList(); };
    el.appendChild(deleteBtn);

    // Drag (solo icono visual)
    const dragBtn = document.createElement('span');
    dragBtn.className = "action-btn drag";
    dragBtn.title = "Arrastrar";
    dragBtn.textContent = "☰";
    el.appendChild(dragBtn);

    // DnD events
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      const from = +e.dataTransfer.getData("text/plain");
      moveParticipant(from, i);
      drawWheel();
      renderParticipantsList();
    });

    participantsListDiv.appendChild(el);
  });
}
renderParticipantsList();

function editParticipant(idx, nameSpan, rowEl) {
  const input = document.createElement("input");
  input.value = participants[idx];
  input.maxLength = 25;
  input.onblur = saveEdit;
  input.onkeydown = e => { if (e.key === "Enter") saveEdit(); };
  function saveEdit() {
    if (input.value.trim()) {
      participants[idx] = input.value.trim();
    }
    renderParticipantsList();
    drawWheel();
  }
  nameSpan.replaceWith(input);
  input.focus();
}

function removeParticipant(idx) {
  participants.splice(idx, 1);
}

function moveParticipant(from, to) {
  if (from === to) return;
  const [moved] = participants.splice(from, 1);
  participants.splice(to, 0, moved);
}

addForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const val = addInput.value.trim();
  if (val && participants.length < 36) {
    participants.push(val);
    addInput.value = '';
    drawWheel();
    renderParticipantsList();
  }
});

addInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    addForm.dispatchEvent(new Event('submit'));
  }
});

// ----------- GANADORES HISTORIAL -----------
const historyList = document.getElementById('history-list');
function addToHistory(name) {
  winnersHistory.unshift(name);
  updateHistory();
}
function updateHistory() {
  historyList.innerHTML = "";
  winnersHistory.forEach(name => {
    const li = document.createElement('li');
    li.textContent = `🏅 Ganador: ${name}`;
    historyList.appendChild(li);
  });
}

// ----------- SONIDO CORNETA -----------
function playHorn() {
  const horn = document.getElementById('horn-sound');
  horn.currentTime = 0;
  horn.play();
}

// ----------- CONFETI ANIMADO -----------
// Solo vuela y desaparece, ya no se acumula abajo
function launchConfetti(done) {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  const confettiCount = 180;
  const confettis = [];
  const colors = ["#ffb6b9", "#f8e9a1", "#b5ead7", "#c7ceea", "#ffd6e0", "#ffc6ff", "#fff1ba"];
  for(let i=0; i<confettiCount; i++) {
    confettis.push({
      x: Math.random() * W,
      y: Math.random() * -H,
      r: 4 + Math.random()*6,
      d: 1 + Math.random() * 4,
      color: colors[Math.floor(Math.random()*colors.length)],
      tilt: Math.random() * 20 - 10,
      tiltAngle: Math.random() * Math.PI,
      tiltAngleIncrement: (Math.random()*0.1) + 0.04,
      alpha: 1
    });
  }
  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,W,H);
    confettis.forEach(c=>{
      ctx.globalAlpha = c.alpha;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r, c.r*0.6, c.tilt, 0, 2*Math.PI);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.closePath();
    });
    ctx.globalAlpha = 1;
  }
  function update() {
    frame++;
    confettis.forEach(c=>{
      c.y += Math.cos(frame/20 + c.d) + 2 + c.d/2;
      c.x += Math.sin(frame/25) * 2;
      c.tiltAngle += c.tiltAngleIncrement;
      c.tilt = Math.sin(c.tiltAngle) * 15;
      if(c.y > H+20) {
        c.y = Math.random() * -40;
        c.x = Math.random() * W;
        c.alpha = 1;
      }
    });
  }
  let t = 0;
  function loop() {
    draw();
    update();
    t++;
    if (t < CONFETTI_ANIMATION_TIME / (1000/60)) {
      requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0,0,W,H);
      if (done) done();
    }
  }
  loop();
}

// ----------- WINDOW RESIZE CONFETTI -----------
window.addEventListener("resize", ()=>{
  const canvas = document.getElementById('confetti-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// ----------- INIT -----------
drawWheel();
renderParticipantsList();
updateHistory();

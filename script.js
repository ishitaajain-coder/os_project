const canvas = document.getElementById('diskCanvas');
const ctx = canvas.getContext('2d');

const requestsInput = document.getElementById('requests');
const headInput = document.getElementById('head');
const maxCylinderInput = document.getElementById('maxCylinder');
const algorithmSelect = document.getElementById('algorithm');

const startBtn = document.getElementById('startBtn');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

const totalSeekElem = document.getElementById('totalSeek');
const avgSeekElem = document.getElementById('avgSeek');
const numRequestsElem = document.getElementById('numRequests');
const currentStepDisplayElem = document.getElementById('currentStepDisplay');
const totalStepsElem = document.getElementById('totalSteps');

const algorithmDescriptionElem = document.getElementById('algorithmDescription');
const serviceOrderElem = document.getElementById('serviceOrder');
const stepDetailsElem = document.getElementById('stepDetails');

let simulationState = null;
let animationId = null;
let isPlaying = false;
let currentStep = 0;
let animationSpeed = 3;

// Algorithm descriptions
const algorithmDescriptions = {
  FCFS: "First Come First Serve (FCFS) services disk requests in the order they arrive in the queue. This is the simplest algorithm but may not provide optimal seek time.",
  SSTF: "Shortest Seek Time First (SSTF) selects the request closest to the current head position. This minimizes seek time for each individual request but can cause starvation.",
  SCAN: "SCAN (Elevator Algorithm) moves the head in one direction servicing requests until reaching the end, then reverses direction. This prevents starvation and provides fair service.",
  CSCAN: "Circular SCAN (C-SCAN) moves the head in one direction servicing requests, then jumps back to the beginning without servicing requests on the return trip. This provides more uniform wait times."
};

speedSlider.addEventListener('input', (e) => {
  animationSpeed = parseInt(e.target.value);
  speedValue.textContent = `${animationSpeed}x`;
});

function parseRequests(str) {
  return str.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
}

function clampRequests(requests, maxCylinder) {
  return requests.filter(r => r >= 0 && r <= maxCylinder);
}

function simulateUserOrder(requests, head) {
  const order = [...requests];
  const steps = [];
  let totalSeek = 0;
  let current = head;

  for (let i = 0; i < order.length; i++) {
    const seek = Math.abs(order[i] - current);
    totalSeek += seek;
    steps.push({
      from: current,
      to: order[i],
      seek: seek,
      cumulative: totalSeek,
      explanation: `Moving from cylinder ${current} to ${order[i]} (seek distance: ${seek})`
    });
    current = order[i];
  }

  return { order, totalSeek, steps };
}

function fcfs(requests, head) {
  const order = [...requests];
  const steps = [];
  let totalSeek = 0;
  let current = head;
  for (let i = 0; i < order.length; i++) {
    const seek = Math.abs(order[i] - current);
    totalSeek += seek;
    steps.push({
      from: current,
      to: order[i],
      seek: seek,
      cumulative: totalSeek,
      explanation: `Moving from cylinder ${current} to ${order[i]} (seek distance: ${seek})`
    });
    current = order[i];
  }
  return { order, totalSeek, steps };
}

function sstf(requests, head) { /*...*/ }
function scan(requests, head, maxCylinder) { /*...*/ }
function cscan(requests, head, maxCylinder) { /*...*/ }

function drawVisualization(state, stepIndex) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const margin = 60;
  const trackY = 200;
  const usableWidth = canvas.width - 2 * margin;
  const maxCyl = state.maxCylinder;
  
  function getX(cyl) {
    return margin + (cyl / maxCyl) * usableWidth;
  }
  
  ctx.fillStyle = '#333';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`${state.algorithm}`, 20, 30);
  
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(margin, trackY);
  ctx.lineTo(canvas.width - margin, trackY);
  ctx.stroke();
  
  ctx.fillStyle = '#888';
  ctx.font = '11px Arial';
  const step = Math.max(20, Math.floor(maxCyl / 10));
  for (let cyl = 0; cyl <= maxCyl; cyl += step) {
    const x = getX(cyl);
    ctx.beginPath();
    ctx.moveTo(x, trackY - 8);
    ctx.lineTo(x, trackY + 8);
    ctx.stroke();
    ctx.fillText(cyl, x - 10, trackY + 25);
  }
  
  state.requests.forEach((req) => {
    const x = getX(req);
    const isServiced = stepIndex >= 0 && state.order.slice(0, stepIndex + 1).includes(req);
    const isCurrent = stepIndex >= 0 && state.steps[stepIndex] && state.steps[stepIndex].to === req;
    
    if (isServiced) {
      ctx.fillStyle = isCurrent ? '#ff6600' : '#4CAF50';
    } else {
      ctx.fillStyle = '#2196F3';
    }
    
    ctx.beginPath();
    ctx.arc(x, trackY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(req, x - 8, trackY - 15);
  });
  
  const initialX = getX(state.initialHead);
  ctx.fillStyle = '#9C27B0';
  ctx.beginPath();
  ctx.arc(initialX, trackY, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('S', initialX - 4, trackY + 4);
  
  if (stepIndex >= 0 && stepIndex < state.steps.length) {
    const currentPos = state.steps[stepIndex].to;
    const currentX = getX(currentPos);
    
    ctx.fillStyle = '#FF5722';
    ctx.shadowColor = 'rgba(255, 87, 34, 0.5)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(currentX, trackY, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('H', currentX - 5, trackY + 4);
  }
  
  if (stepIndex >= 0) {
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(initialX, trackY + 40);
    for (let i = 0; i <= stepIndex && i < state.steps.length; i++) {
      const x = getX(state.steps[i].to);
      ctx.lineTo(x, trackY + 40);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  const legendY = canvas.height - 40;
  ctx.font = '12px Arial';
  ctx.fillStyle = '#9C27B0';
  ctx.beginPath();
  ctx.arc(margin, legendY, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillText('Start Position', margin + 15, legendY + 4);
  
  ctx.fillStyle = '#2196F3';
  ctx.beginPath();
  ctx.arc(margin + 150, legendY, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillText('Pending Request', margin + 165, legendY + 4);
  
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(margin + 300, legendY, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillText('Serviced Request', margin + 315, legendY + 4);
  
  ctx.fillStyle = '#FF5722';
  ctx.beginPath();
  ctx.arc(margin + 450, legendY, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.fillText('Current Head', margin + 465, legendY + 4);
}

function updateUI(state, stepIndex) {
  totalSeekElem.textContent = stepIndex >= 0 ? state.steps[stepIndex].cumulative : 0;
  avgSeekElem.textContent = stepIndex >= 0 ? (state.steps[stepIndex].cumulative / (stepIndex + 1)).toFixed(2) : '0';
  numRequestsElem.textContent = state.requests.length;
  currentStepDisplayElem.textContent = stepIndex + 1;
  totalStepsElem.textContent = state.steps.length;
  
  algorithmDescriptionElem.innerHTML = `<p><strong>${state.algorithm}</strong>: ${algorithmDescriptions[state.algorithm]}</p>`;
  
  let orderHTML = '<p><strong>Order:</strong> ' + state.initialHead;
  for (let i = 0; i <= stepIndex && i < state.order.length; i++) {
    orderHTML += ` → <span class="highlight">${state.order[i]}</span>`;
  }
  for (let i = stepIndex + 1; i < state.order.length; i++) {
    orderHTML += ` → ${state.order[i]}`;
  }
  orderHTML += '</p>';
  serviceOrderElem.innerHTML = orderHTML;
  
  if (stepIndex >= 0 && stepIndex < state.steps.length) {
    const step = state.steps[stepIndex];
    stepDetailsElem.innerHTML = `
      <p><strong>Step ${stepIndex + 1}:</strong></p>
      <p>${step.explanation}</p>
      <p><strong>Seek Distance:</strong> ${step.seek}</p>
      <p><strong>Cumulative Seek:</strong> ${step.cumulative}</p>
    `;
  } else {
    stepDetailsElem.innerHTML = '<p>Simulation not started</p>';
  }
}

function enableControls(enable) {
  playBtn.disabled = !enable;
  pauseBtn.disabled = !enable;
  prevBtn.disabled = !enable;
  nextBtn.disabled = !enable;
  resetBtn.disabled = !enable;
}

function goToStep(stepIndex) {
  if (!simulationState) return;
  
  currentStep = Math.max(0, Math.min(stepIndex, simulationState.steps.length - 1));
  drawVisualization(simulationState, currentStep);
  updateUI(simulationState, currentStep);
}

async function playAnimation() {
  if (!simulationState || isPlaying) return;
  
  isPlaying = true;
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  
  while (isPlaying && currentStep < simulationState.steps.length - 1) {
    currentStep++;
    goToStep(currentStep);
    
    const delay = 1000 / animationSpeed;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  
  if (currentStep >= simulationState.steps.length - 1) {
    currentStep = simulationState.steps.length - 1;
  }
}

startBtn.onclick = () => {
  let requests = parseRequests(requestsInput.value);
  const head = parseInt(headInput.value);
  const maxCylinder = parseInt(maxCylinderInput.value);
  const algorithm = algorithmSelect.value;
  
  requests = clampRequests(requests, maxCylinder);
  
  if (requests.length === 0) {
    alert('Please enter valid disk requests within max cylinder range.');
    return;
  }
  if (head < 0 || head > maxCylinder) {
    alert('Initial head position must be within 0 and max cylinder.');
    return;
  }
  
  let result;
    switch (algorithm) {
      case 'FCFS': result = fcfs(requests, head); break;
      case 'SSTF': result = sstf(requests, head); break;
      case 'SCAN': result = scan(requests, head, maxCylinder); break;
      case 'CSCAN': result = cscan(requests, head, maxCylinder); break;
      default: alert('Unknown algorithm'); return;
  }
  
  simulationState = {
    requests,
    initialHead: head,
    maxCylinder,
    algorithm,
    ...result
  };
  
  currentStep = -1;
  isPlaying = false;
  
  enableControls(true);
  drawVisualization(simulationState, -1);
  updateUI(simulationState, -1);
  
  setTimeout(() => playAnimation(), 500);
};

playBtn.onclick = () => playAnimation();

pauseBtn.onclick = () => {
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
};

prevBtn.onclick = () => {
  if (simulationState && currentStep > 0) {
    isPlaying = false;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    goToStep(currentStep - 1);
  }
};

nextBtn.onclick = () => {
  if (simulationState && currentStep < simulationState.steps.length - 1) {
    isPlaying = false;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    goToStep(currentStep + 1);
  }
};

resetBtn.onclick = () => {
  isPlaying = false;
  currentStep = -1;
  if (simulationState) {
    drawVisualization(simulationState, -1);
    updateUI(simulationState, -1);
  }
  playBtn.disabled = false;
  pauseBtn.disabled = true;
};

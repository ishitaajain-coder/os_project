const canvas = document.getElementById('diskCanvas');
const ctx = canvas.getContext('2d');

const requestsInput = document.getElementById('requests');
const headInput = document.getElementById('head');
const maxCylinderInput = document.getElementById('maxCylinder');
const algorithmSelect = document.getElementById('algorithm');
const runBtn = document.getElementById('runBtn');

const totalSeekElem = document.getElementById('totalSeek');
const avgSeekElem = document.getElementById('avgSeek');
const throughputElem = document.getElementById('throughput');
const orderTableBody = document.querySelector('#orderTable tbody');

let animationId;

function parseRequests(str) {
  return str.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
}

function clampRequests(requests, maxCylinder) {
  return requests.filter(r => r >= 0 && r <= maxCylinder);
}

function fcfs(requests, head) {
  const order = [...requests];
  let totalSeek = 0;
  let last = head;
  for (let r of requests) {
    totalSeek += Math.abs(r - last);
    last = r;
  }
  return { order, totalSeek };
}

function sstf(requests, head) {
  let reqs = [...requests];
  let order = [];
  let totalSeek = 0;
  let current = head;

  while (reqs.length > 0) {
    let closestIdx = 0;
    let closestDist = Math.abs(reqs[0] - current);
    for (let i = 1; i < reqs.length; i++) {
      const dist = Math.abs(reqs[i] - current);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    order.push(reqs[closestIdx]);
    totalSeek += closestDist;
    current = reqs[closestIdx];
    reqs.splice(closestIdx, 1);
  }
  return { order, totalSeek };
}

function scan(requests, head, maxCylinder) {
  let order = [];
  let totalSeek = 0;
  let current = head;
  let left = requests.filter(r => r < head).sort((a,b) => b - a);
  let right = requests.filter(r => r >= head).sort((a,b) => a - b);

  for (let r of right) {
    totalSeek += Math.abs(r - current);
    current = r;
    order.push(r);
  }
  if (right.length > 0 && current !== maxCylinder) {
    totalSeek += (maxCylinder - current);
    current = maxCylinder;
  }
  for (let r of left) {
    totalSeek += Math.abs(r - current);
    current = r;
    order.push(r);
  }
  return { order, totalSeek };
}

function cscan(requests, head, maxCylinder) {
  let order = [];
  let totalSeek = 0;
  let current = head;
  let left = requests.filter(r => r < head).sort((a,b) => a - b);
  let right = requests.filter(r => r >= head).sort((a,b) => a - b);

  for (let r of right) {
    totalSeek += Math.abs(r - current);
    current = r;
    order.push(r);
  }
  if (right.length > 0 && current !== maxCylinder) {
    totalSeek += (maxCylinder - current);
    current = maxCylinder;
  }
  totalSeek += maxCylinder; // jump from end to start
  current = 0;
  for (let r of left) {
    totalSeek += Math.abs(r - current);
    current = r;
    order.push(r);
  }
  return { order, totalSeek };
}

function drawZigzag(requests, head, order, maxCylinder) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '12px Arial';
  ctx.fillStyle = '#444';

  const marginTop = 20;
  const marginBottom = 20;
  const usableHeight = canvas.height - marginTop - marginBottom;

  function getY(cyl) {
    return marginTop + usableHeight * (cyl / maxCylinder);
  }

  // Left vertical line (cylinder scale)
  const leftX = 80;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX, marginTop);
  ctx.lineTo(leftX, canvas.height - marginBottom);
  ctx.stroke();

  // Right vertical line (step markers)
  const rightX = 300;
  ctx.beginPath();
  ctx.moveTo(rightX, marginTop);
  ctx.lineTo(rightX, canvas.height - marginBottom);
  ctx.stroke();

  // Cylinder ticks and labels on left
  ctx.fillStyle = '#666';
  for (let cyl = 0; cyl <= maxCylinder; cyl += Math.max(1, Math.floor(maxCylinder / 10))) {
    let y = getY(cyl);
    ctx.beginPath();
    ctx.moveTo(leftX - 6, y);
    ctx.lineTo(leftX + 6, y);
    ctx.stroke();
    ctx.fillText(cyl, leftX - 40, y + 4);
  }

  // Draw request points on left line
  ctx.fillStyle = 'blue';
  for (const r of requests) {
    const y = getY(r);
    ctx.beginPath();
    ctx.arc(leftX, y, 6, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Initial head position
  ctx.fillStyle = 'green';
  ctx.beginPath();
  ctx.arc(leftX, getY(head), 8, 0, 2 * Math.PI);
  ctx.fill();
}

let currentStep = 0;
let stepProgress = 0;

function animateZigzag(order, head, maxCylinder) {
  const marginTop = 20;
  const marginBottom = 20;
  const usableHeight = canvas.height - marginTop - marginBottom;
  const leftX = 80;
  const rightX = 300;

  function getY(cyl) {
    return marginTop + usableHeight * (cyl / maxCylinder);
  }

  if (currentStep >= order.length) {
    cancelAnimationFrame(animationId);
    return;
  }

  // Clear animation area (right side)
  ctx.clearRect(leftX + 10, 0, canvas.width - leftX - 10, canvas.height);

  // Draw zigzag path trace so far
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rightX, getY(head));
  for (let i = 0; i < currentStep; i++) {
    ctx.lineTo(rightX, getY(order[i]));
    ctx.lineTo(rightX + 40, getY(order[i]));
  }

  // Partial move animation for current step:
  let startY = currentStep === 0 ? getY(head) : getY(order[currentStep - 1]);
  let endY = getY(order[currentStep]);
  let interpY = startY + (endY - startY) * (stepProgress / stepDurationFrames);

  ctx.lineTo(rightX, interpY);

  if (stepProgress > stepDurationFrames / 2) {
    const horizProgress = ((stepProgress - stepDurationFrames / 2) / (stepDurationFrames / 2));
    ctx.lineTo(rightX + 40 * horizProgress, endY);
  }
  ctx.stroke();

  // Draw moving head circle
  ctx.fillStyle = 'orange';
  ctx.shadowColor = 'rgba(255,165,0,0.7)';
  ctx.shadowBlur = 15;

  let interpX = rightX;
  if (stepProgress > stepDurationFrames / 2) {
    const horizProgress = ((stepProgress - stepDurationFrames / 2) / (stepDurationFrames / 2));
    interpX = rightX + 40 * horizProgress;
  }
  ctx.beginPath();
  ctx.arc(interpX, interpY, 12, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw label with current cylinder
  ctx.fillStyle = '#222';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`Cylinder: ${order[currentStep]}`, interpX + 15, interpY + 5);

  stepProgress++;
  if (stepProgress > stepDurationFrames) {
    stepProgress = 0;
    currentStep++;
  }
  animationId = requestAnimationFrame(() => animateZigzag(order, head, maxCylinder));
}

const stepDurationFrames = 60;

function displayOrderTable(order, head) {
  orderTableBody.innerHTML = '';
  let cumulativeSeek = 0;
  let last = head;
  order.forEach((cyl, i) => {
    cumulativeSeek += Math.abs(cyl - last);
    last = cyl;
    const row = document.createElement('tr');
    row.innerHTML = `<td>${i + 1}</td><td>${cyl}</td><td>${cumulativeSeek}</td>`;
    orderTableBody.appendChild(row);
  });
}

runBtn.onclick = () => {
  if (animationId) cancelAnimationFrame(animationId);
  let requests = parseRequests(requestsInput.value);
  const head = parseInt(headInput.value);
  const maxCylinder = parseInt(maxCylinderInput.value);
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
  switch (algorithmSelect.value) {
    case 'FCFS': result = fcfs(requests, head); break;
    case 'SSTF': result = sstf(requests, head); break;
    case 'SCAN': result = scan(requests, head, maxCylinder); break;
    case 'CSCAN': result = cscan(requests, head, maxCylinder); break;
    default: alert('Unknown algorithm'); return;
  }

  const avgSeek = (result.totalSeek / requests.length).toFixed(2);
  const throughput = (requests.length / (result.totalSeek / 1000)).toFixed(2);

  totalSeekElem.textContent = result.totalSeek;
  avgSeekElem.textContent = avgSeek;
  throughputElem.textContent = throughput;

  displayOrderTable(result.order, head);
  drawZigzag(requests, head, result.order, maxCylinder);

  currentStep = 0;
  stepProgress = 0;
  animationId = requestAnimationFrame(() => animateZigzag(result.order, head, maxCylinder));
};

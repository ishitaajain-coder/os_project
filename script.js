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
  let left = requests.filter(r => r < head).sort((a,b) => b - a); // Desc
  let right = requests.filter(r => r >= head).sort((a,b) => a - b);  // Asc

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
  let left = requests.filter(r => r < head).sort((a,b) => a - b); // Asc
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
  // Jump from maxCylinder to 0
  totalSeek += maxCylinder;
  current = 0;
  for (let r of left) {
    totalSeek += Math.abs(r - current);
    current = r;
    order.push(r);
  }
  return { order, totalSeek };
}

function drawDisk(requests, head, order, maxCylinder) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margin = 40;
  const usableWidth = canvas.width - 2 * margin;
  function getX(cyl) {
    return margin + (cyl / maxCylinder) * usableWidth;
  }

  // Draw base line for cylinders
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, 50);
  ctx.lineTo(canvas.width - margin, 50);
  ctx.stroke();

  // Draw ticks and labels every 20 cylinders
  ctx.fillStyle = '#666';
  ctx.font = '10px Arial';
  for (let tick = 0; tick <= maxCylinder; tick += 20) {
    let x = getX(tick);
    ctx.beginPath();
    ctx.moveTo(x, 45);
    ctx.lineTo(x, 55);
    ctx.stroke();
    ctx.fillText(tick, x - 10, 70);
  }

  // Draw request points
  ctx.fillStyle = 'blue';
  for (let r of requests) {
    let x = getX(r);
    ctx.beginPath();
    ctx.arc(x, 50, 6, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw initial head position
  ctx.fillStyle = 'green';
  let headX = getX(head);
  ctx.beginPath();
  ctx.arc(headX, 50, 8, 0, 2 * Math.PI);
  ctx.fill();
}

let index, animationFrameCount, pathPoints;

function animateSmooth() {
  ctx.clearRect(0, 80, canvas.width, 70);

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < pathPoints.length; i++) {
    let x = getX(pathPoints[i]);
    let y = 100;
    if (i === 0) ctx.moveTo(x, y);
    else {
      let prevX = getX(pathPoints[i - 1]);
      let ctrlX = (prevX + x) / 2;
      ctx.quadraticCurveTo(ctrlX, y - 20, x, y);
    }
  }
  ctx.stroke();

  if (index >= pathPoints.length - 1) {
    cancelAnimationFrame(animationId);
    return;
  }

  const framesPerStep = 30;
  animationFrameCount++;
  const startX = getX(pathPoints[index]);
  const endX = getX(pathPoints[index + 1]);
  const progress = animationFrameCount / framesPerStep;
  const currX = startX + (endX - startX) * progress;

  ctx.fillStyle = 'orange';
  ctx.shadowColor = 'rgba(255, 165, 0, 0.7)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(currX, 100, 12, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#222';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`Cylinder: ${Math.round(pathPoints[index] + (pathPoints[index + 1] - pathPoints[index]) * progress)}`, currX - 30, 80);

  if (animationFrameCount >= framesPerStep) {
    index++;
    animationFrameCount = 0;
  }

  animationId = requestAnimationFrame(animateSmooth);
}

function getX(cyl) {
  const margin = 40;
  const usableWidth = canvas.width - 2 * margin;
  return margin + (cyl / parseInt(maxCylinderInput.value)) * usableWidth;
}

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
  drawDisk(requests, head, result.order, maxCylinder);

  // Initialize animation variables
  index = 0;
  animationFrameCount = 0;
  pathPoints = [head, ...result.order];

  animationId = requestAnimationFrame(animateSmooth);
};

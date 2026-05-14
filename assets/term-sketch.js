(() => {
  const terms = window.SOLAR_TERMS || {};
  const key = document.body.dataset.term;
  const term = terms[key];

  if (!term) {
    throw new Error(`Missing term data: ${key}`);
  }

  const canvas = document.querySelector('#canvas');
  const ctx = canvas.getContext('2d');
  const stage = document.querySelector('#stage');
  const gyroButton = document.querySelector('#gyroButton');
  const title = document.querySelector('#termTitle');

  canvas.width = term.width;
  canvas.height = term.height;
  title.textContent = term.label;
  document.title = `${term.label}交互`;

  let pointerX = term.width / 2;
  let pointerY = term.height / 2;
  let targetX = pointerX;
  let targetY = pointerY;
  let gyroBaseGamma = null;
  let gyroBaseBeta = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function map(value, start1, stop1, start2, stop2) {
    return start2 + ((stop2 - start2) * (value - start1)) / (stop1 - start1);
  }

  function lerp(start, stop, amount) {
    return start + (stop - start) * amount;
  }

  function lerpColor(a, b, amount) {
    return a.map((value, index) => Math.round(lerp(value, b[index], amount)));
  }

  function setPointerFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    targetX = clamp(((clientX - rect.left) / rect.width) * term.width, 0, term.width - 1);
    targetY = clamp(((clientY - rect.top) / rect.height) * term.height, 0, term.height - 1);
  }

  function drawStroke(points, upAmount, downAmount, leftAmount, rightAmount) {
    const [ox1, oy1, ox2, oy2, ux1, uy1, ux2, uy2, dx1, dy1, dx2, dy2, lx1, ly1, lx2, ly2, rx1, ry1, rx2, ry2] = points;
    let x1 = ox1;
    let y1 = oy1;
    let x2 = ox2;
    let y2 = oy2;

    if (upAmount > 0) {
      y1 = lerp(oy1, uy1, upAmount);
      y2 = lerp(oy2, uy2, upAmount);
    }

    if (downAmount > 0) {
      y1 = lerp(oy1, dy1, downAmount);
      y2 = lerp(oy2, dy2, downAmount);
    }

    if (leftAmount > 0) {
      x1 = lerp(ox1, lx1, leftAmount);
      x2 = lerp(ox2, lx2, leftAmount);
    }

    if (rightAmount > 0) {
      x1 = lerp(ox1, rx1, rightAmount);
      x2 = lerp(ox2, rx2, rightAmount);
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function draw() {
    pointerX = targetX;
    pointerY = targetY;

    const bgAmount = clamp(map(pointerY, 0, term.height, 0, 1), 0, 1);
    const [r, g, b] = lerpColor(term.light, term.dark, bgAmount);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, term.width, term.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.lineWidth = clamp(map(pointerY, 0, term.height, 1, 20), 1, 20);

    const centerX = term.width / 2;
    const centerY = term.height / 2;
    const upAmount = pointerY < centerY ? clamp(map(pointerY, centerY, 0, 0, 1), 0, 1) : 0;
    const downAmount = pointerY > centerY ? clamp(map(pointerY, centerY, term.height - 1, 0, 1), 0, 1) : 0;
    const leftAmount = pointerX < centerX ? clamp(map(pointerX, centerX, 0, 0, 1), 0, 1) : 0;
    const rightAmount = pointerX > centerX ? clamp(map(pointerX, centerX, term.width - 1, 0, 1), 0, 1) : 0;

    term.strokes.forEach((stroke) => drawStroke(stroke, upAmount, downAmount, leftAmount, rightAmount));
    requestAnimationFrame(draw);
  }

  function handleDeviceOrientation(event) {
    const gamma = event.gamma || 0;
    const beta = event.beta || 0;

    if (gyroBaseGamma === null || gyroBaseBeta === null) {
      gyroBaseGamma = gamma;
      gyroBaseBeta = beta;
      targetX = term.width / 2;
      targetY = term.height / 2;
      return;
    }

    const deltaGamma = clamp(gamma - gyroBaseGamma, -28, 28);
    const deltaBeta = clamp(beta - gyroBaseBeta, -28, 28);
    targetX = map(deltaGamma, -28, 28, 0, term.width - 1);
    targetY = map(deltaBeta, -28, 28, 0, term.height - 1);
  }

  async function enableGyro() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      gyroButton.textContent = '当前设备不支持';
      return;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        gyroButton.textContent = '未授权';
        return;
      }
    }

    gyroBaseGamma = null;
    gyroBaseBeta = null;
    targetX = term.width / 2;
    targetY = term.height / 2;
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    gyroButton.textContent = '陀螺仪已启用';
  }

  stage.addEventListener('pointermove', (event) => setPointerFromClient(event.clientX, event.clientY));
  stage.addEventListener('pointerdown', (event) => setPointerFromClient(event.clientX, event.clientY));
  gyroButton.addEventListener('click', enableGyro);

  draw();
})();

// 摇杆状态
let joystick = { active: false, dx: 0, dy: 0, distance: 0, touchId: null };
const joystickCanvas = document.getElementById('joystickCanvas');
const jctx = joystickCanvas.getContext('2d');
const JOYSTICK = { size: 140, centerX: 70, centerY: 70, bgRadius: 55, knobRadius: 24, maxOffset: 31 };

function initJoystickCanvas() {
  joystickCanvas.width = JOYSTICK.size;
  joystickCanvas.height = JOYSTICK.size;
  drawJoystick(0, 0, false);
}

function drawJoystick(knobX, knobY, active) {
  const ctx = jctx, cx = JOYSTICK.centerX, cy = JOYSTICK.centerY;
  ctx.clearRect(0, 0, JOYSTICK.size, JOYSTICK.size);
  ctx.beginPath(); ctx.arc(cx, cy, JOYSTICK.bgRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - JOYSTICK.bgRadius + 5, cy); ctx.lineTo(cx + JOYSTICK.bgRadius - 5, cy);
  ctx.moveTo(cx, cy - JOYSTICK.bgRadius + 5); ctx.lineTo(cx, cy + JOYSTICK.bgRadius - 5); ctx.stroke();
  const kx = active ? cx + knobX : cx, ky = active ? cy + knobY : cy;
  ctx.beginPath(); ctx.arc(kx, ky, JOYSTICK.knobRadius, 0, Math.PI * 2);
  ctx.fillStyle = active ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.25)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(kx, ky, JOYSTICK.knobRadius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)'; ctx.fill();
}

function updateJoystickFromPos(posX, posY) {
  const cx = JOYSTICK.centerX, cy = JOYSTICK.centerY;
  let dx = posX - cx, dy = posY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy), maxOff = JOYSTICK.maxOffset;
  if (dist > maxOff) { dx = (dx / dist) * maxOff; dy = (dy / dist) * maxOff; }
  const clampedDist = Math.min(dist, maxOff);
  joystick.dx = maxOff > 0 ? dx / maxOff : 0;
  joystick.dy = maxOff > 0 ? dy / maxOff : 0;
  joystick.distance = maxOff > 0 ? clampedDist / maxOff : 0;
  joystick.active = true;
  drawJoystick(dx, dy, true);
}

function resetJoystick() {
  joystick.active = false; joystick.dx = 0; joystick.dy = 0;
  joystick.distance = 0; joystick.touchId = null;
  drawJoystick(0, 0, false);
}

// 事件绑定
function bindJoystickEvents() {
  joystickCanvas.addEventListener('touchstart', onJoystickStart, { passive: false });
  joystickCanvas.addEventListener('touchmove', onJoystickMove, { passive: false });
  joystickCanvas.addEventListener('touchend', onJoystickEnd);
  joystickCanvas.addEventListener('touchcancel', onJoystickEnd);
  joystickCanvas.addEventListener('mousedown', onJoystickStart);
  window.addEventListener('mousemove', onJoystickMove);
  window.addEventListener('mouseup', onJoystickEnd);
}

function unbindJoystickEvents() {
  joystickCanvas.removeEventListener('touchstart', onJoystickStart);
  joystickCanvas.removeEventListener('touchmove', onJoystickMove);
  joystickCanvas.removeEventListener('touchend', onJoystickEnd);
  joystickCanvas.removeEventListener('touchcancel', onJoystickEnd);
  joystickCanvas.removeEventListener('mousedown', onJoystickStart);
  window.removeEventListener('mousemove', onJoystickMove);
  window.removeEventListener('mouseup', onJoystickEnd);
}

function onJoystickStart(e) {
  e.preventDefault();
  if (!battleRunning || GameState.battle.paused) return;
  const pos = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  const rect = joystickCanvas.getBoundingClientRect();
  const localX = pos.x - rect.left, localY = pos.y - rect.top;
  if (e.touches && e.touches.length > 0) joystick.touchId = e.touches[0].identifier;
  updateJoystickFromPos(localX, localY);
}

function onJoystickMove(e) {
  e.preventDefault();
  if (!battleRunning || GameState.battle.paused) return;
  if (!joystick.active && !e.touches) return;
  let pos;
  if (e.touches) {
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystick.touchId) {
        pos = { x: e.touches[i].clientX, y: e.touches[i].clientY };
        break;
      }
    }
    if (!pos && joystick.touchId !== null) return;
    if (!pos && joystick.touchId === null && e.touches.length > 0) {
      pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      joystick.touchId = e.touches[0].identifier;
    }
  } else {
    if (!joystick.active) return;
    pos = { x: e.clientX, y: e.clientY };
  }
  if (!pos) return;
  const rect = joystickCanvas.getBoundingClientRect();
  const localX = pos.x - rect.left, localY = pos.y - rect.top;
  updateJoystickFromPos(localX, localY);
}

function onJoystickEnd(e) {
  e.preventDefault();
  if (e.touches && e.touches.length === 0) resetJoystick();
  else if (!e.touches) resetJoystick();
  else if (e.touches) {
    let found = false;
    for (let i = 0; i < e.touches.length; i++)
      if (e.touches[i].identifier === joystick.touchId) { found = true; break; }
    if (!found) resetJoystick();
  }
}
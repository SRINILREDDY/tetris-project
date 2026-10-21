import { Game, SHAPES, WIDTH, HEIGHT } from './engine.js';

const game = new Game();
const board = document.querySelector('#board');
const preview = document.querySelector('#next');
const context = board.getContext('2d');
const previewContext = preview.getContext('2d');
const startButton = document.querySelector('#start');
const pauseButton = document.querySelector('#pause');
const overlay = document.querySelector('#overlay');
const colours = ['#080f18', '#66d9e8', '#6d9df6', '#f4ae69', '#f4dc77', '#a9da82', '#b79cea', '#ed8994'];
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem('stack-best')) || 0); } catch {}
let previousTime = performance.now();
let elapsed = 0;
let previousStatus = '';

function prepareCanvas(canvas, ctx, width, height) {
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function tile(ctx, x, y, value, size, ghost = false) {
  if (!value) return;
  ctx.fillStyle = ghost ? `${colours[value]}12` : colours[value];
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  ctx.strokeStyle = ghost ? `${colours[value]}66` : '#ffffff36';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
  if (!ghost) {
    ctx.fillStyle = '#ffffff26';
    ctx.fillRect(x + 3, y + 3, size - 6, 3);
  }
}

function draw() {
  context.fillStyle = '#080f18';
  context.fillRect(0, 0, 300, 600);
  context.strokeStyle = '#192532';
  context.lineWidth = .5;
  for (let x = 0; x <= WIDTH; x++) {
    context.beginPath(); context.moveTo(x * 30, 0); context.lineTo(x * 30, 600); context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y++) {
    context.beginPath(); context.moveTo(0, y * 30); context.lineTo(300, y * 30); context.stroke();
  }
  game.board.forEach((row, y) => row.forEach((value, x) => tile(context, x * 30, y * 30, value, 30)));
  if (game.active && game.status !== 'over') {
    const ghostY = game.ghostY();
    game.active.matrix.forEach((row, y) => row.forEach((value, x) => {
      tile(context, (game.active.x + x) * 30, (ghostY + y) * 30, value, 30, true);
      tile(context, (game.active.x + x) * 30, (game.active.y + y) * 30, value, 30);
    }));
  }
  previewContext.clearRect(0, 0, 120, 100);
  const next = SHAPES[game.next];
  const occupied = [];
  next.forEach((row, y) => row.forEach((value, x) => { if (value) occupied.push({ x, y, value }); }));
  const minX = Math.min(...occupied.map(cell => cell.x));
  const minY = Math.min(...occupied.map(cell => cell.y));
  const width = Math.max(...occupied.map(cell => cell.x)) - minX + 1;
  const height = Math.max(...occupied.map(cell => cell.y)) - minY + 1;
  occupied.forEach(cell => tile(previewContext, (120 - width * 25) / 2 + (cell.x - minX) * 25,
    (100 - height * 25) / 2 + (cell.y - minY) * 25, cell.value, 25));
}

function refresh() {
  if (game.score > best) {
    best = game.score;
    try { localStorage.setItem('stack-best', String(best)); } catch {}
  }
  document.querySelector('#score').textContent = String(game.score).padStart(6, '0');
  document.querySelector('#best').textContent = String(best).padStart(6, '0');
  document.querySelector('#lines').textContent = String(game.lines).padStart(2, '0');
  document.querySelector('#level').textContent = String(game.level).padStart(2, '0');
  document.querySelector('#level-speed').textContent = `LEVEL ${String(game.level).padStart(2, '0')}`;
  const labels = { ready: 'READY TO PLAY', playing: 'IN THE FLOW', paused: 'TAKE A BREATHER', over: 'ONE MORE ROUND?' };
  document.querySelector('#status-label').textContent = labels[game.status];
  pauseButton.disabled = !['playing', 'paused'].includes(game.status);
  pauseButton.firstChild.textContent = game.status === 'paused' ? 'Resume ' : 'Pause ';
  startButton.firstChild.textContent = game.status === 'ready' ? 'Start game ' : 'Restart game ';
  overlay.hidden = game.status === 'playing';
  if (game.status !== previousStatus) {
    const messages = {
      ready: ['YOUR NEXT CHALLENGE', 'Find your flow.', 'Press Start game to begin.'],
      paused: ['NO RUSH', 'Take a breather.', 'Press P or Resume to keep going.'],
      over: ['A GOOD RUN', 'Build again.', `You scored ${game.score}. Press R to restart.`],
    };
    if (messages[game.status]) {
      const [kicker, title, copy] = messages[game.status];
      document.querySelector('#overlay-kicker').textContent = kicker;
      document.querySelector('#overlay-title').textContent = title;
      document.querySelector('#overlay-copy').textContent = copy;
      document.querySelector('#announcement').textContent = `${title} ${copy}`;
    } else document.querySelector('#announcement').textContent = 'Game started.';
    previousStatus = game.status;
  }
  draw();
}

function start() {
  game.start(); elapsed = 0; board.focus({ preventScroll: true }); refresh();
}

function act(action) {
  if (action === 'pause') game.pause();
  else if (action === 'left') game.move(-1);
  else if (action === 'right') game.move(1);
  else if (action === 'rotate') game.rotate();
  else if (action === 'down') game.step(true);
  else if (action === 'drop') { game.hardDrop(); elapsed = 0; }
  board.focus({ preventScroll: true });
  refresh();
}

startButton.addEventListener('click', start);
pauseButton.addEventListener('click', () => act('pause'));
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => act(button.dataset.action));
});
board.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const actions = { arrowleft: 'left', arrowright: 'right', arrowup: 'rotate', arrowdown: 'down', ' ': 'drop', p: 'pause', escape: 'pause' };
  if (key === 'r' || key === 'enter') {
    event.preventDefault(); if (!event.repeat) start();
  } else if (actions[key]) {
    event.preventDefault();
    if (event.repeat && ['pause', 'drop', 'rotate'].includes(actions[key])) return;
    act(actions[key]);
  }
});
function pauseWhenHidden() {
  if (game.status === 'playing') { game.pause(); refresh(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenHidden(); });
window.addEventListener('blur', pauseWhenHidden);
function resize() {
  prepareCanvas(board, context, 300, 600);
  prepareCanvas(preview, previewContext, 120, 100);
  draw();
}
window.addEventListener('resize', resize);
function frame(time) {
  const delta = Math.min(100, time - previousTime);
  previousTime = time;
  if (game.status === 'playing') {
    elapsed += delta;
    if (elapsed >= game.fallInterval) { game.step(); elapsed = 0; refresh(); }
  } else elapsed = 0;
  requestAnimationFrame(frame);
}
resize();
refresh();
requestAnimationFrame(frame);

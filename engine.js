export const WIDTH = 10;
export const HEIGHT = 20;

// Values also identify the block colours. Rotation uses simple horizontal kicks.
export const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
  L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
  O: [[4, 4], [4, 4]],
  S: [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
  T: [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
  Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
};

export function rotateClockwise(matrix) {
  return matrix[0].map((_, x) => matrix.map(row => row[x]).reverse());
}

export function shuffledBag(random = Math.random) {
  const bag = Object.keys(SHAPES);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export class Game {
  constructor(random = Math.random) {
    this.random = random;
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.status = 'ready';
    this.active = null;
    this.bag = [];
    this.next = this.takeType();
  }

  takeType() {
    if (!this.bag.length) this.bag = shuffledBag(this.random);
    return this.bag.pop();
  }

  start() {
    this.reset();
    this.status = 'playing';
    this.spawn();
  }

  spawn() {
    const type = this.next;
    this.next = this.takeType();
    const matrix = SHAPES[type].map(row => [...row]);
    this.active = { type, matrix, x: Math.floor((WIDTH - matrix[0].length) / 2), y: 0 };
    if (!this.fits(matrix, this.active.x, this.active.y)) this.status = 'over';
  }

  fits(matrix, originX, originY) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (!matrix[y][x]) continue;
        const column = originX + x;
        const row = originY + y;
        if (column < 0 || column >= WIDTH || row < 0 || row >= HEIGHT) return false;
        if (this.board[row][column]) return false;
      }
    }
    return true;
  }

  move(dx) {
    if (this.status !== 'playing') return false;
    const { matrix, x, y } = this.active;
    if (!this.fits(matrix, x + dx, y)) return false;
    this.active.x += dx;
    return true;
  }

  rotate() {
    if (this.status !== 'playing') return false;
    const matrix = rotateClockwise(this.active.matrix);
    for (const offset of [0, -1, 1, -2, 2]) {
      if (this.fits(matrix, this.active.x + offset, this.active.y)) {
        this.active.matrix = matrix;
        this.active.x += offset;
        return true;
      }
    }
    return false;
  }

  step(manual = false) {
    if (this.status !== 'playing') return false;
    const { matrix, x, y } = this.active;
    if (this.fits(matrix, x, y + 1)) {
      this.active.y++;
      if (manual) this.score++;
      return true;
    }
    this.lock();
    return false;
  }

  hardDrop() {
    if (this.status !== 'playing') return 0;
    const startY = this.active.y;
    this.active.y = this.ghostY();
    const distance = this.active.y - startY;
    this.score += distance * 2;
    this.lock();
    return distance;
  }

  ghostY() {
    if (!this.active) return 0;
    const { matrix, x } = this.active;
    let y = this.active.y;
    while (this.fits(matrix, x, y + 1)) y++;
    return y;
  }

  lock() {
    if (this.status !== 'playing') return;
    const { matrix, x, y } = this.active;
    matrix.forEach((row, dy) => row.forEach((value, dx) => {
      if (value) this.board[y + dy][x + dx] = value;
    }));
    const remaining = this.board.filter(row => row.some(value => value === 0));
    const cleared = HEIGHT - remaining.length;
    this.score += [0, 100, 300, 500, 800][cleared] * this.level;
    this.lines += cleared;
    this.level = 1 + Math.floor(this.lines / 10);
    this.board = [
      ...Array.from({ length: cleared }, () => Array(WIDTH).fill(0)),
      ...remaining,
    ];
    this.spawn();
  }

  pause() {
    if (this.status === 'playing') this.status = 'paused';
    else if (this.status === 'paused') this.status = 'playing';
  }

  get fallInterval() {
    return Math.max(90, 800 - (this.level - 1) * 60);
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SHAPES, WIDTH, HEIGHT, rotateClockwise, shuffledBag } from '../engine.js';

test('a new game starts with an empty board, score zero and a valid piece', () => {
  const game = new Game(() => 0.25);
  game.start();
  assert.equal(game.status, 'playing');
  assert.equal(game.score, 0);
  assert.equal(game.board.length, HEIGHT);
  assert.ok(game.board.every(row => row.length === WIDTH && row.every(value => value === 0)));
  assert.ok(game.fits(game.active.matrix, game.active.x, game.active.y));
});

test('every bag contains each of the seven pieces exactly once', () => {
  assert.deepEqual(shuffledBag(() => 0.25).sort(), Object.keys(SHAPES).sort());
});

test('movement cannot cross the wall or pass through a settled block', () => {
  const game = new Game(); game.start();
  game.active = { type: 'O', matrix: SHAPES.O, x: 0, y: 0 };
  assert.equal(game.move(-1), false);
  game.board[0][2] = 1;
  assert.equal(game.move(1), false);
  assert.equal(game.active.x, 0);
});

test('rotation preserves a piece after four turns', () => {
  for (const shape of Object.values(SHAPES)) {
    let result = shape;
    for (let i = 0; i < 4; i++) result = rotateClockwise(result);
    assert.deepEqual(result, shape);
  }
});

test('horizontal wall kicks keep a rotated I piece inside the board', () => {
  const game = new Game(); game.start();
  game.active = { type: 'I', matrix: rotateClockwise(SHAPES.I), x: 7, y: 2 };
  assert.ok(game.fits(game.active.matrix, game.active.x, game.active.y));
  assert.equal(game.rotate(), true);
  assert.ok(game.fits(game.active.matrix, game.active.x, game.active.y));
});

test('hard drop locks four cells, awards drop points and spawns the next piece', () => {
  const game = new Game(); game.start();
  game.active = { type: 'O', matrix: SHAPES.O, x: 4, y: 0 };
  const distance = game.hardDrop();
  assert.equal(distance, 18);
  assert.equal(game.score, 36);
  assert.equal(game.board.flat().filter(Boolean).length, 4);
  assert.equal(game.status, 'playing');
});

test('clearing two rows removes their blocks and awards the correct score', () => {
  const game = new Game(); game.start();
  for (const y of [18, 19]) game.board[y] = Array.from({ length: WIDTH }, (_, x) => x === 4 || x === 5 ? 0 : 1);
  game.active = { type: 'O', matrix: SHAPES.O, x: 4, y: 18 };
  game.step();
  assert.equal(game.lines, 2);
  assert.equal(game.score, 300);
  assert.equal(game.board.flat().filter(Boolean).length, 0);
});

test('clearing the tenth line advances the level and speeds up gravity', () => {
  const game = new Game(); game.start(); game.lines = 9;
  game.board[19] = Array.from({ length: WIDTH }, (_, x) => x >= 3 && x <= 6 ? 0 : 1);
  game.active = { type: 'I', matrix: SHAPES.I, x: 3, y: 18 };
  game.step();
  assert.equal(game.lines, 10);
  assert.equal(game.level, 2);
  assert.equal(game.score, 100);
  assert.ok(game.fallInterval < 800);
});

test('blocked spawn ends the game and prevents additional moves', () => {
  const game = new Game(); game.start();
  game.board[0].fill(1); game.board[1].fill(1);
  game.spawn();
  assert.equal(game.status, 'over');
  assert.equal(game.move(1), false);
  assert.equal(game.hardDrop(), 0);
});

test('pause freezes movement and a restart clears the previous game', () => {
  const game = new Game(); game.start();
  const y = game.active.y;
  game.pause(); game.step();
  assert.equal(game.active.y, y);
  assert.equal(game.rotate(), false);
  game.pause(); assert.equal(game.status, 'playing');
  game.hardDrop(); game.start();
  assert.equal(game.score, 0);
  assert.equal(game.lines, 0);
  assert.equal(game.level, 1);
  assert.ok(game.board.flat().every(value => value === 0));
});

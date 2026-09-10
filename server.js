'use strict';

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Room, genRoomCode } = require('./game/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

/** @type {Map<string, Room>} */
const rooms = new Map();

function findRoomOfSocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId)) return room;
  }
  return null;
}

io.on('connection', (socket) => {
  socket.data.roomCode = null;

  socket.on('create_room', ({ nickname, ante, startingChips, maxPlayers } = {}, cb) => {
    let code;
    do {
      code = genRoomCode();
    } while (rooms.has(code));

    const room = new Room(io, code, {
      ante: clampNumber(ante, 100, 1000000, 1000),
      startingChips: clampNumber(startingChips, 1000, 100000000, 100000),
      maxPlayers: clampNumber(maxPlayers, 2, 5, 5),
    });
    rooms.set(code, room);

    const result = room.addPlayer(socket, nickname);
    if (result.error) {
      rooms.delete(code);
      if (cb) cb({ error: result.error });
      return;
    }
    socket.data.roomCode = code;
    if (cb) cb({ ok: true, code });
  });

  socket.on('join_room', ({ code, nickname } = {}, cb) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) {
      if (cb) cb({ error: '존재하지 않는 방 코드입니다.' });
      return;
    }
    const result = room.addPlayer(socket, nickname);
    if (result.error) {
      if (cb) cb({ error: result.error });
      return;
    }
    socket.data.roomCode = room.code;
    if (cb) cb({ ok: true, code: room.code });
  });

  socket.on('start_game', (_payload, cb) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return cb && cb({ error: '방을 찾을 수 없습니다.' });
    const result = room.startGame(socket.id);
    if (cb) cb(result);
  });

  socket.on('player_action', ({ action, amount } = {}, cb) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return cb && cb({ error: '방을 찾을 수 없습니다.' });
    const result = room.handleAction(socket.id, action, amount);
    if (cb) cb(result);
  });

  socket.on('chat_message', ({ text } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !text) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    const clean = String(text).slice(0, 200);
    io.to(room.code).emit('chat_message', { nickname: player.nickname, text: clean, ts: Date.now() });
  });

  socket.on('leave_room', (_payload, cb) => {
    leaveCurrentRoom(socket);
    if (cb) cb({ ok: true });
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket, true);
  });
});

function leaveCurrentRoom(socket, disconnecting) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  const empty = disconnecting ? room.markDisconnected(socket.id) : room.removePlayer(socket.id);
  socket.leave(code);
  socket.data.roomCode = null;
  if (empty) rooms.delete(code);
}

function clampNumber(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`섯다 온라인 서버 실행 중: http://localhost:${PORT}`);
});

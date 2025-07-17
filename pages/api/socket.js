// pages/api/socket.js - Working Socket.IO API without Redis
import { Server } from 'socket.io';

// In-memory storage
const rooms = new Map();
const players = new Map();

// Word lists
const wordLists = {
  easy: ['cat', 'dog', 'run', 'jump', 'red', 'blue', 'car', 'sun', 'day', 'moon', 'star', 'tree', 'book', 'pen', 'hat', 'cup', 'bed', 'key', 'box', 'ball', 'fish', 'bird', 'ship', 'milk', 'egg', 'door', 'hand', 'foot', 'eye', 'ear'],
  medium: ['dragon', 'knight', 'castle', 'wizard', 'potion', 'spell', 'magic', 'quest', 'adventure', 'dungeon', 'treasure', 'monster', 'hero', 'journey', 'battle', 'legend', 'myth', 'scroll', 'sword', 'shield', 'armor', 'enemy', 'victory', 'defeat', 'champion', 'challenge', 'realm', 'kingdom', 'power', 'strength'],
  hard: ['achievement', 'courageous', 'fortunate', 'strategy', 'adventure', 'solution', 'discovery', 'triangle', 'election', 'creature', 'calendar', 'electric', 'vacation', 'dangerous', 'language', 'resource', 'improve', 'backpack', 'volcano', 'favorite']
};

function generateWordQueue(difficulty) {
  const wordList = wordLists[difficulty] || wordLists.medium;
  const queue = [];
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    queue.push(wordList[randomIndex]);
  }
  return queue;
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(),
      gameState: 'waiting',
      gameData: null,
      createdAt: Date.now()
    });
    console.log(` Created room: ${roomId}`);
  }
  return rooms.get(roomId);
}

function mapToObject(map) {
  const obj = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

export default function handler(req, res) {
  console.log(' Socket.IO API route called');
  
  if (!res.socket.server.io) {
    console.log(' Starting Socket.IO server...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(` Player connected: ${socket.id}`);

      // Store player
      players.set(socket.id, {
        id: socket.id,
        name: '',
        roomId: null,
        wordsCompleted: 0
      });

      // Join room
      socket.on('joinRoom', ({ roomId, playerName }) => {
        try {
          console.log(` ${playerName} joining room: ${roomId}`);
          
          const room = getOrCreateRoom(roomId);
          
          if (room.players.size >= 2) {
            console.log(` Room ${roomId} is full`);
            socket.emit('roomFull');
            return;
          }

          // Remove from previous room
          const player = players.get(socket.id);
          if (player.roomId) {
            const oldRoom = rooms.get(player.roomId);
            if (oldRoom) {
              oldRoom.players.delete(socket.id);
              socket.leave(player.roomId);
            }
          }

          // Add to new room
          player.name = playerName;
          player.roomId = roomId;
          player.wordsCompleted = 0;
          
          room.players.set(socket.id, player);
          socket.join(roomId);

          console.log(` ${playerName} joined ${roomId} (${room.players.size}/2)`);

          // Notify players
          const playersObj = mapToObject(room.players);
          io.to(roomId).emit('playerJoined', { players: playersObj });
          socket.emit('roomJoined', { players: playersObj, roomId });

        } catch (error) {
          console.error(' Join room error:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Start game
      socket.on('startGame', ({ roomId, difficulty }) => {
        try {
          console.log(`🎮 Starting game in ${roomId}, difficulty: ${difficulty}`);
          
          const room = rooms.get(roomId);
          if (!room || room.players.size !== 2) {
            socket.emit('error', { message: 'Need 2 players to start' });
            return;
          }

          const wordQueue = generateWordQueue(difficulty);
          room.gameData = {
            wordQueue,
            currentWordIndex: 0,
            wordsToDefeat: 10,
            difficulty,
            startTime: Date.now()
          };
          room.gameState = 'playing';

          // Reset progress
          room.players.forEach(p => { p.wordsCompleted = 0; });

          console.log(` Game started! First word: ${wordQueue[0]}`);

          const playersObj = mapToObject(room.players);
          io.to(roomId).emit('gameStarted', {
            gameData: room.gameData,
            players: playersObj
          });

        } catch (error) {
          console.error(' Start game error:', error);
          socket.emit('error', { message: 'Failed to start game' });
        }
      });

      // Word completed
      socket.on('wordCompleted', ({ roomId, playerId }) => {
        try {
          const room = rooms.get(roomId);
          if (!room || room.gameState !== 'playing') return;

          const player = room.players.get(playerId);
          if (!player) return;

          player.wordsCompleted++;
          
          console.log(` ${player.name}: ${player.wordsCompleted}/10 words`);

          // Check win
          if (player.wordsCompleted >= room.gameData.wordsToDefeat) {
            room.gameState = 'finished';
            console.log(` ${player.name} wins!`);
            
            io.to(roomId).emit('gameEnded', {
              winner: playerId,
              players: mapToObject(room.players)
            });
            return;
          }

          // Send next word for this specific player
          const nextWord = room.gameData.wordQueue[player.wordsCompleted];
          
          console.log(` Next word for ${player.name}: ${nextWord}`);
          
          // Send individual word to the player who completed it
          socket.emit('nextWord', {
            nextWord: nextWord,
            players: mapToObject(room.players)
          });
          
          // Update other players about progress
          socket.to(roomId).emit('playerProgress', {
            players: mapToObject(room.players)
          });

        } catch (error) {
          console.error(' Word completed error:', error);
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(` Player disconnected: ${socket.id}`);
        
        const player = players.get(socket.id);
        if (player && player.roomId) {
          const room = rooms.get(player.roomId);
          if (room) {
            room.players.delete(socket.id);
            socket.to(player.roomId).emit('playerLeft', { 
              players: mapToObject(room.players) 
            });
            
            if (room.players.size === 0) {
              rooms.delete(player.roomId);
              console.log(`🗑️ Deleted empty room: ${player.roomId}`);
            }
          }
        }
        
        players.delete(socket.id);
      });

      // Debug
      socket.on('ping', () => socket.emit('pong'));
    });

    console.log(' Socket.IO server ready!');
  } else {
    console.log(' Socket.IO server already running');
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
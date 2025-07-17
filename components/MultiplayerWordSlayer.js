import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Word lists for different difficulties
const wordLists = {
  easy: ['cat', 'dog', 'run', 'jump', 'red', 'blue', 'car', 'sun', 'day', 'moon', 'star', 'tree', 'book', 'pen', 'hat', 'cup', 'bed', 'key', 'box', 'ball', 'fish', 'bird', 'ship', 'milk', 'egg', 'door', 'hand', 'foot', 'eye', 'ear'],
  medium: ['dragon', 'knight', 'castle', 'wizard', 'potion', 'spell', 'magic', 'quest', 'adventure', 'dungeon', 'treasure', 'monster', 'hero', 'journey', 'battle', 'legend', 'myth', 'scroll', 'sword', 'shield', 'armor', 'enemy', 'victory', 'defeat', 'champion', 'challenge', 'realm', 'kingdom', 'power', 'strength'],
  hard: ['achievement', 'courageous', 'fortunate', 'strategy', 'adventure', 'solution', 'discovery', 'triangle', 'election', 'creature', 'calendar', 'electric', 'vacation', 'dangerous', 'language', 'resource', 'improve', 'backpack', 'volcano', 'favorite']
};

// Game states
const GAME_STATES = {
  LOBBY: 'lobby',
  WAITING: 'waiting',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};

const MultiplayerWordSlayer = () => {
  // Connection state
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');

  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.LOBBY);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [currentWord, setCurrentWord] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [players, setPlayers] = useState({});
  const [myPlayerId, setMyPlayerId] = useState('');
  const [gameData, setGameData] = useState({
    currentWordIndex: 0,
    wordQueue: [],
    wordsToDefeat: 10
  });

  // Performance tracking
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [actualTypingTime, setActualTypingTime] = useState(0);
  const [wordStartTime, setWordStartTime] = useState(null);
  
  const inputRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    console.log(' Initializing socket connection...');
    setConnectionStatus('connecting');

    const initializeConnection = async () => {
      try {
        // Step 1: Initialize the Socket.IO server
        console.log(' Initializing Socket.IO server...');
        
        const initResponse = await fetch('/api/socket', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(' Server initialization request sent');
        
        // Step 2: Wait a moment for server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Connect to Socket.IO
        console.log(' Connecting to Socket.IO...');
        
        const newSocket = io('http://localhost:3000', {
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          timeout: 15000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
        });

        // Connection events
        newSocket.on('connect', () => {
          console.log(' Connected to server! Socket ID:', newSocket.id);
          setMyPlayerId(newSocket.id);
          setConnectionStatus('connected');
          setError('');
          
          // Test ping
          newSocket.emit('ping');
        });

        newSocket.on('connect_error', (err) => {
          console.error(' Connection error:', err);
          setConnectionStatus('error');
          setError(`Connection failed: ${err.message || 'Server not responding'}`);
        });

        newSocket.on('disconnect', (reason) => {
          console.log(' Disconnected:', reason);
          setConnectionStatus('disconnected');
          setError('Connection lost');
        });

        newSocket.on('pong', () => {
          console.log(' Ping successful - server is responding');
        });

        // Game events
        newSocket.on('roomJoined', (data) => {
          console.log(' Room joined:', data);
          setPlayers(data.players);
          setGameState(GAME_STATES.WAITING);
          setError('');
        });

        newSocket.on('roomFull', () => {
          console.log(' Room is full');
          setError('Room is full!');
        });

        newSocket.on('playerJoined', (data) => {
          console.log(' Player joined:', data);
          setPlayers(data.players);
        });

        newSocket.on('playerLeft', (data) => {
          console.log(' Player left:', data);
          setPlayers(data.players);
        });

        newSocket.on('gameStarted', (data) => {
          console.log(' Game started:', data);
          setGameData(data.gameData);
          setCurrentWord(data.gameData.wordQueue[0]);
          setGameState(GAME_STATES.PLAYING);
          setStartTime(Date.now());
          setWordsTyped(0);
          setCorrectWords(0);
          setActualTypingTime(0);
          
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 100);
        });

        // Handle individual word progression
        newSocket.on('nextWord', (data) => {
          console.log(' Next word for me:', data.nextWord);
          setCurrentWord(data.nextWord);
          setPlayers(data.players);
        });

        // Handle other players' progress updates
        newSocket.on('playerProgress', (data) => {
          console.log(' Player progress update:', data);
          setPlayers(data.players);
        });

        // Keep the old wordCompleted for backward compatibility
        newSocket.on('wordCompleted', (data) => {
          console.log(' Word completed (legacy):', data);
          setPlayers(data.players);
          if (data.nextWord) {
            setCurrentWord(data.nextWord);
          }
        });

        newSocket.on('gameEnded', (data) => {
          console.log(' Game ended:', data);
          setPlayers(data.players);
          setEndTime(Date.now());
          
          if (data.winner === newSocket.id) {
            setGameState(GAME_STATES.WIN);
          } else {
            setGameState(GAME_STATES.LOSE);
          }
        });

        newSocket.on('error', (data) => {
          console.error(' Server error:', data);
          setError(data.message || 'Server error occurred');
        });

        setSocket(newSocket);

      } catch (error) {
        console.error(' Failed to initialize connection:', error);
        setConnectionStatus('error');
        setError('Failed to connect to server');
      }
    };

    // Start the initialization process
    initializeConnection();

    return () => {
      if (socket) {
        console.log('🧹 Cleaning up socket connection');
        socket.close();
      }
    };
  }, []);

  // Join room
  const joinRoom = () => {
    console.log(' Join room clicked:', { roomId, playerName, connectionStatus });
    
    if (socket && roomId && playerName && connectionStatus === 'connected') {
      console.log(' Emitting joinRoom event...');
      socket.emit('joinRoom', { roomId: roomId.toUpperCase(), playerName });
      setError('');
    } else {
      console.log(' Cannot join room - missing requirements');
      setError('Please check connection and fill all fields');
    }
  };

  // Create room
  const createRoom = () => {
    console.log(' Create room clicked:', { playerName, connectionStatus });
    
    if (socket && playerName && connectionStatus === 'connected') {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomId(newRoomId);
      console.log(' Emitting joinRoom event for new room:', newRoomId);
      socket.emit('joinRoom', { roomId: newRoomId, playerName });
      setError('');
    } else {
      console.log(' Cannot create room - missing requirements');
      setError('Please check connection and enter name');
    }
  };

  // Start game
  const startGame = () => {
    if (socket && Object.keys(players).length === 2) {
      console.log('🎮 Starting game...');
      socket.emit('startGame', { roomId, difficulty });
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    if (inputValue === '' && e.target.value !== '') {
      setWordStartTime(Date.now());
    }
    
    setInputValue(e.target.value);
    
    if (e.target.value.toLowerCase() === currentWord.toLowerCase()) {
      if (wordStartTime) {
        const wordTypingTime = Date.now() - wordStartTime;
        setActualTypingTime(prevTime => prevTime + wordTypingTime);
      }
      
      setWordsTyped(wordsTyped + 1);
      setCorrectWords(correctWords + 1);
      setInputValue('');
      setWordStartTime(null);
      
      socket.emit('wordCompleted', { roomId, playerId: myPlayerId });
    }
  };

  // Calculate player positions
  const getPlayerPosition = (playerId) => {
    const player = players[playerId];
    if (!player) return 0;
    
    const totalWords = gameData.wordsToDefeat;
    const wordsCompleted = player.wordsCompleted;
    const maxDistance = 80;
    
    return (wordsCompleted * maxDistance) / totalWords;
  };

  // Calculate stats
  const calculateStats = () => {
    if (!startTime || !endTime) return { wpm: 0, accuracy: 0, timeTaken: 0 };
    
    const totalTimeTakenSeconds = (endTime - startTime) / 1000;
    const actualTypingTimeMinutes = actualTypingTime / 1000 / 60;
    
    let totalChars = 0;
    for (let i = 0; i < correctWords; i++) {
      if (gameData.wordQueue[i]) {
        totalChars += gameData.wordQueue[i].length;
      }
    }
    
    const traditionalWpm = Math.round((totalChars / 5) / (totalTimeTakenSeconds / 60));
    const adjustedWpm = actualTypingTimeMinutes > 0 
      ? Math.round((totalChars / 5) / actualTypingTimeMinutes) 
      : 0;
    
    const accuracy = wordsTyped > 0 ? Math.round((correctWords / wordsTyped) * 100) : 0;
    
    return {
      traditionalWpm,
      wpm: adjustedWpm,
      accuracy,
      timeTaken: totalTimeTakenSeconds.toFixed(1),
      actualTypingTime: (actualTypingTime / 1000).toFixed(1),
      totalWords: correctWords,
      totalChars
    };
  };

  const stats = calculateStats();

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="fixed top-4 right-4 z-50">
      <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
        connectionStatus === 'connected' ? 'bg-green-600' : 
        connectionStatus === 'connecting' ? 'bg-yellow-600' : 'bg-red-600'
      }`}>
        {connectionStatus === 'connected' && '🟢'}
        {connectionStatus === 'connecting' && '🟡'}
        {connectionStatus === 'disconnected' && '🔴'}
        {connectionStatus === 'error' && '🔴 Error'}
      </div>
    </div>
  );

  // Render lobby
  const renderLobby = () => (
    <div className="text-center max-w-lg">
      <h1 className="text-4xl font-bold mb-8 text-yellow-400 flex items-center justify-center">
        <span className="mr-2">⚔️</span> WordSlayer Online <span className="ml-2">🛡️</span>
      </h1>

      {error && (
        <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Join the Battle!</h2>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            disabled={connectionStatus !== 'connected'}
          />
          
          <input
            type="text"
            placeholder="Room ID (leave empty to create)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            disabled={connectionStatus !== 'connected'}
          />
          
          <div className="flex gap-4">
            <button
              onClick={createRoom}
              disabled={!playerName || connectionStatus !== 'connected'}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Create Room
            </button>
            
            <button
              onClick={joinRoom}
              disabled={!playerName || !roomId || connectionStatus !== 'connected'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render waiting room
  const renderWaitingRoom = () => (
    <div className="text-center max-w-lg">
      <h1 className="text-4xl font-bold mb-8 text-yellow-400">
        Room: {roomId}
      </h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Players in Room</h2>
        
        <div className="space-y-2 mb-6">
          {Object.values(players).map((player) => (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
              <span className="font-semibold">{player.name}</span>
              {player.id === myPlayerId && <span className="text-yellow-400">(You)</span>}
            </div>
          ))}
        </div>
        
        {Object.keys(players).length < 2 ? (
          <div>
            <p className="text-gray-400 mb-4">Waiting for another player...</p>
            <p className="text-sm text-gray-500">Room code: <span className="font-bold text-yellow-400">{roomId}</span></p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Select Difficulty</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDifficulty('easy')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  difficulty === 'easy' ? 'border-green-500 bg-green-800' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <h4 className="font-bold">Easy</h4>
                <p className="text-sm">Short words</p>
              </button>
              
              <button
                onClick={() => setDifficulty('medium')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  difficulty === 'medium' ? 'border-yellow-500 bg-yellow-800' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <h4 className="font-bold">Medium</h4>
                <p className="text-sm">Normal words</p>
              </button>
              
              <button
                onClick={() => setDifficulty('hard')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  difficulty === 'hard' ? 'border-red-500 bg-red-800' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <h4 className="font-bold">Hard</h4>
                <p className="text-sm">Complex words</p>
              </button>
            </div>
            
            <button
              onClick={startGame}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-xl transition-colors"
            >
              Start Battle!
            </button>
          </div>
        )}
      </div>
      
      <button
        onClick={() => {
          setGameState(GAME_STATES.LOBBY);
          setRoomId('');
          setPlayers({});
          setError('');
        }}
        className="text-gray-400 hover:text-white transition-colors"
      >
        ← Leave Room
      </button>
    </div>
  );

  // Render game
  const renderGame = () => (
    <div className="w-full max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div className="text-xl">
          Room: <span className="font-bold">{roomId}</span>
        </div>
        <div className="text-xl">
          Difficulty: <span className="font-bold capitalize">{difficulty}</span>
        </div>
        <div className="text-xl">
          Words: <span className="font-bold">{wordsTyped}</span>
        </div>
      </div>

      {/* Race Track */}
      <div className="relative h-80 bg-gray-800 rounded-lg mb-8 overflow-hidden">
        <div className="absolute inset-0 flex flex-col">
          {Object.values(players).map((player) => (
            <div key={player.id} className="flex-1 relative border-b border-gray-600 last:border-b-0">
              <div className="absolute top-2 left-4 z-10">
                <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  player.id === myPlayerId ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {player.name} ({player.wordsCompleted}/{gameData.wordsToDefeat})
                </div>
              </div>
              
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-out"
                style={{ left: `${10 + getPlayerPosition(player.id)}%` }}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  player.id === myPlayerId ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  🧙
                </div>
              </div>
              
              <div className="absolute top-0 right-4 h-full w-1 bg-yellow-500"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="text-4xl font-bold mb-4">{currentWord}</div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="w-full max-w-md px-4 py-3 text-xl bg-gray-800 border-2 border-yellow-500 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-yellow-600"
          autoFocus
          placeholder="Type the word here..."
        />
        
        <div className="mt-6">
          <div className="text-sm text-gray-400 mb-2">Coming up next for you:</div>
          <div className="flex flex-wrap justify-center gap-2">
            {gameData.wordQueue.slice(correctWords + 1, correctWords + 4).map((word, index) => (
              <div key={index} className="bg-gray-800 px-3 py-1 rounded text-gray-400">
                {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render results
  const renderResults = () => (
    <div className="text-center max-w-lg">
      <h1 className={`text-4xl font-bold mb-6 ${gameState === GAME_STATES.WIN ? 'text-green-400' : 'text-red-400'}`}>
        {gameState === GAME_STATES.WIN ? 'Victory!' : 'Defeat!'}
      </h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">Final Results</h2>
        
        <div className="space-y-4 mb-6">
          {Object.values(players).map((player) => {
            const isWinner = (gameState === GAME_STATES.WIN && player.id === myPlayerId) || 
                            (gameState === GAME_STATES.LOSE && player.id !== myPlayerId);
            return (
              <div key={player.id} className={`p-4 rounded-lg border-2 ${
                isWinner ? 'border-green-500 bg-green-800' : 'border-gray-600 bg-gray-700'
              }`}>
                <div className="font-bold text-lg">
                  {player.name} {isWinner && '👑'}
                </div>
                <div className="text-sm">Words: {player.wordsCompleted}/{gameData.wordsToDefeat}</div>
              </div>
            );
          })}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-left mb-6">
          <div className="flex flex-col">
            <span className="text-gray-400">Your WPM</span>
            <span className="text-2xl font-bold">{stats.wpm}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">Your Accuracy</span>
            <span className="text-2xl font-bold">{stats.accuracy}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">Total Time</span>
            <span className="text-2xl font-bold">{stats.timeTaken}s</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">Words Typed</span>
            <span className="text-2xl font-bold">{stats.totalWords}</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => {
          setGameState(GAME_STATES.LOBBY);
          setRoomId('');
          setPlayers({});
          setCurrentWord('');
          setInputValue('');
          setWordsTyped(0);
          setCorrectWords(0);
          setError('');
        }}
        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-xl transition-colors flex items-center justify-center mx-auto"
      >
        <span className="mr-2">🔄</span> Play Again
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <ConnectionStatus />
      {gameState === GAME_STATES.LOBBY && renderLobby()}
      {gameState === GAME_STATES.WAITING && renderWaitingRoom()}
      {gameState === GAME_STATES.PLAYING && renderGame()}
      {(gameState === GAME_STATES.WIN || gameState === GAME_STATES.LOSE) && renderResults()}
    </div>
  );
};

export default MultiplayerWordSlayer;
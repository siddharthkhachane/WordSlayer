import React, { useState, useEffect, useRef } from 'react';
import { Realtime } from 'ably';

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

const AblyMultiplayerWordSlayer = () => {
  // Ably connection
  const [ably, setAbly] = useState(null);
  const [channel, setChannel] = useState(null);
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

  // Generate word queue
  const generateWordQueue = (difficulty) => {
    const wordList = wordLists[difficulty] || wordLists.medium;
    const queue = [];
    for (let i = 0; i < 10; i++) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      queue.push(wordList[randomIndex]);
    }
    return queue;
  };

  // Initialize Ably connection
  useEffect(() => {
    const initializeAbly = async () => {
      try {
        console.log('🔧 Initializing Ably connection...');
        setConnectionStatus('connecting');

        // Check if API key is available
        const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
        if (!apiKey) {
          throw new Error('Ably API key not found. Please add NEXT_PUBLIC_ABLY_API_KEY to your environment variables.');
        }

        // Initialize Ably client
        const ablyClient = new Realtime({
          key: apiKey,
          clientId: `player_${Math.random().toString(36).substring(2, 15)}`
        });

        // Set up connection event handlers
        ablyClient.connection.on('connected', () => {
          console.log(' Connected to Ably');
          setConnectionStatus('connected');
          setMyPlayerId(ablyClient.auth.clientId);
          setError('');
        });

        ablyClient.connection.on('disconnected', () => {
          console.log(' Disconnected from Ably');
          setConnectionStatus('disconnected');
        });

        ablyClient.connection.on('failed', (error) => {
          console.error(' Ably connection failed:', error);
          setConnectionStatus('error');
          setError(`Connection failed: ${error.message}`);
        });

        setAbly(ablyClient);

      } catch (error) {
        console.error(' Failed to initialize Ably:', error);
        setConnectionStatus('error');
        setError(error.message);
      }
    };

    initializeAbly();

    return () => {
      if (ably) {
        ably.close();
      }
    };
  }, []);

  // Join or create room
  const joinRoom = async () => {
    if (!ably || !roomId || !playerName || connectionStatus !== 'connected') {
      setError('Please check connection and fill all fields');
      return;
    }

    try {
      console.log(`🚪 Joining room: ${roomId}`);
      
      // Get or create channel for the room
      const roomChannel = ably.channels.get(`wordslayer:room:${roomId.toUpperCase()}`);
      
      // Subscribe to room events
      await roomChannel.subscribe('player-joined', (message) => {
        console.log('👤 Player joined:', message.data);
        setPlayers(prevPlayers => ({
          ...prevPlayers,
          [message.data.playerId]: message.data.player
        }));
      });

      await roomChannel.subscribe('player-left', (message) => {
        console.log(' Player left:', message.data);
        setPlayers(prevPlayers => {
          const newPlayers = { ...prevPlayers };
          delete newPlayers[message.data.playerId];
          return newPlayers;
        });
      });

      await roomChannel.subscribe('room-full', () => {
        console.log(' Room is full');
        setError('Room is full!');
      });

      await roomChannel.subscribe('game-started', (message) => {
        console.log('🎮 Game started:', message.data);
        const { gameData: newGameData, players: newPlayers } = message.data;
        setGameData(newGameData);
        setCurrentWord(newGameData.wordQueue[0]);
        setPlayers(newPlayers);
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

      await roomChannel.subscribe('word-completed', (message) => {
        console.log(' Word completed:', message.data);
        if (message.data.playerId === myPlayerId) {
          // This is my word completion
          setCurrentWord(message.data.nextWord);
        }
        // Update all players' progress
        setPlayers(message.data.players);
      });

      await roomChannel.subscribe('game-ended', (message) => {
        console.log(' Game ended:', message.data);
        setPlayers(message.data.players);
        setEndTime(Date.now());
        
        if (message.data.winner === myPlayerId) {
          setGameState(GAME_STATES.WIN);
        } else {
          setGameState(GAME_STATES.LOSE);
        }
      });

      // Set the channel
      setChannel(roomChannel);

      // Join the room
      await roomChannel.publish('join-room', {
        playerId: myPlayerId,
        playerName: playerName,
        timestamp: Date.now()
      });

      // Wait for room state
      const roomState = await roomChannel.history({ limit: 50 });
      const existingPlayers = {};
      let playerCount = 0;

      // Process recent messages to get current room state
      roomState.items.reverse().forEach(message => {
        if (message.name === 'player-joined') {
          existingPlayers[message.data.playerId] = message.data.player;
          playerCount++;
        } else if (message.name === 'player-left') {
          delete existingPlayers[message.data.playerId];
          playerCount--;
        }
      });

      // Check room capacity
      if (playerCount >= 2 && !existingPlayers[myPlayerId]) {
        setError('Room is full!');
        await roomChannel.unsubscribe();
        return;
      }

      // Add myself to players
      const myPlayer = {
        id: myPlayerId,
        name: playerName,
        wordsCompleted: 0,
        joinedAt: Date.now()
      };

      existingPlayers[myPlayerId] = myPlayer;
      setPlayers(existingPlayers);

      // Notify others that I joined
      await roomChannel.publish('player-joined', {
        playerId: myPlayerId,
        player: myPlayer
      });

      setGameState(GAME_STATES.WAITING);
      setRoomId(roomId.toUpperCase());
      setError('');

    } catch (error) {
      console.error(' Error joining room:', error);
      setError('Failed to join room');
    }
  };

  const createRoom = async () => {
    if (!ably || !playerName || connectionStatus !== 'connected') {
      setError('Please check connection and enter name');
      return;
    }

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    
    // Use joinRoom logic with the new room ID
    setTimeout(() => {
      joinRoom();
    }, 100);
  };

  // Start game
  const startGame = async () => {
    if (!channel || Object.keys(players).length !== 2) {
      return;
    }

    try {
      console.log('🎮 Starting game...');
      
      const wordQueue = generateWordQueue(difficulty);
      const newGameData = {
        wordQueue,
        currentWordIndex: 0,
        wordsToDefeat: 10,
        difficulty,
        startTime: Date.now()
      };

      // Reset all players' progress
      const resetPlayers = { ...players };
      Object.keys(resetPlayers).forEach(playerId => {
        resetPlayers[playerId].wordsCompleted = 0;
      });

      await channel.publish('game-started', {
        gameData: newGameData,
        players: resetPlayers
      });

    } catch (error) {
      console.error(' Error starting game:', error);
      setError('Failed to start game');
    }
  };

  // Handle input change
  const handleInputChange = async (e) => {
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
      
      const newWordsTyped = wordsTyped + 1;
      const newCorrectWords = correctWords + 1;
      
      setWordsTyped(newWordsTyped);
      setCorrectWords(newCorrectWords);
      setInputValue('');
      setWordStartTime(null);
      
      // Update my progress
      const updatedPlayers = { ...players };
      updatedPlayers[myPlayerId].wordsCompleted = newCorrectWords;

      // Check win condition
      if (newCorrectWords >= gameData.wordsToDefeat) {
        await channel.publish('game-ended', {
          winner: myPlayerId,
          players: updatedPlayers
        });
        return;
      }

      // Get next word
      const nextWord = gameData.wordQueue[newCorrectWords];

      // Publish word completion
      await channel.publish('word-completed', {
        playerId: myPlayerId,
        nextWord: nextWord,
        players: updatedPlayers
      });
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
        {connectionStatus === 'connected' && '🟢 '}
        {connectionStatus === 'connecting' && '🟡 '}
        {connectionStatus === 'disconnected' && '🔴 '}
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
      <p className="text-sm text-purple-400 mb-4"></p>

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
          if (channel) {
            channel.unsubscribe();
            setChannel(null);
          }
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
                  player.id === myPlayerId ? 'bg-blue-600' : 'bg-red-600'
                }`}>
                  {player.name} ({player.wordsCompleted}/{gameData.wordsToDefeat})
                </div>
              </div>
              
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-out"
                style={{ left: `${10 + getPlayerPosition(player.id)}%` }}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  player.id === myPlayerId ? 'bg-blue-600' : 'bg-red-600'
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
          if (channel) {
            channel.unsubscribe();
            setChannel(null);
          }
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

export default AblyMultiplayerWordSlayer; 
import React, { useState, useEffect, useRef } from 'react';

// Word lists for different difficulties
const wordLists = {
  easy: ['cat', 'dog', 'run', 'jump', 'red', 'blue', 'car', 'sun', 'day', 'moon', 'star', 'tree', 'book', 'pen', 'hat', 'cup', 'bed', 'key', 'box', 'ball', 'fish', 'bird', 'ship', 'milk', 'egg', 'door', 'hand', 'foot', 'eye', 'ear'],
  medium: ['dragon', 'knight', 'castle', 'wizard', 'potion', 'spell', 'magic', 'quest', 'adventure', 'dungeon', 'treasure', 'monster', 'hero', 'journey', 'battle', 'legend', 'myth', 'scroll', 'sword', 'shield', 'armor', 'enemy', 'victory', 'defeat', 'champion', 'challenge', 'realm', 'kingdom', 'power', 'strength'],
  hard: ['achievement', 'courageous', 'fortunate', 'strategy', 'adventure', 'solution', 'discovery', 'triangle', 'election', 'creature', 'calendar', 'electric', 'vacation', 'dangerous', 'language', 'resource', 'improve', 'backpack', 'volcano', 'favorite']
};

// Game states
const GAME_STATES = {
  START: 'start',
  DIFFICULTY: 'difficulty',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};

// Monster states for Nightmare mode
const MONSTER_STATES = {
  FIRE: 'fire',
  ICE: 'ice'
};

// Main game component
const WordSlayerGame = () => {
  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.START);
  const [difficulty, setDifficulty] = useState('medium');
  const [currentWord, setCurrentWord] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [enemyPosition, setEnemyPosition] = useState(100);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [wordQueue, setWordQueue] = useState([]);
  const [wordsToDefeat, setWordsToDefeat] = useState(10);
  const [wordStartTime, setWordStartTime] = useState(null);
  const [actualTypingTime, setActualTypingTime] = useState(0);
  const [monsterState, setMonsterState] = useState(MONSTER_STATES.FIRE);
  const [wordsSinceSwitch, setWordsSinceSwitch] = useState(0);
  const [nextSwitchCount, setNextSwitchCount] = useState(0);
  
  const inputRef = useRef(null);

  // Get difficulty settings
  const getDifficultySettings = (diff) => {
    switch (diff) {
      case 'easy':
        return { speed: 0.35, wordsRequired: 10 };
      case 'medium':
        return { speed: 0.4, wordsRequired: 10 };
      case 'hard':
        return { speed: 0.5, wordsRequired: 10 };
      case 'nightmare':
        return { speed: 0.4, wordsRequired: 10 };
      default:
        return { speed: 0.4, wordsRequired: 10 };
    }
  };

  // Get a random word based on difficulty
  const getRandomWord = () => {
    let wordList;
    if (difficulty === 'nightmare') {
      wordList = wordLists.medium;
    } else {
      wordList = wordLists[difficulty];
    }
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex];
  };
  
  // Generate a queue of words to type
  const generateWordQueue = () => {
    const newQueue = [];
    for (let i = 0; i < wordsToDefeat; i++) {
      newQueue.push(getRandomWord());
    }
    return newQueue;
  };

  // Start the game
  const startGame = () => {
    const settings = getDifficultySettings(difficulty);
    const newWordQueue = generateWordQueue();
    
    setGameState(GAME_STATES.PLAYING);
    setWordQueue(newWordQueue);
    setCurrentWord(newWordQueue[0]);
    setInputValue('');
    setEnemyHealth(100);
    setEnemyPosition(100);
    setWordsTyped(0);
    setCorrectWords(0);
    setStartTime(Date.now());
    setEndTime(null);
    setActualTypingTime(0);
    setWordStartTime(null);
    setWordsToDefeat(settings.wordsRequired);
    
    if (difficulty === 'nightmare') {
      setMonsterState(MONSTER_STATES.FIRE);
      setWordsSinceSwitch(0);
      setNextSwitchCount(Math.floor(Math.random() * 2) + 1);
    }
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Handle input change
  const handleInputChange = (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    if (inputValue === '' && e.target.value !== '') {
      setWordStartTime(Date.now());
    }
    
    setInputValue(e.target.value);
    
    let targetWord = currentWord;
    
    // For Nightmare mode, check for correct prefix
    if (difficulty === 'nightmare') {
      if (monsterState === MONSTER_STATES.FIRE && e.target.value.startsWith('1')) {
        targetWord = '1' + currentWord;
      } else if (monsterState === MONSTER_STATES.ICE && e.target.value.startsWith('2')) {
        targetWord = '2' + currentWord;
      }
    }
    
    if (e.target.value.toLowerCase() === targetWord.toLowerCase()) {
      const damagePerWord = 100 / wordsToDefeat;
      const newHealth = Math.max(0, enemyHealth - damagePerWord);
      
      if (wordStartTime) {
        const wordTypingTime = Date.now() - wordStartTime;
        setActualTypingTime(prevTime => prevTime + wordTypingTime);
      }
      
      setEnemyHealth(newHealth);
      setWordsTyped(wordsTyped + 1);
      setCorrectWords(correctWords + 1);
      setInputValue('');
      setWordStartTime(null);
      
      const newQueue = [...wordQueue];
      newQueue.shift();
      setWordQueue(newQueue);
      
      // Handle Nightmare mode monster state switching
      if (difficulty === 'nightmare') {
        const newWordsSinceSwitch = wordsSinceSwitch + 1;
        setWordsSinceSwitch(newWordsSinceSwitch);
        
        if (newWordsSinceSwitch >= nextSwitchCount) {
          setMonsterState(current => 
            current === MONSTER_STATES.FIRE ? MONSTER_STATES.ICE : MONSTER_STATES.FIRE
          );
          setWordsSinceSwitch(0);
          setNextSwitchCount(Math.floor(Math.random() * 2) + 1);
        }
      }
      
      if (newQueue.length === 0) {
        setGameState(GAME_STATES.WIN);
        setEndTime(Date.now());
      } else {
        setCurrentWord(newQueue[0]);
      }
    }
  };

  // Enemy movement
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const settings = getDifficultySettings(difficulty);
    const interval = setInterval(() => {
      const newPosition = enemyPosition - settings.speed;
      setEnemyPosition(newPosition);
      
      if (newPosition <= 0) {
        setGameState(GAME_STATES.LOSE);
        setEndTime(Date.now());
        if (wordStartTime) {
          const finalWordTime = Date.now() - wordStartTime;
          setActualTypingTime(prevTime => prevTime + finalWordTime);
        }
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [gameState, enemyPosition, difficulty, wordStartTime]);

  // Calculate stats
  const calculateStats = () => {
    if (!startTime || !endTime) return { wpm: 0, accuracy: 0, timeTaken: 0 };
    
    const totalTimeTakenSeconds = (endTime - startTime) / 1000;
    const actualTypingTimeMinutes = actualTypingTime / 1000 / 60;
    
    let totalChars = 0;
    const completedWords = generateWordQueue().slice(0, correctWords);
    totalChars = completedWords.reduce((total, word) => total + word.length, 0);
    
    if (difficulty === 'nightmare') {
      totalChars += correctWords * 1; // Add 1 char per word for the prefix
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

  // Render functions
  const renderDifficultySelect = () => (
    <div className="text-center max-w-lg">
      <h1 className="text-4xl font-bold mb-8 text-yellow-400 flex items-center justify-center">
        <span className="mr-2">⚔️</span> WordSlayer <span className="ml-2">🛡️</span>
      </h1>
      <h2 className="text-2xl font-semibold mb-6">Select Difficulty</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setDifficulty('easy')}
          className={`p-4 rounded-lg border-2 transition-colors ${
            difficulty === 'easy' ? 'border-green-500 bg-green-800' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <h3 className="text-xl font-bold mb-2">Easy</h3>
          <p className="text-sm">Short words, slower enemy</p>
        </button>
        
        <button
          onClick={() => setDifficulty('medium')}
          className={`p-4 rounded-lg border-2 transition-colors ${
            difficulty === 'medium' ? 'border-yellow-500 bg-yellow-800' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <h3 className="text-xl font-bold mb-2">Medium</h3>
          <p className="text-sm">Normal words, normal speed</p>
        </button>
        
        <button
          onClick={() => setDifficulty('hard')}
          className={`p-4 rounded-lg border-2 transition-colors ${
            difficulty === 'hard' ? 'border-red-500 bg-red-800' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <h3 className="text-xl font-bold mb-2">Hard</h3>
          <p className="text-sm">Complex words, faster enemy</p>
        </button>
        
        <button
          onClick={() => setDifficulty('nightmare')}
          className={`p-4 rounded-lg border-2 transition-colors ${
            difficulty === 'nightmare' ? 'border-purple-500 bg-purple-800' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <h3 className="text-xl font-bold mb-2">Nightmare</h3>
          <p className="text-sm">Fire/Ice switch, faster enemy</p>
        </button>
      </div>
      
      <button
        onClick={startGame}
        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-xl transition-colors"
      >
        Start Game
      </button>
    </div>
  );

  const getMonsterEmoji = () => {
    if (difficulty === 'nightmare') {
      return monsterState === MONSTER_STATES.FIRE ? '🔥👹🔥' : '❄️👹❄️';
    }
    return '👹';
  };

  const getMonsterColor = () => {
    if (difficulty === 'nightmare') {
      return monsterState === MONSTER_STATES.FIRE ? 'bg-red-600' : 'bg-blue-400';
    }
    return 'bg-red-600';
  };

  // Render based on game state
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
      {gameState === GAME_STATES.START && (
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-bold mb-8 text-yellow-400 flex items-center justify-center">
            <span className="mr-2">⚔️</span> WordSlayer <span className="ml-2">🛡️</span>
          </h1>
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4">How to Play:</h2>
            <ul className="text-left space-y-2">
              <li className="flex items-start">
                <span className="mt-1 mr-2 text-yellow-400">▶</span>
                <span>Type words correctly to defeat the enemy</span>
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-2 text-yellow-400">▶</span>
                <span>Defeat the enemy before it reaches you</span>
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-2 text-yellow-400">▶</span>
                <span>Different difficulties have different words and speeds</span>
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-2 text-yellow-400">▶</span>
                <span>Nightmare mode: Type 1 for fire, 2 for ice before the word</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => setGameState(GAME_STATES.DIFFICULTY)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-xl transition-colors"
          >
            Select Difficulty
          </button>
        </div>
      )}

      {gameState === GAME_STATES.DIFFICULTY && renderDifficultySelect()}

      {gameState === GAME_STATES.PLAYING && (
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <div className="text-xl">
              Words: <span className="font-bold">{wordsTyped}</span>
            </div>
            <div className="text-xl">
              Difficulty: <span className="font-bold capitalize">{difficulty}</span>
            </div>
            <div className="w-64 bg-gray-700 h-4 rounded-full overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${enemyHealth}%` }}
              ></div>
            </div>
          </div>

          <div className="relative h-64 bg-gray-800 rounded-lg mb-8 overflow-hidden">
            {/* Enemy */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-100 ease-linear"
              style={{ left: `${enemyPosition}%` }}
            >
              <div className={`w-24 h-24 ${getMonsterColor()} rounded-lg flex items-center justify-center text-4xl`}>
                {getMonsterEmoji()}
              </div>
            </div>
            
            {/* Player */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                🧙
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-gray-700 px-3 py-1 rounded-lg mr-2">
                {wordQueue.length} / {wordsToDefeat} words left
              </div>
            </div>
            {difficulty === 'nightmare' && (
              <div className="mb-4 text-xl font-bold">
                {monsterState === MONSTER_STATES.FIRE ? 
                  <span className="text-red-500">🔥 Type 1 first!</span> : 
                  <span className="text-blue-400">❄️ Type 2 first!</span>
                }
              </div>
            )}
            <div className="text-3xl font-bold mb-4">{currentWord}</div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              className="w-full max-w-md px-4 py-3 text-xl bg-gray-800 border-2 border-yellow-500 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-yellow-600"
              autoFocus
            />
            <div className="mt-6">
              <div className="text-sm text-gray-400 mb-2">Coming up next:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {wordQueue.slice(1, 4).map((word, index) => (
                  <div key={index} className="bg-gray-800 px-3 py-1 rounded text-gray-400">
                    {word}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(gameState === GAME_STATES.WIN || gameState === GAME_STATES.LOSE) && (
        <div className="text-center max-w-lg">
          <h1 className={`text-4xl font-bold mb-6 ${gameState === GAME_STATES.WIN ? 'text-green-400' : 'text-red-400'}`}>
            {gameState === GAME_STATES.WIN ? 'Victory!' : 'Defeat!'}
          </h1>
          
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4">Performance Stats:</h2>
            <div className="mb-4 text-lg font-bold capitalize">Difficulty: {difficulty}</div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="flex flex-col">
                <span className="text-gray-400">Words Per Minute</span>
                <span className="text-2xl font-bold">{stats.wpm}</span>
                <span className="text-xs text-gray-500">(based on actual typing time)</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Accuracy</span>
                <span className="text-2xl font-bold">{stats.accuracy}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Total Game Time</span>
                <span className="text-2xl font-bold">{stats.timeTaken}s</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Actual Typing Time</span>
                <span className="text-2xl font-bold">{stats.actualTypingTime}s</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Characters Typed</span>
                <span className="text-2xl font-bold">{stats.totalChars}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400">Traditional WPM</span>
                <span className="text-2xl font-bold">{stats.traditionalWpm}</span>
                <span className="text-xs text-gray-500">(based on total game time)</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setGameState(GAME_STATES.DIFFICULTY)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-xl transition-colors flex items-center justify-center mx-auto"
          >
            <span className="mr-2">🔄</span> Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default WordSlayerGame;
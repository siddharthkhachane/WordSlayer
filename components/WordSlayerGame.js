import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Repeat, Shield, Sword } from 'lucide-react';

// Word list for the game
const wordList = [
  'dragon', 'knight', 'castle', 'wizard', 'potion', 'spell', 'magic', 'quest',
  'adventure', 'dungeon', 'treasure', 'monster', 'hero', 'journey', 'battle',
  'legend', 'myth', 'scroll', 'sword', 'shield', 'armor', 'enemy', 'victory',
  'defeat', 'champion', 'challenge', 'realm', 'kingdom', 'power', 'strength'
];

// Game states
const GAME_STATES = {
  START: 'start',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};

// Main game component
const WordSlayerGame = () => {
  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.START);
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
  // Add new state to track when the player starts typing each word
  const [wordStartTime, setWordStartTime] = useState(null);
  // Add new state to track actual typing time
  const [actualTypingTime, setActualTypingTime] = useState(0);
  // Track if the input is focused
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const inputRef = useRef(null);

  // Get a random word from the word list
  const getRandomWord = () => {
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
    
    // Focus the input field
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Handle input change
  const handleInputChange = (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    // If this is the first keystroke for this word, record the start time
    if (inputValue === '' && e.target.value !== '') {
      setWordStartTime(Date.now());
    }
    
    setInputValue(e.target.value);
    
    // Check if the word is correct
    if (e.target.value.toLowerCase() === currentWord.toLowerCase()) {
      // Calculate damage based on word length and progress
      const damagePerWord = 100 / wordsToDefeat;
      const newHealth = Math.max(0, enemyHealth - damagePerWord);
      
      // Update the actual typing time if we have a valid start time for this word
      if (wordStartTime) {
        const wordTypingTime = Date.now() - wordStartTime;
        setActualTypingTime(prevTime => prevTime + wordTypingTime);
      }
      
      setEnemyHealth(newHealth);
      setWordsTyped(wordsTyped + 1);
      setCorrectWords(correctWords + 1);
      setInputValue('');
      setWordStartTime(null);
      
      // Remove the typed word from the queue
      const newQueue = [...wordQueue];
      newQueue.shift();
      setWordQueue(newQueue);
      
      // Check if all words are typed (enemy is defeated)
      if (newQueue.length === 0) {
        setGameState(GAME_STATES.WIN);
        setEndTime(Date.now());
      } else {
        // Set the next word
        setCurrentWord(newQueue[0]);
      }
    }
  };

  // Track focus state of the input field
  const handleFocus = () => {
    setIsInputFocused(true);
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    // Pause typing time tracking when input loses focus
    if (wordStartTime) {
      const pauseTime = Date.now() - wordStartTime;
      setActualTypingTime(prevTime => prevTime + pauseTime);
      setWordStartTime(null);
    }
  };

  // Enemy movement
  useEffect(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const interval = setInterval(() => {
      const newPosition = enemyPosition - 0.5;
      setEnemyPosition(newPosition);
      
      // Check if enemy reached the player
      if (newPosition <= 0) {
        setGameState(GAME_STATES.LOSE);
        setEndTime(Date.now());
        // Make sure to account for typing time up to this point
        if (wordStartTime) {
          const finalWordTime = Date.now() - wordStartTime;
          setActualTypingTime(prevTime => prevTime + finalWordTime);
        }
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [gameState, enemyPosition, wordStartTime]);

  // Calculate stats
  const calculateStats = () => {
    if (!startTime || !endTime) return { wpm: 0, accuracy: 0, timeTaken: 0 };
    
    // Total game time
    const totalTimeTakenSeconds = (endTime - startTime) / 1000;
    
    // Use actualTypingTime for WPM calculation (in milliseconds, convert to minutes)
    const actualTypingTimeMinutes = actualTypingTime / 1000 / 60;
    
    // Calculate total characters in completed words only
    let totalChars = 0;
    // We're using a fixed list at the start, so we need to get the completed words
    const completedWords = generateWordQueue().slice(0, correctWords);
    totalChars = completedWords.reduce((total, word) => total + word.length, 0);
    
    // Calculate traditional WPM
    const traditionalWpm = Math.round((totalChars / 5) / (totalTimeTakenSeconds / 60));
    
    // Calculate adjusted WPM based on actual typing time
    // Prevent division by zero
    const adjustedWpm = actualTypingTimeMinutes > 0 
      ? Math.round((totalChars / 5) / actualTypingTimeMinutes) 
      : 0;
    
    const accuracy = wordsTyped > 0 ? Math.round((correctWords / wordsTyped) * 100) : 0;
    
    return {
      traditionalWpm, // Keep the old calculation for comparison
      wpm: adjustedWpm, // Use the new adjusted WPM as the main stat
      accuracy,
      timeTaken: totalTimeTakenSeconds.toFixed(1),
      actualTypingTime: (actualTypingTime / 1000).toFixed(1), // Convert ms to seconds
      totalWords: correctWords,
      totalChars
    };
  };

  const stats = calculateStats();

  // Render based on game state
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
      {gameState === GAME_STATES.START && (
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-bold mb-8 text-yellow-400 flex items-center justify-center">
            <Sword className="mr-2" size={36} /> WordSlayer <Shield className="ml-2" size={36} />
          </h1>
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4">How to Play:</h2>
            <ul className="text-left space-y-2">
              <li className="flex items-start">
                <ChevronRight className="mt-1 mr-2 text-yellow-400" size={16} />
                <span>Type 10 words correctly in sequence to defeat the enemy</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="mt-1 mr-2 text-yellow-400" size={16} />
                <span>Defeat the enemy before it reaches you</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="mt-1 mr-2 text-yellow-400" size={16} />
                <span>Each correct word damages the enemy</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="mt-1 mr-2 text-yellow-400" size={16} />
                <span>Type quickly to defeat the enemy before it reaches you</span>
              </li>
            </ul>
          </div>
          <button
            onClick={startGame}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg text-xl transition-colors"
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === GAME_STATES.PLAYING && (
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <div className="text-xl">
              Words: <span className="font-bold">{wordsTyped}</span>
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
              <div className="w-24 h-24 bg-red-600 rounded-lg flex items-center justify-center text-4xl">
                👹
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
            <div className="text-3xl font-bold mb-4">{currentWord}</div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
            onClick={startGame}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-xl transition-colors flex items-center justify-center mx-auto"
          >
            <Repeat className="mr-2" size={20} /> Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default WordSlayerGame;
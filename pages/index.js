import { useState } from 'react';
import WordSlayerGame from '../components/WordSlayerGame';
import MultiplayerWordSlayer from '../components/MultiplayerWordSlayer';

export default function Home() {
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'single', 'multiplayer'

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-5xl font-bold mb-8 text-yellow-400 flex items-center justify-center">
          <span className="mr-3">⚔️</span> WordSlayer <span className="ml-3">🛡️</span>
        </h1>
        
        <div className="bg-gray-800 p-8 rounded-lg mb-8">
          <h2 className="text-3xl font-semibold mb-6">Choose Your Battle</h2>
          <p className="text-gray-300 mb-8">
            Test your typing skills in the ultimate word combat arena!
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => setGameMode('single')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors transform hover:scale-105 flex items-center justify-center"
            >
              <span className="mr-3"></span>
              Single Player
              <span className="ml-3">→</span>
            </button>
            
            <button
              onClick={() => setGameMode('multiplayer')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors transform hover:scale-105 flex items-center justify-center"
            >
              <span className="mr-3"></span>
              Multiplayer Battle
              <span className="ml-3">→</span>
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">How to Play:</h3>
          <div className="text-left space-y-2">
            <div className="flex items-start">
              <span className="mt-1 mr-3 text-yellow-400">▶</span>
              <span className="text-gray-300">Type words correctly to defeat enemies</span>
            </div>
            <div className="flex items-start">
              <span className="mt-1 mr-3 text-yellow-400">▶</span>
              <span className="text-gray-300">Complete words before time runs out</span>
            </div>
            <div className="flex items-start">
              <span className="mt-1 mr-3 text-yellow-400">▶</span>
              <span className="text-gray-300">In multiplayer: Race against other players!</span>
            </div>
            <div className="flex items-start">
              <span className="mt-1 mr-3 text-yellow-400">▶</span>
              <span className="text-gray-300">Choose difficulty to match your skill level</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-purple-400"></p>
        </div>
      </div>
    </div>
  );

  const renderGame = () => {
    return (
      <div className="relative">
        {/* Back button */}
        <button
          onClick={() => setGameMode('menu')}
          className="absolute top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center"
        >
          <span className="mr-2">←</span>
          Back to Menu
        </button>
        
        {gameMode === 'single' ? (
          <WordSlayerGame />
        ) : (
          <MultiplayerWordSlayer />
        )}
      </div>
    );
  };

  return (
    <main>
      {gameMode === 'menu' ? renderMenu() : renderGame()}
    </main>
  );
}
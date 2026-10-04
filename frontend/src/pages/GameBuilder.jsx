import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function GameBuilder() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState('SCENES');

  const [players, setPlayers] = useState([
    { id: 1, name: 'Player', sprite: 'Player', x: 20, y: 40 }
  ]);
  const [objects, setObjects] = useState([
    { id: 1, name: 'Coin', sprite: 'Coin', type: 'Item', collision: true, x: 80, y: 40 }
  ]);
  const [rules, setRules] = useState([
    { id: 1, description: 'IF Player touches Coin → Score +1 → Respawn Coin' }
  ]);

  return (
    <div className="relative z-10 flex flex-col h-screen w-screen overflow-hidden text-ink bg-parchment">
      {/* Title Block Wrapper */}
      <div className="m-4 border-2 border-ink p-[1px] flex-1 flex flex-col">
        <div className="border border-ink-light bg-parchment/80 backdrop-blur-sm relative flex-1 flex flex-col">
          
          <header className="flex border-b-2 border-ink">
            {/* Left Region */}
            <div className="flex-1 p-4 border-r-2 border-ink flex flex-col justify-center">
              <h1 className="font-black text-3xl uppercase tracking-widest text-ink leading-none">
                PixelForge
              </h1>
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-light mt-1">
                Game Builder
              </div>
            </div>

            {/* Right Meta-box */}
            <div className="w-64 flex flex-col text-[0.7rem] uppercase tracking-[0.15em] font-bold">
              <div className="flex-1 border-b border-grid-line-major p-2 bg-ink/5 flex items-center justify-center gap-2">
                 <button className="flex-1 text-center bg-transparent border border-ink text-ink py-1 hover:bg-ink hover:text-parchment transition-colors shadow-sm">
                   SAVE
                 </button>
                 <Link to={`/preview/${projectId || 1}`} className="flex-1 bg-ink text-center text-parchment py-1 hover:bg-ink-light transition-colors shadow-sm block">
                   RUN GAME
                 </Link>
              </div>
              <div className="flex-1 border-b border-grid-line-major px-3 py-1 flex justify-between items-center bg-ink/5">
                <span className="text-ink-light">Project ID</span>
                <span>{projectId || 1}</span>
              </div>
            </div>
          </header>

          {/* Navigation Strip */}
          <div className="flex border-b-2 border-ink bg-ink/5 text-[0.65rem] font-bold uppercase tracking-widest">
            <Link to="/" className="px-4 py-2 border-r border-ink hover:bg-ink hover:text-parchment transition-colors text-ink-light">Dashboard</Link>
            <div className="px-4 py-2 border-r border-ink bg-ink text-parchment">Game Builder</div>
          </div>

          {/* Main Builder Content */}
          <div className="flex-1 flex min-h-0">
            {/* Sidebar (Tabs) */}
            <div className="w-48 border-r-2 border-ink flex flex-col bg-parchment-dark/10">
              {['SCENES', 'PLAYERS', 'OBJECTS', 'RULES'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 font-bold text-xs uppercase tracking-widest border-b border-ink-light transition-colors ${activeTab === tab ? 'bg-ink text-parchment' : 'text-ink hover:bg-ink/5'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Center Content based on Tab */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-parchment">
              
              {activeTab === 'SCENES' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-xl uppercase tracking-widest text-ink">SCENES</h2>
                    <button className="bg-ink text-parchment px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-ink-light">+ NEW SCENE</button>
                  </div>
                  
                  <div className="border-2 border-ink p-4 flex gap-4 items-start bg-ink/5 mb-4">
                     <div className="w-32 h-16 border-2 border-ink bg-parchment flex items-center justify-center text-xs font-bold text-ink-light">PREVIEW</div>
                     <div className="flex-1">
                        <div className="font-black text-lg text-ink uppercase tracking-widest">LEVEL 1</div>
                        <div className="text-xs font-bold text-ink-light mt-1 uppercase tracking-widest">1 Player • 1 Object</div>
                     </div>
                     <button className="bg-transparent border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink hover:bg-ink hover:text-parchment">OPEN</button>
                  </div>
                </div>
              )}

              {activeTab === 'PLAYERS' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-xl uppercase tracking-widest text-ink">PLAYERS</h2>
                    <button className="bg-ink text-parchment px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-ink-light">+ ADD PLAYER</button>
                  </div>
                  
                  {players.map(p => (
                    <div key={p.id} className="border-2 border-ink p-4 flex gap-4 items-center bg-ink/5 mb-4">
                       <div className="w-12 h-12 border-2 border-ink bg-parchment flex items-center justify-center font-bold text-ink text-xs">P</div>
                       <div className="flex-1 flex flex-col gap-2">
                         <div className="font-black text-lg text-ink uppercase tracking-widest">{p.name}</div>
                         <div className="flex gap-4">
                            <div className="flex flex-col">
                              <span className="text-[0.6rem] uppercase tracking-widest text-ink-light">Sprite</span>
                              <span className="text-xs font-bold text-ink uppercase tracking-widest">{p.sprite}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.6rem] uppercase tracking-widest text-ink-light">X Position</span>
                              <span className="text-xs font-bold text-ink uppercase tracking-widest">{p.x}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.6rem] uppercase tracking-widest text-ink-light">Y Position</span>
                              <span className="text-xs font-bold text-ink uppercase tracking-widest">{p.y}</span>
                            </div>
                         </div>
                       </div>
                       <Link to="/editor" className="bg-transparent border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink hover:bg-ink hover:text-parchment text-center block">EDIT SPRITE</Link>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'OBJECTS' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-xl uppercase tracking-widest text-ink">OBJECTS</h2>
                    <button className="bg-ink text-parchment px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-ink-light">+ ADD OBJECT</button>
                  </div>
                  
                  {objects.map(obj => (
                    <div key={obj.id} className="border-2 border-ink p-4 flex gap-4 items-center bg-ink/5 mb-4">
                       <div className="w-12 h-12 border-2 border-ink bg-parchment flex items-center justify-center font-bold text-ink text-xs">C</div>
                       <div className="flex-1 flex flex-col gap-2">
                         <div className="font-black text-lg text-ink uppercase tracking-widest">{obj.name}</div>
                         <div className="flex gap-4">
                            <div className="flex flex-col">
                              <span className="text-[0.6rem] uppercase tracking-widest text-ink-light">Type</span>
                              <span className="text-xs font-bold text-ink uppercase tracking-widest">{obj.type}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.6rem] uppercase tracking-widest text-ink-light">Collision</span>
                              <span className="text-xs font-bold text-ink uppercase tracking-widest">{obj.collision ? 'YES' : 'NO'}</span>
                            </div>
                         </div>
                       </div>
                       <Link to="/editor" className="bg-transparent border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink hover:bg-ink hover:text-parchment text-center block">EDIT SPRITE</Link>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'RULES' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-black text-xl uppercase tracking-widest text-ink">RULES</h2>
                    <button className="bg-ink text-parchment px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-ink-light">+ ADD RULE</button>
                  </div>
                  
                  {rules.map(r => (
                    <div key={r.id} className="border-2 border-ink p-4 bg-ink/5 mb-4 flex items-center gap-3">
                      <div className="w-3 h-3 bg-coral"></div>
                      <div className="font-bold text-xs text-ink uppercase tracking-wider">{r.description}</div>
                    </div>
                  ))}
                  
                  <div className="mt-8 border-2 border-ink p-4 bg-parchment">
                    <div className="font-black text-sm uppercase tracking-widest text-ink mb-4 border-b border-ink-light pb-2">ADD RULE</div>
                    <div className="flex gap-4 items-center">
                      <span className="font-bold text-xs text-ink uppercase tracking-widest">WHEN</span>
                      <select className="border border-ink-light bg-transparent p-1 outline-none text-ink text-xs font-bold uppercase">
                        <option>Player</option>
                      </select>
                      <select className="border border-ink-light bg-transparent p-1 outline-none text-ink text-xs font-bold uppercase">
                        <option>touches</option>
                      </select>
                      <select className="border border-ink-light bg-transparent p-1 outline-none text-ink text-xs font-bold uppercase">
                        <option>Coin</option>
                      </select>
                    </div>
                    <div className="flex gap-4 items-center mt-4">
                      <span className="font-bold text-xs text-ink uppercase tracking-widest">THEN</span>
                      <select className="border border-ink-light bg-transparent p-1 outline-none text-ink text-xs font-bold uppercase">
                        <option>Add Score</option>
                      </select>
                      <select className="border border-ink-light bg-transparent p-1 outline-none text-ink text-xs font-bold uppercase">
                        <option>+1</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

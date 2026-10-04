import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../components/shared/Toast.jsx';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Fetch projects from PostgreSQL via FastAPI
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/projects/');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    const title = prompt("Enter new project title:");
    if (!title) return;

    try {
      const response = await fetch('http://localhost:8000/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Hardcoding user_id: 1 since we seeded this user earlier
        body: JSON.stringify({ user_id: 1, title: title })
      });
      
      if (response.ok) {
        fetchProjects(); // Refresh list
        setToast({ message: `Project "${title}" created successfully!`, type: 'success' });
      } else {
        setToast({ message: 'Failed to create project', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setToast({ message: 'Error creating project. Is the backend running?', type: 'error' });
    }
  };

  return (
    <div className="relative z-10 flex flex-col h-screen w-screen overflow-hidden text-ink bg-parchment">
      {/* Title Block Wrapper (Double Border) */}
      <div className="m-4 border-2 border-ink p-[1px] flex-1 flex flex-col">
        <div className="border border-ink-light bg-parchment/80 backdrop-blur-sm relative flex-1 flex flex-col">
          
          <header className="flex border-b-2 border-ink">
            {/* Left Region: Title */}
            <div className="flex-1 p-4 border-r-2 border-ink flex flex-col justify-center">
              <h1 className="font-black text-3xl uppercase tracking-widest text-ink leading-none">
                PixelForge
              </h1>
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-light mt-1">
                MY PROJECTS
              </div>
            </div>

            {/* Right Meta-box */}
            <div className="w-64 flex flex-col text-[0.7rem] uppercase tracking-[0.15em] font-bold justify-center">
              <div className="p-2 flex items-center justify-center h-full">
                 <button 
                   onClick={handleCreateProject}
                   className="w-full h-full bg-ink text-parchment py-2 hover:bg-ink-light transition-colors shadow-sm"
                 >
                   + NEW PROJECT
                 </button>
              </div>
            </div>
          </header>

          {/* Main Dashboard Content */}
          <div className="flex-1 p-8 overflow-y-auto bg-parchment-dark/10">
            <h2 className="font-bold text-xl uppercase tracking-widest mb-6 border-b-2 border-ink pb-2 inline-block">
              MY PROJECTS
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                <div className="col-span-full text-center py-10 font-bold text-ink-light">LOADING PROJECTS FROM POSTGRESQL...</div>
              ) : projects.length === 0 ? (
                <div className="col-span-full text-center py-10 font-bold text-ink-light">NO PROJECTS FOUND. CREATE ONE ABOVE.</div>
              ) : (
                projects.map(proj => (
                  <div key={proj.id} className="border-2 border-ink bg-parchment p-1 group hover:bg-sand-light/20 transition-colors">
                    <div className="border border-ink-light p-4 h-full flex flex-col">
                      <h3 className="font-black text-lg uppercase tracking-wider mb-4 text-ink">{proj.title}</h3>
                      
                      <div className="flex flex-col gap-2 text-[0.7rem] uppercase tracking-[0.1em] font-bold text-ink-light mb-6 flex-1">
                        <div className="flex justify-between border-b border-grid-line-major pb-1">
                          <span>Created</span>
                          <span className="text-ink">{new Date(proj.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-grid-line-major pb-1">
                          <span>Database ID</span>
                          <span className="text-ink">#{proj.id}</span>
                        </div>
                      </div>
                      
                      <Link to={`/builder/${proj.id}`} className="block w-full text-center bg-ink border-2 border-ink text-parchment font-bold uppercase tracking-widest py-2 text-xs hover:bg-ink-light transition-colors">
                        OPEN GAME BUILDER
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Toast Notifications */}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />
    </div>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PixelEditor from './components/pixel-editor/PixelEditor.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GameBuilder from './pages/GameBuilder.jsx';
import GamePreview from './pages/GamePreview.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor" element={<PixelEditor />} />
        <Route path="/builder/:projectId" element={<GameBuilder />} />
        <Route path="/preview/:projectId" element={<GamePreview />} />
      </Routes>
    </BrowserRouter>
  );
}

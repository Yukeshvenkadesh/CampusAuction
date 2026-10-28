import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import AIAssistant from './pages/AIAssistant';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/create" element={<CreateListing />} />
            <Route path="/assistant" element={<AIAssistant />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} CampusAuction — Peer-to-Peer Student Marketplace & Real-Time Bidding.</p>
        </footer>
      </div>
    </Router>
  );
}

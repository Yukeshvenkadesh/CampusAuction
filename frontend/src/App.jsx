import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import AIAssistant from './pages/AIAssistant';
import Login from './pages/Login';
import Register from './pages/Register';
import MyListings from './pages/MyListings';
import MyPurchases from './pages/MyPurchases';
import Alerts from './pages/Alerts';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateListing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-listings"
                element={
                  <ProtectedRoute>
                    <MyListings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-bids"
                element={
                  <ProtectedRoute>
                    <MyPurchases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute>
                    <Alerts />
                  </ProtectedRoute>
                }
              />
              <Route path="/assistant" element={<AIAssistant />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
            <p>
              © {new Date().getFullYear()} CampusAuction — Peer-to-Peer Student Marketplace &
              Real-Time Bidding.
            </p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

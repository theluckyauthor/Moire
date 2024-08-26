import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import BottomTabBar from './components/BottomTabBar';
import Closet from './components/Closet';
import Outfits from './components/Outfits';
import Explore from './components/Explore';
import Calendar from './components/Calendar';
import Profile from './components/Profile';
import WelcomeScreen from './components/WelcomeScreen';
import AddItem from './components/AddItem';
import CreateOutfit from './components/CreateOutfit';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/outfits" /> : <WelcomeScreen />} />
          <Route path="/outfits" element={user ? <Outfits /> : <Navigate to="/" />} />
          <Route path="/closet" element={user ? <Closet /> : <Navigate to="/" />} />
          <Route path="/explore" element={user ? <Explore /> : <Navigate to="/" />} />
          <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
          <Route path="/add-item" element={user ? <AddItem /> : <Navigate to="/" />} />
          <Route path="/create-outfit" element={user ? <CreateOutfit /> : <Navigate to="/" />} />
        </Routes>
        {user && <BottomTabBar />}
      </div>
    </Router>
  );
};

export default App;
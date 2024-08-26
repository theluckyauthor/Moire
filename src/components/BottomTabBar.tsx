import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, User, Calendar, Shirt, Compass } from "lucide-react";

const BottomTabBar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav bg-gray-100 text-gray-700 p-4 flex justify-around items-center fixed bottom-0 left-0 right-0 shadow-lg">
      <Link
        to="/closet"
        className={`text-2xl ${location.pathname === "/closet" ? "text-indigo-700" : "text-gray-600 hover:text-indigo-600"}`}
      >
        <Shirt size={24} />
      </Link>
      <Link
        to="/calendar"
        className={`text-2xl ${location.pathname === "/calendar" ? "text-indigo-700" : "text-gray-600 hover:text-indigo-600"}`}
      >
        <Calendar size={24} />
      </Link>
      <Link
        to="/outfits"
        className={`text-2xl ${location.pathname === "/outfits" ? "text-indigo-700" : "text-gray-600 hover:text-indigo-600"}`}
      >
        <Home size={24} />
      </Link>
      <Link
        to="/explore"
        className={`text-2xl ${location.pathname === "/explore" ? "text-indigo-700" : "text-gray-600 hover:text-indigo-600"}`}
      >
        <Compass size={24} />
      </Link>
      <Link
        to="/profile"
        className={`text-2xl ${location.pathname === "/profile" ? "text-indigo-700" : "text-gray-600 hover:text-indigo-600"}`}
      >
        <User size={24} />
      </Link>
    </nav>
  );
};

export default BottomTabBar;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SignIn from "./SignIn";
import { Shirt, Calendar, Sparkles, Search, Heart, TrendingUp } from 'lucide-react';

const WelcomeScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        navigate('/closet');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const features = [
    { icon: <Shirt size={48} />, title: "Organize Your Wardrobe", description: "Easily categorize and manage your clothing items" },
    { icon: <Calendar size={48} />, title: "Plan Your Outfits", description: "Schedule your looks for any occasion" },
    { icon: <Sparkles size={48} />, title: "Get Inspired", description: "Discover new outfit combinations" },
    { icon: <Search size={48} />, title: "Quick Search", description: "Find items and outfits in seconds" },
    { icon: <Heart size={48} />, title: "Favorite Outfits", description: "Save your best looks for easy access" },
    { icon: <TrendingUp size={48} />, title: "Style Analytics", description: "Track your most worn items and styles" },
  ];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      }
    ]
  };

  if (user) {
    return null; // The user is logged in, so we'll redirect to /closet
  }

  return (
    <div className="welcome-screen p-8 max-w-6xl mx-auto text-gray-800">
      <h1 className="text-5xl font-bold mb-6 text-center text-indigo-600">Welcome to Your Stylish Closet</h1>
      <p className="text-xl mb-8 text-center max-w-2xl mx-auto">
        Elevate your style game with our intelligent wardrobe management app. Organize, plan, and discover new looks effortlessly.
      </p>
      
      <div className="mb-12">
        <SignIn />
      </div>

      <div className="mb-12">
        <Slider {...sliderSettings}>
          {features.map((feature, index) => (
            <div key={index} className="px-4">
              <div className="bg-white rounded-lg shadow-md p-6 h-64 flex flex-col items-center justify-center text-center">
                <div className="text-indigo-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      <div className="mb-12 bg-indigo-100 rounded-lg p-8">
        <h2 className="text-3xl font-semibold mb-4 text-center text-indigo-700">Why Choose Stylish Closet?</h2>
        <ul className="list-disc list-inside space-y-2 max-w-2xl mx-auto">
          <li>Intuitive and user-friendly interface</li>
          <li>Personalized outfit recommendations</li>
          <li>Seamless integration with your calendar</li>
          <li>Detailed insights into your style preferences</li>
          <li>Secure cloud storage for your wardrobe data</li>
          <li>Regular updates with new features and improvements</li>
        </ul>
      </div>

      <footer className="text-center text-gray-500 mt-8">
        <p>&copy; 2023 Stylish Closet. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default WelcomeScreen;
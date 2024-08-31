import React, { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { Heart, Plus, Calendar, ChevronDown, Search, Filter } from "lucide-react";
import OutfitDetail from "./OutfitDetail";
import { Outfit, ClothingItem } from '../types/outfit';
import { useOutfits } from '../hooks/useOutfits';
import { generateColorFromItems } from '../utils/colorUtils';
import { firebaseService } from '../services/firebaseService';

const DEFAULT_COLOR = '#CCCCCC';

const Outfits: React.FC = () => {
  const { outfits, loading, error, hasMore, loadMoreOutfits, updateOutfit, deleteOutfit, toggleFavorite, setOutfits } = useOutfits();
  const [user, setUser] = useState<User | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const fetchFullOutfitDetails = async () => {
      const updatedOutfits = await Promise.all(
        outfits.map(async (outfit) => {
          const fullOutfit = await firebaseService.getOutfit(outfit.id);
          return fullOutfit;
        })
      );
      // Update the outfits state with the full details
      // You'll need to add a setOutfits function to your useOutfits hook
      setOutfits(updatedOutfits);
    };

    if (outfits.length > 0) {
      fetchFullOutfitDetails();
    }
  }, [outfits]);

  const handleOutfitClick = useCallback(async (outfit: Outfit) => {
    try {
      const fullOutfit = await firebaseService.getOutfit(outfit.id);
      setSelectedOutfit(fullOutfit);
    } catch (error) {
      console.error("Error fetching full outfit details:", error);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedOutfit(null);
  }, []);

  const handleUpdateOutfit = useCallback(async (updatedOutfit: Outfit) => {
    await updateOutfit(updatedOutfit);
    setSelectedOutfit(null);
  }, [updateOutfit]);

  const handleDeleteOutfit = useCallback(async (outfitId: string) => {
    await deleteOutfit(outfitId);
    setSelectedOutfit(null);
  }, [deleteOutfit]);

  const handleAddOutfit = useCallback(() => {
    navigate("/create-outfit");
  }, [navigate]);

  const handleToggleFavorite = useCallback(async (outfitId: string, currentFavorite: boolean) => {
    await toggleFavorite(outfitId, currentFavorite);
  }, [toggleFavorite]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    await loadMoreOutfits();
    setLoadingMore(false);
  }, [loadMoreOutfits]);

  const handleAddToCalendar = useCallback((outfitId: string) => {
    navigate(`/calendar?outfitId=${outfitId}`);
  }, [navigate]);

  const filteredOutfits = outfits.filter((outfit) => {
    const matchesSearch = outfit.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorite = showFavoritesOnly ? outfit.favorite : true;
    return matchesSearch && matchesFavorite;
  });

  if (!user) {
    return (
      <div className="profile p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Profile</h2>
        <p>Please sign in to view your outfits.</p>
        <Link
          to="/signin"
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4 inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loading && outfits.length === 0) {
    return <div className="text-center py-8">Loading outfits...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="outfits p-4 max-w-4xl mx-auto mb-16">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">
        Your Outfits
      </h1>
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          to="/create-outfit"
          className="w-full sm:w-auto inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
        >
          <Plus size={20} className="mr-2" />
          Create New Outfit
        </Link>
        <div className="w-full sm:w-auto flex items-center gap-2">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search outfits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-2 rounded-lg ${
              showFavoritesOnly ? "bg-yellow-400 text-white" : "bg-gray-200 text-gray-700"
            } hover:bg-yellow-500 transition duration-200`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>
      {filteredOutfits.length === 0 ? (
        <p className="text-center py-4">No outfits found. Try adjusting your search or filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutfits.map((outfit) => (
            <div
              key={outfit.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                outfit.favorite ? 'border-2 border-yellow-400' : ''
              } hover:shadow-lg transition duration-200 cursor-pointer`}
              onClick={() => handleOutfitClick(outfit)}
            >
              <div className="relative h-48">
                {outfit.imageUrl ? (
                  <img
                    src={outfit.imageUrl}
                    alt={outfit.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: outfit.color || generateColorFromItems(outfit.items) || DEFAULT_COLOR }}
                  ></div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                  <h3 className="font-semibold text-lg">{outfit.name}</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {outfit.items && outfit.items.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: item.color || DEFAULT_COLOR }}
                      title={item.name}
                    ></div>
                  ))}
                  {outfit.items && outfit.items.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                      +{outfit.items.length - 5}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(outfit.id, outfit.favorite);
                    }}
                    className={`p-2 rounded-full ${
                      outfit.favorite ? "text-yellow-500" : "text-gray-400"
                    }`}
                  >
                    <Heart size={20} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCalendar(outfit.id);
                    }}
                    className="p-2 text-indigo-600 hover:text-indigo-800"
                  >
                    <Calendar size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="mt-6 w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200 flex items-center justify-center"
          disabled={loadingMore}
        >
          {loadingMore ? (
            "Loading..."
          ) : (
            <>
              <ChevronDown size={20} className="mr-2" />
              Load More
            </>
          )}
        </button>
      )}
      {selectedOutfit && (
        <OutfitDetail
          outfit={selectedOutfit}
          onClose={handleCloseModal}
          onUpdate={handleUpdateOutfit}
          onDelete={handleDeleteOutfit}
        />
      )}
    </div>
  );
};

export default Outfits;
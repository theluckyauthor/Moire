import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc as firestoreDoc,
  where,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  getDocs,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Heart, Plus, Calendar, ChevronDown, Search, Filter } from "lucide-react";
import OutfitDetail from "./OutfitDetail";
import { Outfit, ClothingItem, OutfitItemSummary } from '../types/outfit';
import { generateColorFromItems } from '../utils/colorUtils';

const DEFAULT_COLOR = '#CCCCCC'; // Added this line

const ITEMS_PER_PAGE = 9;

const Outfits: React.FC = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(true);
      if (currentUser) {
        fetchOutfits(currentUser.uid);
      } else {
        setOutfits([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const fetchOutfits = async (userId: string) => {
    setError(null);
    try {
      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(ITEMS_PER_PAGE)
      );

      const snapshot = await getDocs(outfitsQuery);
      console.log("Fetched outfits:", snapshot.docs.length);

      const newOutfits = await Promise.all(snapshot.docs.map(async (outfitDoc) => {
        const data = outfitDoc.data();
        const itemsWithDetails = await Promise.all(data.items.map(async (itemId: string) => {
          const itemDocRef = firestoreDoc(db, 'clothingItems', itemId);
          const itemDoc = await getDoc(itemDocRef);
          if (itemDoc.exists()) {
            const itemData = itemDoc.data() as DocumentData;
            return {
              id: itemId,
              name: itemData.name || '',
              color: itemData.color || '#ccc',
              type: itemData.type || '',
              imageUrl: itemData.imageUrl || '',
            } as ClothingItem;
          }
          return null;
        }));

        return {
          id: outfitDoc.id,
          name: data.name || 'Unnamed Outfit',
          favorite: data.favorite || false,
          items: itemsWithDetails.filter((item): item is ClothingItem => item !== null),
          createdAt: data.createdAt.toDate(),
          imageUrl: data.imageUrl || null,
          userId: data.userId || '',
        } as Outfit;
      }));

      console.log("Processed outfits:", newOutfits);
      setOutfits(sortOutfits(newOutfits));
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (err) {
      console.error("Error fetching outfits:", err);
      setError("Failed to load outfits. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreOutfits = async () => {
    if (!lastVisible) return;

    setLoadingMore(true);
    try {
      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", user?.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );

      const snapshot = await getDocs(outfitsQuery);
      const newOutfits = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        items: doc.data().items
          .filter((item: any) => item && item.id) // Filter out items with undefined ids
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            color: item.color || '#ccc',
          })),
        createdAt: doc.data().createdAt.toDate(),
      })) as Outfit[];

      // Filter out outfits with less than 2 items
      const validOutfits = newOutfits.filter(outfit => outfit.items.length >= 2);

      setOutfits((prevOutfits) => sortOutfits([...prevOutfits, ...validOutfits]));
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (err) {
      console.error("Error loading more outfits:", err);
      setError("Failed to load more outfits. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleFavorite = async (outfitId: string, currentFavorite: boolean) => {
    try {
      await updateDoc(firestoreDoc(db, "outfits", outfitId), {
        favorite: !currentFavorite,
      });
      // Update local state
      setOutfits((prevOutfits) => {
        const updatedOutfits = prevOutfits.map((outfit) =>
          outfit.id === outfitId
            ? { ...outfit, favorite: !currentFavorite }
            : outfit
        );
        return sortOutfits(updatedOutfits);
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setError("Failed to update favorite status. Please try again.");
    }
  };

  const sortOutfits = (outfitsToSort: Outfit[]): Outfit[] => {
    return outfitsToSort.sort((a, b) => {
      if (a.favorite === b.favorite) {
        return b.createdAt.getTime() - a.createdAt.getTime(); // Sort by date if favorite status is the same
      }
      return a.favorite ? -1 : 1; // Favorites first
    });
  };

  const handleOutfitClick = (outfit: Outfit) => {
    // Ensure we have full item details before opening the detail view
    const outfitWithFullItems: Outfit = {
      ...outfit,
      items: outfit.items.map(item => {
        if (typeof item === 'string') {
          // If item is just an ID, find the corresponding item from the fetched data
          const fullItem = outfit.items.find(i => i.id === item);
          return fullItem || { id: item, name: 'Unknown Item', color: '#ccc' };
        }
        return item;
      })
    };
    setSelectedOutfit(outfitWithFullItems);
  };

  const handleCloseModal = () => {
    setSelectedOutfit(null);
  };

  const handleUpdateOutfit = (updatedOutfit: Outfit) => {
    setOutfits((prevOutfits) =>
      sortOutfits(
        prevOutfits.map((outfit) =>
          outfit.id === updatedOutfit.id ? updatedOutfit : outfit
        )
      )
    );
    setSelectedOutfit(null);
  };

  const handleDeleteOutfit = (outfitId: string) => {
    setOutfits((prevOutfits) =>
      prevOutfits.filter((outfit) => outfit.id !== outfitId)
    );
    setSelectedOutfit(null);
  };

  const handleAddToCalendar = (outfitId: string) => {
    navigate(`/calendar?outfitId=${outfitId}`);
  };

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

  if (loading) {
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
      {loading ? (
        <p className="text-center py-4">Loading outfits...</p>
      ) : error ? (
        <p className="text-center py-4 text-red-500">{error}</p>
      ) : filteredOutfits.length === 0 ? (
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
                  {outfit.items.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    ></div>
                  ))}
                  {outfit.items.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                      +{outfit.items.length - 5}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(outfit.id, outfit.favorite);
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
      {lastVisible && (
        <button
          onClick={loadMoreOutfits}
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
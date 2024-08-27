import React, { useState } from "react";
import { User } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Plus, Calendar, ChevronDown, Search, Filter } from "lucide-react";
import OutfitDetail from "./OutfitDetail";
import { Outfit } from '../types/outfit';
import { generateColorFromItems } from '../utils/colorUtils';
import { useOutfits } from '../hooks/useOutfits';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import styles from '../styles/components/Outfits.module.css';

const DEFAULT_COLOR = '#CCCCCC';

const Outfits: React.FC = () => {
  const { outfits, loading, error, hasMore, loadMoreOutfits } = useOutfits();
  const [user, setUser] = useState<User | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  React.useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(setUser);
    return () => unsubscribeAuth();
  }, []);

  const toggleFavorite = async (outfitId: string, currentFavorite: boolean) => {
    try {
      await firebaseService.updateOutfit(outfitId, { favorite: !currentFavorite });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleOutfitClick = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
  };

  const handleCloseModal = () => {
    setSelectedOutfit(null);
  };

  const handleUpdateOutfit = async (updatedOutfit: Outfit) => {
    try {
      await firebaseService.updateOutfit(updatedOutfit.id, updatedOutfit);
      setSelectedOutfit(null);
    } catch (error) {
      console.error("Error updating outfit:", error);
    }
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    try {
      await firebaseService.deleteOutfit(outfitId);
      setSelectedOutfit(null);
    } catch (error) {
      console.error("Error deleting outfit:", error);
    }
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
      <div className={styles.profileContainer}>
        <h2 className={styles.profileTitle}>Profile</h2>
        <p>Please sign in to view your outfits.</p>
        <Link to="/signin" className={styles.signInButton}>
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loadingMessage}>Loading outfits...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <div className={styles.outfitsContainer}>
      <h1 className={styles.title}>Your Outfits</h1>
      <div className={styles.controlsContainer}>
        <Link to="/create-outfit" className={styles.createOutfitButton}>
          <Plus size={20} className="mr-2" />
          Create New Outfit
        </Link>
        <div className={styles.searchContainer}>
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search outfits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <Search size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`${styles.filterButton} ${
              showFavoritesOnly ? styles.filterButtonActive : styles.filterButtonInactive
            }`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>
      {loading ? (
        <p className={styles.loadingMessage}>Loading outfits...</p>
      ) : error ? (
        <p className={styles.errorMessage}>{error}</p>
      ) : filteredOutfits.length === 0 ? (
        <p className={styles.noOutfitsMessage}>No outfits found. Try adjusting your search or filters.</p>
      ) : (
        <div className={styles.outfitGrid}>
          {filteredOutfits.map((outfit) => (
            <div
              key={outfit.id}
              className={`${styles.outfitCard} ${outfit.favorite ? styles.outfitCardFavorite : ''}`}
              onClick={() => handleOutfitClick(outfit)}
            >
              <div className={styles.outfitImageContainer}>
                {outfit.imageUrl ? (
                  <img
                    src={outfit.imageUrl}
                    alt={outfit.name}
                    className={styles.outfitImage}
                  />
                ) : (
                  <div
                    className={styles.outfitImage}
                    style={{ backgroundColor: outfit.color || generateColorFromItems(outfit.items) || DEFAULT_COLOR }}
                  ></div>
                )}
                <div className={styles.outfitNameOverlay}>
                  <h3 className={styles.outfitName}>{outfit.name}</h3>
                </div>
              </div>
              <div className={styles.outfitDetails}>
                <div className={styles.itemColorContainer}>
                  {outfit.items.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className={styles.itemColor}
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    ></div>
                  ))}
                  {outfit.items.length > 5 && (
                    <div className={styles.itemCountBadge}>
                      +{outfit.items.length - 5}
                    </div>
                  )}
                </div>
                <div className={styles.outfitActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(outfit.id, outfit.favorite);
                    }}
                    className={`${styles.favoriteButton} ${
                      outfit.favorite ? styles.favoriteButtonActive : styles.favoriteButtonInactive
                    }`}
                  >
                    <Heart size={20} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCalendar(outfit.id);
                    }}
                    className={styles.calendarButton}
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
          onClick={loadMoreOutfits}
          className={styles.loadMoreButton}
          disabled={loading}
        >
          {loading ? (
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
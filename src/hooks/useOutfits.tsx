import { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { Outfit } from '../types/outfit';
import { QueryDocumentSnapshot } from 'firebase/firestore';

const ITEMS_PER_PAGE = 10;

export const useOutfits = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchOutfits = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      const result = await firebaseService.fetchOutfits(user.uid, ITEMS_PER_PAGE);
      setOutfits(result.outfits);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching outfits:", err);
      setError("Failed to fetch outfits. Please try again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutfits();
  }, [fetchOutfits]);

  const loadMoreOutfits = async () => {
    if (!lastVisible || !hasMore) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const result = await firebaseService.fetchMoreOutfits(user.uid, ITEMS_PER_PAGE, lastVisible);
      setOutfits((prevOutfits) => [...prevOutfits, ...result.outfits]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Error loading more outfits:", err);
      setError("Failed to load more outfits. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateOutfit = async (updatedOutfit: Outfit) => {
    try {
      const updated = await firebaseService.updateOutfit(updatedOutfit.id, updatedOutfit);
      setOutfits((prevOutfits) =>
        prevOutfits.map((outfit) => (outfit.id === updated.id ? updated : outfit))
      );
    } catch (err) {
      console.error("Error updating outfit:", err);
      setError("Failed to update outfit. Please try again.");
    }
  };

  const deleteOutfit = async (outfitId: string) => {
    try {
      await firebaseService.deleteOutfit(outfitId);
      setOutfits((prevOutfits) => prevOutfits.filter((outfit) => outfit.id !== outfitId));
    } catch (err) {
      console.error("Error deleting outfit:", err);
      setError("Failed to delete outfit. Please try again.");
    }
  };

  const toggleFavorite = async (outfitId: string, currentFavorite: boolean) => {
    try {
      const outfitToUpdate = outfits.find(outfit => outfit.id === outfitId);
      if (!outfitToUpdate) {
        throw new Error("Outfit not found");
      }
      const updatedOutfit = {
        ...outfitToUpdate,
        favorite: !currentFavorite
      };
      await firebaseService.updateOutfit(outfitId, { favorite: !currentFavorite });
      setOutfits((prevOutfits) =>
        prevOutfits.map((outfit) => (outfit.id === outfitId ? updatedOutfit : outfit))
      );
    } catch (err) {
      console.error("Error toggling favorite:", err);
      setError("Failed to update favorite status. Please try again.");
    }
  };

  return {
    outfits,
    setOutfits,
    loading,
    error,
    hasMore,
    loadMoreOutfits,
    updateOutfit,
    deleteOutfit,
    toggleFavorite,
  };
};
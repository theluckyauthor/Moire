import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    const fetchOutfits = async () => {
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
    };

    fetchOutfits();
  }, []);

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

  return { outfits, loading, error, hasMore, loadMoreOutfits };
};
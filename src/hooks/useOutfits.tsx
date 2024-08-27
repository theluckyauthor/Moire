import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../firebase';
import { Outfit } from '../types/outfit';

const ITEMS_PER_PAGE = 10;

export const useOutfits = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
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
        const outfitsQuery = query(
          collection(db, "outfits"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(ITEMS_PER_PAGE)
        );

        const snapshot = await getDocs(outfitsQuery);
        const fetchedOutfits = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          items: doc.data().items
            .filter((item: any) => item && item.id)
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              color: item.color || '#ccc',
            })),
          createdAt: doc.data().createdAt.toDate(),
        })) as Outfit[];

        setOutfits(fetchedOutfits);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
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

      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );

      const snapshot = await getDocs(outfitsQuery);
      const newOutfits = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        items: doc.data().items
          .filter((item: any) => item && item.id)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            color: item.color || '#ccc',
          })),
        createdAt: doc.data().createdAt.toDate(),
      })) as Outfit[];

      setOutfits((prevOutfits) => [...prevOutfits, ...newOutfits]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error loading more outfits:", err);
      setError("Failed to load more outfits. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { outfits, loading, error, hasMore, loadMoreOutfits };
};
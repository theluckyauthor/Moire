import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs, doc, updateDoc, deleteDoc, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Outfit, ClothingItem } from '../types/outfit';

export const firebaseService = {
  // Outfits
  async fetchOutfits(userId: string, itemsPerPage: number) {
    const outfitsQuery = query(
      collection(db, "outfits"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(itemsPerPage)
    );
    
    const snapshot = await getDocs(outfitsQuery);
    const outfits = snapshot.docs.map((doc) => ({
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

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === itemsPerPage;

    return { outfits, lastVisible, hasMore };
  },

  async fetchMoreOutfits(userId: string, itemsPerPage: number, lastVisible: QueryDocumentSnapshot) {
    const outfitsQuery = query(
      collection(db, "outfits"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(itemsPerPage)
    );
    
    const snapshot = await getDocs(outfitsQuery);
    const outfits = snapshot.docs.map((doc) => ({
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

    const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === itemsPerPage;

    return { outfits, lastVisible: newLastVisible, hasMore };
  },

  async addOutfit(outfit: Omit<Outfit, 'id'>) {
    return addDoc(collection(db, "outfits"), outfit);
  },

  async updateOutfit(outfitId: string, updates: Partial<Outfit>) {
    const outfitRef = doc(db, "outfits", outfitId);
    return updateDoc(outfitRef, updates);
  },

  async deleteOutfit(outfitId: string) {
    const outfitRef = doc(db, "outfits", outfitId);
    return deleteDoc(outfitRef);
  },

  // ClothingItems
  async fetchClothingItems(userId: string) {
    const itemsQuery = query(
      collection(db, "clothingItems"),
      where("userId", "==", userId),
      orderBy("name", "asc")
    );
    return new Promise((resolve, reject) => {
      onSnapshot(itemsQuery, 
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ClothingItem[];
          resolve(items);
        },
        (error) => {
          reject(error);
        }
      );
    });
  },
  async addClothingItem(item: {
    userId: string;
    name: string;
    type: string;
    color: string;
    image: File | null;
  }) {
    let imageUrl = null;
    if (item.image) {
      const storageRef = ref(storage, `clothing/${item.userId}/${Date.now()}_${item.image.name}`);
      await uploadBytes(storageRef, item.image);
      imageUrl = await getDownloadURL(storageRef);
    }
  
    return addDoc(collection(db, "clothingItems"), {
      userId: item.userId,
      name: item.name,
      type: item.type,
      color: item.color,
      imageUrl,
      createdAt: new Date(),
    });
  }

};
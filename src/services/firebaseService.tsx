import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Outfit, ClothingItem } from '../types/outfit';

export const firebaseService = {
  // Outfits
  async fetchOutfits(userId: string) {
    const outfitsQuery = query(
      collection(db, "outfits"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    return new Promise((resolve, reject) => {
      onSnapshot(outfitsQuery, 
        (snapshot) => {
          const outfits = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Outfit[];
          resolve(outfits);
        },
        (error) => {
          reject(error);
        }
      );
    });
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

  // Add more methods for other Firebase operations
};
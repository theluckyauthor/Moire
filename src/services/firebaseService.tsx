import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs, doc, updateDoc, deleteDoc, limit, startAfter, QueryDocumentSnapshot, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Outfit, ClothingItem, OutfitItemSummary } from '../types/outfit';

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
    const updateData: any = { ...updates };
    
    // Remove the 'items' field if it's undefined
    if (updateData.items === undefined) {
      delete updateData.items;
    }
    
    // If items are provided, ensure they are just IDs
    if (Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map((item: string | OutfitItemSummary) => 
        typeof item === 'string' ? item : item.id
      );
    }

    await updateDoc(outfitRef, updateData);
    return this.getOutfit(outfitId);
  },

  async deleteOutfit(outfitId: string) {
    const outfitRef = doc(db, "outfits", outfitId);
    await deleteDoc(outfitRef);
  },

  // ClothingItems
  async fetchClothingItems(userId: string): Promise<ClothingItem[]> {
    const itemsQuery = query(
      collection(db, "clothingItems"),
      where("userId", "==", userId),
      orderBy("name", "asc")
    );
    const snapshot = await getDocs(itemsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ClothingItem));
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
  },

  // New functions for OutfitDetail
  async getOutfit(outfitId: string): Promise<Outfit> {
    const outfitRef = doc(db, "outfits", outfitId);
    const outfitDoc = await getDoc(outfitRef);
    if (!outfitDoc.exists()) {
      throw new Error("Outfit not found");
    }
    const outfitData = outfitDoc.data();
    return {
      id: outfitDoc.id,
      ...outfitData,
      items: await Promise.all(outfitData.items.map(async (itemId: string) => {
        const itemDoc = await getDoc(doc(db, "clothingItems", itemId));
        return { id: itemDoc.id, ...itemDoc.data() } as ClothingItem;
      })),
      createdAt: outfitData.createdAt.toDate(),
    } as Outfit;
  },

  async uploadOutfitImage(outfitId: string, imageFile: File): Promise<string> {
    const storageRef = ref(storage, `outfits/${outfitId}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
  },

};
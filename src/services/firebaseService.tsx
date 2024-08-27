import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs, doc, updateDoc, deleteDoc, limit, startAfter, QueryDocumentSnapshot, getDoc, serverTimestamp, Timestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Outfit, ClothingItem, CalendarEntry, Post } from '../types/outfit';
import { UserProfile } from '../types/user';

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
  },

  async fetchUserProfile(userId: string) {
    const userProfileDoc = await getDoc(doc(db, "userProfiles", userId));
    if (userProfileDoc.exists()) {
      return userProfileDoc.data() as UserProfile;
    }
    return null;
  },

  async createPost(postData: {
    userId: string;
    username: string;
    userProfilePicture: string;
    caption: string;
    image: File;
    outfitId: string;
    date: string;
  }): Promise<void> {
    let imageUrl = '';
    if (postData.image) {
      const imageRef = ref(storage, `posts/${postData.userId}/${Date.now()}`);
      await uploadBytes(imageRef, postData.image);
      imageUrl = await getDownloadURL(imageRef);
    }

    const newPost: Omit<Post, 'id' | 'createdAt'> = {
      userId: postData.userId,
      username: postData.username,
      userProfilePicture: postData.userProfilePicture,
      caption: postData.caption,
      imageUrl,
      outfitId: postData.outfitId,
      date: postData.date,
      likes: [],
      comments: [],
    };

    // Add post to the public feed
    await addDoc(collection(db, "posts"), {
      ...newPost,
      createdAt: serverTimestamp(),
    });

    // Update calendar with the outfit
    await addDoc(collection(db, "calendarEntries"), {
      userId: postData.userId,
      outfitId: postData.outfitId,
      date: postData.date,
    });
  },


  async fetchAllOutfits(userId: string): Promise<Outfit[]> {
    const outfitsQuery = query(
      collection(db, "outfits"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(outfitsQuery);
    return snapshot.docs.map((doc) => ({
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
  },
  
  async fetchCalendarEntries(userId: string): Promise<CalendarEntry[]> {
    const entriesQuery = query(
      collection(db, "calendarEntries"),
      where("userId", "==", userId)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    return entriesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        outfitId: data.outfitId,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
      };
    }) as CalendarEntry[];
  },
  
  async updateCalendarEntry(userId: string, date: Date, outfitId: string): Promise<void> {
    const entriesQuery = query(
      collection(db, "calendarEntries"),
      where("userId", "==", userId),
      where("date", "==", date)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
  
    if (entriesSnapshot.empty) {
      await addDoc(collection(db, "calendarEntries"), {
        userId: userId,
        outfitId: outfitId,
        date: date,
      });
    } else {
      const entryDoc = entriesSnapshot.docs[0];
      await updateDoc(doc(db, "calendarEntries", entryDoc.id), { 
        outfitId: outfitId,
      });
    }
  },

  async removeCalendarEntry(entryId: string): Promise<void> {
    const entryRef = doc(db, "calendarEntries", entryId);
    return deleteDoc(entryRef);
  },

  // Posts
  async fetchPosts(userId: string, lastVisible: QueryDocumentSnapshot | null = null, limitCount: number = 10): Promise<{ posts: Post[], lastVisible: QueryDocumentSnapshot | null, hasMore: boolean }> {
    let postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    if (lastVisible) {
      postsQuery = query(postsQuery, startAfter(lastVisible));
    }

    const snapshot = await getDocs(postsQuery);
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    })) as Post[];

    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === limitCount;

    return { posts, lastVisible: newLastVisible, hasMore };
  },

  async likePost(postId: string, userId: string): Promise<void> {
    const postRef = doc(db, "posts", postId);
    return updateDoc(postRef, {
      likes: arrayUnion(userId)
    });
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    const postRef = doc(db, "posts", postId);
    return updateDoc(postRef, {
      likes: arrayRemove(userId)
    });
  },

  async addComment(postId: string, comment: { userId: string, text: string }): Promise<void> {
    const postRef = doc(db, "posts", postId);
    return updateDoc(postRef, {
      comments: arrayUnion({
        ...comment,
        createdAt: serverTimestamp()
      })
    });
  },

  async removeComment(postId: string, commentToRemove: { userId: string, text: string, createdAt: Date }): Promise<void> {
    const postRef = doc(db, "posts", postId);
    return updateDoc(postRef, {
      comments: arrayRemove(commentToRemove)
    });
  },
};

export default firebaseService;
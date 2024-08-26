import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Outfit, ClothingItem } from '../types/outfit';

interface Post {
  id: string;
  userId: string;
  username: string;
  userProfilePicture: string;
  caption: string;
  imageUrl: string;
  outfitId: string;
  date: string;
  createdAt: any;
  outfit?: Outfit;
}

interface FeedProps {
  onEmptyFeed: () => void;
}

const Feed: React.FC<FeedProps> = ({ onEmptyFeed }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async (lastDoc: any = null) => {
    setLoading(true);
    try {
      let postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      if (lastDoc) {
        postsQuery = query(postsQuery, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(postsQuery);
      const newPosts = await Promise.all(querySnapshot.docs.map(async (postDoc) => {
        const postData = postDoc.data() as Omit<Post, 'id' | 'outfit'>;
        let outfitData: Outfit | undefined;
        
        if (postData.outfitId) {
          const outfitDocRef = doc(db, 'outfits', postData.outfitId);
          const outfitDoc = await getDoc(outfitDocRef);
          if (outfitDoc.exists()) {
            const outfitRawData = outfitDoc.data() as {
              name: string;
              items: string[];
              favorite: boolean;
              createdAt: any;
              imageUrl: string;
              userId: string;
              color?: string;
            };

            const itemPromises = outfitRawData.items.map(async (itemId) => {
              const itemDoc = await getDoc(doc(db, 'clothingItems', itemId));
              if (itemDoc.exists()) {
                const itemData = itemDoc.data();
                return {
                  id: itemDoc.id,
                  name: itemData.name,
                  type: itemData.type,
                  color: itemData.color,
                  imageUrl: itemData.imageUrl
                } as ClothingItem;
              }
              return null;
            });

            const items = (await Promise.all(itemPromises)).filter((item): item is ClothingItem => item !== null);

            outfitData = {
              id: outfitDoc.id,
              name: outfitRawData.name,
              items: items,
              favorite: outfitRawData.favorite,
              createdAt: outfitRawData.createdAt.toDate(),
              imageUrl: outfitRawData.imageUrl,
              userId: outfitRawData.userId,
              color: outfitRawData.color || '#4F46E5', // Default color
            } as Outfit;
          }
        }
        
        return {
          id: postDoc.id,
          ...postData,
          outfit: outfitData
        };
      }));

      setPosts(prevPosts => lastDoc ? [...prevPosts, ...newPosts] : newPosts);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);

      // Call onEmptyFeed if there are no posts
      if (newPosts.length === 0) {
        onEmptyFeed();
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const loadMore = () => {
    if (lastVisible) {
      fetchPosts(lastVisible);
    }
  };

  return (
    <div className="feed p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">Public Feed</h1>
      {posts.map(post => (
        <div key={post.id} className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 flex items-center">
            <img
              src={post.userProfilePicture || "https://via.placeholder.com/40"}
              alt={post.username}
              className="w-10 h-10 rounded-full object-cover mr-4"
            />
            <div>
              <p className="font-bold">{post.username}</p>
              <p className="text-gray-600 text-sm">{new Date(post.date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="relative pt-[100%]">
            <img 
              src={post.imageUrl} 
              alt="Post" 
              className="absolute top-0 left-0 w-full h-full object-contain bg-gray-100"
            />
          </div>
          <div className="p-4">
            <p className="text-lg mb-2">{post.caption}</p>
            {post.outfit && (
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <p className="font-semibold">Outfit: {post.outfit.name}</p>
                <p className="text-sm text-gray-600">
                  Items: {post.outfit.items.map(item => item.name).join(', ')}
                  {post.outfit.favorite && ' | Favorite'}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
      {!loading && lastVisible && (
        <button
          onClick={loadMore}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200"
        >
          Load More
        </button>
      )}
      {loading && <p className="text-center">Loading...</p>}
    </div>
  );
};

export default Feed;
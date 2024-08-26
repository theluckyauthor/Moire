import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Loader } from "lucide-react";

interface Post {
  id: string;
  text: string;
  imageUrl: string;
  userId: string;
  createdAt: Date;
}

const POSTS_PER_PAGE = 10;

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMorePosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchPosts = async (isInitial: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const postsQuery = isInitial
        ? query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(POSTS_PER_PAGE))
        : query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(POSTS_PER_PAGE));

      const snapshot = await getDocs(postsQuery);
      const newPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Post[];

      if (isInitial) {
        setPosts(newPosts);
      } else {
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMorePosts = () => {
    if (!loading && hasMore) {
      fetchPosts();
    }
  };

  useEffect(() => {
    fetchPosts(true);
  }, []);

  return (
    <div className="home p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Home Feed</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <div className="max-w-2xl mx-auto">
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={index === posts.length - 1 ? lastPostElementRef : null}
            className="post bg-white shadow-md rounded-lg p-4 mb-4"
          >
            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full h-64 object-cover rounded-lg mb-2"
              />
            )}
            <p className="text-gray-800">{post.text}</p>
            <p className="text-gray-500 text-sm mt-2">
              {post.createdAt.toLocaleString()}
            </p>
          </div>
        ))}
        {loading && (
          <div className="flex justify-center items-center py-4">
            <Loader className="animate-spin text-indigo-600" size={24} />
          </div>
        )}
        {!hasMore && (
          <p className="text-center text-gray-500 py-4">No more posts to load</p>
        )}
      </div>
    </div>
  );
};

export default Home;
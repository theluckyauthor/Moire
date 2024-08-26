import React, { useState } from 'react';
import Feed from './Feed';
import AddPost from './AddPost';
import { Plus } from 'lucide-react';

const Explore: React.FC = () => {
  const [showAddPost, setShowAddPost] = useState(false);
  const [feedEmpty, setFeedEmpty] = useState(false);

  return (
    <div className="explore-page pb-20 max-w-4xl mx-auto">
      {showAddPost ? (
        <AddPost onClose={() => setShowAddPost(false)} />
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4 text-center text-indigo-600">
            Explore Posts
          </h2>
          {feedEmpty ? (
            <div className="text-center text-gray-500 mt-8">
              No posts available. Be the first to add a post!
            </div>
          ) : (
            <Feed onEmptyFeed={() => setFeedEmpty(true)} />
          )}
          <button
            onClick={() => setShowAddPost(true)}
            className="fixed bottom-24 right-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 shadow-lg transition duration-200 z-10 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Add Post
          </button>
        </>
      )}
    </div>
  );
};

export default Explore;
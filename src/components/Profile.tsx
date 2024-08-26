import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Loader, Trash2 } from "lucide-react";
import { Outfit, ClothingItem } from "../types/outfit";

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

interface UserProfile {
  username: string;
  bio: string;
  profilePicture: string;
}

const Profile: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ username: "", bio: "", profilePicture: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user profile
        const userProfileDoc = await getDoc(doc(db, "userProfiles", currentUser.uid));
        if (userProfileDoc.exists()) {
          setProfile(userProfileDoc.data() as UserProfile);
        }

        // Fetch user posts
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
        );

        const unsubscribePosts = onSnapshot(postsQuery, async (snapshot) => {
          const newPosts = await Promise.all(snapshot.docs.map(async (postDoc) => {
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
          setPosts(newPosts);
        });

        return () => unsubscribePosts();
      } else {
        setPosts([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedProfile = {
        ...profile,
        id: user.uid // Add the user ID to the profile data
      };
      await setDoc(doc(db, "userProfiles", user.uid), updatedProfile);
      setProfile(updatedProfile); // Update the local state with the new profile including the ID
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
    setLoading(false);
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      setLoading(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setProfile({ ...profile, profilePicture: downloadURL });
        await setDoc(doc(db, "userProfiles", user.uid), { ...profile, profilePicture: downloadURL });
      } catch (error) {
        console.error("Error uploading profile picture:", error);
      }
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      // The posts state will automatically update due to the onSnapshot listener
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  if (!user) {
    return (
      <div className="profile p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Profile</h2>
        <p>Please sign in to view your profile.</p>
        <Link
          to="/signin"
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4 inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="profile p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Your Profile</h2>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 text-center">
          <div className="relative inline-block">
            <img
              src={profile.profilePicture || "https://via.placeholder.com/150"}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover"
            />
            <label htmlFor="profile-picture" className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer">
              <Camera size={20} />
            </label>
            <input
              type="file"
              id="profile-picture"
              className="hidden"
              onChange={handleProfilePictureChange}
              accept="image/*"
            />
          </div>
        </div>
        {isEditing ? (
          <div className="mb-4">
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="Username"
              className="w-full p-2 mb-2 border rounded"
            />
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Bio"
              className="w-full p-2 mb-2 border rounded"
            />
            <button
              onClick={handleProfileUpdate}
              className="bg-indigo-600 text-white px-4 py-2 rounded mr-2"
              disabled={loading}
            >
              {loading ? <Loader className="animate-spin" /> : "Save"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <p className="font-bold">{profile.username}</p>
            <p>{profile.bio}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded mt-2"
            >
              Edit Profile
            </button>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded mb-4"
        >
          Sign Out
        </button>
        <h3 className="text-xl font-semibold mb-2">Your Posts</h3>
        {posts.map(post => (
          <div key={post.id} className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
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
              <button
                onClick={() => handleDeletePost(post.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={20} />
              </button>
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
      </div>
    </div>
  );
};

export default Profile;
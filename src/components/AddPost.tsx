import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import imageCompression from "browser-image-compression";
import { Loader } from "lucide-react";

interface Outfit {
  id: string;
  name: string;
}

interface AddPostProps {
  onClose: () => void;
}

interface UserProfile {
  username: string;
  profilePicture: string;
}

const AddPost: React.FC<AddPostProps> = ({ onClose }) => {
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchOutfits = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const outfitsQuery = query(collection(db, "outfits"), where("userId", "==", user.uid));
        const outfitsSnapshot = await getDocs(outfitsQuery);
        const outfitsData = outfitsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setOutfits(outfitsData);
      } catch (error) {
        console.error("Error fetching outfits:", error);
        setError("Failed to load outfits. Please try again.");
      }
    };

    const fetchUserProfile = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userProfileDoc = await getDoc(doc(db, "userProfiles", user.uid));
        if (userProfileDoc.exists()) {
          setUserProfile(userProfileDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchOutfits();
    fetchUserProfile();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        setImage(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setError("Failed to process the image. Please try again.");
      }
    }
  };

  const validateForm = (): boolean => {
    if (!caption.trim()) {
      setError("Please add a caption to your post.");
      return false;
    }
    if (!selectedOutfit) {
      setError("Please select an outfit for your post.");
      return false;
    }
    if (!image) {
      setError("Please select an image for your post.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setError("User not authenticated. Please sign in and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl = "";
      if (image) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Add post to the public feed
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        username: userProfile?.username || "Anonymous",
        userProfilePicture: userProfile?.profilePicture || "",
        caption,
        imageUrl,
        outfitId: selectedOutfit,
        date: selectedDate.toISOString(),
        createdAt: serverTimestamp(),
      });

      // Update calendar with the outfit
      await addDoc(collection(db, "calendarEntries"), {
        userId: user.uid,
        outfitId: selectedOutfit,
        date: selectedDate.toISOString(),
      });

      setCaption("");
      setImage(null);
      setSelectedOutfit("");
      setSelectedDate(new Date());
      navigate("/");
      onClose(); // Call onClose after successful post creation
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-post p-4 mx-auto max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-indigo-600">Create a New Post</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption to your post"
        className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        required
      />
      <input
        type="file"
        onChange={handleImageChange}
        accept="image/*"
        className="mb-4 w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-indigo-50 file:text-indigo-700
        hover:file:bg-indigo-100"
        required
      />
      <select
        value={selectedOutfit}
        onChange={(e) => setSelectedOutfit(e.target.value)}
        className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        required
      >
        <option value="">Select an outfit</option>
        {outfits.map((outfit) => (
          <option key={outfit.id} value={outfit.id}>{outfit.name}</option>
        ))}
      </select>
      <input
        type="date"
        value={selectedDate.toISOString().split('T')[0]}
        onChange={(e) => setSelectedDate(new Date(e.target.value))}
        className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader className="animate-spin mr-2" size={20} />
            Creating Post...
          </>
        ) : (
          "Create Post"
        )}
      </button>
    </form>
  );
};

export default AddPost;
import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  where,
  getDocs
} from "firebase/firestore";
import { db, auth, storage } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Loader, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ClothingItem } from '../types/outfit';
import { generateColorFromItems } from '../utils/colorUtils';

const CreateOutfit: React.FC = () => {
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState("");
  const [outfitImage, setOutfitImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [existingOutfits, setExistingOutfits] = useState<{ id: string; items: string[] }[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    const itemsQuery = query(
      collection(db, "clothingItems"),
      where("userId", "==", user.uid),
      orderBy("name", "asc")
    );

    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ClothingItem[];
      setClothingItems(newItems);
    }, (error) => {
      console.error("Error fetching clothing items:", error);
      setError("Failed to load clothing items. Please try again.");
    });

    // Fetch existing outfits
    const fetchExistingOutfits = async () => {
      const outfitsQuery = query(
        collection(db, "outfits"),
        where("userId", "==", user.uid)
      );

      const outfitsSnapshot = await getDocs(outfitsQuery);
      const outfitsData = outfitsSnapshot.docs.map(doc => ({
        id: doc.id,
        items: doc.data().items as string[]
      }));
      setExistingOutfits(outfitsData);
    };

    fetchExistingOutfits();

    return () => unsubscribe();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        setOutfitImage(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error compressing image:", error);
        setError("Failed to process the image. Please try again.");
      }
    }
  };

  const handleRemoveImage = () => {
    setOutfitImage(null);
    setPreviewUrl(null);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!outfitName.trim()) {
      setNameError("Outfit name is required");
      isValid = false;
    } else {
      setNameError(null);
    }

    if (selectedItems.length === 0) {
      setItemsError("Please select at least one item for the outfit");
      isValid = false;
    } else {
      setItemsError(null);
    }

    return isValid;
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
    setItemsError(null);
  };

  const checkForDuplicateOutfit = (): boolean => {
    return existingOutfits.some(outfit => 
      outfit.items.length === selectedItems.length &&
      outfit.items.every(item => selectedItems.includes(item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      setError("User not authenticated. Please sign in and try again.");
      return;
    }

    if (checkForDuplicateOutfit()) {
      setError("An outfit with these exact items already exists. Please modify your selection.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl = null;
      if (outfitImage) {
        const imageRef = ref(storage, `outfits/${user.uid}/${Date.now()}_${outfitImage.name}`);
        await uploadBytes(imageRef, outfitImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const outfitColor = generateColorFromItems(selectedItems.map(id => clothingItems.find(item => item.id === id)!));

      await addDoc(collection(db, "outfits"), {
        userId: user.uid,
        name: outfitName,
        items: selectedItems,
        imageUrl,
        favorite: false,
        createdAt: new Date(),
        color: outfitColor,
      });
      navigate("/outfits");
    } catch (error) {
      console.error("Error creating outfit:", error);
      setError("Failed to create outfit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-outfit p-4 max-w-4xl mx-auto mb-16">
      <h2 className="text-2xl font-bold mb-4 text-center text-indigo-600">
        Create New Outfit
      </h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="outfitName"
            className="block text-sm font-medium text-gray-700"
          >
            Outfit Name
          </label>
          <input
            type="text"
            id="outfitName"
            value={outfitName}
            onChange={(e) => {
              setOutfitName(e.target.value);
              setNameError(null);
            }}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${
              nameError ? "border-red-500" : ""
            }`}
          />
          {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="outfitImage" className="block text-sm font-medium text-gray-700">
            Outfit Image (optional)
          </label>
          <input
            type="file"
            id="outfitImage"
            onChange={handleImageChange}
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
          />
          {previewUrl && (
            <div className="mt-2 relative">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-md" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Selected Items</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {selectedItems.map((itemId) => {
              const item = clothingItems.find((i) => i.id === itemId);
              return item ? (
                <div key={item.id} className="bg-gray-100 rounded-lg p-2">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                  <p className="text-sm text-center">{item.name}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Select Items</h3>
          {itemsError && <p className="text-red-500 text-sm mb-2">{itemsError}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clothingItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer ${
                  selectedItems.includes(item.id)
                    ? "ring-2 ring-indigo-500"
                    : ""
                }`}
                onClick={() => handleItemToggle(item.id)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-2">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader className="animate-spin mr-2" size={20} />
              Creating Outfit...
            </>
          ) : (
            "Create Outfit"
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateOutfit;
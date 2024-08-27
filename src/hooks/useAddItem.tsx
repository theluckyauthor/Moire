import { useState } from "react";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { firebaseService } from "../services/firebaseService";
import { auth } from "../firebase";

export const useAddItem = () => {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        setImage(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error compressing image:", error);
        setError("Failed to process the image. Please try again.");
      }
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError("Please enter a name for the item.");
      return false;
    }
    if (!type) {
      setError("Please select a type for the item.");
      return false;
    }
    if (!color) {
      setError("Please select a color for the item.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const user = auth.currentUser;
    if (!user) {
      setError("User not authenticated. Please sign in and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await firebaseService.addClothingItem({
        userId: user.uid,
        name,
        type,
        color,
        image,
      });
      navigate("/closet");
    } catch (error) {
      console.error("Error adding item:", error);
      setError("Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    name,
    setName,
    type,
    setType,
    color,
    setColor,
    image,
    loading,
    error,
    previewUrl,
    handleImageChange,
    handleSubmit,
  };
};
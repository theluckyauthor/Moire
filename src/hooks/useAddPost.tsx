import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import { firebaseService } from '../services/firebaseService';
import { UserProfile } from '../types/user';
import { Outfit } from '../types/outfit';

export const useAddPost = (onClose: () => void) => {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOutfitsAndUserProfile = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const fetchedOutfits = await firebaseService.fetchOutfits(user.uid, 100);
        setOutfits(fetchedOutfits.outfits);
        const userProfileData = await firebaseService.fetchUserProfile(user.uid);
        setUserProfile(userProfileData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
      }
    };

    fetchOutfitsAndUserProfile();
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
        console.error('Error compressing image:', error);
        setError('Failed to process the image. Please try again.');
      }
    }
  };

  const validateForm = (): boolean => {
    if (!caption.trim()) {
      setError('Please add a caption to your post.');
      return false;
    }
    if (!selectedOutfit) {
      setError('Please select an outfit for your post.');
      return false;
    }
    if (!image) {
      setError('Please select an image for your post.');
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
      setError('User not authenticated. Please sign in and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!image) throw new Error('Image is required');
      await firebaseService.createPost({
        userId: user.uid,
        username: userProfile?.username || 'Anonymous',
        userProfilePicture: userProfile?.profilePicture || '',
        caption,
        image,
        outfitId: selectedOutfit,
        date: selectedDate.toISOString(),
      });

      setCaption('');
      setImage(null);
      setSelectedOutfit('');
      setSelectedDate(new Date());
      navigate('/');
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    caption,
    setCaption,
    image,
    outfits,
    selectedOutfit,
    setSelectedOutfit,
    selectedDate,
    setSelectedDate,
    loading,
    error,
    handleImageChange,
    handleSubmit,
  };
};
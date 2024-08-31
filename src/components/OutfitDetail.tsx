import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Edit, Trash2, Save, Loader, Heart, Calendar, Plus, Minus } from 'lucide-react';
import { ChromePicker } from 'react-color';
import { Outfit, ClothingItem } from '../types/outfit';
import { generateColorFromItems } from '../utils/colorUtils';
import { firebaseService } from '../services/firebaseService';
import styles from '../styles/components/OutfitDetail.module.css';

const DEFAULT_COLOR = '#4F46E5';

interface Props {
  outfit: Outfit;
  onClose: () => void;
  onUpdate: (updatedOutfit: Outfit) => void;
  onDelete: (outfitId: string) => void;
}

const OutfitDetail: React.FC<Props> = ({ outfit, onClose, onUpdate, onDelete }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutfit, setEditedOutfit] = useState(outfit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<ClothingItem[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      const items = await firebaseService.fetchClothingItems(outfit.userId);
      setAvailableItems(items.filter(item => !editedOutfit.items.some(outfitItem => outfitItem.id === item.id)));
    } catch (err) {
      console.error("Error fetching available items:", err);
      setError("Failed to load available items. Please try again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedOutfit(prev => ({ ...prev, [name]: value }));
  };

  const handleFavoriteToggle = () => {
    setEditedOutfit(prev => ({ ...prev, favorite: !prev.favorite }));
  };

  const handleAddItem = (item: ClothingItem) => {
    setEditedOutfit(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
    setAvailableItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleRemoveItem = (item: ClothingItem) => {
    setEditedOutfit(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== item.id)
    }));
    setAvailableItems(prev => [...prev, item]);
  };

  const handleColorChange = (color: any) => {
    setEditedOutfit(prev => ({ ...prev, color: color.hex }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      let imageUrl = editedOutfit.imageUrl;
      if (imageFile) {
        imageUrl = await firebaseService.uploadOutfitImage(outfit.id, imageFile);
      }
      const updatedOutfit: Outfit = {
        ...editedOutfit,
        imageUrl,
        // Remove the mapping to item.id
      };
      await firebaseService.updateOutfit(outfit.id, updatedOutfit);
      onUpdate(updatedOutfit);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating outfit:", error);
      setError("Failed to update outfit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this outfit?")) {
      setLoading(true);
      setError(null);
      try {
        await firebaseService.deleteOutfit(outfit.id);
        onDelete(outfit.id);
      } catch (error) {
        console.error("Error deleting outfit:", error);
        setError("Failed to delete outfit. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddToCalendar = () => {
    navigate(`/calendar?outfitId=${outfit.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-indigo-600">{isEditing ? 'Edit Outfit' : 'Outfit Details'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="mb-6">
          <input
            type="text"
            name="name"
            value={editedOutfit.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
            placeholder="Outfit name"
            disabled={!isEditing}
          />
        </div>
        <div className="flex items-center mb-6">
          <div className="flex-1">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editedOutfit.favorite}
                onChange={handleFavoriteToggle}
                disabled={!isEditing}
                className="mr-2 form-checkbox text-indigo-600"
              />
              <span className="text-gray-700">Favorite</span>
            </label>
          </div>
        </div>
        <div className="flex items-center mb-4">
          <span className="mr-2">Outfit Color:</span>
          <div
            className="w-8 h-8 rounded-full cursor-pointer border border-gray-300"
            style={{ backgroundColor: editedOutfit.color }}
            onClick={() => isEditing && setShowColorPicker(!showColorPicker)}
          ></div>
          {isEditing && showColorPicker && (
            <div className="absolute z-10">
              <ChromePicker color={editedOutfit.color} onChange={handleColorChange} />
            </div>
          )}
        </div>
        <div className="mb-6">
          {editedOutfit.imageUrl && (
            <img 
              src={editedOutfit.imageUrl} 
              alt={editedOutfit.name} 
              className="w-full object-contain max-h-[60vh] mb-2" 
            />
          )}
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mb-2"
            />
          )}
        </div>
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-2 text-indigo-600">Items in this Outfit</h4>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader className="animate-spin" size={32} />
            </div>
          ) : editedOutfit.items.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {editedOutfit.items.map((item) => (
                <div key={item.id} className="bg-gray-100 rounded-lg p-2 shadow-sm relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-gray-500">No image</span>
                    </div>
                  )}
                  <p className="text-sm font-medium text-center">{item.name}</p>
                  <p className="text-xs text-gray-500 text-center">{item.type}</p>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <Minus size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No items in this outfit.</p>
          )}
        </div>
        {isEditing && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2 text-indigo-600">Available Items</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableItems.map((item) => (
                <div key={item.id} className="bg-gray-100 rounded-lg p-2 shadow-sm relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-gray-500">No image</span>
                    </div>
                  )}
                  <p className="text-sm font-medium text-center">{item.name}</p>
                  <p className="text-xs text-gray-500 text-center">{item.type}</p>
                  <button
                    onClick={() => handleAddItem(item)}
                    className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
          <p>Created on: {outfit.createdAt.toLocaleDateString()}</p>
          <button
            onClick={handleAddToCalendar}
            className="flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <Calendar size={16} className="mr-1" />
            Add to Calendar
          </button>
        </div>
        <div className="flex justify-end mt-4">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2 flex items-center hover:bg-green-600 transition duration-200"
            >
              {loading ? <Loader className="animate-spin mr-2" size={20} /> : <Save size={20} className="mr-2" />}
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2 flex items-center hover:bg-blue-600 transition duration-200"
            >
              <Edit size={20} className="mr-2" />
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded flex items-center hover:bg-red-600 transition duration-200"
          >
            <Trash2 size={20} className="mr-2" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutfitDetail;
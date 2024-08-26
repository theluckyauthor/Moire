import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { X, Edit, Trash2, Save, Loader } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { ClothingItem } from '../types/outfit';

interface Props {
  item: ClothingItem;
  onClose: () => void;
  onUpdate: (updatedItem: ClothingItem) => void;
  onDelete: (itemId: string) => void;
}

const ClothingItemDetail: React.FC<Props> = ({ item, onClose, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        setNewImage(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setError("Failed to process the image. Please try again.");
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const itemRef = doc(db, 'clothingItems', item.id);
      let updatedData = { ...editedItem };

      if (newImage) {
        const storageRef = ref(storage, `clothing/${item.id}`);
        await uploadBytes(storageRef, newImage);
        const downloadURL = await getDownloadURL(storageRef);
        updatedData.imageUrl = downloadURL;
      }

      await updateDoc(itemRef, updatedData);
      onUpdate(updatedData as ClothingItem);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating item:", error);
      setError("Failed to update item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for outfits containing this item
      const outfitsQuery = query(
        collection(db, 'outfits'),
        where('items', 'array-contains', { id: item.id })
      );
      const outfitsSnapshot = await getDocs(outfitsQuery);
      const outfitsCount = outfitsSnapshot.size;

      if (outfitsCount > 0) {
        const confirmDelete = window.confirm(
          `This item is used in ${outfitsCount} outfit${outfitsCount > 1 ? 's' : ''}. Deleting it will remove it from these outfits. Are you sure you want to proceed?`
        );
        if (!confirmDelete) {
          setLoading(false);
          return;
        }
      } else {
        const confirmDelete = window.confirm("Are you sure you want to delete this item?");
        if (!confirmDelete) {
          setLoading(false);
          return;
        }
      }

      // Delete the item
      await deleteDoc(doc(db, 'clothingItems', item.id));

      // Update outfits
      const batch = writeBatch(db);
      outfitsSnapshot.forEach((outfitDoc) => {
        const outfitRef = doc(db, 'outfits', outfitDoc.id);
        const updatedItems = outfitDoc.data().items.filter((outfitItem: any) => outfitItem.id !== item.id);
        batch.update(outfitRef, { items: updatedItems });
      });
      await batch.commit();

      onDelete(item.id);
    } catch (error) {
      console.error("Error deleting item:", error);
      setError("Failed to delete item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{isEditing ? 'Edit Item' : 'Item Details'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="mb-4">
          <img src={editedItem.imageUrl} alt={editedItem.name} className="w-full h-64 object-cover rounded-lg" />
          {isEditing && (
            <input type="file" onChange={handleImageChange} className="mt-2" accept="image/*" />
          )}
        </div>
        {isEditing ? (
          <>
            <input
              type="text"
              name="name"
              value={editedItem.name}
              onChange={handleInputChange}
              className="w-full p-2 mb-2 border rounded"
              placeholder="Item name"
            />
            <select
              name="type"
              value={editedItem.type}
              onChange={handleInputChange}
              className="w-full p-2 mb-2 border rounded"
            >
              <option value="shirt">Shirt</option>
              <option value="pants">Pants</option>
              <option value="shoes">Shoes</option>
              <option value="accessory">Accessory</option>
            </select>
            <input
              type="color"
              name="color"
              value={editedItem.color}
              onChange={handleInputChange}
              className="w-full p-2 mb-2 border rounded"
            />
          </>
        ) : (
          <>
            <p><strong>Name:</strong> {item.name}</p>
            <p><strong>Type:</strong> {item.type}</p>
            <p><strong>Color:</strong> <span className="inline-block w-6 h-6 rounded-full mr-2" style={{backgroundColor: item.color}}></span>{item.color}</p>
          </>
        )}
        <div className="flex justify-end mt-4">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2 flex items-center"
            >
              {loading ? <Loader className="animate-spin mr-2" size={20} /> : <Save size={20} className="mr-2" />}
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2 flex items-center"
            >
              <Edit size={20} className="mr-2" />
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded flex items-center"
          >
            <Trash2 size={20} className="mr-2" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClothingItemDetail;
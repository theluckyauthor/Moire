import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";
import { Search, Filter, Plus } from "lucide-react";
import ClothingItemDetail from "./ClothingItemDetail";
import { ClothingItem } from "../types/outfit";

const Closet: React.FC = () => {
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

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
    });

    return () => unsubscribe();
  }, []);

  const filteredItems = clothingItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === "" || item.type === filterType)
  );

  const handleItemClick = (item: ClothingItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const handleUpdateItem = (updatedItem: ClothingItem) => {
    setClothingItems(prevItems =>
      prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
    setSelectedItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setClothingItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setSelectedItem(null);
  };

  return (
    <div className="closet p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">Your Closet</h1>
      <div className="flex items-center mb-4 space-x-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search your closet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Types</option>
          <option value="shirt">Shirts</option>
          <option value="pants">Pants</option>
          <option value="shoes">Shoes</option>
          <option value="accessory">Accessories</option>
        </select>
        <Filter className="text-gray-400" size={20} />
      </div>
      <Link
        to="/add-item"
        className="mb-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
      >
        <Plus size={20} className="mr-2" />
        Add New Item
      </Link>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-200 cursor-pointer"
            onClick={() => handleItemClick(item)}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.type}</p>
              <div
                className="w-6 h-6 rounded-full mt-2"
                style={{ backgroundColor: item.color }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      {selectedItem && (
        <ClothingItemDetail
          item={selectedItem}
          onClose={handleCloseModal}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />
      )}
    </div>
  );
};

export default Closet;
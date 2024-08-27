import React from "react";
import { Loader, Eye } from "lucide-react";
import { useAddItem } from "../hooks/useAddItem";
import styles from "../styles/components/AddItem.module.css";

const AddItem: React.FC = () => {
  const {
    name,
    setName,
    type,
    setType,
    color,
    setColor,
    loading,
    error,
    previewUrl,
    handleImageChange,
    handleSubmit,
  } = useAddItem();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Add New Clothing Item</h2>
      {error && <div className={styles.errorMessage}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="type" className={styles.label}>
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={styles.input}
            required
          >
            <option value="">Select a type</option>
            <option value="shirt">Shirt</option>
            <option value="pants">Pants</option>
            <option value="shoes">Shoes</option>
            <option value="accessory">Accessory</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="color" className={styles.label}>
            Color
          </label>
          <div className={styles.colorContainer}>
            <input
              type="color"
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={styles.colorInput}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className={`${styles.input} ${styles.colorText}`}
              placeholder="#RRGGBB"
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="image" className={styles.label}>
            Image (optional)
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.fileInput}
          />
        </div>
        {previewUrl && (
          <div className={styles.previewContainer}>
            <h3 className={styles.previewTitle}>Image Preview</h3>
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className={styles.previewImage}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                <Eye className="text-white" size={24} />
              </div>
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? (
            <>
              <Loader className={styles.loadingIcon} size={20} />
              Adding Item...
            </>
          ) : (
            "Add Item"
          )}
        </button>
      </form>
    </div>
  );
};

export default AddItem;
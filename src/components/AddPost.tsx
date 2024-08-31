import React from 'react';
import { Loader } from 'lucide-react';
import { useAddPost } from '../hooks/useAddPost';
import styles from '../styles/components/AddPost.module.css';

interface AddPostProps {
  onClose: () => void;
}

const AddPost: React.FC<AddPostProps> = ({ onClose }) => {
  const {
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
  } = useAddPost(onClose);

  return (
    <form onSubmit={handleSubmit} className={styles.addPost}>
      <div className={styles.header}>
        <h2 className={styles.title}>Create a New Post</h2>
        <button
          type="button"
          onClick={onClose}
          className={styles.cancelButton}
        >
          Cancel
        </button>
      </div>
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a caption to your post"
        className={styles.input}
        required
      />
      <input
        type="file"
        onChange={handleImageChange}
        accept="image/*"
        className={styles.fileInput}
        required
      />
      <select
        value={selectedOutfit}
        onChange={(e) => setSelectedOutfit(e.target.value)}
        className={styles.input}
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
        className={styles.input}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className={styles.submitButton}
      >
        {loading ? (
          <>
            <Loader className={styles.loadingIcon} size={20} />
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
export interface ClothingItem {
  id: string;
  name: string;
  type?: string;
  color: string;
  imageUrl?: string;
}

export interface Outfit {
  id: string;
  name: string;
  favorite: boolean;
  items: ClothingItem[];
  createdAt: Date;
  imageUrl: string | null;
  userId: string;
  color?: string;
}

export interface OutfitItemSummary {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEntry {
  color: string | undefined;
  id: string;
  userId: string;
  outfitId: string;
  date: Date;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userProfilePicture: string;
  caption: string;
  imageUrl: string;
  outfitId: string;
  date: string;
  likes: string[];
  comments: Comment[];
  createdAt: Date;
}
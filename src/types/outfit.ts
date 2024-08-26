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
    items: ClothingItem[];
    favorite: boolean;
    createdAt: Date;
    imageUrl: string | null;
    userId: string;
    color: string;
  }

export interface OutfitItemSummary {
  id: string;
  name: string;
  color: string;
}
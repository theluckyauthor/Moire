import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { firebaseService } from '../services/firebaseService';
import { Outfit, CalendarEntry } from '../types/outfit';

export const useCalendar = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEntry | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchOutfits();
    fetchEntries();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const outfitId = searchParams.get("outfitId");
    if (outfitId) {
      setSelectedOutfitId(outfitId);
    }
  }, [location]);

  const fetchOutfits = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      const outfitsData = await firebaseService.fetchAllOutfits(user.uid);
      setOutfits(outfitsData);
    } catch (error) {
      console.error("Error fetching outfits:", error);
    }
  };

  const fetchEntries = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      const entriesData = await firebaseService.fetchCalendarEntries(user.uid);
      setEntries(entriesData);
    } catch (error) {
      console.error("Error fetching calendar entries:", error);
    }
  };

  const handleOutfitSelect = async (outfitId: string, date: Date) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      await firebaseService.updateCalendarEntry(user.uid, date, outfitId);
      await fetchEntries();
      setSelectedDate(null);
      setSelectedOutfitId(null);
      navigate("/calendar");
    } catch (error) {
      console.error("Error updating calendar entry:", error);
    }
  };

  const handleRemoveOutfit = async (event: CalendarEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      await firebaseService.removeCalendarEntry(event.id);
      await fetchEntries();
    } catch (error) {
      console.error("Error removing calendar entry:", error);
    }
  };

  const handleEventClick = (event: CalendarEntry) => {
    setSelectedEvent(event);
    setEditingOutfitId(event.outfitId);
  };

  const handleSaveOutfit = async () => {
    if (!selectedEvent || !editingOutfitId) return;

    try {
      await firebaseService.updateCalendarEntry(auth.currentUser!.uid, selectedEvent.date, editingOutfitId);
      await fetchEntries();
      setSelectedEvent(null);
      setEditingOutfitId(null);
    } catch (error) {
      console.error("Error updating calendar entry:", error);
    }
  };

  const calendarEvents = useMemo(() => {
    return entries
      .filter(entry => entry.date instanceof Date) // Ensure date is valid
      .map((entry): CalendarEntry & { title: string; color: string } => {
        const outfit = outfits.find((o) => o.id === entry.outfitId);
        return {
          ...entry,
          title: outfit?.name || 'Unknown Outfit',
          color: outfit?.color || '#3174ad',
        };
      });
  }, [entries, outfits]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setEditingOutfitId(null);
  };

  const filteredOutfits = useMemo(() => {
    return outfits.filter(outfit => !showFavoritesOnly || outfit.favorite === true);
  }, [outfits, showFavoritesOnly]);

  return {
    outfits,
    entries,
    selectedDate,
    setSelectedDate,
    selectedOutfitId,
    setSelectedOutfitId,
    selectedEvent,
    setSelectedEvent,
    editingOutfitId,
    setEditingOutfitId,
    showFavoritesOnly,
    setShowFavoritesOnly,
    calendarEvents,
    filteredOutfits,
    handleOutfitSelect,
    handleRemoveOutfit,
    handleEventClick,
    handleSaveOutfit,
    handleDateClick,
  };
};
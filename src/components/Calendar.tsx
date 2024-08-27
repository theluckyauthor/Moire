import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { X, Edit, Save, Search, Star } from "lucide-react";
import { Outfit } from '../types/outfit';

interface CalendarEntry {
  id: string;
  date: Date;
  outfitId: string;
  userId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  outfitId: string;
  color: string;
}

const localizer = momentLocalizer(moment);

const Calendar: React.FC = () => {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

    const outfitsQuery = query(
      collection(db, "outfits"),
      where("userId", "==", user.uid)
    );
    const outfitsSnapshot = await getDocs(outfitsQuery);
    const outfitsData = outfitsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      items: doc.data().items,
      favorite: doc.data().favorite || false,
      createdAt: doc.data().createdAt.toDate(),
      imageUrl: doc.data().imageUrl,
      userId: doc.data().userId,
      color: doc.data().color,
    })) as Outfit[];
    setOutfits(outfitsData);
  };

  const fetchEntries = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    const entriesQuery = query(
      collection(db, "calendarEntries"),
      where("userId", "==", user.uid)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    const entriesData = entriesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
      };
    }) as CalendarEntry[];
    setEntries(entriesData);
  };

  const handleOutfitSelect = async (outfitId: string, date: Date) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      const existingEntry = entries.find(
        (e) => e.date.toDateString() === date.toDateString()
      );

      if (existingEntry) {
        // Update existing entry instead of creating a new one
        await updateDoc(doc(db, "calendarEntries", existingEntry.id), {
          outfitId: outfitId,
        });
      } else {
        // Create new entry only if one doesn't exist for this date
        await addDoc(collection(db, "calendarEntries"), {
          date: date,
          outfitId: outfitId,
          userId: user.uid,
        });
      }

      await fetchEntries();
      setSelectedDate(null);
      setSelectedOutfitId(null);
      navigate("/calendar");
    } catch (error) {
      console.error("Error updating calendar entry:", error);
    }
  };

  const handleRemoveOutfit = async (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      await deleteDoc(doc(db, "calendarEntries", event.id));
      await fetchEntries();
    } catch (error) {
      console.error("Error removing calendar entry:", error);
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setEditingOutfitId(event.outfitId);
  };

  const handleSaveOutfit = async () => {
    if (!selectedEvent || !editingOutfitId) return;

    try {
      await updateDoc(doc(db, "calendarEntries", selectedEvent.id), {
        outfitId: editingOutfitId,
      });
      await fetchEntries();
      setSelectedEvent(null);
      setEditingOutfitId(null);
    } catch (error) {
      console.error("Error updating calendar entry:", error);
    }
  };

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return entries
      .map((entry): CalendarEvent | null => {
        const outfit = outfits.find((o) => o.id === entry.outfitId);
        if (!outfit) return null; // Skip entries without a corresponding outfit
        return {
          id: entry.id,
          title: outfit.name,
          start: entry.date,
          end: entry.date,
          outfitId: entry.outfitId,
          color: outfit.color || '#3174ad',
        };
      })
      .filter((event): event is CalendarEvent => event !== null);
  }, [entries, outfits]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setEditingOutfitId(null);
  };

  const filteredOutfits = useMemo(() => {
    return outfits.filter(outfit => !showFavoritesOnly || outfit.favorite === true);
  }, [outfits, showFavoritesOnly]);

  const EventComponent: React.FC<{ event: CalendarEvent }> = ({ event }) => (
    <div className="flex justify-between items-center w-full h-full p-1">
      <span className="truncate">{event.title}</span>
      <button
        onClick={(e) => handleRemoveOutfit(event, e)}
        className="text-white hover:text-gray-200 ml-1"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <div className="calendar p-4 max-w-full mx-auto mb-16">
      <h2 className="text-2xl font-bold mb-4 text-center text-indigo-600">
        Outfit Calendar
      </h2>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-5/6 mb-4 md:mb-0 md:mr-4">
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor={(event: CalendarEvent) => event.start}
            endAccessor={(event: CalendarEvent) => event.end}
            style={{ height: 700 }}
            onSelectSlot={({ start }) => handleDateClick(start as Date)}
            selectable
            views={['month']}
            defaultView="month"
            components={{
              dateCellWrapper: ({ children, value }) => (
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateClick(value as Date);
                  }}
                >
                  {children}
                </div>
              ),
              event: EventComponent,
            }}
            eventPropGetter={(event: CalendarEvent) => ({
              style: {
                backgroundColor: event.color,
              },
            })}
          />
        </div>
        <div className="w-full md:w-1/6">
          {selectedDate && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">
                {entries.some(e => e.date.toDateString() === selectedDate.toDateString())
                  ? `Edit Outfit for ${moment(selectedDate).format('MMMM D, YYYY')}`
                  : `Add Outfit for ${moment(selectedDate).format('MMMM D, YYYY')}`}
              </h3>
              <div className="flex items-center mb-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFavoritesOnly}
                    onChange={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className="mr-2"
                  />
                  <Star size={16} className="mr-1 text-yellow-400" />
                  Favorites only
                </label>
              </div>
              <select
                value={selectedOutfitId || ''}
                onChange={(e) => setSelectedOutfitId(e.target.value)}
                className="w-full p-2 mb-2 border rounded"
              >
                <option value="">Select an outfit</option>
                {filteredOutfits.map((outfit) => (
                  <option key={outfit.id} value={outfit.id}>
                    {outfit.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedOutfitId && handleOutfitSelect(selectedOutfitId, selectedDate)}
                className="w-full bg-indigo-500 text-white px-4 py-2 rounded flex items-center justify-center"
                disabled={!selectedOutfitId}
              >
                <Save size={16} className="mr-2" />
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
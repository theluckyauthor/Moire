import React from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { X, Star, Save } from 'lucide-react';
import { useCalendar } from '../hooks/useCalendar';
import styles from '../styles/components/Calendar.module.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEntry } from '../types/outfit';


const localizer = momentLocalizer(moment);

const Calendar: React.FC = () => {
  const {
    selectedDate,
    selectedOutfitId,
    setSelectedOutfitId,
    showFavoritesOnly,
    setShowFavoritesOnly,
    calendarEvents,
    filteredOutfits,
    handleOutfitSelect,
    handleRemoveOutfit,
    handleDateClick,
  } = useCalendar();

  // Update EventComponent
  const EventComponent: React.FC<{ event: CalendarEntry & { title: string; color: string } }> = ({ event }) => (
    <div className={styles.eventComponent}>
      <span className={styles.eventTitle}>{event.title}</span>
      <button
        onClick={(e) => handleRemoveOutfit(event, e)}
        className={styles.removeButton}
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <div className={styles.calendar}>
      <h2 className={styles.title}>Outfit Calendar</h2>
      <div className={styles.calendarContainer}>
        <div className={styles.bigCalendar}>
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor={(event: CalendarEntry) => event.date}
            endAccessor={(event: CalendarEntry) => event.date}
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
            eventPropGetter={(event: CalendarEntry) => ({
              style: {
                backgroundColor: event.color,
              },
            })}
          />
        </div>
        <div className={styles.sidePanel}>
          {selectedDate && (
            <div className={styles.outfitSelector}>
              <h3 className={styles.outfitSelectorTitle}>
                {`${calendarEvents.some(e => e.date && e.date.toDateString() === selectedDate.toDateString())
                  ? 'Edit' : 'Add'} Outfit for ${moment(selectedDate).format('MMMM D, YYYY')}`}
              </h3>
              <label className={styles.favoriteToggle}>
                <input
                  type="checkbox"
                  checked={showFavoritesOnly}
                  onChange={() => setShowFavoritesOnly(!showFavoritesOnly)}
                />
                <span className={styles.favoriteToggleLabel}>
                  <Star size={16} className="mr-1 text-yellow-400" />
                  Favorites only
                </span>
              </label>
              <select
                value={selectedOutfitId || ''}
                onChange={(e) => setSelectedOutfitId(e.target.value)}
                className={styles.outfitSelect}
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
                className={styles.saveButton}
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
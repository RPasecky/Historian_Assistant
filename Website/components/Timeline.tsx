import React, { useMemo, useEffect, useRef } from 'react';
import { EnrichedEvent } from '../types';

interface TimelineProps {
  events: EnrichedEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ events, selectedEventId, onSelectEvent }) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sort events by year and date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.event_date && b.event_date) return a.event_date.localeCompare(b.event_date);
        return 0;
    });
  }, [events]);

  // Scroll to selected event
  useEffect(() => {
    if (selectedEventId && itemRefs.current.has(selectedEventId)) {
      itemRefs.current.get(selectedEventId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedEventId]);

  if (events.length === 0) {
    return <div className="p-8 text-center text-stone-500 italic">No events found in this time period.</div>;
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2 custom-scrollbar">
      <div className="relative border-l-2 border-stone-300 ml-4 space-y-8 py-4">
        {sortedEvents.map((event) => {
          const isSelected = selectedEventId === event.id;
          return (
            <div 
              key={event.id}
              ref={el => { if (el) itemRefs.current.set(event.id, el); }} 
              className={`relative pl-8 transition-all duration-300 cursor-pointer group`}
              onClick={() => onSelectEvent(event.id)}
            >
              {/* Dot on the line */}
              <div 
                className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 
                  ${isSelected ? 'bg-amber-500 border-amber-600 scale-125' : 'bg-stone-100 border-stone-400 group-hover:bg-amber-200'}
                  transition-all z-10`}
              ></div>
              
              {/* Card Content */}
              <div 
                className={`rounded-lg border p-4 shadow-sm transition-all
                  ${isSelected 
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' 
                    : 'bg-white border-stone-200 hover:border-amber-300 hover:shadow-md'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-serif text-2xl font-bold text-stone-800">{event.year}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-1 rounded">
                    {event.event_date || 'Circa'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">
                    {event.people.map(p => p.name).join(" & ")}
                </h3>
                {event.location && (
                    <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {event.location.name}
                        {event.location.neighborhood && <span className="text-stone-400 font-normal ml-1">({event.location.neighborhood})</span>}
                    </h4>
                )}
                <p className="text-stone-600 text-sm leading-relaxed line-clamp-3">{event.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

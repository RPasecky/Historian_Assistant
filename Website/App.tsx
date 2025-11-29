import React, { useState, useEffect } from 'react';
import { TabView, EnrichedEvent } from './types';
import { MapView } from './components/MapView';
import { Timeline } from './components/Timeline';
import { NetworkGraph } from './components/NetworkGraph';
import { fetchEnrichedEvents } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.MAP);
  const [query, setQuery] = useState("Harlem Renaissance & Beat Generation");
  
  // State for filtered/display data
  const [enrichedEvents, setEnrichedEvents] = useState<EnrichedEvent[]>([]);
  const [displayEvents, setDisplayEvents] = useState<EnrichedEvent[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Time Filter State
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 1950]);
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(1950);

  // Initialize Data (fetch from backend)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchEnrichedEvents();
        if (!isMounted) return;
        setEnrichedEvents(data);
        if (data.length > 0) setSelectedEventId(data[0].id);

        const validYears = data
          .map(event => event.year)
          .filter((year): year is number => typeof year === 'number' && !Number.isNaN(year) && year > 0);
        const fallbackMin = 1850;
        const fallbackMax = fallbackMin + 50;
        const derivedMinYear = validYears.length ? Math.min(...validYears) : fallbackMin;
        const derivedMaxYear = validYears.length ? Math.max(...validYears) : fallbackMax;
        setMinYear(derivedMinYear);
        setMaxYear(Math.max(derivedMaxYear, derivedMinYear + 1));
        setYearRange([derivedMinYear, Math.max(derivedMaxYear, derivedMinYear + 1)]);
      } catch (e) {
        console.error("Failed to load events from API, falling back to empty list.", e);
        if (!isMounted) return;
        setEnrichedEvents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter Data when Range Changes
  useEffect(() => {
    const filtered = enrichedEvents.filter(e => {
        if (!e.year || e.year <= 0) return true;
        return e.year >= yearRange[0] && e.year <= yearRange[1];
    });
    setDisplayEvents(filtered);
  }, [yearRange, enrichedEvents]);

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
  };

  const selectedEvent = displayEvents.find(e => e.id === selectedEventId);
  const sliderSpan = Math.max(1, maxYear - minYear);
  const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
  const startPercent = clampPercent(((yearRange[0] - minYear) / sliderSpan) * 100);
  const endPercent = clampPercent(((yearRange[1] - minYear) / sliderSpan) * 100);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-100 font-sans text-stone-900">
      
      {/* Header */}
      <header className="bg-white border-b border-stone-200 shadow-sm z-20 flex-none">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl shadow-md">
                M
             </div>
             <div>
                <h1 className="text-xl font-bold font-serif tracking-wide text-stone-800">MANHATTAN NEXUS</h1>
                <p className="text-xs text-stone-500 uppercase tracking-widest">Historical Mapping Engine</p>
             </div>
          </div>

          <div className="flex-1 max-w-2xl w-full flex gap-4 items-center">
             {/* Year Range Slider */}
             <div className="flex flex-col w-full max-w-md px-4">
                <div className="flex justify-between text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider">
                    <span>{yearRange[0]}</span>
                    <span>Time Period</span>
                    <span>{yearRange[1]}</span>
                </div>
                <div className="relative h-2 bg-stone-200 rounded-full">
                     {/* Simplified visual range slider */}
                     <input 
                        type="range" 
                        min={minYear} 
                        max={maxYear} 
                        value={yearRange[0]} 
                        onChange={(e) => setYearRange([Math.min(parseInt(e.target.value), yearRange[1] - 1), yearRange[1]])}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                     />
                    <input 
                        type="range" 
                        min={minYear} 
                        max={maxYear} 
                        value={yearRange[1]} 
                        onChange={(e) => setYearRange([yearRange[0], Math.max(parseInt(e.target.value), yearRange[0] + 1)])}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                     />
                     <div 
                        className="absolute h-full bg-amber-500 rounded-full opacity-50"
                        style={{
                            left: `${startPercent}%`,
                            right: `${100 - endPercent}%`
                        }}
                     ></div>
                     {/* Thumbs visual */}
                     <div
                        className="absolute top-1/2 -mt-2 w-4 h-4 bg-white border-2 border-amber-600 rounded-full shadow pointer-events-none transform -translate-x-1/2 transition-all"
                        style={{ left: `${startPercent}%` }}
                     ></div>
                     <div
                        className="absolute top-1/2 -mt-2 w-4 h-4 bg-white border-2 border-amber-600 rounded-full shadow pointer-events-none transform -translate-x-1/2 transition-all"
                        style={{ left: `${endPercent}%` }}
                     ></div>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar (List/Detail) - visible on md+ */}
        <aside className="w-80 md:w-96 bg-white border-r border-stone-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-none hidden md:flex">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
               <h2 className="text-sm font-bold uppercase text-stone-500 tracking-wider">Historical Timeline</h2>
               <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{displayEvents.length} Events</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <Timeline 
                    events={displayEvents} 
                    selectedEventId={selectedEventId} 
                    onSelectEvent={handleSelectEvent}
                />
            </div>
        </aside>

        {/* Center Stage (Map/Graph) */}
        <div className="flex-1 flex flex-col min-w-0 bg-stone-100 relative">
          
           {/* Tab Navigation */}
           <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/90 backdrop-blur shadow-lg rounded-full p-1 border border-stone-200 flex gap-1">
              {[
                { id: TabView.MAP, label: 'Map View', icon: 'M' },
                { id: TabView.NETWORK, label: 'Connections', icon: 'C' }
              ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabView)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        activeTab === tab.id 
                        ? 'bg-stone-800 text-white shadow-md' 
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                 >
                    {tab.label}
                 </button>
              ))}
           </div>

           <div className="flex-1 p-0 md:p-4 h-full relative">
              {activeTab === TabView.MAP && (
                 <MapView 
                    events={displayEvents} 
                    selectedEventId={selectedEventId} 
                    onSelectEvent={handleSelectEvent}
                 />
              )}
              
              {activeTab === TabView.NETWORK && (
                 <NetworkGraph 
                    events={displayEvents} 
                    onSelectEvent={handleSelectEvent}
                 />
              )}

              {/* Detail Overlay for selected event */}
              {selectedEvent && (
                <div className="absolute bottom-0 md:bottom-6 left-0 md:left-auto md:right-6 w-full md:w-80 bg-white/95 backdrop-blur border-t md:border border-stone-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:rounded-xl p-5 z-[500] transition-all animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded border border-amber-200">{selectedEvent.year}</span>
                    <button 
                        onClick={() => setSelectedEventId(null)}
                        className="text-stone-400 hover:text-stone-800"
                    >
                        ✕
                    </button>
                  </div>
                  <h3 className="font-serif font-bold text-lg leading-tight mb-2">
                    {selectedEvent.people.map(p => p.name).join(", ")}
                  </h3>
                  {selectedEvent.location && (
                    <div className="flex items-center text-xs text-stone-500 font-semibold uppercase mb-3">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        {selectedEvent.location.name}
                    </div>
                  )}
                  <p className="text-sm text-stone-600 leading-relaxed mb-4 max-h-32 overflow-y-auto">{selectedEvent.description}</p>
                  
                  <div className="pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                    {selectedEvent.people.map(p => (
                        <span key={p.id} className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 rounded-full">
                            {p.name}
                        </span>
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
}

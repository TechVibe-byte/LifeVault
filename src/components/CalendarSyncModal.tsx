import React, { useState } from 'react';
import { Calendar, Upload, CheckCircle2, X, AlertCircle, Sparkles, Building, ChevronRight, Tag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { findSuggestedOfficeDays, CalendarOfficeSuggestion, batchLogOfficeDays } from '../utils/calendarSync';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CalendarSyncModal({ isOpen, onClose, onSuccess }: CalendarSyncModalProps) {
  const { officeKeywords, setOfficeKeywords, commuteDistance, commuteRate, commuteRoundTrip } = useAppStore();
  
  const [icsInput, setIcsInput] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [suggestions, setSuggestions] = useState<CalendarOfficeSuggestion[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isLogging, setIsLogging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Default travel cost autofill estimate
  const defaultTravelCost = commuteDistance && commuteRate 
    ? commuteDistance * commuteRate * (commuteRoundTrip ? 2 : 1)
    : undefined;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setIcsInput(content);
        processContent(content);
      }
    };
    reader.readAsText(file);
  };

  const processContent = (content: string) => {
    const found = findSuggestedOfficeDays(content, officeKeywords);
    setSuggestions(found);
    setSelectedDates(new Set(found.map(s => s.date)));
    if (found.length === 0) {
      setStatusMessage('No office meetings found matching your location keywords.');
    } else {
      setStatusMessage(`Found ${found.length} suggested office days!`);
    }
  };

  const handleFetchUrl = async () => {
    if (!icalUrl) return;
    setIsLoadingUrl(true);
    setStatusMessage('');
    try {
      const res = await fetch(icalUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setIcsInput(text);
      processContent(text);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Failed to fetch calendar URL: ${err.message}. Try downloading the .ics file directly.`);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const toggleSelectDate = (date: string) => {
    const next = new Set(selectedDates);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    setSelectedDates(next);
  };

  const handleBatchLog = async () => {
    const itemsToLog = suggestions.filter(s => selectedDates.has(s.date));
    if (itemsToLog.length === 0) return;

    setIsLogging(true);
    try {
      const count = await batchLogOfficeDays(itemsToLog, defaultTravelCost);
      alert(`🎉 Successfully logged ${count} office days into your attendance database!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to log attendance: ${err.message}`);
    } finally {
      setIsLogging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Calendar Intelligence Sync</h3>
              <p className="text-xs text-zinc-400">Detect office days from Google Calendar / Outlook .ics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="space-y-4 overflow-y-auto pr-1 hide-scrollbar flex-1">
          {/* Keywords Config Input */}
          <div className="space-y-1.5 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
            <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Office Detection Keywords (comma-separated):
            </label>
            <input
              type="text"
              value={officeKeywords}
              onChange={(e) => setOfficeKeywords(e.target.value)}
              placeholder="e.g. office, hq, lab, building, on-site, room 402"
              className="w-full px-3 py-1.5 text-xs bg-zinc-900 rounded-xl border border-zinc-700 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Import Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* File Upload Option */}
            <label className="p-3 bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group text-center">
              <Upload className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-bold text-white block">Upload .ics File</span>
                <span className="text-[10px] text-zinc-400">Google / Outlook export</span>
              </div>
              <input type="file" accept=".ics,.ical" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* iCal URL Option */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 flex flex-col justify-between">
              <span className="text-xs font-bold text-white block">Or Public iCal URL</span>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  placeholder="https://..."
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-zinc-900 rounded-lg border border-zinc-700 text-white"
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={isLoadingUrl || !icalUrl}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-[10px] rounded-lg shrink-0"
                >
                  {isLoadingUrl ? 'Loading...' : 'Fetch'}
                </button>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className="text-xs px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 font-medium">
              {statusMessage}
            </div>
          )}

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Suggested Office Days ({selectedDates.size}/{suggestions.length} selected):
                </span>
                <button
                  onClick={() => {
                    if (selectedDates.size === suggestions.length) {
                      setSelectedDates(new Set());
                    } else {
                      setSelectedDates(new Set(suggestions.map(s => s.date)));
                    }
                  }}
                  className="text-[10px] text-indigo-400 hover:underline font-bold"
                >
                  {selectedDates.size === suggestions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {suggestions.map((item) => {
                  const isChecked = selectedDates.has(item.date);
                  return (
                    <div
                      key={item.date}
                      onClick={() => toggleSelectDate(item.date)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div click
                        className="mt-1 rounded accent-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-indigo-300">{item.date}</span>
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono border border-indigo-500/30">
                            Tag: {item.matchedKeyword}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate mt-0.5">{item.title}</p>
                        {item.location && (
                          <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-zinc-500 shrink-0" />
                            {item.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-zinc-800 pt-3 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-all"
          >
            Cancel
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={handleBatchLog}
              disabled={isLogging || selectedDates.size === 0}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isLogging ? 'Logging...' : `Log ${selectedDates.size} Office Days`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

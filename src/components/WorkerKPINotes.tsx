import React, { useState } from 'react';
import { Calendar, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { logAction } from '../utils/logger';

interface Note {
  id: string;
  date: string;
  text: string;
  images: string[];
}

export function WorkerKPINotes({ workerId }: { workerId: string }) {
  const [allNotes, setAllNotes] = useLocalStorage<Record<string, Note[]>>('worker_notes', {});
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newNoteImages, setNewNoteImages] = useState<string[]>([]);
  
  const workerNotes = allNotes[workerId] || [];

  // sort notes by date descending
  workerNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewNoteImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index: number) => {
    setNewNoteImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    
    const newNote: Note = {
      id: Date.now().toString(),
      date: newNoteDate,
      text: newNoteText,
      images: newNoteImages
    };
    
    setAllNotes(prev => {
      const updated = { ...prev };
      if (!updated[workerId]) updated[workerId] = [];
      updated[workerId] = [newNote, ...updated[workerId]];
      return updated;
    });
    
    logAction('KPI Note Added', `A new note was added for worker ID ${workerId}`, 'info');
    
    setNewNoteText('');
    setNewNoteImages([]);
    setIsAdding(false);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    setAllNotes(prev => {
      const updated = { ...prev };
      if (updated[workerId]) {
        updated[workerId] = updated[workerId].filter(n => n.id !== noteId);
      }
      return updated;
    });
    
    logAction('KPI Note Deleted', `A note was deleted for worker ID ${workerId}`, 'warning');
  };

  return (
    <div className="space-y-4 pt-6 border-t border-divider mt-6">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-primary">Notes</h5>
        {!isAdding && (
          <button type="button" 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-canvas border border-divider rounded-lg p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-tertiary mb-1">Date</label>
              <input 
                type="date" 
                value={newNoteDate}
                onChange={(e) => setNewNoteDate(e.target.value)}
                className="w-full bg-surface border border-divider rounded-xl px-4 py-2 text-sm text-secondary outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-tertiary mb-1">Note Details</label>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Enter note details..."
              rows={3}
              className="w-full bg-surface border border-divider rounded-xl px-4 py-2 text-sm text-secondary outline-none focus:border-blue-500 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-tertiary mb-1">Images (Optional)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newNoteImages.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg border border-divider overflow-hidden group">
                  <img src={img} alt="Upload preview" className="w-full h-full object-cover" />
                  <button type="button" 
                    onClick={() => removeNewImage(i)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border border-dashed border-divider flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors">
                <ImageIcon className="w-5 h-5 text-tertiary mb-1" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-divider">
            <button type="button" 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button type="button" 
              onClick={handleSaveNote}
              disabled={!newNoteText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {workerNotes.length === 0 && !isAdding ? (
          <div className="col-span-full text-center py-6 border border-dashed border-divider rounded-lg text-tertiary text-sm">
            No notes for this worker yet.
          </div>
        ) : (
          workerNotes.map(note => (
            <div key={note.id} className="bg-canvas border border-divider rounded-lg p-3 group flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-xs font-medium text-secondary">
                  <Calendar className="w-3.5 h-3.5 text-tertiary" />
                  {note.date}
                </div>
                <button type="button" 
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-quaternary hover:text-red-400 transition-all"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-secondary whitespace-pre-wrap mb-3 flex-grow">{note.text}</p>
              
              {note.images && note.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto">
                  {note.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded-lg overflow-hidden border border-divider hover:opacity-80 transition-opacity">
                      <img src={img} alt={`Note attachment ${i+1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

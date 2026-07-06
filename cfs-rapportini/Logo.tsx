import React, { useState, useEffect, useRef } from 'react';
import { DailyReport, WorkType } from '../types';
import { Loader2, Sparkles, Save, Clock, MapPin, User, FileText, Briefcase, Truck, Camera, X, Image as ImageIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sounds } from '../utils/sounds';

interface DailyReportFormProps {
  onSubmit: (report: Omit<DailyReport, 'id' | 'createdAt'>) => void;
  initialData?: DailyReport;
  onCancelEdit?: () => void;
}

const DailyReportForm: React.FC<DailyReportFormProps> = ({ onSubmit, initialData, onCancelEdit }) => {
  const [technicianName, setTechnicianName] = useState(initialData?.technicianName || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [workType, setWorkType] = useState<WorkType>(initialData?.workType || 'ordinary');
  const [interventionHours, setInterventionHours] = useState<number | ''>(initialData?.interventionHours || '');
  const [travelHours, setTravelHours] = useState<number | ''>(initialData?.travelHours || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTechnicianName(initialData.technicianName);
      setLocation(initialData.location);
      setDescription(initialData.description);
      setWorkType(initialData.workType);
      setInterventionHours(initialData.interventionHours);
      setTravelHours(initialData.travelHours);
      setDate(initialData.date);
      setPhotos(initialData.photos || []);
    } else {
      const savedName = localStorage.getItem('cfs_last_tech_name');
      if (savedName) setTechnicianName(savedName);
    }
  }, [initialData]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxSize = 1024;

            if (width > height) {
              if (width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setPhotos(prev => [...prev, dataUrl]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianName || !location || !description || interventionHours === '') {
      alert("Compila tutti i campi obbligatori.");
      return;
    }

    const reportData: Omit<DailyReport, 'id' | 'createdAt'> = {
      technicianName,
      location,
      description,
      date,
      workType,
      interventionHours: Number(interventionHours),
      travelHours: workType === 'on_call' ? Number(travelHours || 0) : 0,
      photos
    };

    localStorage.setItem('cfs_last_tech_name', technicianName);
    onSubmit(reportData);
    
    setLocation('');
    setDescription('');
    setInterventionHours('');
    setTravelHours('');
    setPhotos([]);
  };

  // Helper for input styles
  const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-cfs-blue focus:border-transparent block p-3 transition-all duration-200 outline-none hover:bg-white hover:shadow-sm";
  const labelClass = "block mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: Anagrafica */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-display font-bold text-lg text-cfs-grey mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cfs-blue-soft flex items-center justify-center text-cfs-blue">
               <User className="w-4 h-4" />
            </span>
            Dati Generali
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Data</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tecnico</label>
              <input type="text" required placeholder="Mario Rossi" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Luogo / Cantiere</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input type="text" required placeholder="Es. Sede Centrale, Roma" value={location} onChange={(e) => setLocation(e.target.value)} className={`${inputClass} pl-10`} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Tipologia */}
        <div className="glass-card p-6 rounded-2xl">
           <h3 className="font-display font-bold text-lg text-cfs-grey mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cfs-orange-soft flex items-center justify-center text-cfs-orange">
               <Briefcase className="w-4 h-4" />
            </span>
            Tipologia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'ordinary', label: 'Ordinario', color: 'blue', icon: Briefcase },
              { id: 'on_call', label: 'Reperibilità', color: 'orange', icon: Clock },
              { id: 'extraordinary', label: 'Straordinario', color: 'purple', icon: Sparkles },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => { sounds.playPop(); setWorkType(type.id as WorkType); }}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2
                  ${workType === type.id 
                    ? type.id === 'ordinary' ? 'border-cfs-blue bg-cfs-blue-soft/50 text-cfs-blue' :
                      type.id === 'on_call' ? 'border-cfs-orange bg-cfs-orange-soft/50 text-cfs-orange' :
                      'border-purple-500 bg-purple-50 text-purple-600'
                    : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }
                `}
              >
                <AnimatePresence>
                {workType === type.id && (
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]
                    ${type.id === 'ordinary' ? 'bg-cfs-blue' : type.id === 'on_call' ? 'bg-cfs-orange' : 'bg-purple-600'}
                  `}>
                    <Check className="w-3 h-3" />
                  </motion.div>
                )}
                </AnimatePresence>
                <type.icon className="w-6 h-6" />
                <span className="font-semibold text-sm">{type.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-5">
             <div>
                <label className={labelClass}>Ore Intervento</label>
                <div className="relative">
                   <input 
                      type="number" step="0.5" min="0" required 
                      value={interventionHours} 
                      onChange={(e) => setInterventionHours(e.target.value === '' ? '' : Number(e.target.value))} 
                      className={`${inputClass} font-mono font-medium text-lg text-right pr-8`}
                   />
                   <span className="absolute right-3 top-3.5 text-gray-400 font-bold text-sm">h</span>
                </div>
             </div>
             <AnimatePresence>
             {workType === 'on_call' && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }} 
                 animate={{ opacity: 1, height: 'auto' }} 
                 exit={{ opacity: 0, height: 0 }} 
                 className="overflow-hidden"
               >
                 <label className={`${labelClass} text-cfs-orange`}>Ore Viaggio</label>
                 <div className="relative">
                   <input 
                      type="number" step="0.5" min="0" required 
                      value={travelHours} 
                      onChange={(e) => setTravelHours(e.target.value === '' ? '' : Number(e.target.value))} 
                      className={`${inputClass} border-orange-200 bg-orange-50/30 font-mono font-medium text-lg text-right pr-8 text-cfs-orange focus:ring-cfs-orange`}
                   />
                   <span className="absolute right-3 top-3.5 text-cfs-orange font-bold text-sm">h</span>
                 </div>
               </motion.div>
             )}
             </AnimatePresence>
          </div>
        </div>

        {/* SECTION 3: Dettagli & Foto */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-display font-bold text-lg text-cfs-grey mb-5 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
               <FileText className="w-4 h-4" />
            </span>
            Dettagli & Foto
          </h3>

          <div className="mb-6">
            <label className={labelClass}>Descrizione Lavoro</label>
            <div className="relative">
              <textarea
                required
                rows={4}
                placeholder="Descrizione dettagliata..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
             <label className={labelClass}>Allegati</label>
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group border border-gray-100">
                    <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-cfs-blue hover:bg-blue-50/50 flex flex-col items-center justify-center text-gray-400 hover:text-cfs-blue transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-white flex items-center justify-center mb-1 shadow-sm transition-colors">
                     <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase">Foto</span>
                </button>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
          </div>
        </div>

        <div className="flex gap-4">
          {initialData && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-1/3 bg-gray-100 text-gray-700 font-display font-semibold text-lg py-4 rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              Annulla
            </button>
          )}
          <button
            type="submit"
            className={`${initialData ? 'w-2/3' : 'w-full'} bg-gradient-to-r ${initialData ? 'from-green-500 to-green-600' : 'from-cfs-grey to-gray-800'} text-white font-display font-semibold text-lg py-4 rounded-2xl shadow-xl shadow-gray-400/20 hover:shadow-gray-400/40 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3`}
          >
            <Save className="w-6 h-6" />
            {initialData ? 'Aggiorna Rapportino' : 'Salva Rapportino'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default DailyReportForm;
import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './components/Logo';
import DailyReportForm from './components/DailyReportForm';
import { DailyReport } from './types';
import { generateDailyPdf } from './services/pdfGenerator';
import { Trash2, Copy, Calendar, User, FileDown, CheckCircle, Mail, Archive, FileText, Camera, Download, Upload, Lock, AlertCircle, RefreshCw, ChevronRight, Send, MessageCircle, Plus } from 'lucide-react';

type ViewMode = 'form' | 'history' | 'archive';

const App: React.FC = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('form');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [sentDays, setSentDays] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [closedSessionDays, setClosedSessionDays] = useState<string[]>([]);
  const [confirmCloseDate, setConfirmCloseDate] = useState<string | null>(null);
  
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cfs_reports');
    if (saved) {
      try { setReports(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    const savedSent = localStorage.getItem('cfs_sent_days');
    if (savedSent) {
      try { setSentDays(JSON.parse(savedSent)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cfs_sent_days', JSON.stringify(sentDays));
  }, [sentDays]);

  const showToast = (message: string, duration = 3000) => {
    setNotification(message);
    setTimeout(() => setNotification(null), duration);
  };

  const handleSaveReport = (data: Omit<DailyReport, 'id' | 'createdAt'>) => {
    const newReport: DailyReport = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    localStorage.setItem('cfs_reports', JSON.stringify(updatedReports));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Intervento salvato correttamente!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo intervento?')) {
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      localStorage.setItem('cfs_reports', JSON.stringify(updated));
      showToast('Intervento eliminato.');
    }
  };

  const copyToClipboard = (report: DailyReport) => {
    let typeLabel = 'Ordinario';
    if (report.workType === 'on_call') typeLabel = 'Reperibilità';
    if (report.workType === 'extraordinary') typeLabel = 'Straordinario';

    const text = `*Rapportino CFS Facility*\nTecnico: ${report.technicianName}\nData: ${report.date}\nCantiere: ${report.location}\n------------------\n${report.description}\n------------------\nTipo: ${typeLabel}\nOre Lavoro: ${report.interventionHours}h\n${report.workType === 'on_call' ? `Ore Viaggio: ${report.travelHours}h` : ''}`;
    navigator.clipboard.writeText(text);
    showToast('Rapportino copiato negli appunti!');
  };

  const groupedReports = reports.reduce((groups, report) => {
    const date = report.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(report);
    return groups;
  }, {} as Record<string, DailyReport[]>);

  const sortedDates = Object.keys(groupedReports).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const handleInitiateCloseDay = (date: string) => setConfirmCloseDate(date);
  const handleConfirmCloseDay = () => {
    if (confirmCloseDate) {
      setClosedSessionDays(prev => [...prev, confirmCloseDate]);
      showToast('Giornata chiusa! I PDF sono pronti in Archivio.');
      setConfirmCloseDate(null);
    }
  };

  const handleDownloadDay = (date: string) => {
    const dayReports = groupedReports[date];
    if (dayReports && dayReports.length > 0) {
      const technician = dayReports[0].technicianName;
      generateDailyPdf(dayReports, date, technician);
      showToast('Download avviato...');
    }
  };

  const toggleDateSelection = (date: string) => {
    setSelectedDays(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const markAsSent = (dates: string[]) => {
    setSentDays(prev => Array.from(new Set([...prev, ...dates])));
    setSelectedDays([]);
  };

  const markAsUnsent = (date: string) => setSentDays(prev => prev.filter(d => d !== date));

  const dataURLtoFile = (dataurl: string, filename: string): File | null => {
      try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        if (!mime) return null;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
      } catch (e) { return null; }
  };

  const prepareFilesForSharing = async (): Promise<File[]> => {
    const filesToShare: File[] = [];
    selectedDays.forEach(date => {
      const dayReports = groupedReports[date];
      if (dayReports && dayReports.length > 0) {
        const technician = dayReports[0].technicianName;
        // @ts-ignore
        const pdfResults = generateDailyPdf(dayReports, date, technician, { returnBlob: true });
        if (Array.isArray(pdfResults)) {
          pdfResults.forEach(res => {
            filesToShare.push(new File([res.blob], res.fileName, { type: 'application/pdf' }));
          });
        }
        dayReports.forEach((report, index) => {
            if (report.photos) {
                report.photos.forEach((photoBase64, photoIndex) => {
                    const f = dataURLtoFile(photoBase64, `Foto_${technician.replace(/\s+/g, '_')}_${date}_${index + 1}_${photoIndex + 1}.jpg`);
                    if (f) filesToShare.push(f);
                });
            }
        });
      }
    });
    return filesToShare;
  };

  const downloadFilesLocally = (files: File[]) => {
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a'); a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    });
  };

  const handleSendEmail = async () => {
    if (selectedDays.length === 0) return;
    setIsSharing(true);
    showToast('Generazione file...', 2000);
    try {
      const filesToShare = await prepareFilesForSharing();
      if (filesToShare.length === 0) { alert("Errore generazione."); setIsSharing(false); return; }

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        try {
          await navigator.share({ files: filesToShare, title: 'Rapportini CFS', text: `Allegati per: ${selectedDays.join(', ')}` });
          showToast('Inviato!'); markAsSent(selectedDays);
        } catch (e) { if ((e as Error).name !== 'AbortError') throw new Error("SharingFailed"); }
      } else {
        downloadFilesLocally(filesToShare);
        const subject = encodeURIComponent("Rapportini CFS");
        const body = encodeURIComponent(`Rapportini per: ${selectedDays.join(', ')}.`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        alert("File scaricati. Allegali all'email.");
        markAsSent(selectedDays);
      }
    } catch { alert("Errore invio."); } finally { setIsSharing(false); }
  };

  const handleSendWhatsApp = async () => {
    if (selectedDays.length === 0) return;
    setIsSharing(true);
    showToast('Preparazione WhatsApp...', 2000);
    try {
      const files = await prepareFilesForSharing();
      const msg = `Rapportini per: ${selectedDays.join(', ')}`;
      if (files.length === 0) { alert("Errore."); setIsSharing(false); return; }

      if (navigator.canShare && navigator.canShare({ files })) {
         try { await navigator.share({ files, text: msg }); showToast('Fatto!'); markAsSent(selectedDays); }
         catch (e) { if ((e as Error).name !== 'AbortError') throw new Error("SharingFailed"); }
      } else {
         downloadFilesLocally(files);
         window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
         alert("File scaricati. Trascinali su WhatsApp.");
         markAsSent(selectedDays);
      }
    } catch { alert("Errore WhatsApp."); } finally { setIsSharing(false); }
  };

  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Backup salvato!');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && confirm(`Ripristinare ${parsed.length} interventi?`)) {
          setReports(parsed); localStorage.setItem('cfs_reports', JSON.stringify(parsed)); showToast('Ripristinato!');
        }
      } catch { alert("File non valido."); }
      if (backupInputRef.current) backupInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const groupDatesByMonth = (dates: string[]) => {
    const groups: Record<string, string[]> = {};
    dates.forEach(date => {
      const key = new Date(date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      const k = key.charAt(0).toUpperCase() + key.slice(1);
      if (!groups[k]) groups[k] = []; groups[k].push(date);
    });
    return groups;
  };

  const unsentDates = sortedDates.filter(d => !sentDays.includes(d));
  const sentDatesHistory = sortedDates.filter(d => sentDays.includes(d));

  // Visual Components helpers
  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => setCurrentView(id)}
      className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
        currentView === id 
          ? 'text-cfs-blue bg-white shadow-md shadow-gray-200 ring-1 ring-gray-100' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
      }`}
    >
      <Icon className={`w-4 h-4 ${currentView === id ? 'text-cfs-blue' : ''}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 relative overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#F5F5F7] to-[#E8F1F5]" />
      <div className="fixed -z-10 top-0 right-0 w-[500px] h-[500px] bg-cfs-orange/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
      <div className="fixed -z-10 bottom-0 left-0 w-[400px] h-[400px] bg-cfs-blue/5 rounded-full blur-[80px] -translate-x-1/3 translate-y-1/3" />

      {/* Floating Navbar */}
      <header className="sticky top-0 z-40 px-4 py-3">
        <div className="max-w-4xl mx-auto glass rounded-2xl shadow-sm px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 transition-all">
          <Logo className="h-10 scale-90 sm:scale-100 origin-left" />
          
          <div className="flex p-1 bg-gray-100/80 backdrop-blur rounded-full">
            <TabButton id="form" label="Nuovo" icon={Plus} />
            <TabButton id="history" label="Storico" icon={FileText} />
            <TabButton id="archive" label="Archivio" icon={Archive} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 md:p-6 space-y-8">
        
        {/* VIEW: FORM */}
        {currentView === 'form' && (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="mb-8 text-center">
              <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">Nuovo Rapporto</h1>
              <p className="text-gray-500">Compila i dettagli o usa l'AI per velocizzare.</p>
            </div>
            <DailyReportForm onSubmit={handleSaveReport} />
          </div>
        )}

        {/* VIEW: HISTORY */}
        {currentView === 'history' && (
          <div className="animate-fade-in-up space-y-6">
             <div className="mb-4">
              <h1 className="font-display text-3xl font-bold text-gray-800">I tuoi Interventi</h1>
              <p className="text-gray-500">Cronologia completa delle attività svolte.</p>
            </div>

            {reports.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl text-center border-dashed border-2 border-gray-300">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg text-gray-700">Nessun intervento</h3>
                <p className="text-gray-400 mb-4">Inizia compilando il tuo primo rapportino.</p>
                <button onClick={() => setCurrentView('form')} className="text-cfs-blue font-semibold hover:underline">Compila ora</button>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedDates.map((date) => {
                  const isClosed = closedSessionDays.includes(date);
                  return (
                    <div key={date} className="glass-card rounded-2xl overflow-hidden shadow-lg shadow-gray-200/50 hover:shadow-xl transition-shadow duration-300">
                      <div className="bg-white/50 p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cfs-blue to-cyan-700 rounded-xl flex items-center justify-center text-white shadow-md">
                            <span className="font-display font-bold text-sm">{new Date(date).getDate()}</span>
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-lg capitalize">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', month: 'long', year: 'numeric' })}</h3>
                            <p className="text-xs text-gray-500 font-medium">{groupedReports[date].length} interventi registrati</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => !isClosed && handleInitiateCloseDay(date)}
                          disabled={isClosed}
                          className={`w-full sm:w-auto px-5 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-300 ${
                            isClosed 
                              ? 'bg-green-100 text-green-700 cursor-default ring-1 ring-green-200' 
                              : 'bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200 hover:ring-cfs-blue'
                          }`}
                        >
                          {isClosed ? <><CheckCircle className="w-4 h-4" /> Chiuso</> : <><Lock className="w-4 h-4" /> Chiudi Giornata</>}
                        </button>
                      </div>

                      <div className="p-2 space-y-2 bg-gray-50/30">
                        {groupedReports[date].map((report) => (
                          <div key={report.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:border-cfs-blue/30 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-start gap-3">
                                 <div className={`mt-1 w-2 h-2 rounded-full ${report.workType === 'ordinary' ? 'bg-cfs-blue' : report.workType === 'on_call' ? 'bg-cfs-orange' : 'bg-purple-500'}`} />
                                 <div>
                                   <h4 className="font-bold text-gray-900 leading-tight">{report.location}</h4>
                                   <p className="text-sm text-gray-500 line-clamp-2 mt-1">{report.description}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-gray-800 text-lg">{report.interventionHours}h</span>
                                {report.workType === 'on_call' && <div className="text-xs font-mono text-cfs-orange font-medium">+{report.travelHours}h v.</div>}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                               <div className="flex gap-2">
                                 {report.photos && report.photos.length > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><Camera className="w-3 h-3"/> {report.photos.length}</span>}
                               </div>
                               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => copyToClipboard(report)} className="p-2 hover:bg-blue-50 text-cfs-blue rounded-lg"><Copy className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete(report.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW: ARCHIVE */}
        {currentView === 'archive' && (
           <div className="animate-fade-in-up space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold text-gray-800">Archivio</h1>
                  <p className="text-gray-500">Gestisci invii e backup.</p>
                </div>
                
                {/* Backup Actions */}
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExportData} className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" /> Backup
                    </button>
                    <button onClick={() => backupInputRef.current?.click()} className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                        <Upload className="w-4 h-4" /> Ripristina
                    </button>
                    <input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={handleImportData} />
                </div>
             </div>

             {selectedDays.length > 0 && (
                <div className="sticky top-24 z-30 glass-card p-4 rounded-xl shadow-xl border-l-4 border-cfs-orange flex flex-col sm:flex-row justify-between items-center gap-4 animate-scale-in">
                  <div className="flex items-center gap-3">
                     <div className="bg-orange-100 text-cfs-orange p-2 rounded-lg"><CheckCircle className="w-5 h-5"/></div>
                     <span className="font-bold text-gray-800">{selectedDays.length} giorni selezionati</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleSendWhatsApp} disabled={isSharing} className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2">
                       {isSharing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> : <MessageCircle className="w-5 h-5" />} WhatsApp
                    </button>
                    <button onClick={handleSendEmail} disabled={isSharing} className="flex-1 bg-cfs-blue hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2">
                       {isSharing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div> : <Mail className="w-5 h-5" />} Email
                    </button>
                  </div>
                </div>
              )}

             {sortedDates.length === 0 ? (
               <div className="glass-card p-12 text-center rounded-2xl">
                 <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                 <p className="text-gray-400">Archivio vuoto.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* TO SEND */}
                 <div className="space-y-4">
                    <h2 className="font-display font-bold text-gray-700 flex items-center gap-2 text-lg">
                       <span className="w-8 h-8 rounded-lg bg-blue-100 text-cfs-blue flex items-center justify-center"><Send className="w-4 h-4" /></span>
                       Da Inviare
                       <span className="bg-cfs-blue text-white text-xs px-2 py-0.5 rounded-full ml-auto">{unsentDates.length}</span>
                    </h2>
                    
                    {unsentDates.length === 0 && <p className="text-gray-400 text-sm italic p-4">Tutto inviato!</p>}
                    
                    {Object.keys(groupDatesByMonth(unsentDates)).map(monthKey => (
                        <div key={monthKey} className="glass-card rounded-2xl overflow-hidden">
                           <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-100 font-bold text-gray-500 text-xs uppercase tracking-wider">
                              {monthKey}
                           </div>
                           <div className="divide-y divide-gray-100">
                              {groupDatesByMonth(unsentDates)[monthKey].map(date => {
                                 const isSelected = selectedDays.includes(date);
                                 return (
                                   <div key={date} onClick={() => toggleDateSelection(date)} className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                     <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-cfs-blue border-cfs-blue text-white shadow-sm' : 'border-gray-300 bg-white'}`}>
                                       {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                     </div>
                                     <div className="flex-1">
                                       <h4 className="font-bold text-gray-800 capitalize">{new Date(date).toLocaleDateString('it-IT', { day: 'numeric', weekday: 'short' })}</h4>
                                       <span className="text-xs text-gray-500">{groupedReports[date].length} interventi</span>
                                     </div>
                                     <button onClick={(e) => { e.stopPropagation(); handleDownloadDay(date); }} className="text-gray-400 hover:text-cfs-blue p-2 hover:bg-white rounded-full"><FileDown className="w-5 h-5" /></button>
                                   </div>
                                 )
                              })}
                           </div>
                        </div>
                      ))}
                 </div>

                 {/* HISTORY SENT */}
                 <div className="space-y-4">
                    <h2 className="font-display font-bold text-gray-500 flex items-center gap-2 text-lg opacity-80">
                       <span className="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center"><Archive className="w-4 h-4" /></span>
                       Storico Inviati
                    </h2>
                    
                    {Object.keys(groupDatesByMonth(sentDatesHistory)).map(monthKey => (
                        <div key={monthKey} className="glass rounded-2xl overflow-hidden opacity-70 hover:opacity-100 transition-opacity">
                           <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-100 font-bold text-gray-400 text-xs uppercase tracking-wider">
                              {monthKey}
                           </div>
                           <div className="divide-y divide-gray-100">
                              {groupDatesByMonth(sentDatesHistory)[monthKey].map(date => (
                                   <div key={date} className="p-4 flex items-center justify-between gap-4">
                                     <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <h4 className="font-medium text-gray-600 capitalize line-through decoration-gray-300">{new Date(date).toLocaleDateString('it-IT', { day: 'numeric', weekday: 'short' })}</h4>
                                     </div>
                                     <div className="flex gap-1">
                                         <button onClick={() => markAsUnsent(date)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-white rounded-lg"><RefreshCw className="w-4 h-4" /></button>
                                         <button onClick={() => handleDownloadDay(date)} className="p-1.5 text-gray-400 hover:text-cfs-blue hover:bg-white rounded-lg"><FileDown className="w-4 h-4" /></button>
                                     </div>
                                   </div>
                              ))}
                           </div>
                        </div>
                      ))}
                 </div>
               </div>
             )}
           </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center animate-fade-in-up">
        <p className="text-xs text-gray-400/80 font-medium font-sans">
          Developed by Graziano Garlaschelli
        </p>
      </footer>

      {/* Confirmation Modal */}
      {confirmCloseDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-xl text-center text-gray-900 mb-2">Chiudi Giornata</h3>
                <p className="text-gray-500 text-center mb-6 text-sm">Confermi di aver terminato i lavori per il <strong>{new Date(confirmCloseDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</strong>?</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmCloseDate(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Annulla</button>
                    <button onClick={handleConfirmCloseDay} className="flex-1 py-3 rounded-xl bg-cfs-blue text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Conferma</button>
                </div>
            </div>
        </div>
      )}

      {/* Modern Toast */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 glass-card px-6 py-3 rounded-full shadow-xl z-50 flex items-center gap-3 animate-scale-in border-l-4 border-l-green-500">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="font-medium text-sm text-gray-700">{notification}</span>
        </div>
      )}
    </div>
  );
};

export default App;
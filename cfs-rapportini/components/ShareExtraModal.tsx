import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, MessageCircle, FileDown, Loader2 } from 'lucide-react';
import { DailyReport } from '../types';
import { generateDailyPdf } from '../services/pdfGenerator';
import { Share } from '@capacitor/share';

interface ShareExtraModalProps {
  report: DailyReport | null;
  onClose: () => void;
}

export const ShareExtraModal: React.FC<ShareExtraModalProps> = ({ report, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async (method: 'native' | 'download') => {
    if (!report) return;
    setIsGenerating(true);

    try {
      const date = new Date(report.createdAt).toLocaleDateString('it-IT');
      const results = generateDailyPdf([report], date, report.technicianName, { returnBlob: true });
      if (!results || results.length < 2) throw new Error("Could not generate extraordinary report");
      
      const extraPdf = results[1];
      
      if (method === 'download') {
        const url = URL.createObjectURL(extraPdf.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = extraPdf.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const isNative = !!window.Capacitor?.isNative;
        if (isNative) {
          try {
            const { Directory, Filesystem } = await import('@capacitor/filesystem');
            const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(extraPdf.blob);
              reader.onloadend = () => {
                const b64 = reader.result as string;
                resolve(b64.split(',')[1]);
              };
            });
            const savedFile = await Filesystem.writeFile({
              path: extraPdf.fileName,
              data: base64Data,
              directory: Directory.Cache
            });
            await Share.share({
              dialogTitle: 'Condividi Intervento Straordinario',
              files: [savedFile.uri]
            });
          } catch (e) {
            console.error("Capacitor share error", e);
            alert("Errore nella condivisione nativa.");
          }
        } else {
          const file = new File([extraPdf.blob], extraPdf.fileName, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Intervento Straordinario',
              text: `Rapporto intervento straordinario - ${report.location}`,
              files: [file]
            });
          } else {
            alert("La condivisione diretta di file non è supportata. Usa il tasto Scarica.");
          }
        }
      }
    } catch (e) {
      console.error("Error sharing extraordinary report", e);
      alert("Si è verificato un errore durante la generazione del PDF.");
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  if (!report) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 10, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm my-8 relative overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 bg-white">
            <h3 className="text-lg font-bold text-gray-800">Condividi Rapportino</h3>
            <button onClick={onClose} disabled={isGenerating} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4">
              Vuoi inviare subito questo rapporto straordinario al cliente?
            </p>

            <button
              onClick={() => handleShare('native')}
              disabled={isGenerating}
              className="w-full py-4 px-4 bg-cfs-blue text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-70"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
              Condividi (WhatsApp / Email)
            </button>

            <button
              onClick={() => handleShare('download')}
              disabled={isGenerating}
              className="w-full py-4 px-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors disabled:opacity-70"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              Scarica PDF
            </button>

            <button
              onClick={onClose}
              disabled={isGenerating}
              className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 mt-2"
            >
              No, grazie (Salta)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

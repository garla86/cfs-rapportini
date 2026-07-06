import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (technicianSignature: string | undefined, clientSignature: string | undefined) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const techSigRef = useRef<SignatureCanvas>(null);
  const clientSigRef = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    const techSig = techSigRef.current?.isEmpty() ? undefined : techSigRef.current?.getCanvas().toDataURL('image/png');
    const clientSig = clientSigRef.current?.isEmpty() ? undefined : clientSigRef.current?.getCanvas().toDataURL('image/png');
    onSave(techSig, clientSig);
  };

  const handleSkip = () => {
    onSave(undefined, undefined);
  };

  if (!isOpen) return null;

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
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-8 relative overflow-hidden"
        >
          <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-lg font-bold text-amber-900">Firme Intervento Straordinario</h3>
            <button onClick={onClose} className="p-2 text-amber-600 hover:bg-amber-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">Firma Tecnico</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden relative">
                <SignatureCanvas 
                  ref={techSigRef}
                  canvasProps={{ className: 'w-full h-40' }}
                  backgroundColor="rgba(255,255,255,0)"
                />
                <button 
                  onClick={() => techSigRef.current?.clear()} 
                  className="absolute top-2 right-2 text-xs bg-white/80 backdrop-blur px-2 py-1 rounded text-gray-500 shadow-sm border border-gray-200"
                >
                  Cancella
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">Firma Cliente</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden relative">
                <SignatureCanvas 
                  ref={clientSigRef}
                  canvasProps={{ className: 'w-full h-40' }}
                  backgroundColor="rgba(255,255,255,0)"
                />
                <button 
                  onClick={() => clientSigRef.current?.clear()} 
                  className="absolute top-2 right-2 text-xs bg-white/80 backdrop-blur px-2 py-1 rounded text-gray-500 shadow-sm border border-gray-200"
                >
                  Cancella
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex gap-3 sticky bottom-0 z-10">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-colors"
            >
              Salta
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-colors"
            >
              Conferma Firme
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

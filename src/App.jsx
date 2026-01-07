import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RotateCw, Image as ImageIcon, Sparkles, MessageSquare, Loader2, Copy, Check, Twitter, Dice5 } from 'lucide-react';

export default function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });
  const [overlayState, setOverlayState] = useState({ x: 400, y: 225, scale: 0.5, rotation: 5 });
  
  const [textPrompt, setTextPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Standard');

  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const overlayImgRef = useRef(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Traitement des images (Upload et Drag & Drop)
  const processFile = (file, type) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (type === 'base') {
          setBaseImage(e.target.result);
          baseImgRef.current = img;
          setCanvasSize({ width: img.width, height: img.height });
        } else {
          setOverlayImage(e.target.result);
          overlayImgRef.current = img;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Mise à jour du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (baseImgRef.current) {
      canvas.width = baseImgRef.current.width;
      canvas.height = baseImgRef.current.height;
      ctx.drawImage(baseImgRef.current, 0, 0);
    } else {
      canvas.width = 800;
      canvas.height = 450;
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (overlayImgRef.current) {
      ctx.save();
      ctx.translate(overlayState.x, overlayState.y);
      ctx.rotate((overlayState.rotation * Math.PI) / 180);
      ctx.scale(overlayState.scale, overlayState.scale);
      const w = overlayImgRef.current.width;
      const h = overlayImgRef.current.height;
      
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'white';
      const pad = 20;
      ctx.fillRect(-w/2 - pad, -h/2 - pad, w + pad*2, h + pad*4);
      ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      ctx.restore();
    }
  }, [baseImage, overlayImage, overlayState]);

  // Appel au serveur pour l'IA
  const generateText = async () => {
    if (!textPrompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textPrompt, tone: selectedTone })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedText(data.text);
    } catch (e) { 
      alert("Erreur génération : " + e.message); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  // Publication sur X
  const publishToX = async () => {
    if (!generatedText || !canvasRef.current) return;
    setIsPublishing(true);
    try {
      const res = await fetch('/api/publish-to-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: generatedText, 
          imageBase64: canvasRef.current.toDataURL('image/png') 
        })
      });
      const data = await res.json();
      if (data.success) alert("Votre post a été publié avec succès !");
      else alert("Erreur : " + data.error);
    } catch (e) { 
      alert("Erreur lors de la publication"); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  // Gestion du Drag & Drop sur les boutons
  const onDrop = (e, type) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], type);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Éditeur Visuel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600"><ImageIcon /> Éditeur Visuel</h2>
            <div className="bg-gray-100 rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300">
              <canvas ref={canvasRef} 
                onMouseDown={() => { isDragging.current = true; }}
                onMouseMove={(e) => {
                  if (!isDragging.current) return;
                  setOverlayState(s => ({ ...s, x: s.x + e.movementX, y: s.y + e.movementY }));
                }}
                onMouseUp={() => isDragging.current = false}
                className="max-w-full h-auto cursor-move shadow-md" />
            </div>
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              <label 
                onDragOver={e => e.preventDefault()} 
                onDrop={e => onDrop(e, 'base')} 
                className="bg-orange-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-orange-700 transition font-bold"
              >
                Changer Fond <input type="file" className="hidden" onChange={e => processFile(e.target.files[0], 'base')} />
              </label>
              <label 
                onDragOver={e => e.preventDefault()} 
                onDrop={e => onDrop(e, 'overlay')} 
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition font-bold"
              >
                Ajouter Image <input type="file" className="hidden" onChange={e => processFile(e.target.files[0], 'overlay')} />
              </label>
            </div>
            {overlayImage && (
              <div className="mt-4 flex gap-4 justify-center items-center">
                <span className="text-xs font-bold text-gray-400">Taille:</span>
                <input type="range" min="0.1" max="2" step="0.01" value={overlayState.scale} onChange={(e) => setOverlayState(s => ({...s, scale: parseFloat(e.target.value)}))} className="w-24 accent-indigo-600" />
                <span className="text-xs font-bold text-gray-400">Rotation:</span>
                <input type="range" min="-45" max="45" value={overlayState.rotation} onChange={(e) => setOverlayState(s => ({...s, rotation: parseInt(e.target.value)}))} className="w-24 accent-indigo-600" />
              </div>
            )}
          </div>
        </div>

        {/* Colonne Texte & Publication */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600"><MessageSquare /> Texte du Post</h2>
            <textarea 
              value={textPrompt} 
              onChange={e => setTextPrompt(e.target.value)} 
              placeholder="Quel est le sujet de votre post ?" 
              className="w-full p-3 border border-gray-200 rounded-xl mb-4 h-24 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <div className="flex gap-2 mb-4">
              <select value={selectedTone} onChange={e => setSelectedTone(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs outline-none">
                <option value="Standard">Ton Standard</option>
                <option value="Professionnel">Professionnel</option>
                <option value="Viral">Viral / Hype</option>
              </select>
              <button 
                onClick={generateText} 
                disabled={isGenerating || !textPrompt} 
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-gray-300"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Générer
              </button>
            </div>
            <textarea 
              value={generatedText} 
              onChange={e => setGeneratedText(e.target.value)} 
              placeholder="Texte généré..." 
              className="w-full p-3 border border-indigo-100 rounded-xl flex-1 bg-indigo-50 mb-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <button 
              onClick={publishToX} 
              disabled={isPublishing || !generatedText || !baseImage || !overlayImage} 
              className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:bg-gray-900 disabled:bg-gray-400"
            >
              {isPublishing ? <Loader2 className="animate-spin" size={20} /> : <Twitter fill="white" size={20} />} Publier sur X
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

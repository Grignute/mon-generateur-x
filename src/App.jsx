import React, { useState, useRef, useEffect } from 'react';
import { Upload, RotateCw, Maximize, Image as ImageIcon, Trash2, Sparkles, MessageSquare, Loader2, Twitter, RefreshCw } from 'lucide-react';

export default function App() {
  // --- ÉTAT : IMAGE ---
  const [baseImage, setBaseImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });
  const [overlayState, setOverlayState] = useState({
    x: 100, y: 100, scale: 0.5, rotation: 5
  });

  // --- ÉTAT : TEXTE ---
  const [textPrompt, setTextPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Expert Web3 / DeFi');

  // --- REFS ---
  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const overlayImgRef = useRef(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // --- PERSISTANCE DU FOND ---
  useEffect(() => {
    const savedBg = localStorage.getItem('myPostBackground');
    if (savedBg) {
      const img = new Image();
      img.onload = () => {
        baseImgRef.current = img;
        setBaseImage(savedBg);
        setCanvasSize({ width: img.width, height: img.height });
      };
      img.src = savedBg;
    }
  }, []);

  const saveBackgroundToLocal = (dataUrl) => {
    try { 
      localStorage.setItem('myPostBackground', dataUrl); 
    } catch (e) { 
      console.warn("Image de fond trop lourde pour le stockage local."); 
    }
  };

  const processFile = (file, type) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      const img = new Image();
      img.onload = () => {
        if (type === 'base') {
          saveBackgroundToLocal(result);
          setBaseImage(result);
          baseImgRef.current = img;
          setCanvasSize({ width: img.width, height: img.height });
        } else {
          let initialScale = 0.5;
          if (baseImgRef.current) {
            const targetWidth = baseImgRef.current.width * 0.4;
            initialScale = targetWidth / img.width;
          }
          
          setOverlayImage(result);
          overlayImgRef.current = img;
          setOverlayState({
            x: baseImgRef.current ? baseImgRef.current.width / 2 : 200,
            y: baseImgRef.current ? baseImgRef.current.height / 2 : 200,
            scale: initialScale,
            rotation: 5
          });
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const startDragging = (clientX, clientY) => {
    if (!overlayImage) return;
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    lastPos.current = { 
      x: (clientX - rect.left) * scaleX, 
      y: (clientY - rect.top) * scaleY 
    };
  };

  const moveDragging = (clientX, clientY) => {
    if (!isDragging.current || !overlayImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const currentX = (clientX - rect.left) * scaleX;
    const currentY = (clientY - rect.top) * scaleY;
    
    const dx = currentX - lastPos.current.x;
    const dy = currentY - lastPos.current.y;
    
    setOverlayState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: currentX, y: currentY };
  };

  const stopDragging = () => { isDragging.current = false; };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (baseImgRef.current) {
      canvas.width = baseImgRef.current.width;
      canvas.height = baseImgRef.current.height;
      ctx.drawImage(baseImgRef.current, 0, 0);
    } else {
      canvas.width = 800;
      canvas.height = 450;
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (overlayImgRef.current) {
      ctx.save();
      const { x, y, rotation, scale } = overlayState;
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      
      const w = overlayImgRef.current.width;
      const h = overlayImgRef.current.height;
      
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = 'white';
      const pad = Math.max(w, h) * 0.05;
      ctx.fillRect(-w/2 - pad, -h/2 - pad, w + pad*2, h + pad*4);
      ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      ctx.restore();
    }
  }, [baseImage, overlayImage, overlayState, canvasSize]);

  const generateText = async () => {
    if (!textPrompt) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textPrompt, tone: selectedTone })
      });
      const data = await response.json();
      if (data.text) setGeneratedText(data.text);
    } catch (err) {
      alert("Erreur de génération.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedText || !canvasRef.current) return;
    setIsPublishing(true);
    const imageBase64 = canvasRef.current.toDataURL('image/png');
    try {
      const response = await fetch('/api/publish-to-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: generatedText, imageBase64: imageBase64 })
      });
      const result = await response.json();
      if (result.success) {
        alert("Publication réussie !");
        setOverlayImage(null);
        overlayImgRef.current = null;
        setGeneratedText('');
        setTextPrompt('');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const resetAll = () => {
    setOverlayImage(null);
    overlayImgRef.current = null;
    setGeneratedText('');
    setTextPrompt('');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2 text-orange-600 uppercase tracking-wider">
                <ImageIcon size={24} /> Éditeur Visuel
              </h2>
              <button onClick={resetAll} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center min-h-[450px] border-2 border-dashed border-slate-300 relative touch-none">
              <canvas 
                ref={canvasRef} 
                onMouseDown={(e) => startDragging(e.clientX, e.clientY)}
                onMouseMove={(e) => moveDragging(e.clientX, e.clientY)}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onTouchStart={(e) => startDragging(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => moveDragging(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={stopDragging}
                className={`max-w-full h-auto shadow-2xl transition-transform ${overlayImage ? 'cursor-move' : 'cursor-default'}`} 
              />
              {!baseImage && <p className="absolute text-slate-400 font-medium text-center px-4">Chargez un fond pour commencer (format X recommandé)</p>}
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <div className="flex flex-wrap gap-3 justify-center">
                <label className="bg-orange-600 text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-orange-700 transition-all font-bold shadow-md flex items-center gap-2">
                  <Upload size={20} /> Fond (Canvas)
                  <input type="file" className="hidden" onChange={(e) => processFile(e.target.files[0], 'base')} />
                </label>
                <label className="bg-indigo-600 text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-indigo-700 transition-all font-bold shadow-md flex items-center gap-2">
                  <Upload size={20} /> Image / Photo
                  <input type="file" className="hidden" onChange={(e) => processFile(e.target.files[0], 'overlay')} />
                </label>
              </div>

              {overlayImage && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-center">
                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <Maximize size={18} className="text-slate-400" />
                    <input type="range" min="0.05" max="2" step="0.01" value={overlayState.scale} onChange={(e) => setOverlayState({...overlayState, scale: parseFloat(e.target.value)})} className="flex-1 accent-indigo-600" />
                  </div>
                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <RotateCw size={18} className="text-slate-400" />
                    <input type="range" min="-180" max="180" step="1" value={overlayState.rotation} onChange={(e) => setOverlayState({...overlayState, rotation: parseInt(e.target.value)})} className="flex-1 accent-indigo-600" />
                  </div>
                  <button onClick={() => {setOverlayImage(null); overlayImgRef.current = null;}} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-indigo-600 uppercase tracking-wider">
              <MessageSquare size={24} /> Contenu Web3
            </h2>
            
            <div className="space-y-4 flex-1 flex flex-col">
              <textarea 
                value={textPrompt} 
                onChange={(e) => setTextPrompt(e.target.value)} 
                placeholder="Ex: Analyse de la DeFi sur Solana, actus MoveToEarn ou présence à CryptoXR..." 
                className="w-full p-4 border border-slate-200 rounded-2xl h-32 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              />
              
              <div className="flex flex-col gap-2">
                <select 
                  value={selectedTone} 
                  onChange={(e) => setSelectedTone(e.target.value)} 
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Expert Web3 / DeFi">Expert Web3 / DeFi</option>
                  <option value="Actualité / CryptoXR">Actualité / CryptoXR</option>
                  <option value="Hype / Engagement">Hype / Engagement (LFG/Bullish)</option>
                  <option value="Professionnel">Professionnel / Factuel</option>
                </select>
                <button 
                  onClick={generateText} 
                  disabled={isGenerating || !textPrompt} 
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-200 transition-all active:scale-95 shadow-lg"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Générer le Post
                </button>
              </div>

              <textarea 
                value={generatedText} 
                onChange={(e) => setGeneratedText(e.target.value)} 
                className="w-full p-4 border border-indigo-100 rounded-2xl flex-1 bg-indigo-50/50 text-sm font-medium text-slate-700 resize-none outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Le post optimisé apparaîtra ici..."
              />

              <button 
                onClick={handlePublish} 
                disabled={isPublishing || !generatedText || !baseImage || !overlayImage} 
                className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest ${isPublishing ? 'bg-slate-400' : 'bg-black hover:bg-slate-800 active:scale-95'}`}
              >
                {isPublishing ? <Loader2 className="animate-spin" /> : <Twitter fill="white" size={20} />} Publier sur X
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

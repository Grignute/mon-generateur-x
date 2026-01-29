import React, { useState, useRef, useEffect } from 'react';
import { Upload, RotateCw, Maximize, Image as ImageIcon, Trash2, Sparkles, MessageSquare, Loader2, Twitter, RefreshCw, AlertCircle, Palette } from 'lucide-react';

export default function App() {
  // --- ÉTAT : IMAGE ---
  const [baseImage, setBaseImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });
  const [overlayState, setOverlayState] = useState({
    x: 100, y: 100, scale: 0.5, rotation: 0, 
    borderStyle: 'classic', // classic, stars, glow, jagged
    borderWidths: [10, 10, 40, 10], // top, right, bottom, left
    accentColor: '#ffffff'
  });

  // --- ÉTAT : TEXTE ---
  const [textPrompt, setTextPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Expert Web3 / DeFi');
  const [errorMessage, setErrorMessage] = useState(null);

  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const overlayImgRef = useRef(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

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

  const processFile = (file, type) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      const img = new Image();
      img.onload = () => {
        if (type === 'base') {
          localStorage.setItem('myPostBackground', result);
          setBaseImage(result);
          baseImgRef.current = img;
          setCanvasSize({ width: img.width, height: img.height });
        } else {
          // --- CALCUL DU HASARD BASÉ SUR L'HEURE ---
          const now = Date.now();
          const randomAngle = (now % 31) - 15; // Entre -15 et 15
          
          // Variations de bords irréguliers (style polaroïd ou scrap)
          const bTop = 8 + (now % 5);
          const bRight = 8 + ((now >> 1) % 5);
          const bBottom = 25 + ((now >> 2) % 15);
          const bLeft = 8 + ((now >> 3) % 5);

          // Choix du style décoratif
          const styles = ['classic', 'stars', 'glow', 'jagged'];
          const chosenStyle = styles[now % styles.length];

          let initialScale = 0.5;
          if (baseImgRef.current) {
            initialScale = (baseImgRef.current.width * 0.35) / img.width;
          }
          
          setOverlayImage(result);
          overlayImgRef.current = img;
          setOverlayState({
            x: baseImgRef.current ? baseImgRef.current.width / 2 : 200,
            y: baseImgRef.current ? baseImgRef.current.height / 2 : 200,
            scale: initialScale,
            rotation: randomAngle,
            borderStyle: chosenStyle,
            borderWidths: [bTop, bRight, bBottom, bLeft],
            accentColor: now % 2 === 0 ? '#6366f1' : '#f59e0b'
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
    lastPos.current = { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
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
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (overlayImgRef.current) {
      const { x, y, rotation, scale, borderStyle, borderWidths, accentColor } = overlayState;
      const w = overlayImgRef.current.width;
      const h = overlayImgRef.current.height;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      // 1. EFFETS DE DÉCORATION ARRIÈRE-PLAN
      if (borderStyle === 'glow') {
        ctx.shadowBlur = 60;
        ctx.shadowColor = accentColor;
      } else {
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
      }

      // 2. DESSIN DU CADRE (Bords irréguliers demandés)
      const [t, r, b, l] = borderWidths;
      ctx.fillStyle = 'white';
      
      if (borderStyle === 'jagged') {
        // Effet bords découpés "timbre"
        ctx.beginPath();
        const step = 20;
        const rectW = w + l + r;
        const rectH = h + t + b;
        const startX = -w/2 - l;
        const startY = -h/2 - t;
        ctx.moveTo(startX, startY);
        // On dessine grossièrement pour l'effet scrap
        for(let i=0; i<rectW; i+=step) ctx.lineTo(startX+i, startY+(i%2?5:0));
        for(let i=0; i<rectH; i+=step) ctx.lineTo(startX+rectW+(i%2?5:0), startY+i);
        for(let i=rectW; i>0; i-=step) ctx.lineTo(startX+i, startY+rectH+(i%2?5:0));
        for(let i=rectH; i>0; i-=step) ctx.lineTo(startX+(i%2?5:0), startY+i);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-w/2 - l, -h/2 - t, w + l + r, h + t + b);
      }

      // 3. IMAGE PRINCIPALE
      ctx.shadowBlur = 0;
      ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);

      // 4. DÉCORATIONS SUPPLÉMENTAIRES (Étoiles/Confettis)
      if (borderStyle === 'stars') {
        ctx.fillStyle = accentColor;
        for(let i=0; i<8; i++) {
          const sx = (Math.random() - 0.5) * (w * 1.5);
          const sy = (Math.random() - 0.5) * (h * 1.5);
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }, [baseImage, overlayImage, overlayState, canvasSize]);

  const generateText = async () => {
    if (!textPrompt) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textPrompt, tone: selectedTone })
      });
      const data = await response.json();
      if (data.text) setGeneratedText(data.text);
    } catch (err) {
      setErrorMessage("Erreur de génération texte.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedText || !canvasRef.current) return;
    setIsPublishing(true);
    setErrorMessage(null);
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
        setGeneratedText('');
      } else {
        setErrorMessage(result.error);
      }
    } catch (err) {
      setErrorMessage("Erreur de connexion serveur.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2 text-orange-600 uppercase tracking-wider">
                <ImageIcon size={24} /> Créateur de Visuels
              </h2>
              <button onClick={() => setOverlayImage(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <RefreshCw size={20} />
              </button>
            </div>

            <div className="bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center min-h-[450px] border-2 border-dashed border-slate-300 relative touch-none">
              <canvas 
                ref={canvasRef} 
                onMouseDown={(e) => startDragging(e.clientX, e.clientY)}
                onMouseMove={(e) => moveDragging(e.clientX, e.clientY)}
                onMouseUp={() => isDragging.current = false}
                className={`max-w-full h-auto shadow-2xl ${overlayImage ? 'cursor-move' : ''}`} 
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              <label className="bg-orange-600 text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-orange-700 transition-all font-bold shadow-md flex items-center gap-2">
                <Upload size={20} /> Fond (X)
                <input type="file" className="hidden" onChange={(e) => processFile(e.target.files[0], 'base')} />
              </label>
              <label className="bg-indigo-600 text-white px-6 py-3 rounded-xl cursor-pointer hover:bg-indigo-700 transition-all font-bold shadow-md flex items-center gap-2">
                <Palette size={20} /> Ajouter Photo
                <input type="file" className="hidden" onChange={(e) => processFile(e.target.files[0], 'overlay')} />
              </label>
            </div>
            
            {overlayImage && (
              <div className="mt-4 flex flex-wrap gap-6 items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 w-48">
                  <Maximize size={18} className="text-slate-400" />
                  <input type="range" min="0.1" max="1.5" step="0.01" value={overlayState.scale} onChange={(e) => setOverlayState({...overlayState, scale: parseFloat(e.target.value)})} className="flex-1" />
                </div>
                <div className="flex items-center gap-3 w-48">
                  <RotateCw size={18} className="text-slate-400" />
                  <input type="range" min="-180" max="180" step="1" value={overlayState.rotation} onChange={(e) => setOverlayState({...overlayState, rotation: parseInt(e.target.value)})} className="flex-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col gap-4">
          <h2 className="text-xl font-black flex items-center gap-2 text-indigo-600 uppercase">
            <MessageSquare size={24} /> Contenu
          </h2>
          {errorMessage && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100">{errorMessage}</div>}
          <textarea 
            value={textPrompt} 
            onChange={(e) => setTextPrompt(e.target.value)} 
            placeholder="Sujet du post..." 
            className="w-full p-4 border border-slate-200 rounded-2xl h-32 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
          <select 
            value={selectedTone} 
            onChange={(e) => setSelectedTone(e.target.value)} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option>Expert Web3 / DeFi</option>
            <option>Actualité / CryptoXR</option>
            <option>Hype / Engagement</option>
            <option>Professionnel</option>
          </select>
          <button onClick={generateText} disabled={isGenerating || !textPrompt} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:bg-slate-200">
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Générer le Texte
          </button>
          <textarea 
            value={generatedText} 
            onChange={(e) => setGeneratedText(e.target.value)} 
            className="w-full p-4 border border-indigo-50 rounded-2xl flex-1 bg-indigo-50/30 text-sm italic"
          />
          <button onClick={handlePublish} disabled={isPublishing || !generatedText || !overlayImage} className="w-full bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 disabled:bg-slate-300">
            {isPublishing ? <Loader2 className="animate-spin" /> : <Twitter size={20} fill="white" />} PUBLIER SUR X
          </button>
        </div>
      </div>
    </div>
  );
}

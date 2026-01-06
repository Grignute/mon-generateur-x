import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RotateCw, Maximize, Image as ImageIcon, Dice5, Copy, Sparkles, MessageSquare, Loader2, Check, Twitter, Share2, MousePointerClick } from 'lucide-react';

export default function App() {
  // --- ÉTAT : IMAGE ---
  const [baseImage, setBaseImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });
  const [overlayState, setOverlayState] = useState({
    x: 400,
    y: 225,
    scale: 0.5,
    rotation: 5,
    styleType: 'polaroid'
  });

  // États pour le feedback visuel du Drag & Drop
  const [isDraggingBase, setIsDraggingBase] = useState(false);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);

  // --- ÉTAT : GÉNÉRATION DE TEXTE ---
  const [textPrompt, setTextPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Standard');
  const [copySuccess, setCopySuccess] = useState(false);

  // --- REFS ---
  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const overlayImgRef = useRef(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  
  const promptInputRef = useRef(null); 
  const outputTextRef = useRef(null);  

  // --- 1. LOGIQUE DE PERSISTANCE (LOCALSTORAGE) ---
  
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
      console.warn("Image trop lourde pour le stockage local.");
    }
  };

  const randomizeOverlay = (imgWidth, imgHeight, canvasW, canvasH) => {
    const styles = ['polaroid', 'modern', 'elegant'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const minPct = 0.75;
    const maxPct = 1.10;
    const randomHeightPct = minPct + Math.random() * (maxPct - minPct);
    const calculatedScale = (canvasH * randomHeightPct) / imgHeight;
    const randomRotation = Math.floor(Math.random() * 17) - 8;
    const minX = canvasW * 0.5;
    const maxX = canvasW * 0.75;
    const randomX = minX + Math.random() * (maxX - minX);
    const minY = canvasH * 0.4;
    const maxY = canvasH * 0.6;
    const randomY = minY + Math.random() * (maxY - minY);

    return {
      x: randomX,
      y: randomY,
      scale: calculatedScale,
      rotation: randomRotation,
      styleType: randomStyle
    };
  };

  const handleManualRandomize = () => {
    if (!overlayImgRef.current || !baseImgRef.current) return;
    const newState = randomizeOverlay(
      overlayImgRef.current.width,
      overlayImgRef.current.height,
      canvasSize.width,
      canvasSize.height
    );
    setOverlayState(newState);
  };

  const processFile = (file, type) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert("Veuillez déposer un fichier image.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      const img = new Image();
      img.onload = () => {
        if (type === 'base') {
             saveBackgroundToLocal(result);
             setBaseImage(result);
             baseImgRef.current = img;
             setCanvasSize({ width: img.width, height: img.height });
        } else {
             setOverlayImage(img.src);
             overlayImgRef.current = img;
             if (baseImgRef.current) {
                const newState = randomizeOverlay(img.width, img.height, baseImgRef.current.width, baseImgRef.current.height);
                setOverlayState(newState);
             }
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleBaseUpload = (e) => processFile(e.target.files[0], 'base');
  const handleOverlayUpload = (e) => processFile(e.target.files[0], 'overlay');

  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'base') setIsDraggingBase(true);
    if (type === 'overlay') setIsDraggingOverlay(true);
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'base') setIsDraggingBase(false);
    if (type === 'overlay') setIsDraggingOverlay(false);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'base') setIsDraggingBase(false);
    if (type === 'overlay') setIsDraggingOverlay(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0], type);
    }
  };

  // Dessin du Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (baseImgRef.current) {
      canvas.width = baseImgRef.current.width;
      canvas.height = baseImgRef.current.height;
      ctx.drawImage(baseImgRef.current, 0, 0);
    } else {
      canvas.width = 800;
      canvas.height = 450;
      ctx.fillStyle = '#ff7f00'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("Chargez le fond", canvas.width/2, canvas.height/2);
    }

    if (overlayImgRef.current) {
      ctx.save();
      const { x, y, rotation, scale, styleType } = overlayState;
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      const w = overlayImgRef.current.width;
      const h = overlayImgRef.current.height;

      if (styleType === 'polaroid') {
        const borderSize = Math.max(w, h) * 0.06;
        const bottomSize = borderSize * 2.5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 25;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = '#fff';
        ctx.fillRect(-w/2 - borderSize, -h/2 - borderSize, w + borderSize*2, h + borderSize + bottomSize);
        ctx.shadowColor = 'transparent'; 
        ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      } else if (styleType === 'modern') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;
        const radius = Math.min(w, h) * 0.1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w, h, radius);
        else ctx.rect(-w/2, -h/2, w, h);
        ctx.closePath();
        ctx.fillStyle = 'white'; 
        ctx.fill(); 
        ctx.clip();
        ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      } else if (styleType === 'elegant') {
        const pad = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 15;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = 'white';
        ctx.fillRect(-w/2 - pad, -h/2 - pad, w + pad*2, h + pad*2);
        ctx.shadowColor = 'transparent';
        ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      }
      ctx.restore();
    }
  }, [baseImage, overlayImage, overlayState, canvasSize]);

  // Gestion de la souris (Déplacement image)
  const handleMouseDown = (e) => {
    if (!overlayImage) return;
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    lastPos.current = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };
  const handleMouseMove = (e) => {
    if (!isDragging.current || !overlayImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    const dx = currentX - lastPos.current.x;
    const dy = currentY - lastPos.current.y;
    setOverlayState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: currentX, y: currentY };
  };
  const handleMouseUp = () => isDragging.current = false;

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'visuel_x.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // --- 2. LOGIQUE GÉNÉRATION DE TEXTE (Backend sécurisé) ---

  const generateText = async () => {
    if (!textPrompt) return;
    setIsGenerating(true);
    setGeneratedText('');
    setCopySuccess(false);

    try {
        // On appelle l'API de notre serveur Render qui possède la clé
        const response = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: textPrompt, tone: selectedTone })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setGeneratedText(data.text || "Erreur lors du retour de l'IA.");
    } catch (error) {
        console.error(error);
        alert("Erreur de génération : " + error.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!outputTextRef.current) return;
    outputTextRef.current.select();
    document.execCommand('copy');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePostToX = () => {
      downloadImage();
      copyToClipboard();
      const tweetText = generatedText ? encodeURIComponent(generatedText) : '';
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
      window.open(twitterUrl, '_blank');
  };

  const manualSelectAll = (ref) => {
    if (ref.current) { ref.current.focus(); ref.current.select(); }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 min-h-screen font-sans text-gray-800">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ÉDITEUR VISUEL */}
        <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white shadow-xl rounded-xl p-6">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4 border-b pb-4">
                    <h1 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                        <ImageIcon className="w-6 h-6" /> Visuel
                    </h1>
                    <button onClick={downloadImage} disabled={!baseImage || !overlayImage} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${baseImage && overlayImage ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-400'}`}>
                        <Download size={16} /> Télécharger
                    </button>
                </div>

                <div className="relative w-full overflow-hidden bg-gray-200 rounded-lg border border-gray-300 shadow-inner flex items-center justify-center mb-4 min-h-[300px]">
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className={`max-w-full h-auto object-contain ${overlayImage ? 'cursor-move' : 'cursor-default'}`}
                        style={{ maxHeight: '60vh' }}
                    />
                </div>

                <div className="flex flex-wrap gap-4 justify-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <label 
                      onDragOver={(e) => handleDragOver(e, 'base')}
                      onDragLeave={(e) => handleDragLeave(e, 'base')}
                      onDrop={(e) => handleDrop(e, 'base')}
                      className={`cursor-pointer transition-all border px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm ${isDraggingBase ? 'bg-orange-100 border-orange-400 scale-105' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                    >
                        <Upload size={14} /> {baseImage ? 'Changer Fond' : 'Charger Fond'}
                        <input type="file" onChange={handleBaseUpload} accept="image/*" className="hidden" />
                    </label>
                    
                    <label 
                      onDragOver={(e) => handleDragOver(e, 'overlay')}
                      onDragLeave={(e) => handleDragLeave(e, 'overlay')}
                      onDrop={(e) => handleDrop(e, 'overlay')}
                      className={`cursor-pointer transition-all border px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm ${isDraggingOverlay ? 'bg-indigo-100 border-indigo-400 scale-105' : 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700'}`}
                    >
                        <Upload size={14} /> {overlayImage ? 'Changer Image' : 'Ajouter Image'}
                        <input type="file" onChange={handleOverlayUpload} accept="image/*" className="hidden" />
                    </label>

                    {overlayImage && (
                        <>
                            <button onClick={handleManualRandomize} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-sm transition-colors">
                                <Dice5 size={16} /> Styles
                            </button>
                            <input type="range" min="0.1" max="2.5" step="0.01" value={overlayState.scale} onChange={(e) => setOverlayState({...overlayState, scale: parseFloat(e.target.value)})} className="w-16 accent-orange-600" title="Taille" />
                            <input type="range" min="-15" max="15" step="1" value={overlayState.rotation} onChange={(e) => setOverlayState({...overlayState, rotation: parseInt(e.target.value)})} className="w-16 accent-orange-600" title="Rotation" />
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* GÉNÉRATEUR DE TEXTE */}
        <div className="lg:col-span-1 bg-white shadow-xl rounded-xl p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 border-b pb-4 text-indigo-700">
                <MessageSquare className="w-6 h-6" />
                <h2 className="text-xl font-bold">Texte du Post</h2>
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                         <label className="block text-sm font-semibold text-gray-700">Vos consignes</label>
                         <button onClick={() => manualSelectAll(promptInputRef)} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Sélectionner</button>
                    </div>
                    <textarea ref={promptInputRef} className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500" value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} placeholder="Sujet du post..." />
                    <div className="flex justify-between items-center mt-2">
                        <select value={selectedTone} onChange={(e) => setSelectedTone(e.target.value)} className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-1.5 outline-none">
                            <option value="Standard">Standard</option>
                            <option value="Professionnel">Professionnel</option>
                            <option value="Viral et Fun">Viral / Fun</option>
                        </select>
                        <button onClick={generateText} disabled={!textPrompt || isGenerating} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:bg-gray-300">
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Générer
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col relative">
                    <div className="flex justify-between items-center mb-2">
                         <label className="block text-sm font-semibold text-gray-700">Résultat IA</label>
                         <button onClick={() => manualSelectAll(outputTextRef)} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Sélectionner</button>
                    </div>
                    <textarea ref={outputTextRef} value={generatedText} onChange={(e) => setGeneratedText(e.target.value)} className="w-full flex-1 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm resize-none outline-none" />
                    {generatedText && (
                        <button onClick={copyToClipboard} className="absolute top-10 right-2 p-2 bg-white rounded-md shadow-sm hover:bg-gray-50">
                            {copySuccess ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                        </button>
                    )}
                </div>

                <button onClick={handlePostToX} disabled={!generatedText || !baseImage || !overlayImage} className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${generatedText && baseImage && overlayImage ? 'bg-black hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'}`}>
                    <Twitter size={20} fill="white" /> Ouvrir X et Copier
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, RotateCw, Maximize, Image as ImageIcon, Dice5, Copy, Sparkles, MessageSquare, Loader2, Check, Twitter, MousePointerClick, Send } from 'lucide-react';

export default function App() {
  // --- ÉTAT : IMAGE ---
  const [baseImage, setBaseImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });
  const [overlayState, setOverlayState] = useState({
    x: 400, y: 225, scale: 0.5, rotation: 5, styleType: 'polaroid'
  });

  // --- ÉTAT : TEXTE ---
  const [textPrompt, setTextPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Standard');
  const [copySuccess, setCopySuccess] = useState(false);

  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);
  const overlayImgRef = useRef(null);
  const promptInputRef = useRef(null); 
  const outputTextRef = useRef(null);  

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
    try { localStorage.setItem('myPostBackground', dataUrl); } catch (e) { console.warn("Image trop lourde pour stockage local."); }
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
          setOverlayImage(result);
          overlayImgRef.current = img;
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // --- DESSIN DU CANVAS ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (baseImgRef.current) {
      canvas.width = baseImgRef.current.width;
      canvas.height = baseImgRef.current.height;
      ctx.drawImage(baseImgRef.current, 0, 0);
    }

    if (overlayImgRef.current) {
      ctx.save();
      const { x, y, rotation, scale, styleType } = overlayState;
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      const w = overlayImgRef.current.width;
      const h = overlayImgRef.current.height;

      // Style simple (Polaroid)
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'white';
      const pad = 20;
      ctx.fillRect(-w/2 - pad, -h/2 - pad, w + pad*2, h + pad*4);
      ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      ctx.restore();
    }
  }, [baseImage, overlayImage, overlayState, canvasSize]);

  // --- GÉNÉRATION DE TEXTE (IA) ---
  const generateText = async () => {
    if (!textPrompt) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Rédige un post X percutant (max 280 car.) sur : ${textPrompt}. Ton : ${selectedTone}` }] }]
        })
      });
      const data = await response.json();
      setGeneratedText(data.candidates[0].content.parts[0].text);
    } catch (err) {
      alert("Erreur de génération");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- PUBLICATION AUTOMATIQUE VIA LE SERVEUR ---
  const handlePublish = async () => {
    if (!generatedText || !canvasRef.current) return;
    
    setIsPublishing(true);
    const imageBase64 = canvasRef.current.toDataURL('image/png');

    try {
      const response = await fetch('/api/publish-to-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generatedText,
          imageBase64: imageBase64
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("Publication réussie sur X !");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      alert("Erreur lors de la publication : " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Éditeur Visuel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
              <ImageIcon /> Visuel de la publication
            </h2>
            <div className="bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center min-h-[400px]">
              <canvas ref={canvasRef} className="max-w-full h-auto shadow-2xl" />
            </div>
            <div className="mt-4 flex gap-4 justify-center">
              <label className="bg-orange-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-700 transition">
                Fond
                <input type="file" className="hidden" onChange={(e) => processFile(e.target.files[0], 'base')} />
              </label>
              <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition">
                Image
                <input type="file" className="hidden" onChange={(e) => processFile(e.target.files[0], 'overlay')} />
              </label>
            </div>
          </div>
        </div>

        {/* Éditeur de Texte & Publication */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
              <MessageSquare /> Texte du Post
            </h2>
            
            <textarea 
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="Sujet du post..."
              className="w-full p-3 border rounded-xl mb-4 h-32"
            />
            
            <button 
              onClick={generateText}
              disabled={isGenerating}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Générer le texte
            </button>

            <textarea 
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full p-3 border rounded-xl mt-4 h-40 bg-indigo-50"
            />

            <button 
              onClick={handlePublish}
              disabled={isPublishing || !generatedText}
              className={`mt-auto w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${isPublishing ? 'bg-gray-400' : 'bg-black hover:bg-gray-900'}`}
            >
              {isPublishing ? <Loader2 className="animate-spin" /> : <Twitter fill="white" />}
              Publier instantanément sur X
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

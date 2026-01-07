import React, { useState, useRef, useEffect } from 'react';
import { Upload, ImageIcon, Sparkles, MessageSquare, Loader2, Twitter, Dice5 } from 'lucide-react';

export default function App() {
  const [baseImage, setBaseImage] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
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

  const processFile = (file, type) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (type === 'base') {
          setBaseImage(e.target.result);
          baseImgRef.current = img;
        } else {
          setOverlayImage(e.target.result);
          overlayImgRef.current = img;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

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
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'white';
      ctx.fillRect(-w/2 - 20, -h/2 - 20, w + 40, h + 80);
      ctx.drawImage(overlayImgRef.current, -w/2, -h/2, w, h);
      ctx.restore();
    }
  }, [baseImage, overlayImage, overlayState]);

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
      setGeneratedText(data.text);
    } catch (e) { alert("Erreur génération"); }
    finally { setIsGenerating(false); }
  };

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
      if (data.success) alert("Publié avec succès !");
      else alert("Erreur : " + data.error);
    } catch (e) { alert("Erreur de connexion"); }
    finally { setIsPublishing(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600"><ImageIcon /> Visuel</h2>
          <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed flex justify-center">
            <canvas ref={canvasRef} 
              onMouseDown={() => { isDragging.current = true; }}
              onMouseMove={(e) => {
                if (!isDragging.current) return;
                setOverlayState(s => ({ ...s, x: s.x + e.movementX, y: s.y + e.movementY }));
              }}
              onMouseUp={() => isDragging.current = false}
              className="max-w-full h-auto cursor-move" />
          </div>
          <div className="mt-4 flex gap-4 justify-center">
            <label className="bg-orange-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-700">
              Changer Fond <input type="file" className="hidden" onChange={e => processFile(e.target.files[0], 'base')} />
            </label>
            <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700">
              Ajouter Image <input type="file" className="hidden" onChange={e => processFile(e.target.files[0], 'overlay')} />
            </label>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600"><MessageSquare /> Texte</h2>
          <textarea value={textPrompt} onChange={e => setTextPrompt(e.target.value)} placeholder="Sujet..." className="w-full p-3 border rounded-xl mb-4 h-24" />
          <button onClick={generateText} disabled={isGenerating} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 mb-4">
            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} Générer
          </button>
          <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)} className="w-full p-3 border rounded-xl h-40 bg-indigo-50 mb-4" />
          <button onClick={publishToX} disabled={isPublishing || !generatedText} className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            {isPublishing ? <Loader2 className="animate-spin" /> : <Twitter fill="white" />} Publier sur X
          </button>
        </div>
      </div>
    </div>
  );
}

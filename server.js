const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));

/**
 * Nettoyage TRÈS strict pour éviter les erreurs 401/403 liées aux caractères invisibles.
 */
const cleanKey = (val) => {
  if (!val) return '';
  return val.toString().trim().replace(/[\r\n\s"']/g, '');
};

const twitterConfig = {
  appKey: cleanKey(process.env.TWITTER_API_KEY),
  appSecret: cleanKey(process.env.TWITTER_API_SECRET),
  accessToken: cleanKey(process.env.TWITTER_ACCESS_TOKEN),
  accessSecret: cleanKey(process.env.TWITTER_ACCESS_SECRET),
};

const twitterClient = new TwitterApi(twitterConfig);
const GEMINI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

// --- API : GÉNÉRATION IA ---
app.post('/api/generate-text', async (req, res) => {
  try {
    const { prompt, tone } = req.body;
    if (!GEMINI_API_KEY) throw new Error("Clé Gemini manquante.");

    let style = "Expert Web3, technique et DeFi.";
    if (tone === "Actualité / CryptoXR") style = "Journalistique, axé sur l'événement CryptoXR et le networking.";
    if (tone === "Hype / Engagement") style = "Viral, communautaire, utilisant le jargon LFG, Bullish, WAGMI.";
    if (tone === "Professionnel") style = "Sobre et informatif.";

    const systemPrompt = `Rédige un post X (280 car.) sur : ${prompt}. 
    Ton : ${style}. 
    Aère le texte avec des sauts de ligne. 
    Pas de hashtags sauf si spécifiés. 
    Sois percutant.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text || "Erreur IA" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API : PUBLICATION SUR X ---
app.post('/api/publish-to-x', async (req, res) => {
  try {
    const { text, imageBase64 } = req.body;
    
    if (!imageBase64) throw new Error("Image manquante.");

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. Upload média via v1 (obligatoire pour les images)
    console.log("Upload du média...");
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { type: 'png' });

    // 2. Publication du Tweet via v2 (plus stable pour le texte)
    console.log("Publication du tweet...");
    const tweet = await twitterClient.v2.tweet({
      text: text,
      media: { media_ids: [mediaId] }
    });

    res.status(200).json({ success: true, tweetId: tweet.data.id });

  } catch (error) {
    console.error("Détails erreur X:", error.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.data ? `Erreur X: ${error.data.detail || JSON.stringify(error.data)}` : error.message 
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur prêt sur port ${PORT}`));

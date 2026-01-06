const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configuration
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// --- CONFIGURATION CLIENTS API ---

// Client X (Twitter)
const twitterClientInit = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
});
const twitterClient = twitterClientInit.readWrite;

// Clé Gemini (Google AI)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// --- ENDPOINTS ---

// 1. Génération de texte via Gemini
app.post('/api/generate-text', async (req, res) => {
  try {
    const { prompt, tone } = req.body;

    if (!GEMINI_API_KEY) {
      throw new Error("Clé API Gemini manquante sur le serveur.");
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Rédige un post X percutant (maximum 280 caractères) sur le sujet suivant : ${prompt}. Le ton doit être ${tone}. N'utilise pas de guillemets autour du texte.` 
          }] 
        }]
      })
    });

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("L'IA n'a pas retourné de texte.");
    }

    res.status(200).json({ text: generatedText.trim() });
  } catch (error) {
    console.error("Erreur Gemini:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Publication sur X (Texte + Image)
app.post('/api/publish-to-x', async (req, res) => {
  try {
    const { text, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Image manquante" });
    }

    // Conversion base64 en Buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Upload Media
    console.log("Upload du média...");
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { type: 'png' });

    // Publication Tweet
    console.log("Publication du tweet...");
    const tweet = await twitterClient.v2.tweet({
      text: text,
      media: { media_ids: [mediaId] }
    });

    res.status(200).json({ success: true, tweetId: tweet.data.id });
  } catch (error) {
    console.error("Erreur X API:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SERVIR LE FRONTEND ---

// On sert les fichiers du dossier /dist (créé par npm run build)
app.use(express.static(path.join(__dirname, 'dist')));

// Redirection de toutes les autres routes vers l'index.html (Single Page App)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

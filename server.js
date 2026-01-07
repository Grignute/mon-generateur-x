const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configuration
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

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

// Endpoint : Génération de texte via l'IA
app.post('/api/generate-text', async (req, res) => {
  try {
    const { prompt, tone } = req.body;
    if (!GEMINI_API_KEY) throw new Error("Clé API Gemini manquante dans les variables d'environnement.");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Rédige un post X percutant (max 280 car.) sur le sujet : ${prompt}. Ton : ${tone}. Ne mets pas de guillemets.` }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text ? text.trim() : "Désolé, l'IA n'a pas pu générer de texte." });
  } catch (error) {
    console.error("Erreur Gemini:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint : Publication sur X
app.post('/api/publish-to-x', async (req, res) => {
  try {
    const { text, imageBase64 } = req.body;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { type: 'png' });
    const tweet = await twitterClient.v2.tweet({ text, media: { media_ids: [mediaId] } });

    res.status(200).json({ success: true, tweetId: tweet.data.id });
  } catch (error) {
    console.error("Erreur X API:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir les fichiers statiques du dossier 'dist' (généré par le build)
app.use(express.static(path.join(__dirname, 'dist')));

// Redirection vers index.html pour le mode Single Page App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

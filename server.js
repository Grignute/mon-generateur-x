const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Initialisation sécurisée du client Twitter
const twitterClientInit = new TwitterApi({
  appKey: (process.env.TWITTER_API_KEY || '').trim(),
  appSecret: (process.env.TWITTER_API_SECRET || '').trim(),
  accessToken: (process.env.TWITTER_ACCESS_TOKEN || '').trim(),
  accessSecret: (process.env.TWITTER_ACCESS_SECRET || '').trim(),
});

const twitterClient = twitterClientInit.readWrite;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Endpoint : Génération de texte
app.post('/api/generate-text', async (req, res) => {
  try {
    const { prompt, tone } = req.body;
    if (!GEMINI_API_KEY) throw new Error("Clé API Gemini manquante.");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Rédige un post X percutant (max 280 car.) sur : ${prompt}. Ton : ${tone}. Pas de guillemets.` }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text ? text.trim() : "Erreur IA" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint : Publication sur X avec logs de diagnostic
app.post('/api/publish-to-x', async (req, res) => {
  try {
    const { text, imageBase64 } = req.body;
    
    if (!text || !imageBase64) {
      return res.status(400).json({ success: false, error: "Contenu ou image manquant." });
    }

    console.log("Préparation de l'image...");
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Vérification des clés avant d'essayer
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_ACCESS_TOKEN) {
      throw new Error("Les identifiants Twitter sont mal configurés dans l'environnement.");
    }

    console.log("Tentative d'upload du média...");
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { type: 'png' });
    
    console.log("Média uploadé avec succès ID:", mediaId);

    console.log("Tentative de publication du tweet...");
    const tweet = await twitterClient.v2.tweet({
      text: text,
      media: { media_ids: [mediaId] }
    });

    console.log("Tweet publié avec succès ! ID:", tweet.data.id);
    res.status(200).json({ success: true, tweetId: tweet.data.id });
  } catch (error) {
    console.error("ERREUR PUBLICATION X:", error);
    // On renvoie un message d'erreur plus détaillé
    let detailedError = error.message;
    if (error.data) detailedError += ` - ${JSON.stringify(error.data)}`;
    
    res.status(500).json({ success: false, error: detailedError });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));

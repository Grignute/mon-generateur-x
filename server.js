const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

/**
 * Nettoyage TRÈS strict des clés.
 * Supprime tout ce qui n'est pas un caractère alphanumérique ou spécifique aux clés X.
 */
const cleanKey = (val) => {
  if (!val) return '';
  return val.toString().replace(/[\r\n\s"']/g, '').trim();
};

const twitterConfig = {
  appKey: cleanKey(process.env.TWITTER_API_KEY),
  appSecret: cleanKey(process.env.TWITTER_API_SECRET),
  accessToken: cleanKey(process.env.TWITTER_ACCESS_TOKEN),
  accessSecret: cleanKey(process.env.TWITTER_ACCESS_SECRET),
};

// Initialisation du client
const twitterClient = new TwitterApi(twitterConfig);
const rwClient = twitterClient.readWrite;

const GEMINI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

// API : Génération de texte optimisée pour la lisibilité
app.post('/api/generate-text', async (req, res) => {
  try {
    const { prompt, tone } = req.body;
    if (!GEMINI_API_KEY) throw new Error("Clé API Gemini manquante.");

    // Instructions améliorées pour un texte aéré et sans hashtags non sollicités
    const systemPrompt = `Rédige un post X (max 280 car.) sur le sujet : ${prompt}. 
    Ton : ${tone}. 
    
    Règles strictes de formatage :
    1. Aère le texte au maximum : utilise des doubles sauts de ligne entre chaque phrase ou paragraphe court pour donner de la légèreté.
    2. N'ajoute AUCUN hashtag (#) de toi-même. N'en utilise que si l'utilisateur en a spécifiquement inclus dans son sujet.
    3. Ne mets pas de guillemets autour du post.
    4. Sois percutant dès la première ligne.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text ? text.trim() : "Erreur de génération IA" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API : Publication sur X
app.post('/api/publish-to-x', async (req, res) => {
  try {
    const { text, imageBase64 } = req.body;
    
    console.log("--- NOUVELLE TENTATIVE DE PUBLICATION ---");
    
    // Diagnostic longueurs pour vérifier si Render a bien chargé les variables
    console.log(`Diagnostic Keys - APIKey: ${twitterConfig.appKey.length}, Token: ${twitterConfig.accessToken.length}`);

    if (!imageBase64) throw new Error("Image manquante.");

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. Upload Media
    console.log("Étape 1 : Envoi du média vers X...");
    const mediaId = await rwClient.v1.uploadMedia(imageBuffer, { type: 'png' });
    console.log("Étape 1 RÉUSSIE. ID Média:", mediaId);

    // 2. Tweet
    console.log("Étape 2 : Création du tweet...");
    const tweet = await rwClient.v2.tweet({
      text: text,
      media: { media_ids: [mediaId] }
    });

    console.log("SUCCÈS TOTAL. Tweet ID:", tweet.data.id);
    res.status(200).json({ success: true, tweetId: tweet.data.id });

  } catch (error) {
    console.error("ÉCHEC DE PUBLICATION X :");
    console.error("Status Code:", error.code);
    
    if (error.data) {
      console.error("Détails X API:", JSON.stringify(error.data, null, 2));
    } else {
      console.error("Message d'erreur:", error.message);
    }

    res.status(500).json({ 
      success: false, 
      error: error.data ? `X Error: ${JSON.stringify(error.data)}` : error.message 
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
  if (!twitterConfig.appKey || !twitterConfig.accessToken) {
    console.error("ATTENTION : Les clés Twitter ne sont pas détectées dans l'environnement !");
  }
});

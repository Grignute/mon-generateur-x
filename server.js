// Serveur Node.js optimisé pour le déploiement (Render/Heroku)
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configuration CORS pour accepter les requêtes de votre futur domaine
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// --- CONFIGURATION API X (Via Variables d'Environnement) ---
// Sur le serveur distant, vous devrez configurer ces variables :
// TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
});

const twitterClient = client.readWrite;

// Endpoint de publication
app.post('/api/publish-to-x', async (req, res) => {
  try {
    const { text, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Image manquante" });
    }

    // Extraction et conversion de l'image
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log("Étape 1: Upload du média vers X...");
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, { type: 'png' });

    console.log("Étape 2: Création du Tweet...");
    const tweet = await twitterClient.v2.tweet({
      text: text,
      media: { media_ids: [mediaId] }
    });

    res.status(200).json({ success: true, tweetId: tweet.data.id });
  } catch (error) {
    console.error("Détails de l'erreur X API:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- GESTION DU FRONTEND ---
// Sert les fichiers statiques de React (après 'npm run build')
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

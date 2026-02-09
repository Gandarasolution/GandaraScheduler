/**
 * @fileoverview Serveur WebSocket collaboratif pour Gandara Scheduler
 * 
 * Ce serveur utilise Yjs et y-websocket pour permettre la collaboration
 * en temps réel sur les rendez-vous du planning.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const PORT = process.env.WS_PORT || 1234;

// Création du serveur HTTP
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Gandara Scheduler - Collaboration Server\n');
});

// Création du serveur WebSocket
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const docName = req.url.slice(1).split('?')[0];
  console.log(`📡 Nouvelle connexion au document: ${docName}`);
  
  setupWSConnection(ws, req, {
    docName,
    gc: true // Active le garbage collection pour optimiser la mémoire
  });
  
  ws.on('close', () => {
    console.log(`🔌 Déconnexion du document: ${docName}`);
  });
});

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur de collaboration démarré sur le port ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n⏹️  Arrêt du serveur...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Serveur arrêté proprement');
      process.exit(0);
    });
  });
});

// Gestion des erreurs
process.on('uncaughtException', (err) => {
  console.error('❌ Erreur non gérée:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});

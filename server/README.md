# Gandara Scheduler - Serveur de Collaboration

Ce dossier contient le serveur WebSocket pour la collaboration en temps réel.

## Installation

Les dépendances ont été ajoutées au `package.json` principal :
- `yjs` : Framework CRDT pour la synchronisation de données
- `y-websocket` : Provider WebSocket pour Yjs
- `y-protocols` : Protocoles pour Yjs
- `ws` : Serveur WebSocket Node.js

Installez toutes les dépendances avec :
```bash
npm install
```

## Démarrage

### Serveur de collaboration seul
```bash
npm run collab:server
```

Le serveur démarre sur le port 1234 (configurable via `WS_PORT` dans `.env.local`).

### Mode développement complet (Next.js + Serveur collaboration)
```bash
npm run dev:full
```

Cette commande lance à la fois :
- L'application Next.js sur le port 8080
- Le serveur de collaboration sur le port 1234

## Configuration

Créez un fichier `.env.local` à la racine du projet avec :
```env
NEXT_PUBLIC_WS_URL=ws://localhost:1234
WS_PORT=1234
```

## Fonctionnement

Le serveur utilise Yjs pour synchroniser les rendez-vous entre tous les clients connectés en temps réel :

1. **Synchronisation automatique** : Tous les changements (création, modification, suppression) sont automatiquement propagés
2. **Gestion des conflits** : Yjs résout automatiquement les conflits grâce à son algorithme CRDT
3. **Présence** : Le système affiche les utilisateurs actuellement connectés
4. **Persistance** : Les données restent synchronisées même après une déconnexion/reconnexion

## Architecture

```
client (Next.js)
  ├─ useCollaboration hook
  │   └─ Gère la connexion WebSocket
  │   └─ Synchronise les données avec Yjs
  └─ CollaborationIndicator
      └─ Affiche l'état de connexion
      └─ Liste les utilisateurs connectés

server (Node.js)
  └─ collaboration-server.js
      └─ Gère les connexions WebSocket
      └─ Synchronise les documents Yjs
```

## Intégration

La collaboration est automatiquement activée dans `app/calendrier/pages/index.tsx` avec :
```tsx
enableCollaboration: true
```

Pour désactiver temporairement :
```tsx
enableCollaboration: false
```

## Déploiement Production

Pour la production, hébergez le serveur de collaboration sur un serveur dédié et mettez à jour `NEXT_PUBLIC_WS_URL` avec l'URL publique :

```env
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

Recommandations :
- Utilisez `wss://` (WebSocket sécurisé) en production
- Mettez en place un reverse proxy (nginx) pour gérer SSL
- Configurez PM2 ou similaire pour garder le serveur actif
- Ajoutez une authentification si nécessaire

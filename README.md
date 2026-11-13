# HelpDesk Campus

Application de support du campus avec une API Express/MongoDB et un front React/Tailwind.

## Prérequis

- Node.js 22 ou supérieur
- npm
- Docker Desktop avec Docker Compose

## Installation

Depuis la racine du projet :

```powershell
docker compose up -d
```

Cette commande démarre MongoDB sur `localhost:27017`.

### Backend

```powershell
cd back
npm install
Copy-Item .env.example .env
```

Le fichier `.env` utilise par défaut :

```text
API       http://localhost:3000
MongoDB   mongodb://localhost:27017
Base      helpdesk
```

### Frontend

Dans un second terminal :

```powershell
cd front
npm install
```

## Jeu de données de départ

Le seed supprime les données existantes de la base `helpdesk`, puis crée :

- 3 utilisateurs ;
- 2 techniciens ;
- 7 tickets dans différents statuts ;
- des messages ;
- un historique de statuts.

Depuis le dossier `back` :

```powershell
npm run seed
```

Comptes de démonstration :

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Utilisateur | `ana@campus.fr` | `campus1234` |
| Technicien | `marc.tech@campus.fr` | `campus1234` |

## Lancement

Ouvrir deux terminaux.

### API

```powershell
cd back
npm start
```

L'API est disponible sur <http://localhost:3000>.

Vérification rapide :

```powershell
Invoke-WebRequest http://localhost:3000/health
```

### Frontend

```powershell
cd front
npm run dev
```

Ouvrir ensuite <http://localhost:5173>.

## Tests

Les tests backend utilisent `mongodb-memory-server` et ne nécessitent pas le Docker MongoDB.

```powershell
cd back
npm test
```

Le build du frontend peut être vérifié avec :

```powershell
cd front
npm run build
```

## Parcours de démonstration complet

1. Se connecter avec `ana@campus.fr`.
2. Créer un ticket depuis la page d'accueil.
3. Se déconnecter puis se connecter avec `marc.tech@campus.fr`.
4. Vérifier que le technicien voit tous les tickets.
5. Ouvrir le ticket créé et cliquer sur **Prendre en charge**.
6. Répondre dans la discussion.
7. Se reconnecter avec Ana et répondre à son tour.
8. Se reconnecter avec Marc, puis fermer le ticket.
9. Se reconnecter avec Ana et consulter l'historique.
10. Rouvrir le ticket avec le bouton **Rouvrir**.

## API principale

Toutes les routes suivantes, sauf l'inscription et la connexion, nécessitent un utilisateur authentifié.

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout

GET    /tickets
POST   /tickets
GET    /tickets/:id
PATCH  /tickets/:id
POST   /tickets/:id/take
POST   /tickets/:id/release
POST   /tickets/:id/close
POST   /tickets/:id/reopen

GET  /tickets/:id/messages
POST /tickets/:id/messages
GET  /tickets/:id/history
```

## Dépannage

### `Failed to fetch`

Vérifier que :

1. Docker Desktop est démarré ;
2. MongoDB est lancé avec `docker compose up -d` ;
3. l'API est lancée avec `cd back; npm start` ;
4. le frontend est ouvert sur <http://localhost:5173> et non une autre origine.

### Vérifier les conteneurs

```powershell
docker ps
```

### Arrêter MongoDB

```powershell
docker compose down
```

## Structure

```text
back/          API Express, services, tests et seed
front/         Application React/Vite/Tailwind
modelisation/  Documents Merise de conception
docker-compose.yml
README.md
```

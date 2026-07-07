# Étape 1 : build du frontend
FROM node:22-alpine

# Dossier de travail dans le conteneur
WORKDIR /app

# Copier les fichiers nécessaires
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du projet
COPY . .

# Exposer le port du serveur Vite (par défaut 5173)
EXPOSE 5173

# Lancer le serveur de développement
CMD ["npm", "run", "dev"]

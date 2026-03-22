# GUIDE DE DÉPLOIEMENT — Zémidjan Manager

## Ce que tu vas faire (15 minutes)

1. Créer une base de données Firebase (gratuit)
2. Créer un dépôt GitHub et déposer le fichier
3. Activer GitHub Pages → ton appli est en ligne

---

## ÉTAPE 1 — Créer le projet Firebase

1. Va sur https://console.firebase.google.com
2. Clique **"Créer un projet"**
   - Nom : `zemidjan-manager`
   - Désactive Google Analytics (pas nécessaire)
   - Clique **Créer le projet**

3. Dans le menu gauche → **Firestore Database**
   - Clique **Créer une base de données**
   - Choisis **Mode production**
   - Région : `eur3 (europe-west)` ou `us-central`
   - Clique **Activer**

4. Dans Firestore → onglet **Règles**, remplace le contenu par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contrats/{document=**} {
      allow read, write: if true;
    }
  }
}
```

   Clique **Publier**

   > ⚠️ Ces règles permettent un accès libre. Pour sécuriser plus tard,
   > ajoute une authentification Firebase.

5. Dans le menu gauche → icône **</>** (Web)
   - Nom de l'app : `zemidjan-web`
   - Ne coche PAS Firebase Hosting
   - Clique **Enregistrer l'app**
   - **Copie l'objet `firebaseConfig`** qui s'affiche — tu en auras besoin
     au premier lancement de l'appli. Il ressemble à ceci :

```json
{
  "apiKey": "AIza...",
  "authDomain": "zemidjan-manager.firebaseapp.com",
  "projectId": "zemidjan-manager",
  "storageBucket": "zemidjan-manager.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef"
}
```

---

## ÉTAPE 2 — Mettre le fichier sur GitHub

### Option A — Via le site GitHub (sans terminal)

1. Va sur https://github.com → connecte-toi ou crée un compte
2. Clique **"New repository"**
   - Nom : `zemidjan-manager`
   - Visibilité : **Public** (requis pour GitHub Pages gratuit)
   - Coche **"Add a README file"**
   - Clique **Create repository**

3. Dans le dépôt créé, clique **"Add file" → "Upload files"**
4. Glisse le fichier `index.html` dans la zone
5. Clique **"Commit changes"**

### Option B — Via Git (terminal)

```bash
git clone https://github.com/TON-COMPTE/zemidjan-manager
cd zemidjan-manager
cp /chemin/vers/index.html .
git add index.html
git commit -m "Initial deploy"
git push
```

---

## ÉTAPE 3 — Activer GitHub Pages

1. Dans ton dépôt GitHub, clique **Settings**
2. Dans le menu gauche → **Pages**
3. Sous **"Source"** → sélectionne **"Deploy from a branch"**
4. Branch : **main** / Folder : **/ (root)**
5. Clique **Save**

Après 1-2 minutes, ton URL sera :
```
https://TON-COMPTE.github.io/zemidjan-manager/
```

---

## ÉTAPE 4 — Premier lancement

1. Ouvre l'URL GitHub Pages
2. Un écran de configuration apparaît
3. Colle l'objet `firebaseConfig` copié à l'étape 1
4. Clique **"Démarrer l'application"**

La configuration est sauvegardée dans le navigateur —
tu n'auras plus à la ressaisir sur cet appareil.

Sur un nouveau téléphone ou un autre appareil, colle
à nouveau le même `firebaseConfig`.

---

## Mettre à jour l'application

Si tu reçois une nouvelle version du fichier `index.html` :

1. Va dans ton dépôt GitHub
2. Clique sur `index.html` existant
3. Clique l'icône ✏️ (éditer) ou **"Upload files"**
4. Remplace par le nouveau fichier
5. Commit → l'appli se met à jour automatiquement en 1-2 min

---

## Ton domaine personnalisé (optionnel)

Si tu as un domaine (ex: `zemidjan.tonsite.com`) :

1. Chez ton registrar DNS, ajoute un enregistrement CNAME :
   - Nom : `zemidjan`
   - Valeur : `TON-COMPTE.github.io`

2. Dans GitHub Pages Settings → **Custom domain** → entre ton domaine
3. Coche **"Enforce HTTPS"**

---

## Résumé rapide

| Élément         | Service       | Coût    |
|-----------------|---------------|---------|
| Base de données | Firebase      | Gratuit |
| Hébergement     | GitHub Pages  | Gratuit |
| Domaine         | Ton registrar | Variable|

---

*Guide généré pour Zémidjan Manager — HOUNTONDJI Pierre-Canisius*

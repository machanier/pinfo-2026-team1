# Guide d'installation et Environnement

Ce document explique comment configurer votre machine pour travailler sur le projet, que vous soyez sur Mac, Windows(WSL2) ou Linux.

## Pré-requis communs

### GitHub Student Developer Pack
*Nécessaire pour obtenir GitKraken Pro gratuitement.*
1. **Email** : Ajoutez et faites vérifier votre email universitaire dans vos paramètres GitHub : `Settings > Emails`.
2. **Rejoindre** : Allez sur [education.github.com/students](https://github.com/education/students).
3. **Validation** : Cliquez sur **"Get benefits"**. 
   > *Note : La vérification peut prendre de quelques heures à quelques jours.*

### GitKraken & GitLens
*Outils recommandés pour la gestion du Git Flow et la traçabilité du code.*
1. **Activation** : [Activez votre plan étudiant ici](https://www.gitkraken.com/github-student-developer-pack-bundle). 
   - Cliquez sur *"Get Your Free Student Plan"*, connectez-vous avec GitHub, puis sur *"Get started"*.
2. **Installation** : Téléchargez et installez **GitKraken Desktop**.
3. **VS Code** : Installez l'extension **GitLens** pour identifier l'auteur de chaque ligne de code et la PR associée.

### Docker Desktop
*Nécessaire pour la conteneurisation des services.*
- **Windows** : Vous devez impérativement utiliser **WSL2**. Activez l'option *"Use the WSL 2 based engine"* dans les réglages de Docker Desktop.

---

## Kubernetes
*(Contenu à venir)*

---

## Stack de Développement
*Les versions seront confirmées par les responsables de pôle.*
- **Backend (Java)** :
    *- JDK 17 ou 21 (à confirmer par l'équipe Backend).*
    *- IDE : IntelliJ IDEA ou VS Code (avec le pack d'extensions Java).*
- **Frontend (JS)** :
    *- Node.js (Version LTS).*
    *- IDE : VS Code.*

---

## Premier lancement (Quick Start)
Nous utilisons le protocole **SSH** pour plus de sécurité et de confort.

### Option A : Via GitKraken (Recommandé)
1. Allez dans `File > Clone Repo`.
2. Choisissez l'onglet **GitHub.com**.
3. Recherchez et sélectionnez le dépôt `machanier/pinfo-2026-team1`.
4. Cliquez sur **Clone the repo!**

### Option B : Via le Terminal
```bash
# Clonage en SSH
git clone git@github.com:machanier/pinfo-2026-team1.git

# Se placer sur la branche de travail (Git Flow)
git checkout develop
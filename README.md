# 民宿 花水木 · maquette (v2)

Maquette du site de la maison d'hôtes Hanamizuki, île d'Ōnyūjima (Saiki, Ōita). Site statique (HTML, CSS, JavaScript), sans étape de construction, prêt pour Vercel.

- Pages : `index.html` (accueil), `sejour.html` (séjour, tarifs, calculateur, demande de réservation simulée), `acces.html` (traversée, horaires, navette), `404.html`.
- Langues : japonais, anglais, coréen, français (sélecteur dans l'en‑tête ou le menu mobile, ou `?lang=fr`).
- Ciel du héro : couleur, soleil, lune et phase calculés pour Saiki ; `?heure=18:30` affiche une autre heure.
- Bibliothèques hébergées avec le site : GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG, MotionPath), Lenis 1.3, OGL 1.0 (modules utiles seulement).
- Polices Google Fonts (licence OFL) réduites aux caractères du site.
- Carte : côtes issues du 国土数値情報（行政区域データ, MLIT), simplifiées ; routes et débarcadères indicatifs.

## Avant la mise en ligne réelle
- Retirer `<meta name="robots" content="noindex, nofollow">` des pages (la maquette ne doit pas être indexée).
- Remplacer `https://hanamizuki-maquette.vercel.app` par le domaine définitif (balises canonical, og:url, hreflang, données structurées).
- Brancher un vrai formulaire de réservation (aujourd'hui simulé).

## À compléter avec l'hôte
- Horaires d'arrivée et de départ, plan et capacité des pièces, allergènes, tarifs des options (tour onsen, navette), traitement des taxes.
- Position exacte des débarcadères et de la maison sur la carte.
- Téléphone et e‑mail de référence (le site actuel en affiche plusieurs).
- Détail de la « certification » antivirale de 2022.

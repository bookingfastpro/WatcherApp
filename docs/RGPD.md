# RGPD et confidentialité

> Ce document décrit les choix techniques. **Il ne constitue pas un avis juridique.** Les points marqués ⚖️ doivent être validés par un professionnel du droit (avocat / DPO) avant la mise en production.

## Ce qui est implémenté

| Principe | Mise en œuvre |
| --- | --- |
| Minimisation | Les professionnels ne reçoivent que l'identification de la montre, le statut, la référence publique et le **mois** du signalement. Date, lieu, circonstances, plainte, factures et identité restent confidentiels. |
| Séparation des données | Modèles distincts `Watch` (identification) / `TheftReport` (confidentiel) / `PrivateDocument` (pièces) / `User`. |
| Sécurité | Voir `SECURITE.md` (hachage, contrôle d'accès serveur, stockage privé, journalisation, CSP…). |
| Suppression des métadonnées | Les photos sont ré-encodées : EXIF et géolocalisation GPS supprimés. |
| Pseudonymisation | Adresses IP stockées sous forme de HMAC dans les journaux. |
| Consentements | CGU + prise de connaissance de la politique de confidentialité horodatées ; consentement marketing distinct, facultatif, non pré-coché, modifiable. |
| Cookies | Un seul cookie strictement nécessaire (session). Aucun traceur tiers → pas de bandeau de consentement requis. |
| Droit d'accès / portabilité | Export JSON en libre-service (`/api/account/export`), journalisé. |
| Droit d'effacement | Demande en libre-service → file `/admin/rgpd` → anonymisation (`src/server/gdpr.ts`), ou refus motivé. |
| Rectification | Profil et déclarations modifiables par l'utilisateur. |
| Durées de conservation | Paramétrables (`/admin/parametres`) ; purge automatique via `/api/cron/maintenance` (sessions, jetons, compteurs, historique des recherches, journal d'audit). |
| Traçabilité | Journal d'audit des accès sensibles et actions administratives. |

## Politique d'anonymisation par défaut ⚖️

À la suppression d'un compte :

- suppression des documents privés (plaintes, factures, Kbis) et de leurs fichiers ;
- suppression des déclarations **non vérifiées** (et de leurs photos) ;
- déclarations **vérifiées / retrouvées** : conservation de la seule identification de la montre (intérêt légitime : prévention du recel, protection d'autres acheteurs), effacement des champs confidentiels et des messages ;
- anonymisation du compte (email, nom, téléphone, mot de passe), révocation des sessions.

Ce choix doit être confirmé juridiquement (base légale, durée, information des personnes).

## Points à valider avant production ⚖️

1. **Données relatives aux infractions** (art. 10 RGPD, art. 46 loi Informatique et Libertés) : une déclaration de vol et un numéro de plainte peuvent en relever. Déterminer le fondement permettant à un organisme privé de traiter ces données et les garanties exigées.
2. **Bases légales** de chaque traitement (contrat, intérêt légitime — avec mise en balance documentée —, obligation légale).
3. **AIPD** (analyse d'impact) : probablement requise (données sensibles, surveillance/croisement, volume).
4. **Registre des traitements**, désignation éventuelle d'un **DPO**.
5. **Durées de conservation** précises par catégorie (déclarations, documents, journaux, facturation 10 ans).
6. **Sous-traitants** : contrats art. 28 (hébergeur, stockage, email, Stripe), localisation UE des données, transferts hors UE.
7. **Information des personnes** : politique de confidentialité complète (pages modèles fournies avec des `[ … ]` à compléter).
8. **Relations avec les autorités** : procédure de réponse aux réquisitions, transmission des signalements de possession.
9. **Responsabilité** en cas de déclaration erronée ou malveillante, procédure de contestation par un tiers (ex. professionnel détenteur de bonne foi).
10. **Droit de la consommation** pour les abonnements (si des indépendants/TPE sont assimilés à des consommateurs dans certains cas), CGV, facturation.

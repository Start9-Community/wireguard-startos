import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:3',
  releaseNotes: {
    en_US: `- Add Device and View Device Profile offer the profile as a .conf file to download, and show its text line by line.
- The help text in Set Connection Address and Manage Device Access explains what the choice does.
- Remove Device starts with no device selected.`,
    es_ES: `- Añadir dispositivo y Ver el perfil del dispositivo ofrecen el perfil como archivo .conf para descargar y muestran su texto línea por línea.
- El texto de ayuda de Establecer dirección de conexión y Gestionar el acceso del dispositivo explica qué hace cada opción.
- Eliminar dispositivo empieza sin ningún dispositivo seleccionado.`,
    de_DE: `- „Gerät hinzufügen“ und „Geräteprofil ansehen“ bieten das Profil als .conf-Datei zum Herunterladen an und zeigen seinen Text Zeile für Zeile.
- Der Hilfetext in „Verbindungsadresse festlegen“ und „Gerätezugriff verwalten“ erklärt, was die Auswahl bewirkt.
- „Gerät entfernen“ beginnt ohne ausgewähltes Gerät.`,
    pl_PL: `- „Dodaj urządzenie” i „Wyświetl profil urządzenia” udostępniają profil jako plik .conf do pobrania i pokazują jego tekst wiersz po wierszu.
- Tekst pomocy w „Ustaw adres połączenia” i „Zarządzaj dostępem urządzenia” wyjaśnia, co robi dany wybór.
- „Usuń urządzenie” zaczyna bez wybranego urządzenia.`,
    fr_FR: `- Ajouter un appareil et Voir le profil de l'appareil proposent le profil sous forme de fichier .conf à télécharger et affichent son texte ligne par ligne.
- Le texte d'aide de Définir l'adresse de connexion et Gérer l'accès de l'appareil explique l'effet du choix.
- Supprimer l'appareil commence sans appareil sélectionné.`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})

import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:2',
  releaseNotes: {
    en_US:
      'Adds a setup task that prompts you to create the first WireGuard device after configuring the connection address.',
    es_ES:
      'Añade una tarea de configuración que solicita crear el primer dispositivo WireGuard después de configurar la dirección de conexión.',
    de_DE:
      'Fügt eine Einrichtungsaufgabe hinzu, die nach dem Konfigurieren der Verbindungsadresse zum Erstellen des ersten WireGuard-Geräts auffordert.',
    pl_PL:
      'Dodaje zadanie konfiguracji, które po ustawieniu adresu połączenia prosi o utworzenie pierwszego urządzenia WireGuard.',
    fr_FR:
      'Ajoute une tâche de configuration invitant à créer le premier appareil WireGuard après avoir configuré l’adresse de connexion.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})

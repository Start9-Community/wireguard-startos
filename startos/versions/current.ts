import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.0:1',
  releaseNotes: {
    en_US:
      'Initial release with device management, downloadable client profiles, per-device network access controls, and daily, weekly, monthly, and total traffic statistics.',
    es_ES:
      'Versión inicial con gestión de dispositivos, perfiles de cliente descargables, controles de acceso a la red por dispositivo y estadísticas de tráfico diarias, semanales, mensuales y totales.',
    de_DE:
      'Erstveröffentlichung mit Geräteverwaltung, herunterladbaren Client-Profilen, Netzwerkzugriffskontrollen pro Gerät sowie täglichen, wöchentlichen, monatlichen und gesamten Datenverkehrsstatistiken.',
    pl_PL:
      'Pierwsze wydanie z zarządzaniem urządzeniami, profilami klientów do pobrania, kontrolą dostępu do sieci dla każdego urządzenia oraz dziennymi, tygodniowymi, miesięcznymi i łącznymi statystykami ruchu.',
    fr_FR:
      'Version initiale avec gestion des appareils, profils client téléchargeables, contrôles d’accès réseau par appareil et statistiques de trafic quotidiennes, hebdomadaires, mensuelles et totales.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})

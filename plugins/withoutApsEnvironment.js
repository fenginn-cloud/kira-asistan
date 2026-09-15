// Kira Asistan — iOS'ta 'aps-environment' (uzaktan push) entitlement'ını kaldırır.
// Uygulama yalnızca YEREL bildirim (kira hatırlatmaları) kullanır; uzaktan
// push (APNs) kullanmaz. aps-environment kalırsa Apple, provizyon profilinde
// Push Notifications yeteneği ister ve imzalama/sertifika akışı bununla uğraşır.
// Bu entitlement'ı kaldırınca push yeteneğine gerek kalmaz; yerel bildirimler
// aps-environment olmadan zaten çalışır. iOS-only; Android'i etkilemez.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutApsEnvironment(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults && 'aps-environment' in cfg.modResults) {
      delete cfg.modResults['aps-environment'];
    }
    return cfg;
  });
};

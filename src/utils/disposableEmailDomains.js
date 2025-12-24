/**
 * @file disposableEmailDomains.js
 * @description Comprehensive list of disposable/temporary email domains
 *
 * This module provides a Set of known disposable email domains for validation.
 * The list includes common temporary email providers that should be blocked
 * during user registration to prevent abuse.
 *
 * Sources:
 * - https://github.com/disposable/disposable-email-domains
 * - https://github.com/ivolo/disposable-email-domains
 * - Manual additions from known spam patterns
 */

const DISPOSABLE_DOMAINS = new Set([
  // Most common disposable email providers
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'temp-mail.net',
  'throwaway.com', 'throwawaymail.com', 'throam.com',
  'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz', 'guerrillamail.de',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minemail.com',
  'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',

  // Guerrilla Mail variants
  'sharklasers.com', 'spam4.me', 'grr.la', 'guerrillamail.info',

  // Temp mail services
  'getairmail.com', 'getnada.com', 'nada.email', 'tempail.com',
  'fakeinbox.com', 'fakemailgenerator.com', 'fakemail.net',

  // Trash mail services
  'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashemail.de',
  'dispostable.com', 'discard.email', 'discardmail.com',

  // Other popular disposable providers
  'mailnesia.com', 'mailcatch.com', 'maildrop.cc',
  'mohmal.com', 'moakt.com', 'moakt.ws',
  'emailondeck.com', 'mytemp.email', 'tempinbox.com',
  'tempr.email', 'tempmailaddress.com', 'tempmailbox.com',
  'burnermail.io', 'burner.kiwi', 'burnmail.com',
  'mintemail.com', 'mintmail.com', 'minutemail.com',
  'spamgourmet.com', 'spamex.com', 'spamfree24.org',
  'mailsac.com', 'mail-temp.com', 'mailtemp.org',
  'inboxalias.com', 'inboxkitten.com', 'inboxbear.com',

  // Regional disposable domains
  'cocbasura.com', 'hulapla.de', 'jetable.org',
  'emailtemporario.com.br', 'wegwerfmail.de', 'wegwerfmail.net',

  // Anonymous mail services
  'amilegit.com', 'anonymbox.com', 'anon-mail.de',

  // Quick mail services
  'binka.me', 'bobmail.info', 'boximail.com',
  'bugmenot.com', 'cool.fr.nf', 'cuvox.de',

  // Spam-related domains
  'deadfake.cf', 'despam.it', 'devnullmail.com',
  'disposeamail.com', 'disposableemailaddresses.com',
  'dodgeit.com', 'dodgit.com', 'dontreg.com',

  // E-mail services
  'e4ward.com', 'einrot.com', 'email-fake.cf',
  'emailgo.de', 'emailias.com', 'emailmiser.com',
  'emailsensei.com', 'eyepaste.com',

  // F-series
  'fastacura.com', 'filzmail.com', 'fixmail.tk',
  'flyspam.com', 'freundin.ru',

  // G-series
  'garliclife.com', 'geronra.com', 'getonemail.com',
  'gishpuppy.com', 'great-host.in', 'greensloth.com',

  // H-I series
  'haltospam.com', 'hotpop.com', 'imails.info',
  'incognitomail.org', 'iroid.com', 'itemp.email',

  // J-K-L series
  'jnxjn.com', 'kasmail.com', 'killmail.com',
  'klassmaster.com', 'klzlv.com', 'lackmail.net',
  'letthemeatspam.com', 'lhsdv.com', 'lortemail.dk',
  'lroid.com',

  // M-series (mail variants)
  'mailbidon.com', 'mailblocks.com', 'mailcannon.com',
  'maildu.de', 'maileater.com', 'mailexpire.com',
  'mailfa.tk', 'mailfree.ga', 'mailfreeonline.com',
  'mailguard.me', 'maillime.com', 'mailmetrash.com',
  'mailmoat.com', 'mailnull.com', 'mailshell.com',
  'mailsiphon.com', 'mailslite.com', 'mailzilla.com',
  'mbx.cc', 'meltmail.com', 'mierdamail.com',
  'migmail.pl', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'mypartyclip.de', 'myspamless.com', 'mytrashmail.com',

  // N-O series
  'nervmich.net', 'nervtmich.net', 'nobulk.com',
  'noclickemail.com', 'nogmailspam.info', 'nomail.xl.cx',
  'nomail2me.com', 'nomorespamemails.com', 'nospam.ze.tc',
  'nospam4.us', 'nospamfor.us', 'nowmymail.com',
  'objectmail.com', 'obobbo.com', 'ohaaa.de',
  'onewaymail.com', 'online.ms', 'oopi.org',
  'opayq.com', 'ordinaryamerican.net', 'ourklips.com',
  'outlawspam.com', 'ovpn.to', 'owlpic.com',

  // P-Q-R series
  'pjjkp.com', 'plexolan.de', 'pookmail.com',
  'privacy.net', 'privy-mail.com', 'proxymail.eu',
  'prtnx.com', 'punkass.com', 'q314.net',
  'quickinbox.com', 'rcpt.at', 'recode.me',
  'recursor.net', 'recyclemail.dk', 'regbypass.com',
  'rhyta.com', 'rklips.com', 'rmqkr.net',

  // S-series (spam variants)
  's0ny.net', 'safe-mail.net', 'safersignup.de',
  'safetymail.info', 'safetypost.de', 'sandelf.de',
  'saynotospams.com', 'selfdestructingmail.com', 'sendspamhere.com',
  'shiftmail.com', 'shitmail.me', 'shortmail.net',
  'sibmail.com', 'sinnlos-mail.de', 'siteposter.net',
  'skeefmail.com', 'slaskpost.se', 'slopsbox.com',
  'smellfear.com', 'snakemail.com', 'sneakemail.com',
  'sofimail.com', 'sofort-mail.de', 'sogetthis.com',
  'soodonims.com', 'spam.la', 'spam.su',
  'spamavert.com', 'spambob.com', 'spambog.com',
  'spambog.de', 'spambog.ru', 'spambox.info',
  'spambox.us', 'spamcannon.com', 'spamcannon.net',
  'spamcero.com', 'spamcon.org', 'spamcorptastic.com',
  'spamcowboy.com', 'spamcowboy.net', 'spamcowboy.org',
  'spamday.com', 'spameater.org', 'spamfighter.cf',
  'spamfighter.ga', 'spamfighter.gq', 'spamfree.eu',
  'spamherelots.com', 'spamhereplease.com', 'spamhole.com',
  'spamify.com', 'spaminator.de', 'spamkill.info',
  'spaml.com', 'spaml.de', 'spammotel.com',
  'spamobox.com', 'spamoff.de', 'spamsalad.in',
  'spamslicer.com', 'spamspot.com', 'spamthis.co.uk',
  'spamthisplease.com', 'spamtrail.com', 'spamtroll.net',
  'spoofmail.de', 'stuffmail.de',

  // T-series
  'supergreatmail.com', 'supermailer.jp', 'superstachel.de',
  'suremail.info', 'teewars.org', 'teleworm.com',
  'teleworm.us', 'temp.emeraldwebmail.com', 'tempalias.com',
  'tempemailer.com', 'tempinbox.co.uk', 'tempymail.com',
  'thankyou2010.com', 'thecloudindex.com', 'thelimestones.com',
  'thisisnotmyrealemail.com', 'thismail.net', 'thxmate.com',
  'tilien.com', 'tittbit.in', 'tmailinator.com',
  'toiea.com', 'tradermail.info', 'trash-amil.com',
  'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trash2009.com', 'trash2010.com', 'trash2011.com',
  'trashdevil.com', 'trashdevil.de', 'trashymail.com',
  'trashymail.net', 'trbvm.com', 'trickmail.net',
  'trillianpro.com', 'twinmail.de', 'tyldd.com',

  // U-V-W series
  'uggsrock.com', 'upliftnow.com', 'uplipht.com',
  'uroid.com', 'veryrealemail.com', 'viditag.com',
  'viewcastmedia.com', 'vipmailonly.info', 'vkcode.ru',
  'walala.org', 'walkmail.net', 'webemail.me',
  'webm4il.info', 'webuser.in', 'wegwerfadresse.de',
  'wegwerfmail.org', 'wetrainbayarea.com', 'wetrainbayarea.org',
  'whopy.com', 'wilemail.com', 'willhackforfood.biz',
  'willselfdestruct.com', 'winemaven.info', 'wronghead.com',
  'wuzup.net', 'wuzupmail.net', 'wwwnew.eu',

  // X-Y-Z series
  'x.ip6.li', 'xagloo.com', 'xemaps.com',
  'xents.com', 'xmaily.com', 'xoxy.net',
  'yanet.me', 'yogamaven.com', 'yuurok.com',
  'z1p.biz', 'za.com', 'zehnminutenmail.de',
  'zetmail.com', 'zippymail.info', 'zoaxe.com',
  'zoemail.net', 'zoemail.org', 'zomg.info',

  // Additional Brazilian domains
  'emailfalso.com', 'emailtemporal.org', 'tempmail.com.br',

  // Recently identified disposable domains
  'protonmail.ch', // Note: legitimate but sometimes used for abuse
  'tutanota.com',  // Note: legitimate but sometimes used for abuse
  'cock.li', 'airmail.cc', 'tfwno.gf'
]);

/**
 * Check if an email domain is disposable
 * @param {string} email - Full email address or just the domain
 * @returns {boolean} True if the domain is disposable
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;

  const domain = email.includes('@')
    ? email.split('@')[1]?.toLowerCase()
    : email.toLowerCase();

  if (!domain) return false;

  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Get the set of all disposable domains
 * @returns {Set<string>} Set of disposable domain names
 */
export function getDisposableDomains() {
  return DISPOSABLE_DOMAINS;
}

/**
 * Get the count of known disposable domains
 * @returns {number} Number of domains in the list
 */
export function getDisposableDomainsCount() {
  return DISPOSABLE_DOMAINS.size;
}

export default {
  isDisposableEmail,
  getDisposableDomains,
  getDisposableDomainsCount
};

// Info, Impressum & Datenschutz. Texte nach Vorgabe (Datenschutz nach Review Runde 1 erweitert), Betreiberangaben aus legal.js.

import { h } from '../dom.js';
import { NAME, WOHNORT, KONTAKT_MAIL, OPEN_SOURCE } from '../legal.js';
import { APP_VERSION } from '../version.js';

const GITHUB_PRIVACY = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';

const mail = () => h('a', { class: 'mail-link', href: `mailto:${KONTAKT_MAIL}` }, KONTAKT_MAIL);

export function infoScreen(onBack) {
  return [
    h('div', {}, h('button', { class: 'link back info-back', 'data-fid': 'info-back', onclick: onBack }, '‹ Zurück')),
    h('h1', {}, 'Info, Impressum & Datenschutz'),
    h('section', { class: 'card info' },
      h('h2', {}, 'Zweck dieser Seite'),
      h('p', {}, 'Diese Web-App ist ein rein privates, nicht kommerzielles Projekt zum persönlichen Protokollieren von Krafttraining und anderen Trainings. Mit der Seite werden keine wirtschaftlichen, politischen, weltanschaulichen oder sonstigen Interessen verfolgt. Es gibt keine Werbung, keine Verkaufsangebote, keine Spendenaufrufe und keine redaktionellen Inhalte.')),
    h('section', { class: 'card info' },
      h('h2', {}, 'Betreiber / Offenlegung (§ 25 MedienG)'),
      h('p', {}, `Medieninhaber und Betreiber: ${NAME}, ${WOHNORT}, Österreich. Kontakt: `, mail())),
    h('section', { class: 'card info' },
      h('h2', {}, 'Datenschutz'),
      h('p', {}, 'Verantwortlich ist der Betreiber (siehe Offenlegung oben). Kontakt: ', mail(), '.'),
      h('h3', {}, 'In der App'),
      h('p', {}, 'Die App speichert deine Trainingsdaten ausschließlich lokal auf deinem Gerät (Browserspeicher) und in Dateien, die du selbst exportierst. Es gibt kein Benutzerkonto, kein Backend, keine Cookies, kein Tracking und keine Analyse-Dienste. Deine Trainingsdaten werden nicht an den Betreiber übertragen. Damit die App offline funktioniert, legt dein Browser die App-Dateien und deinen Trainingsstand lokal ab. Das ist für die von dir aufgerufene App unbedingt erforderlich. Löschen kannst du diese Daten jederzeit in den Einstellungen deines Browsers.'),
      h('h3', {}, 'Hosting'),
      h('p', {}, 'Die Seite wird über GitHub Pages ausgeliefert (GitHub, Inc., USA). GitHub protokolliert bei jedem Aufruf technisch bedingt Verbindungsdaten wie die IP-Adresse, um die Sicherheit des Dienstes zu gewährleisten. Rechtsgrundlage ist das berechtigte Interesse an einem sicheren Betrieb der Seite (Art. 6 Abs. 1 lit. f DSGVO). GitHub verarbeitet diese Daten auch für eigene Zwecke als eigener Verantwortlicher und ist nach dem EU-U.S. Data Privacy Framework zertifiziert. Eine feste Speicherdauer für diese Protokolle nennt GitHub nicht. Nähere Angaben stehen in der Datenschutzerklärung von GitHub: ',
        h('a', { class: 'mail-link', href: GITHUB_PRIVACY, target: '_blank', rel: 'noopener noreferrer' }, 'GitHub General Privacy Statement'), '.'),
      h('h3', {}, 'E-Mail'),
      h('p', {}, 'Wenn du mir schreibst, verarbeite ich deine Adresse und den Inhalt nur, um die Anfrage zu beantworten (Art. 6 Abs. 1 lit. f DSGVO), und lösche beides danach, sofern keine gesetzliche Aufbewahrungspflicht besteht. Die Nachrichten liegen dabei beim Anbieter des Postfachs der Kontaktadresse.'),
      h('h3', {}, 'Exportierte Dateien'),
      h('p', {}, 'Exportierte Dateien (Teilen-Menü, Dateien-App, optional Garmin Connect) liegen in deiner Verantwortung. Was du an andere Dienste weitergibst, verarbeiten deren Anbieter nach ihren eigenen Bedingungen.'),
      h('h3', {}, 'Deine Rechte'),
      h('p', {}, 'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Anfragen: ', mail(), '. Außerdem kannst du dich bei der Österreichischen Datenschutzbehörde beschweren (dsb.gv.at).')),
    h('section', { class: 'card info' },
      h('h2', {}, 'Hinweis'),
      h('p', {}, 'Die Inhalte sind keine medizinische oder therapeutische Beratung. Bei Beschwerden oder Verletzungen bitte eine Ärztin, einen Arzt oder Physiotherapeutin bzw. Physiotherapeuten fragen. Für Richtigkeit und Vollständigkeit kann keine Gewähr übernommen werden.')),
    h('section', { class: 'card info' },
      h('h2', {}, 'Open-Source-Komponenten'),
      OPEN_SOURCE.length
        ? h('ul', {}, OPEN_SOURCE.map((c) => h('li', {}, `${c.name} – ${c.license}`)))
        : h('p', { class: 'mut' }, 'Keine eingebunden.')),
    h('p', { class: 'mut small' }, `Version ${APP_VERSION}`),
  ];
}

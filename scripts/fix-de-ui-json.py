#!/usr/bin/env python3
"""Post-process de-ui-replacements.json: drop code junk, restore glossary, du-tone."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "scripts" / "de-ui-replacements.json"

GLOSSARY_RESTORE = {
    "§§OPENMYRSI§§": "Open MyRSI.org",
    "§§OPENMYRSIORG§§": "OPEN MYRSI.ORG",
    "§§DCSSRS§§": "DCS-SRS",
    "§§SIMPLERADIO§§": "SimpleRadio",
    "§§TEAMSPEAK§§": "TeamSpeak",
    "§§LIVEKIT§§": "LiveKit",
    "§§DISCORD§§": "Discord",
    "§§MUMBLE§§": "Mumble",
    "§§GAMEPAD§§": "Gamepad",
    "§§WEBHID§§": "WebHID",
    "§§FONTAWESOME§§": "Font Awesome",
    "§§OPENGRAPH§§": "Open Graph",
    "§§FLASHLITE§§": "Flash-Lite",
    "§§UEXCORP§§": "uexcorp.space",
    "§§AUEC§§": "aUEC",
    "§§DASHBOARD§§": "Dashboard",
    "§§ORBAT§§": "ORBAT",
    "§§RSVP§§": "RSVP",
    "§§INTEL§§": "Intel",
    "§§WIKI§§": "Wiki",
    "§§ADMIN§§": "Admin",
    "§§API§§": "API",
    "§§URL§§": "URL",
    "§§PTT§§": "PTT",
    "§§EAM§§": "EAM",
    "§§AO§§": "AO",
    "§§UEC§§": "UEC",
    "§§SCU§§": "SCU",
    "§§RMC§§": "RMC",
    "§§PWA§§": "PWA",
    "§§PIN§§": "PIN",
    "§§SEO§§": "SEO",
    "§§AI§§": "AI",
    "§§HR§§": "HR",
    "§§UEX§§": "UEX",
    "§§EXT§§": "EXT",
    "§§LOCAL§§": "LOCAL",
    "§§RTB§§": "RTB",
    "§§MYRSI§§": "MyRSI",
    "§§RSI§§": "RSI",
}

DROP_KEY = re.compile(
    r"onClick|editor\.|chain\(\)|isActive=\{|className|value=\{|=>|import |const |handleDelete|searchTerm",
    re.I,
)

DU_FIXES = [
    (r"\bSie können\b", "Du kannst"),
    (r"\bSie haben\b", "Du hast"),
    (r"\bSie müssen\b", "Du musst"),
    (r"\bSie werden\b", "Du wirst"),
    (r"\bSie sind\b", "Du bist"),
    (r"\bSie sollten\b", "Du solltest"),
    (r"\bSind Sie\b", "Bist du"),
    (r"\bMöchten Sie\b", "Möchtest du"),
    (r"\bKönnen Sie\b", "Kannst du"),
    (r"\bWählen Sie\b", "Wähle"),
    (r"\bKlicken Sie\b", "Klicke"),
    (r"\bGeben Sie\b", "Gib"),
    (r"\bÖffnen Sie\b", "Öffne"),
    (r"\bSchließen Sie\b", "Schließe"),
    (r"\bBestätigen Sie\b", "Bestätige"),
    (r"\bErstellen Sie\b", "Erstelle"),
    (r"\bVerwalten Sie\b", "Verwalte"),
    (r"\bDefinieren Sie\b", "Definiere"),
    (r"\bRichten Sie\b", "Richte"),
    (r"\bEntfernen Sie\b", "Entferne"),
    (r"\bAkzeptieren Sie\b", "Akzeptiere"),
    (r"\bVersuchen Sie\b", "Versuche"),
    (r"\bLösen Sie\b", "Löse"),
    (r"\bSchalten Sie\b", "Schalte"),
    (r"\bZiehen Sie\b", "Ziehe"),
    (r"\bFügen Sie\b", "Füge"),
    (r"\bKontaktieren Sie\b", "Kontaktiere"),
    (r"\bIhre\b", "Deine"),
    (r"\bIhren\b", "Deinen"),
    (r"\bIhrem\b", "Deinem"),
    (r"\bIhrer\b", "Deiner"),
    (r"\bIhr\b", "Dein"),
    (r"\bIhnen\b", "dir"),
    (r"\bSie\b", "du"),
    (r"\b auf Sie zurück\b", " auf dich zurück"),
    (r"\bNeue Benutzer\b", "Neue Nutzer"),
    (r"\bKunden\b", "Clients"),
    (r"\bKunde\b", "Client"),
    (r"\. Satz$", "."),
    (r" benötigt das$", " benötigt"),
    (r" erforderlich\. Satz$", " erforderlich."),
    (r"Zugangsdaten erforderlich\. Satz$", "Zugangsdaten erforderlich."),
]

SHORT_FIXES = {
    "View": "Ansehen",
    "The": "Die",
    "Close": "Schließen",
    "Open": "Öffnen",
    "Save": "Speichern",
    "Cancel": "Abbrechen",
    "Delete": "Löschen",
    "Edit": "Bearbeiten",
    "Search": "Suchen",
    "Loading": "Lädt",
    "Error": "Fehler",
    "Success": "Erfolg",
    "Failed": "Fehlgeschlagen",
    "Active": "Aktiv",
    "Pending": "Ausstehend",
    "Approved": "Genehmigt",
    "Denied": "Abgelehnt",
    "Intel": "Intel",
    "Admin": "Admin",
    "Dashboard": "Dashboard",
    "Wiki": "Wiki",
    "ORBAT": "ORBAT",
    "AO": "AO",
    "EAM": "EAM",
    "RSVP": "RSVP",
    "PTT": "PTT",
    "API": "API",
    "URL": "URL",
    "PIN": "PIN",
    "PWA": "PWA",
    "AI": "AI",
    "HR": "HR",
    "UEX": "UEX",
    "UEC": "UEC",
    "SCU": "SCU",
    "aUEC": "aUEC",
    "MDT": "MDT",
    "VIP": "VIP",
    "Esc": "Esc",
    "REF:": "REF:",
}

MANUAL = {
    "Platform-wide item database synced from uexcorp.space.": "Plattformweite Gegenstandsdatenbank, synchronisiert von uexcorp.space.",
    "Star Citizen universe — synced from uexcorp.space.": "Star-Citizen-Universum – synchronisiert von uexcorp.space.",
    "Discord integration requires bot credentials. Set": "Discord-Integration erfordert Bot-Zugangsdaten. Setze",
    "Voice radio requires LiveKit API credentials. Set": "Sprachfunk erfordert LiveKit-API-Zugangsdaten. Setze",
    "Government is enabled. Toggle the feature itself from": "Regierung ist aktiv. Funktion umschalten unter",
    "Markers are tags that compound the clearance gate.": "Marker sind Tags, die die Freigabestufe verschärfen.",
    "Menu position locked. Unlock below to re-parent.": "Menüposition gesperrt. Unten entsperren zum Umhängen.",
    "Triggers the EAM alarm sound on all connected devices.": "Löst den EAM-Alarmton auf allen verbundenen Geräten aus.",
    "Create requests on behalf of clients (registered or not).": "Anfragen im Namen von Clients erstellen (registriert oder nicht).",
    "Manage preset tactical frequencies. Drag rows to reorder.": "Taktische Preset-Frequenzen verwalten. Zeilen zum Sortieren ziehen.",
    "Are you sure you want to change your handle to": "Handle wirklich ändern zu",
    "Your vote is secret and cannot be traced back to you.": "Deine Stimme ist geheim und kann nicht dir zugeordnet werden.",
    "Copy this key now. You will not be able to see it again.": "Schlüssel jetzt kopieren. Du kannst ihn später nicht mehr einsehen.",
    "Deployments and training exercises you participated in.": "Einsätze und Übungen, an denen du teilgenommen hast.",
    "Service requests and missions you have responded to.": "Service-Anfragen und Missionen, auf die du reagiert hast.",
    "If Gemini is configured, open any dossier → Overview →": "Wenn Gemini konfiguriert ist: Dossier öffnen → Übersicht →",
    "Error Code: 0xCRASH // Contact Admin if persistent": "Fehlercode: 0xCRASH // Bei anhaltendem Fehler Admin kontaktieren",
    "Success / Failed / Cancelled / Refused / Aborted": "Erfolg / Fehlgeschlagen / Abgebrochen / Abgelehnt / Abgebrochen",
    "Binding directives issued by authorized position holders.": "Verbindliche Weisungen von autorisierten Positionsinhabern.",
}


def polish(text: str) -> str:
    for ph, term in GLOSSARY_RESTORE.items():
        text = text.replace(ph, term)
    text = text.replace("...", "…")
    for pat, rep in DU_FIXES:
        text = re.sub(pat, rep, text)
    return text


def main():
    data = json.loads(PATH.read_text(encoding="utf-8"))
    out = {}
    for k, v in data.items():
        if DROP_KEY.search(k):
            continue
        if k in MANUAL:
            v = MANUAL[k]
        elif k in SHORT_FIXES:
            v = SHORT_FIXES[k]
        else:
            v = polish(v)
        out[k] = v

    ordered = dict(sorted(out.items(), key=lambda x: (-len(x[0]), x[0].lower())))
    PATH.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(ordered))


if __name__ == "__main__":
    main()

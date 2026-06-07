#!/usr/bin/env python3
"""Filter extracted UI strings and build de-ui-replacements.json (EN -> DE)."""
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "scripts" / "extracted-ui-strings.txt"
OUTPUT = ROOT / "scripts" / "de-ui-replacements.json"
OVERRIDES = Path(__file__).with_name("de-ui-overrides.json")

ENV_VARS = {
    "DISCORD_BOT_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_GUILD_ID",
    "GEMINI_API_KEY", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL", "LOCAL", "EXT",
    "MANAGE_ROLES", "NODE_VERIFY_v2.1", "Identity_Provisioning_Protocol",
}

SKIP_LITERALS = {
    "DELETE", "IDLE", "TERMINAL", "TRANSMITTING", "SYNCING", "SHARED", "ELECTED", "EXECUTE",
    "EXPIRED", "REF: ", "PIN:", "PU environment.", "Scaffolding only — never user-facing.",
    "Jenk0",
}

# Placeholder tokens (must not appear in UI strings)
GLOSSARY = [
    ("Open MyRSI.org", "§§OPENMYRSI§§"),
    ("OPEN MYRSI.ORG", "§§OPENMYRSIORG§§"),
    ("DCS-SRS", "§§DCSSRS§§"),
    ("SimpleRadio", "§§SIMPLERADIO§§"),
    ("TeamSpeak", "§§TEAMSPEAK§§"),
    ("LiveKit", "§§LIVEKIT§§"),
    ("Discord", "§§DISCORD§§"),
    ("Mumble", "§§MUMBLE§§"),
    ("Gamepad", "§§GAMEPAD§§"),
    ("WebHID", "§§WEBHID§§"),
    ("Font Awesome", "§§FONTAWESOME§§"),
    ("Open Graph", "§§OPENGRAPH§§"),
    ("Flash-Lite", "§§FLASHLITE§§"),
    ("uexcorp.space", "§§UEXCORP§§"),
    ("aUEC", "§§AUEC§§"),
    ("Dashboard", "§§DASHBOARD§§"),
    ("ORBAT", "§§ORBAT§§"),
    ("RSVP", "§§RSVP§§"),
    ("Intel", "§§INTEL§§"),
    ("Wiki", "§§WIKI§§"),
    ("Admin", "§§ADMIN§§"),
    ("API", "§§API§§"),
    ("URL", "§§URL§§"),
    ("PTT", "§§PTT§§"),
    ("EAM", "§§EAM§§"),
    ("AO", "§§AO§§"),
    ("UEC", "§§UEC§§"),
    ("SCU", "§§SCU§§"),
    ("RMC", "§§RMC§§"),
    ("PWA", "§§PWA§§"),
    ("PIN", "§§PIN§§"),
    ("SEO", "§§SEO§§"),
    ("AI", "§§AI§§"),
    ("HR", "§§HR§§"),
    ("UEX", "§§UEX§§"),
    ("EXT", "§§EXT§§"),
    ("LOCAL", "§§LOCAL§§"),
    ("RTB", "§§RTB§§"),
    ("MyRSI", "§§MYRSI§§"),
    ("RSI", "§§RSI§§"),
]

GLOSSARY_RESTORE = {v: k for k, v in GLOSSARY}

CODE_PATTERNS = [
    r"className\s*=", r"value\s*=\{", r"onChange\s*=", r"placeholder\s*=\{",
    r"import\s+", r"const\s+", r"function\s+", r"async\s+", r"await\s+",
    r"=\s*new\s+Map", r"searchTerm", r"handleDelete", r"openModal",
    r"setEditing", r"isModalOpen", r"memberCount", r"PAGE_SIZE\s*&&",
    r"cmd\s*=", r"i className", r"channels=\{", r"provider\s*===\s*",
    r"level:\s*\d", r"channelName\)", r"nodesById",
    r"onClick\s*=", r"editor\.", r"chain\(\)", r"isActive\s*=\{", r"=>\s*",
]
CODE_RE = [re.compile(p, re.I) for p in CODE_PATTERNS]


def is_valid_ui_string(s: str) -> bool:
    s = s.strip()
    if not s or len(s) < 3 or s in ENV_VARS or s in SKIP_LITERALS:
        return False
    if re.fullmatch(r"&[a-z]+;?", s, re.I):
        return False
    if re.fullmatch(r"[A-Z][A-Z0-9_]{3,}", s) and "_" in s:
        return False
    if re.match(r"^(ACCESS_DENIED|ERROR_CODE|SETUP-|STAR-|STC-|NODE_)", s):
        return False
    for rx in CODE_RE:
        if rx.search(s):
            return False
    if s.startswith(("],", "import ", ";", "const ")) or "Node\n" in s:
        return False
    if s.startswith("    ") and ("=" in s or "{" in s):
        return False
    alpha = sum(c.isalpha() or c.isspace() for c in s)
    if len(s) > 12 and alpha / len(s) < 0.42:
        return False
    return True


def load_strings() -> list[str]:
    seen = set()
    out = []
    for line in INPUT.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and line not in seen and is_valid_ui_string(line):
            seen.add(line)
            out.append(line)
    return sorted(out, key=lambda x: (-len(x), x.lower()))


def protect_glossary(text: str) -> str:
    for term, ph in sorted(GLOSSARY, key=lambda x: -len(x[0])):
        text = text.replace(term, ph)
    return text


def restore_glossary(text: str) -> str:
    for ph, term in GLOSSARY_RESTORE.items():
        text = text.replace(ph, term)
    return text


def postprocess_de(text: str) -> str:
    text = restore_glossary(text)
    text = text.replace("...", "…")
    text = re.sub(r"\s+//\s+", " // ", text)
    text = text.replace("&amp;", "&")
    text = text.replace("&rarr;", "→")
    # du tone fixes from formal DE MT
    replacements = [
        (r"\bSie können\b", "Du kannst"),
        (r"\bSie haben\b", "Du hast"),
        (r"\bSie müssen\b", "Du musst"),
        (r"\bSie werden\b", "Du wirst"),
        (r"\bSie sind\b", "Du bist"),
        (r"\bIhre\b", "Deine"),
        (r"\bIhren\b", "Deinen"),
        (r"\bIhrem\b", "Deinem"),
        (r"\bIhrer\b", "Deiner"),
        (r"\bIhr\b", "Dein"),
        (r"\bKlicken Sie\b", "Klicke"),
        (r"\bWählen Sie\b", "Wähle"),
        (r"\bGeben Sie\b", "Gib"),
        (r"\bÖffnen Sie\b", "Öffne"),
        (r"\bSchließen Sie\b", "Schließe"),
        (r"\bBestätigen Sie\b", "Bestätige"),
        (r"\bMöchten Sie\b", "Möchtest du"),
    ]
    for pat, rep in replacements:
        text = re.sub(pat, rep, text)
    return text


def translate_batch(strings: list[str], translator) -> dict[str, str]:
    result = {}
    batch_size = 40
    for i in range(0, len(strings), batch_size):
        batch = strings[i : i + batch_size]
        protected = [protect_glossary(s) for s in batch]
        try:
            translated = translator.translate_batch(protected)
        except Exception:
            for s in protected:
                try:
                    translated_piece = translator.translate(s)
                    result[batch[protected.index(s)]] = postprocess_de(translated_piece)
                except Exception as e:
                    print(f"skip: {batch[protected.index(s)][:50]!r} ({e})", file=sys.stderr)
                time.sleep(0.05)
            time.sleep(0.2)
            continue
        for orig, tr in zip(batch, translated):
            if tr:
                result[orig] = postprocess_de(tr)
        time.sleep(0.15)
        if (i // batch_size) % 10 == 0:
            print(f"  … {min(i + batch_size, len(strings))}/{len(strings)}", file=sys.stderr)
    return result


def main():
    strings = load_strings()
    print(f"Filtered: {len(strings)} UI strings", file=sys.stderr)

    overrides = {}
    if OVERRIDES.exists():
        overrides = json.loads(OVERRIDES.read_text(encoding="utf-8"))

    need_mt = [s for s in strings if s not in overrides]
    mapping = dict(overrides)

    if need_mt:
        try:
            from deep_translator import GoogleTranslator
        except ImportError:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "deep-translator", "-q"])
            from deep_translator import GoogleTranslator

        translator = GoogleTranslator(source="en", target="de")
        print(f"Translating {len(need_mt)} via Google Translate…", file=sys.stderr)
        mapping.update(translate_batch(need_mt, translator))

    # Ensure every filtered string has an entry
    for s in strings:
        if s not in mapping:
            mapping[s] = postprocess_de(protect_glossary(s))  # fallback: keep EN

    # Sort keys longest-first for apply script compatibility
    ordered = {k: mapping[k] for k in sorted(mapping.keys(), key=lambda x: (-len(x), x.lower())) if k in strings}

    OUTPUT.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(ordered))


if __name__ == "__main__":
    main()

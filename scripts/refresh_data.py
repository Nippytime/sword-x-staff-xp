"""Refresh the bundled XP table from the community reference. Not needed to run the site."""

import argparse
import json
import re
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

SOURCE = "https://www.purrwikimania.com/xp.html"
ROOT = Path(__file__).resolve().parents[1]
SEASONS = (
    (1, "Witching Hours", "Expert", 100, 70, 116507521),
    (2, "Crossed Paths", "Champion", 130, 150, 1925200752),
    (3, "Finale of Chaos", "Master", 160, 150, 15891806242),
    (4, "Bizarre Spectacle", "Paragon", 190, 160, 229321808778),
    (5, "Frostfire Anthem", "Saint", 220, 150, 1692972522328),
)
NORMAL_CHECKPOINTS = {70: 1163263, 100: 16108066, 130: 140115452,
                      160: 1072268042, 190: 16725913668,
                      220: 123188303310, 250: 898316800466}


def read_int(value):
    return int(re.sub(r"[,\s]", "", value))


def extract(html):
    soup = BeautifulSoup(html, "html.parser")
    normal = {}
    seasons = {season[0]: {} for season in SEASONS}
    section = 0

    for element in soup.find_all(["h2", "tr"]):
        if element.name == "h2":
            title = element.get_text(" ", strip=True)
            match = re.search(r"\bSeason\s+(\d+)\s*[·—:-]", title)
            if match:
                section = int(match.group(1))
            continue
        cells = [cell.get_text(" ", strip=True) for cell in element.find_all(["td", "th"], recursive=False)]
        if len(cells) < 3:
            continue
        season_match = re.search(r"Season\s+Level\s+(\d+)\b", cells[0], re.I)
        if season_match and section in seasons:
            seasons[section][int(season_match.group(1))] = read_int(cells[1])
        elif re.fullmatch(r"\d+", cells[0]):
            normal[int(cells[0])] = read_int(cells[1])

    normal_list = [0] + [normal[level] for level in range(1, 251)]
    running = 0
    for level, cost in enumerate(normal_list):
        running += cost
        if level in NORMAL_CHECKPOINTS and running != NORMAL_CHECKPOINTS[level]:
            raise ValueError(f"Normal XP mismatch at {level}: {running:,}. Check the source before replacing data.")

    output = []
    for identifier, name, rank, cap, limit, expected in SEASONS:
        costs = [0] + [seasons[identifier][level] for level in range(1, limit + 1)]
        if sum(costs) != expected:
            raise ValueError(f"Season {identifier} XP mismatch: {sum(costs):,}. Check the source before replacing data.")
        output.append(dict(id=identifier, name=name, rank=rank, cap=cap, limit=limit, costs=costs))
    return normal_list, output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", type=Path, help="Read a saved HTML file instead of downloading")
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "xp-data.js")
    args = parser.parse_args()
    if args.html:
        html = args.html.read_bytes()
    else:
        request = Request(SOURCE, headers={"User-Agent": "SwordStaffXPLedger/1.0 (static calculator)"})
        with urlopen(request, timeout=25) as response:
            html = response.read()
    normal, seasons = extract(html)
    exported = ("// Generated from " + SOURCE + " on " + date.today().isoformat() + ".\n"
                + "// Each cost is the XP needed to REACH the corresponding level.\n"
                + "export const normalCosts = " + json.dumps(normal, separators=(",", ":")) + ";\n"
                + "export const seasonLadders = " + json.dumps(seasons, separators=(",", ":"), ensure_ascii=False) + ";\n"
                + "export const sourceUrl = " + json.dumps(SOURCE) + ";\n"
                + "export const snapshotDate = " + json.dumps(date.today().isoformat()) + ";\n")
    args.output.write_text(exported, encoding="utf-8")
    print(f"Verified 250 normal levels and {sum(x['limit'] for x in seasons)} Season Levels. Wrote {args.output}.")


if __name__ == "__main__":
    main()

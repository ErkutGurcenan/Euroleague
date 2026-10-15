# Updating the injury report

The EuroLeague API has no injury data. Eurostepper's injury report is a
summary of the BasketNews EuroLeague Injury Report, credited and linked on
every page that uses it:

https://basketnews.com/news-212393-euroleague-injury-report-updated.html

basketnews.com blocks automated requests (Cloudflare), so the article is read
in a real browser through Claude in Chrome. Do not try to get around the bot
protection with scrapers, headless browsers or other workarounds.

The site serves `db/injuries.json` (git-ignored, live). `pipeline/data/injuries.json`
is only a fallback snapshot in the repo. Never edit `db/injuries.json` by hand:
always install through the validator.

## Steps

1. Open the article in Chrome (Claude in Chrome: `tabs_context_mcp`, a new tab,
   `navigate`, then `get_page_text`). Close the tab when done. If Chrome isn't
   connected or the page doesn't load, stop and change nothing.
2. Read the article's "updated" timestamp under the headline (for example
   `2026 October 15 14:00`) and write it as `2026-10-15T14:00`. If it equals
   `sourceUpdated` in `db/injuries.json`, the report hasn't changed: stop.
3. Write a new report to a temporary file (e.g. `/tmp/injuries-new.json`) with
   the same shape as `db/injuries.json`:
   - `season`: copy from the current file; `source`, `sourceUrl` unchanged;
     `sourceUpdated` from step 2.
   - one entry per player row, in page order:
     - `club`: team code from the table below.
     - `player`, `pos`: as written on the page.
     - `status`: exactly one of Ready, Expected, Questionable, Game-time,
       Doubtful, Out, Uncertain (as on the page).
     - `reason`: `injury` (any physical injury, surgery or rehab, also
       undisclosed injuries), `illness`, `coach` (coach's decision, DNP),
       `roster` (not registered for the EuroLeague, left out of the 12-man
       roster, out of the squad), `rest`, or `other` (new signing, team
       decision, undisclosed reason).
     - `rounds`: the Round column. `Round 6` → `6`, `Round 4-8` → `4-8`,
       `Out for season` → `Season`, otherwise `Indefinitely` or `Long-term`.
     - `note`: a short summary in your own words (at most about 12 words,
       120 characters max), not a copy of the BasketNews comment. Example:
       "Ankle, practiced partially after missing Round 5".
4. Validate and install (from `pipeline/`):

       .venv/bin/python -m euroleague_pipeline.injuries_check /tmp/injuries-new.json --install

   If it prints INVALID, fix the listed problems and run it again.
5. Check `curl -s localhost:8000/api/injuries` shows the new `sourceUpdated`.
   No restart or rebuild is needed. Don't commit or push.
6. Report what changed: new injuries, players ruled out, players cleared.

## Team codes

| BasketNews team | Code |
| --- | --- |
| Anadolu Efes Istanbul | IST |
| Armani Olimpia Milan | MIL |
| Besiktas Istanbul | BES |
| Crvena Zvezda Meridianbet Belgrade | RED |
| Dubai Basketball | DUB |
| FC Barcelona | BAR |
| FC Bayern Munich | MUN |
| Fenerbahce Beko Istanbul | ULK |
| Hapoel IBI Tel Aviv | HTA |
| Kosner Baskonia Vitoria-Gasteiz | BAS |
| LDLC ASVEL Villeurbanne | ASV |
| Maccabi Rapyd Tel Aviv | TEL |
| Olympiacos Piraeus | OLY |
| Panathinaikos AKTOR Athens | PAN |
| Paris Basketball | PRS |
| Partizan Mozzart Bet Belgrade | PAR |
| Real Madrid | MAD |
| Valencia Basket | PAM |
| Virtus Bologna | VIR |
| Zalgiris Kaunas | ZAL |

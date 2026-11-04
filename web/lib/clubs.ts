/** Club codes as the site shows them. The official code stays the key in
    links and data; a few codes come from old sponsors, so the site shows another. */
const SHOWN_CODE: Record<string, string> = {
  ULK: "FEN", // Fenerbahce: ULK is from its old sponsor Ülker
  PAM: "VAL", // Valencia: PAM is from its old sponsor Pamesa
};

export function clubAbbr(code: string | null | undefined): string {
  return code ? SHOWN_CODE[code] ?? code : "";
}

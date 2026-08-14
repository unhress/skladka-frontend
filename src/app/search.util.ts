/**
 * Cyrillic↔Latin tolerant search: typing "Новус" must find "Novus" and typing "novus"
 * must find "Сільпо"/"Novus". We transliterate Cyrillic → Latin, drop everything but
 * [a-z0-9], and substring-match — so both the query and the candidate collapse to the
 * same Latin skeleton regardless of the script the user typed in.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
  и: 'y', і: 'i', ї: 'yi', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ь: '', ю: 'yu', я: 'ya',
  // Russian letters that show up in brand names
  ё: 'e', ъ: '', ы: 'y', э: 'e',
};

function transliterate(input: string): string {
  let out = '';
  for (const ch of input.toLowerCase()) {
    out += ch in CYRILLIC_TO_LATIN ? CYRILLIC_TO_LATIN[ch] : ch;
  }
  return out;
}

/** Latin skeleton: transliterated, lowercased, only [a-z0-9]. */
export function searchKey(input: string): string {
  return transliterate(input).replace(/[^a-z0-9]+/g, '');
}

/** True if `query` matches any of the given haystacks after script-tolerant normalization. */
export function fuzzyMatch(query: string, ...haystacks: string[]): boolean {
  const q = searchKey(query);
  if (!q) return true;
  const hay = haystacks.map(searchKey).join(' ');
  return hay.includes(q);
}

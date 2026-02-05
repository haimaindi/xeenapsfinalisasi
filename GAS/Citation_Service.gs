
/**
 * XEENAPS PKM - CITATION GENERATOR SERVICE
 * Handles multiple styles and languages for academic citations.
 * Returns Clean Plain Text only.
 */

function formatCitations(item, style, lang) {
  const authors = item.authors || [];
  const year = item.year || "n.d.";
  const title = item.title || "Untitled";
  const publisher = item.publisher || "";
  const journal = item.pubInfo?.journal || "";
  const vol = item.pubInfo?.vol || "";
  const issue = item.pubInfo?.issue || "";
  const pages = item.pubInfo?.pages || "";
  const doi = item.identifiers?.doi || "";
  const url = item.url || "";

  // Dictionary for Internationalization
  const dict = {
    'English': { and: 'and', etAl: 'et al.', available: 'Available at', vol: 'vol.', no: 'no.', pp: 'pp.' },
    'Indonesian': { and: 'dan', etAl: 'et al.', available: 'Tersedia di', vol: 'vol.', no: 'no.', pp: 'hlm.' },
    'French': { and: 'et', etAl: 'et al.', available: 'Disponible sur', vol: 'vol.', no: 'n°', pp: 'pp.' },
    'German': { and: 'und', etAl: 'et al.', available: 'Verfügbar unter', vol: 'Bd.', no: 'Nr.', pp: 'S.' },
    'Dutch': { and: 'en', etAl: 'et al.', available: 'Beschikbaar op', vol: 'vol.', no: 'nr.', pp: 'pp.' }
  };

  const l = dict[lang] || dict['English'];

  // Author Name Formatting Helper (Last, F.)
  const formatAuthorName = (name) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const last = parts.pop();
    const initials = parts.map(p => p.charAt(0).toUpperCase() + ".").join(" ");
    return `${last}, ${initials}`;
  };

  // Bibliography Author List
  let bibAuthorStr = "";
  if (authors.length === 0) {
    bibAuthorStr = "Anon.";
  } else if (authors.length === 1) {
    bibAuthorStr = formatAuthorName(authors[0]);
  } else if (authors.length === 2) {
    bibAuthorStr = `${formatAuthorName(authors[0])} ${l.and} ${formatAuthorName(authors[1])}`;
  } else {
    const allButLast = authors.slice(0, -1).map(formatAuthorName).join(", ");
    bibAuthorStr = `${allButLast}, ${l.and} ${formatAuthorName(authors[authors.length - 1])}`;
  }

  // In-Text Author (Short)
  let shortAuthor = authors.length > 0 ? authors[0].trim().split(' ').pop() : "Anon.";
  if (authors.length === 2) shortAuthor += ` ${l.and} ${authors[1].trim().split(' ').pop()}`;
  else if (authors.length > 2) shortAuthor += ` ${l.etAl}`;

  let parenthetical = "";
  let narrative = "";
  let bibliography = "";

  const source = doi ? `https://doi.org/${doi}` : url;

  switch (style) {
    case 'APA 7th Edition':
      parenthetical = `(${shortAuthor}, ${year})`;
      narrative = `${shortAuthor} (${year})`;
      bibliography = `${bibAuthorStr} (${year}). ${title}. `;
      if (journal) {
        bibliography += `${journal}`;
        if (vol) bibliography += `, ${vol}`;
        if (issue) bibliography += `(${issue})`;
        if (pages) bibliography += `, ${pages}`;
      } else if (publisher) {
        bibliography += `${publisher}.`;
      }
      if (source) bibliography += `. ${source}`;
      break;

    case 'IEEE':
      parenthetical = `[1]`;
      narrative = `[1]`;
      const ieeeAuthors = authors.map(a => {
        const p = a.split(' ');
        const last = p.pop();
        return p[0].charAt(0).toUpperCase() + ". " + last;
      }).join(", ");
      bibliography = `${ieeeAuthors}, "${title}," `;
      if (journal) {
        bibliography += `${journal}, ${l.vol} ${vol}, ${l.no} ${issue}, ${l.pp} ${pages}, ${year}.`;
      } else {
        bibliography += `${publisher}, ${year}.`;
      }
      break;

    case 'Chicago':
      parenthetical = `(${shortAuthor} ${year})`;
      narrative = `${shortAuthor} (${year})`;
      bibliography = `${bibAuthorStr}. ${year}. "${title}." `;
      if (journal) {
        bibliography += `${journal}`;
        if (vol) bibliography += ` ${vol}`;
        if (issue) bibliography += `, ${l.no} ${issue}`;
        if (pages) bibliography += `: ${pages}`;
      } else if (publisher) {
        bibliography += `${publisher}.`;
      }
      if (source) bibliography += ` ${source}.`;
      break;

    case 'Vancouver':
      parenthetical = `(1)`;
      narrative = `(1)`;
      const vancAuthors = authors.map(a => {
        const p = a.split(' ');
        const last = p.pop();
        const init = p.map(n => n.charAt(0).toUpperCase()).join("");
        return last + " " + init;
      }).join(", ");
      bibliography = `${vancAuthors}. ${title}. `;
      if (journal) {
        bibliography += `${journal}. ${year};`;
        if (vol) bibliography += `${vol}`;
        if (issue) bibliography += `(${issue})`;
        if (pages) bibliography += `:${pages}.`;
      } else {
        bibliography += `${publisher}; ${year}.`;
      }
      break;

    case 'MLA 9th Edition':
      const mlaAuthor = authors.length > 0 ? (authors[0].split(' ').pop() + ", " + authors[0].split(' ').slice(0,-1).join(' ')) : "Anon.";
      let mlaAuthorStr = mlaAuthor;
      if (authors.length === 2) mlaAuthorStr += ` ${l.and} ${authors[1]}`;
      else if (authors.length > 2) mlaAuthorStr += `, ${l.etAl}`;
      
      parenthetical = `(${shortAuthor} ${pages})`;
      narrative = `${shortAuthor}`;
      bibliography = `${mlaAuthorStr}. "${title}." `;
      if (journal) {
        bibliography += `${journal}, ${l.vol} ${vol}, ${l.no} ${issue}, ${year}, ${l.pp} ${pages}.`;
      } else {
        bibliography += `${publisher}, ${year}.`;
      }
      if (source) bibliography += ` ${source.replace(/^https?:\/\//, '')}.`;
      break;

    case 'Harvard':
    default:
      parenthetical = `(${shortAuthor}, ${year})`;
      narrative = `${shortAuthor} (${year})`;
      bibliography = `${bibAuthorStr} (${year}) '${title}'`;
      if (journal) {
        bibliography += `, ${journal}`;
        if (vol) bibliography += `, ${vol}`;
        if (issue) bibliography += `(${issue})`;
        if (pages) bibliography += `, ${l.pp} ${pages}`;
      } else if (publisher) {
        bibliography += `, ${publisher}`;
      }
      if (source) bibliography += `. ${l.available}: ${source}`;
      break;
  }

  // Final Cleanup: No HTML allowed, remove redundant spaces
  bibliography = bibliography.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  parenthetical = parenthetical.replace(/<[^>]*>/g, '').trim();
  narrative = narrative.replace(/<[^>]*>/g, '').trim();

  return {
    parenthetical,
    narrative,
    bibliography
  };
}

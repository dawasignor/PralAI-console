/**
 * The jargon table.
 *
 * Chanakya and Agent Norwood are allowed to be technical, but they must explain
 * every term and abbreviation the FIRST time it appears in a session - and only
 * the first time, so a long conversation does not repeat itself.
 *
 * CK bot never reaches this table: its replies are written in plain language
 * and are not supposed to contain jargon at all.
 *
 * Definitions are one line, active voice, and must not need a second
 * definition to make sense.
 */

export interface GlossaryEntry {
  /** The term as it appears in text. Matched on a word boundary. */
  term: string;
  meaning: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: "AOI", meaning: "area of interest - the map rectangle being analysed" },
  { term: "EO", meaning: "Earth observation - measuring the surface from satellites" },
  { term: "SAR", meaning: "synthetic aperture radar - a sensor that makes its own signal and sees through cloud" },
  { term: "DEM", meaning: "digital elevation model - a grid of ground heights" },
  { term: "GLO-30", meaning: "the 30-metre version of the Copernicus global elevation model" },
  { term: "SCL", meaning: "scene classification layer - Sentinel-2's per-pixel mask of cloud, shadow, water and land" },
  { term: "L2A", meaning: "Sentinel-2 processing level 2A - surface reflectance, corrected for the atmosphere" },
  { term: "NDVI", meaning: "normalised difference vegetation index - a greenness measure" },
  { term: "NDBI", meaning: "normalised difference built-up index - a measure of built surfaces" },
  { term: "BUI", meaning: "built-up index - built surfaces, with vegetation removed" },
  { term: "NDMI", meaning: "normalised difference moisture index - moisture held in vegetation" },
  { term: "NMDI", meaning: "normalised multi-band drought index - moisture in soil and vegetation" },
  { term: "MNDWI", meaning: "modified normalised difference water index - open water" },
  { term: "LULC", meaning: "land use and land cover - what the ground is and what it is used for" },
  { term: "ERA5-Land", meaning: "a Copernicus reanalysis dataset - modelled weather on a grid of about 9 km" },
  { term: "GHI", meaning: "global horizontal irradiance - solar energy reaching a flat surface" },
  { term: "JRC", meaning: "the Joint Research Centre, the European Commission's science service" },
  { term: "MGRS", meaning: "military grid reference system - the tiling scheme Sentinel-2 scenes use" },
  { term: "COG", meaning: "cloud-optimised GeoTIFF - an image that can be read in parts, over the network" },
  { term: "MCDM", meaning: "multi-criteria decision making - scoring options against several weighted criteria" },
  { term: "STAC", meaning: "SpatioTemporal Asset Catalog - the standard used to search satellite archives" },
];

/**
 * Find the terms in `text` that have not been explained yet.
 *
 * Matching is case-sensitive and bounded by non-word characters, because these
 * are abbreviations: a loose match would explain "EO" inside "Open-Meteo".
 * Hyphenated terms are handled by escaping the hyphen rather than treating it
 * as a boundary.
 */
export function newTerms(text: string, seen: string[]): GlossaryEntry[] {
  const already = new Set(seen);

  return GLOSSARY.filter((entry) => {
    if (already.has(entry.term)) return false;
    const escaped = entry.term.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
    return new RegExp(`(^|[^\\w-])${escaped}([^\\w-]|$)`).test(text);
  });
}

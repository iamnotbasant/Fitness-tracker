import fs from 'fs';

function parseSwiftFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parts = [];

  // Split by BodyPartPathData(
  const blocks = content.split('BodyPartPathData(');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Get slug
    const slugMatch = block.match(/slug:\s*\.([a-zA-Z0-9]+)/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];

    const extractArray = (label) => {
      const idx = block.indexOf(`${label}:`);
      if (idx === -1) return [];
      const startBracket = block.indexOf('[', idx);
      if (startBracket === -1) return [];
      const endBracket = block.indexOf(']', startBracket);
      if (endBracket === -1) return [];

      const inner = block.slice(startBracket + 1, endBracket);
      const strings = [];
      const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      let m;
      while ((m = strRegex.exec(inner)) !== null) {
        strings.push(m[1]);
      }
      return strings;
    };

    const common = extractArray('common');
    const left = extractArray('left');
    const right = extractArray('right');

    parts.push({
      slug,
      common,
      left,
      right,
      allPaths: [...common, ...left, ...right]
    });
  }

  return parts;
}

const frontParts = parseSwiftFile('muscle_map_repo/Sources/MuscleMap/Data/MaleFrontPaths.swift');
const backParts = parseSwiftFile('muscle_map_repo/Sources/MuscleMap/Data/MaleBackPaths.swift');

console.log(`Front parts found: ${frontParts.length}`);
console.log(`Front parts with paths: ${frontParts.filter(p => p.allPaths.length > 0).length}`);
console.log(`Back parts found: ${backParts.length}`);
console.log(`Back parts with paths: ${backParts.filter(p => p.allPaths.length > 0).length}`);

const outputTs = `// Generated from https://github.com/melihcolpan/MuscleMap
// Licensed under MIT License. Male Anatomy SVG Paths

export interface BodyPartPaths {
  slug: string
  common: string[]
  left: string[]
  right: string[]
  allPaths: string[]
}

export const MALE_FRONT_VIEWBOX = "0 95 727 1280"
export const MALE_BACK_VIEWBOX = "718 95 727 1280"

export const MALE_FRONT_PARTS: BodyPartPaths[] = ${JSON.stringify(frontParts, null, 2)}

export const MALE_BACK_PARTS: BodyPartPaths[] = ${JSON.stringify(backParts, null, 2)}
`;

fs.writeFileSync('src/components/charts/muscle-map-data.ts', outputTs);
console.log('Written src/components/charts/muscle-map-data.ts successfully!');

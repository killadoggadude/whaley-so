/**
 * Humanizer: Remove AI Writing Patterns
 * 
 * Based on Wikipedia's "Signs of AI writing" guide from WikiProject AI Cleanup.
 * Identifies and removes 24 common AI writing patterns to make text sound more natural.
 */

export interface HumanizerOptions {
  preserveLineBreaks?: boolean;
  intensity?: 'light' | 'medium' | 'aggressive';
}

interface PatternReplacement {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  description: string;
}

/**
 * Main humanizer function - strips AI writing patterns from text
 */
export function humanizeText(text: string, options: HumanizerOptions = {}): string {
  const { preserveLineBreaks = true, intensity = 'medium' } = options;
  
  let result = text;

  // Apply patterns based on intensity
  if (intensity === 'light') {
    result = applyLightPatterns(result);
  } else if (intensity === 'medium') {
    result = applyMediumPatterns(result);
  } else {
    result = applyAggressivePatterns(result);
  }

  // Clean up extra whitespace while preserving intentional line breaks
  if (preserveLineBreaks) {
    result = result
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  } else {
    result = result.replace(/\s+/g, ' ').trim();
  }

  return result;
}

/**
 * Light mode - only the most obvious patterns
 */
function applyLightPatterns(text: string): string {
  let result = text;

  // Remove chatbot artifacts
  result = removeChatbotArtifacts(result);
  
  // Remove filler phrases
  result = removeFillerPhrases(result);
  
  // Remove em dashes overuse
  result = fixEmDashes(result);

  return result;
}

/**
 * Medium mode - balanced approach (recommended)
 */
function applyMediumPatterns(text: string): string {
  let result = text;

  // Remove chatbot artifacts
  result = removeChatbotArtifacts(result);
  
  // Remove significance inflation
  result = removeSignificanceInflation(result);
  
  // Remove promotional language
  result = removePromotionalLanguage(result);
  
  // Remove superficial -ing analyses
  result = removeSuperficialIng(result);
  
  // Remove filler phrases
  result = removeFillerPhrases(result);
  
  // Fix em dashes
  result = fixEmDashes(result);
  
  // Fix rule of three overuse
  result = fixRuleOfThree(result);
  
  // Replace AI vocabulary
  result = replaceAIVocabulary(result);
  
  // Fix copula avoidance
  result = fixCopulaAvoidance(result);
  
  // Remove negative parallelism
  result = removeNegativeParallelism(result);

  return result;
}

/**
 * Aggressive mode - all patterns
 */
function applyAggressivePatterns(text: string): string {
  let result = applyMediumPatterns(text);

  // Additional aggressive fixes
  result = removeVagueAttributions(result);
  result = fixElegantVariation(result);
  result = removeExcessiveHedging(result);
  result = removeGenericConclusions(result);
  result = removeBoldOveruse(result);
  result = removeEmojis(result);
  result = fixTitleCase(result);
  result = removeCurlyQuotes(result);

  return result;
}

// ============================================
// Pattern Functions
// ============================================

function removeChatbotArtifacts(text: string): string {
  const patterns = [
    /Great question!\s*/gi,
    /I hope this helps[!.]?\s*/gi,
    /Of course[!.]?\s*/gi,
    /Certainly[!.]?\s*/gi,
    /You're absolutely right[!.]?\s*/gi,
    /Would you like me to\s+/gi,
    /Let me know if you'd like me to\s+/gi,
    /Here is\s+/gi,
    /Here's\s+/gi,
    /As of my last update[,.]?\s*/gi,
    /Up to my last training update[,.]?\s*/gi,
    /While specific details are limited[,.]?\s*/gi,
    /Based on available information[,.]?\s*/gi,
    /It's worth noting that\s+/gi,
    /In conclusion[,.]?\s*/gi,
    /To summarize[,.]?\s*/gi,
    /In summary[,.]?\s*/gi,
  ];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

function removeSignificanceInflation(text: string): string {
  const patterns = [
    { regex: /\b(marking|marks?)\s+(a\s+)?pivotal\s+(moment|turning point)/gi, replacement: '' },
    { regex: /\bstands?\s+as\s+(a\s+)?testament\s+to/gi, replacement: '' },
    { regex: /\b(vital|crucial|pivotal|key)\s+(role|moment|importance)/gi, replacement: '' },
    { regex: /\b(underscores|highlights|underscores?|highlights?)\s+(its\s+)?importance/gi, replacement: '' },
    { regex: /\b(contributing|contributes?\s+to)\s+the\s+(broader|ongoing)/gi, replacement: '' },
    { regex: /\bsetting\s+the\s+stage\s+for/gi, replacement: '' },
    { regex: /\b(marking|shaping)\s+the\s+/gi, replacement: '' },
    { regex: /\brepresents?\s+a\s+shift/gi, replacement: '' },
    { regex: /\bevolving\s+landscape/gi, replacement: '' },
    { regex: /\bfocal\s+point/gi, replacement: '' },
    { regex: /\bindelible\s+mark/gi, replacement: '' },
    { regex: /\bdeeply\s+rooted/gi, replacement: '' },
  ];

  let result = text;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }

  return result;
}

function removePromotionalLanguage(text: string): string {
  const patterns = [
    { regex: /\bbreathtaking/gi, replacement: '' },
    { regex: /\bnestled\s+within/gi, replacement: '' },
    { regex: /\bnestled\s+in/gi, replacement: '' },
    { regex: /\bvibrant/gi, replacement: '' },
    { regex: /\brich\s+(cultural\s+)?heritage/gi, replacement: '' },
    { regex: /\bstunning/gi, replacement: '' },
    { regex: /\bmust-visit/gi, replacement: '' },
    { regex: /\bgroundbreaking/gi, replacement: '' },
    { regex: /\brenowned/gi, replacement: '' },
    { regex: /\bexemplifies/gi, replacement: '' },
    { regex: /\bcommitment\s+to/gi, replacement: '' },
    { regex: /\benhancing\s+its/gi, replacement: '' },
    { regex: /\bshowcasing/gi, replacement: '' },
    { regex: /\bprofound/gi, replacement: '' },
  ];

  let result = text;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }

  return result;
}

function removeSuperficialIng(text: string): string {
  const patterns = [
    { regex: /\b(\w+)(?:ing)\s+(?:that\s+)?(?:symboliz(?:es?|ing)|reflect(?:s|ing)|showcas(?:es|ing)|highlight(?:s|ing)|underscor(?:es|ing)|emphasiz(?:es|ing))/gi, replacement: '' },
    { regex: /\ben(?:s|ning|ded)\s+to\s+(?:ensure|foster|cultivat(?:e|ing))/gi, replacement: '' },
  ];

  let result = text;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }

  return result;
}

function removeFillerPhrases(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\bin order to\s+/gi, 'to '],
    [/\bdue to the fact that\s+/gi, 'because '],
    [/\bat this point in time\s+/gi, 'now'],
    [/\bin the event that\s+/gi, 'if '],
    [/\bthe system has the ability to\s+/gi, 'the system can '],
    [/\bit is important to note that\s+/gi, ''],
    [/\bto be honest\s+/gi, ''],
    [/\bto be fair\s+/gi, ''],
    [/\bin todays?\s+/gi, "in today's "],
    [/\bultimately\s+/gi, ''],
    [/\bbasically\s+/gi, ''],
    [/\bessentially\s+/gi, ''],
    [/\bliterally\s+/gi, ''],
    [/\bhonestly\s+/gi, ''],
    [/\bfrankly\s+/gi, ''],
    [/\bactually\s+/gi, ''],
    [/\breally\s+/gi, ''],
    [/\bvery\s+/gi, ''],
    [/\bquite\s+/gi, ''],
    [/\bsurely\s+/gi, ''],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

function fixEmDashes(text: string): string {
  // Replace em dashes with commas or periods when overused
  let result = text;
  
  // If there are multiple em dashes in a sentence, reduce them
  if ((result.match(/—/g) || []).length > 1) {
    result = result.replace(/—/g, ',');
    // Clean up double commas
    result = result.replace(/,,+/g, ',');
    // Remove trailing commas before periods
    result = result.replace(/,\./g, '.');
  }
  
  return result;
}

function fixRuleOfThree(text: string): string {
  // Detect and break forced triples
  const triplePattern = /(\w+),\s*(\w+),\s*(and\s+)?(\w+)\s*(\.|,)/g;
  let result = text;
  
  // Only fix if it looks like a forced triple (all nouns or all adjectives)
  result = result.replace(triplePattern, (match, p1, p2, p3, p4, p5) => {
    return `${p1}, ${p2}${p3 ? ' and ' + p4 : ''}${p5}`;
  });

  return result;
}

function replaceAIVocabulary(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\badditionally\b/gi, 'also'],
    [/\btestament\b/gi, ''],
    [/\blandscape\b/gi, 'field'],
    [/\bshowcase\b/gi, 'show'],
    [/\bunderscore\b/gi, 'show'],
    [/\bdelve\b/gi, 'go'],
    [/\bemphasize\b/gi, 'focus on'],
    [/\bintricate\b/gi, 'complex'],
    [/\bpivotal\b/gi, 'key'],
    [/\benhance\b/gi, 'improve'],
    [/\bfoster\b/gi, 'encourage'],
    [/\bgarner\b/gi, 'get'],
    [/\btapestry\b/gi, ''],
    [/\binterplay\b/gi, 'interaction'],
    [/\bvaluable\b/gi, 'useful'],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

function fixCopulaAvoidance(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\bserves\s+as\s+/gi, 'is '],
    [/\bstands\s+as\s+/gi, 'is '],
    [/\bmarks?\s+as\s+/gi, 'is '],
    [/\brepresents?\s+(a|as)\s+/gi, 'is '],
    [/\bboasts?\s+(a|has)/gi, 'has'],
    [/\bfeatures?\s+(a|has)/gi, 'has'],
    [/\boffers?\s+(a|has)/gi, 'has'],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

function removeNegativeParallelism(text: string): string {
  let result = text;

  // Fix "It's not just X, it's Y" constructions
  result = result.replace(/It's not just (.*?), it's (.*?)\./gi, '$1. $2.');
  result = result.replace(/Not only (.*?), but (.*?)\./gi, '$1. $2.');

  return result;
}

function removeVagueAttributions(text: string): string {
  const patterns = [
    /\bIndustry reports\s+/gi,
    /\bObservers have cited\s+/gi,
    /\bExperts argue\s+/gi,
    /\bSome critics argue\s+/gi,
    /\bseveral sources\b/gi,
    /\bpublications\b/gi,
    /\bsome\b(?=\s+\w+\s+(say|believe|argue|claim))/gi,
  ];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

function fixElegantVariation(text: string): string {
  // Fix excessive synonym substitution by keeping original terms
  // This is harder to automate, so we just remove common transitions
  const patterns = [
    { regex: /\bthe protagonist\b/gi, replacement: 'the protagonist' },
    { regex: /\bthe main character\b/gi, replacement: 'the protagonist' },
    { regex: /\bthe central figure\b/gi, replacement: 'the protagonist' },
    { regex: /\bthe hero\b/gi, replacement: 'the protagonist' },
  ];

  let result = text;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }

  return result;
}

function removeExcessiveHedging(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\bcould\s+potentially\s+possibly\s+be\s+/gi, 'may be '],
    [/\bcould\s+potentially\s+/gi, 'may '],
    [/\bpossibly\s+/gi, ''],
    [/\bmight\s+have\s+/gi, 'may have '],
    [/\bappears\s+to\s+/gi, 'appears '],
    [/\bseems\s+to\s+/gi, 'seems '],
    [/\btends\s+to\s+/gi, 'tends to '],
    [/\bwould\s+likely\s+/gi, 'likely '],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

function removeGenericConclusions(text: string): string {
  const patterns = [
    /\bThe future looks bright[.,]\s*/gi,
    /\bExciting times lie ahead[.,]\s*/gi,
    /\bThis represents a major step in the right direction[.,]\s*/gi,
    /\bOnly time will tell[.,]\s*/gi,
    /\bThe possibilities are endless[.,]\s*/gi,
  ];

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

function removeBoldOveruse(text: string): string {
  // Remove markdown bold that appears in unnatural places
  let result = text;
  
  // If bold appears at start of multiple items in a list
  if (result.includes('**')) {
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
  }

  return result;
}

function removeEmojis(text: string): string {
  // Remove emojis at start of lines or before colons
  let result = text;
  
  // Common emoji patterns
  const emojiRegex = /^[🚀💡✅❌🔥⭐✨👏🤔💯🔍📱💻🎯🎬🎤🎧📸💄👠👙🔥💕]+/gm;
  result = result.replace(emojiRegex, '');
  
  return result;
}

function fixTitleCase(text: string): string {
  // Convert title case headings to sentence case
  const lines = text.split('\n');
  const result = lines.map(line => {
    // If it looks like a heading (short, no punctuation)
    if (line.length < 60 && !line.includes('.') && line === line.toUpperCase()) {
      return line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
    }
    return line;
  }).join('\n');

  return result;
}

function removeCurlyQuotes(text: string): string {
  let result = text;
  result = result.replace(/["""]/g, '"');
  result = result.replace(/[''']/g, "'");
  return result;
}

/**
 * Detect AI patterns in text - returns list of found patterns
 */
export function detectAIPatterns(text: string): string[] {
  const findings: string[] = [];

  // Check for common patterns
  if (/\badditionally\b/i.test(text)) findings.push('AI vocabulary: additionally');
  if (/\btestament\b/i.test(text)) findings.push('Significance inflation: testament');
  if (/—/.test(text) && (text.match(/—/g) || []).length > 1) findings.push('Em dash overuse');
  if (/\bI hope this helps\b/i.test(text)) findings.push('Chatbot artifact');
  if (/\bIt's not just.*it's\b/i.test(text)) findings.push('Negative parallelism');
  if (/\b(breathtaking|stunning|vibrant)\b/i.test(text)) findings.push('Promotional language');
  if (/\bsymboliz(?:es|ing)\b/i.test(text)) findings.push('Superficial -ing analysis');
  if (/\b(underscore|showcase)\b/i.test(text)) findings.push('AI vocabulary');
  if (/\bserves as\b/i.test(text)) findings.push('Copula avoidance');
  if (/\bin order to\b/i.test(text)) findings.push('Filler phrase: in order to');
  if (/\bcould potentially\b/i.test(text)) findings.push('Excessive hedging');
  if (/\bThe future looks bright\b/i.test(text)) findings.push('Generic conclusion');
  if (/\*{2,}/.test(text)) findings.push('Bold overuse');

  return findings;
}

/**
 * Calculate AI probability score (0-100)
 * Higher score = more likely AI-written
 */
export function calculateAIScore(text: string): number {
  let score = 0;
  const length = text.length;
  
  if (length < 50) return 0;
  
  // Pattern checks (each adds to score)
  const patterns: Array<{ regex: RegExp; points: number; count?: boolean }> = [
    { regex: /\badditionally\b/i, points: 8 },
    { regex: /\btestament\b/i, points: 10 },
    { regex: /—/g, points: 5, count: true },
    { regex: /\bI hope this helps\b/i, points: 15 },
    { regex: /\bIt's not just.*it's\b/i, points: 10 },
    { regex: /\bbreathtaking\b/i, points: 8 },
    { regex: /\bstunning\b/i, points: 6 },
    { regex: /\bsymboliz(?:es|ing)\b/i, points: 8 },
    { regex: /\bunderscore\b/i, points: 6 },
    { regex: /\bserves as\b/i, points: 8 },
    { regex: /\bin order to\b/i, points: 10 },
    { regex: /\bcould potentially\b/i, points: 8 },
    { regex: /\bThe future looks bright\b/i, points: 15 },
    { regex: /\b Ultimately\b/i, points: 8 },
    { regex: /\bbasically\b/i, points: 5 },
    { regex: /\bEssentially\b/i, points: 5 },
    { regex: /\*{2,}/, points: 10, count: true },
  ];

  for (const { regex, points, count } of patterns) {
    if (count) {
      const matches = text.match(regex);
      if (matches) score += matches.length * points;
    } else if (regex.test(text)) {
      score += points;
    }
  }

  // Normalize by length (longer texts should have lower per-character scores)
  const normalizedScore = Math.min(100, (score / length) * 1000);
  
  return Math.round(normalizedScore);
}

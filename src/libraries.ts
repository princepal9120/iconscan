// src/libraries.ts — icon library catalog + verified generic/brand name data
import type { LibraryDef } from './types.js'

export const KNOWN_LIBRARIES: LibraryDef[] = [
  {
    name: 'lucide-react',
    pattern: 'lucide-react',
    betterAlternatives: ['@tabler/icons-react', '@phosphor-icons/react']
  },
  {
    name: '@heroicons/react',
    pattern: '@heroicons/react',
    betterAlternatives: ['lucide-react', '@phosphor-icons/react']
  },
  {
    name: '@phosphor-icons/react',
    pattern: '@phosphor-icons/react',
    betterAlternatives: ['@tabler/icons-react', 'lucide-react']
  },
  {
    name: '@tabler/icons-react',
    pattern: '@tabler/icons-react',
    betterAlternatives: ['lucide-react', '@phosphor-icons/react']
  },
  {
    name: 'react-icons',
    pattern: 'react-icons',
    isBrandSafe: true,
    betterAlternatives: ['lucide-react', '@phosphor-icons/react', '@tabler/icons-react']
  },
  {
    name: '@fortawesome/react-fontawesome',
    pattern: '@fortawesome',
    isBrandSafe: true,
    betterAlternatives: ['lucide-react', '@tabler/icons-react']
  },
  {
    name: '@mui/icons-material',
    pattern: '@mui/icons-material',
    betterAlternatives: ['@tabler/icons-react', 'lucide-react']
  },
  {
    name: 'react-feather',
    pattern: 'react-feather',
    betterAlternatives: ['lucide-react', '@phosphor-icons/react']
  },
  {
    name: '@iconify/react',
    pattern: '@iconify/react',
    isBrandSafe: true,
    betterAlternatives: ['lucide-react', '@tabler/icons-react']
  },
  {
    name: '@radix-ui/react-icons',
    pattern: '@radix-ui/react-icons',
    betterAlternatives: ['lucide-react']
  },
  {
    name: 'react-bootstrap-icons',
    pattern: 'react-bootstrap-icons',
    betterAlternatives: ['lucide-react', '@tabler/icons-react']
  }
]

// Placeholder-ish export names that signal "not a real icon choice".
export const GENERIC_ICON_NAMES: ReadonlySet<string> = new Set([
  'icon',
  'default-icon',
  'placeholder',
  'img',
  'image',
  'photo',
  'picture',
  'dummy',
  'temp',
  'temporary',
  'mock',
  'sample',
  'example',
  'fake',
  'blank',
  'empty',
  'unknown',
  'fallback',
  'missing',
  'none',
  'null',
  'undefined',
  'logo',
  'brand',
  'company'
])

// Generic name → verified lucide-react export (exists in lucide-react today).
export const GENERIC_TO_REAL: Record<string, string> = {
  'icon': 'Menu',
  'placeholder': 'Image',
  'image': 'Image',
  'img': 'Image',
  'picture': 'Image',
  'photo': 'Camera',
  'dummy': 'Box',
  'temp': 'Clock',
  'temporary': 'Clock',
  'mock': 'Lightbulb',
  'sample': 'Lightbulb',
  'example': 'Lightbulb',
  'fake': 'TriangleAlert',
  'blank': 'Square',
  'empty': 'Package',
  'unknown': 'CircleHelp',
  'fallback': 'RefreshCw',
  'missing': 'CircleX',
  'none': 'Minus',
  'null': 'Minus',
  'undefined': 'Minus',
  'logo': 'Sparkles',
  'brand': 'Tag',
  'company': 'Building2'
}

export const BRAND_TOKENS: ReadonlySet<string> = new Set([
  'twitter',
  'x',
  'github',
  'gitlab',
  'bitbucket',
  'discord',
  'slack',
  'notion',
  'figma',
  'vercel',
  'stripe',
  'twilio',
  'aws',
  'amazon',
  'google',
  'apple',
  'microsoft',
  'meta',
  'facebook',
  'linkedin',
  'youtube',
  'instagram',
  'tiktok',
  'spotify',
  'netflix',
  'uber',
  'airbnb',
  'shopify',
  'zoom',
  'skype',
  'telegram',
  'whatsapp',
  'signal',
  'reddit',
  'pinterest',
  'twitch',
  'dribbble',
  'behance',
  'medium',
  'paypal',
  'githubactions',
  'docker',
  'kubernetes'
])

// Brand slug → real Simple Icons export (react-icons/si).
// Brand slugs with a verified react-icons/si export (checked against
// react-icons 5.7.0). Brands simple-icons dropped for trademark reasons —
// linkedin, slack, microsoft, twilio, skype, amazon/aws — have no entry on
// purpose: they fall through to the "use an official brand SVG" info path
// instead of pointing at a nonexistent export.
export const BRAND_TO_SIMPLE: Record<string, { name: string; library: 'react-icons/si' }> = {
  'twitter': { name: 'SiX', library: 'react-icons/si' },
  'x': { name: 'SiX', library: 'react-icons/si' },
  'github': { name: 'SiGithub', library: 'react-icons/si' },
  'gitlab': { name: 'SiGitlab', library: 'react-icons/si' },
  'bitbucket': { name: 'SiBitbucket', library: 'react-icons/si' },
  'discord': { name: 'SiDiscord', library: 'react-icons/si' },
  'notion': { name: 'SiNotion', library: 'react-icons/si' },
  'figma': { name: 'SiFigma', library: 'react-icons/si' },
  'vercel': { name: 'SiVercel', library: 'react-icons/si' },
  'stripe': { name: 'SiStripe', library: 'react-icons/si' },
  'google': { name: 'SiGoogle', library: 'react-icons/si' },
  'apple': { name: 'SiApple', library: 'react-icons/si' },
  'meta': { name: 'SiMeta', library: 'react-icons/si' },
  'facebook': { name: 'SiFacebook', library: 'react-icons/si' },
  'youtube': { name: 'SiYoutube', library: 'react-icons/si' },
  'instagram': { name: 'SiInstagram', library: 'react-icons/si' },
  'tiktok': { name: 'SiTiktok', library: 'react-icons/si' },
  'spotify': { name: 'SiSpotify', library: 'react-icons/si' },
  'netflix': { name: 'SiNetflix', library: 'react-icons/si' },
  'uber': { name: 'SiUber', library: 'react-icons/si' },
  'airbnb': { name: 'SiAirbnb', library: 'react-icons/si' },
  'shopify': { name: 'SiShopify', library: 'react-icons/si' },
  'zoom': { name: 'SiZoom', library: 'react-icons/si' },
  'telegram': { name: 'SiTelegram', library: 'react-icons/si' },
  'whatsapp': { name: 'SiWhatsapp', library: 'react-icons/si' },
  'signal': { name: 'SiSignal', library: 'react-icons/si' },
  'reddit': { name: 'SiReddit', library: 'react-icons/si' },
  'pinterest': { name: 'SiPinterest', library: 'react-icons/si' },
  'twitch': { name: 'SiTwitch', library: 'react-icons/si' },
  'dribbble': { name: 'SiDribbble', library: 'react-icons/si' },
  'behance': { name: 'SiBehance', library: 'react-icons/si' },
  'medium': { name: 'SiMedium', library: 'react-icons/si' },
  'paypal': { name: 'SiPaypal', library: 'react-icons/si' },
  'githubactions': { name: 'SiGithubactions', library: 'react-icons/si' },
  'docker': { name: 'SiDocker', library: 'react-icons/si' },
  'kubernetes': { name: 'SiKubernetes', library: 'react-icons/si' }
}

// Vendor prefixes used by react-icons-style exports (FaGithub, SiX, ...).
// Longest-first so Io5/Hi2/Fa6/Tfi/Lia/Vsc win over their 2-char heads.
const ICON_NAME_PREFIXES = [
  'Io5', 'Hi2', 'Fa6', 'Lia', 'Tfi', 'Vsc',
  'Fa', 'Si', 'Io', 'Tb', 'Fi', 'Bi', 'Rx', 'Lu', 'Hi', 'Pi', 'Md',
  'Gr', 'Ri', 'Bs', 'Ai', 'Ci', 'Cg', 'Di', 'Go', 'Im', 'Sl', 'Ti', 'Wi'
]

// Strips a known vendor prefix, then splits on camelCase, digits, and -/_.
export function tokenizeIconName(name: string): string[] {
  let stem = name
  for (const prefix of ICON_NAME_PREFIXES) {
    if (
      stem.length > prefix.length &&
      stem.startsWith(prefix) &&
      /[A-Z]/.test(stem[prefix.length])
    ) {
      stem = stem.slice(prefix.length)
      break
    }
  }
  return stem
    .split(/[-_\s]+/)
    .flatMap(seg =>
      seg.split(
        /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])/
      )
    )
    .filter(Boolean)
    .map(token => token.toLowerCase())
}

// Brand tokens that are also ordinary lucide-style icon names — X is the
// close glyph, Apple the fruit, Signal the bars, ZoomIn/ZoomOut magnifiers.
// They only count as a brand when the name itself signals a brand
// representation (XLogo, AppleIcon).
const AMBIGUOUS_BRAND_TOKENS: ReadonlySet<string> = new Set(['x', 'apple', 'signal', 'zoom'])
const BRAND_CONTEXT_TOKENS: ReadonlySet<string> = new Set(['logo', 'icon', 'brand'])

// Brand detection: an unambiguous brand slug as the leading token, anywhere in
// the name, or the whole tokenized name joined back together — plus ambiguous
// tokens only when a logo/icon/brand token rides along. Tokens are matched
// whole — 'awesome' never hits 'aws', 'xLengthViolation' never hits 'x', and a
// bare lucide `X` is a close icon, not the X brand.
export function detectBrand(name: string): string | null {
  const tokens = tokenizeIconName(name)
  if (tokens.length === 0) return null
  const unambiguous = (t: string) => BRAND_TOKENS.has(t) && !AMBIGUOUS_BRAND_TOKENS.has(t)
  if (unambiguous(tokens[0])) return tokens[0]
  const slug = tokens.join('')
  if (unambiguous(slug)) return slug
  const mid = tokens.find(unambiguous)
  if (mid) return mid
  const amb = tokens.find(t => AMBIGUOUS_BRAND_TOKENS.has(t))
  if (amb && tokens.some(t => BRAND_CONTEXT_TOKENS.has(t))) return amb
  return null
}

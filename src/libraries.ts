// src/libraries.ts — known icon libraries, their patterns, upgrade paths
import type { LibraryDef } from './types.js'

export const KNOWN_LIBRARIES: LibraryDef[] = [
  {
    name: 'lucide-react',
    pattern: 'lucide-react',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['tabler-icons-react', 'phosphor-icons-react']
  },
  {
    name: '@heroicons/react',
    pattern: '@heroicons/react',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['lucide-react', 'phosphor-icons-react']
  },
  {
    name: '@phosphor-icons/react',
    pattern: '@phosphor-icons/react',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['tabler-icons-react', 'lucide-react']
  },
  {
    name: '@tabler/icons-react',
    pattern: '@tabler/icons-react',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['lucide-react', 'phosphor-icons-react']
  },
  {
    name: 'react-icons',
    pattern: 'react-icons',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['lucide-react', 'phosphor-icons-react', '@tabler/icons-react']
  },
  {
    name: '@fortawesome/react-fontawesome',
    pattern: '@fortawesome',
    iconPattern: /\bfa[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['lucide-react', '@tabler/icons-react']
  },
  {
    name: '@mui/icons-material',
    pattern: '@mui/icons-material',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['@tabler/icons-react', 'lucide-react']
  },
  {
    name: 'react-feather',
    pattern: 'react-feather',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['lucide-react', '@phosphor-icons/react']
  },
  {
    name: 'generic-icon',
    pattern: 'generic-icon|icon-placeholder|default-icon',
    iconPattern: /.*/,
    isGeneric: true,
    betterAlternatives: ['lucide-react', '@tabler/icons-react', '@phosphor-icons/react']
  },
  {
    name: 'iconify',
    pattern: '@iconify/react',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: []
  },
  {
    name: '@radix-ui/react-icons',
    pattern: '@radix-ui/react-icons',
    iconPattern: /\b[A-Z][a-zA-Z0-9]+\b/,
    isGeneric: false,
    betterAlternatives: ['lucide-react']
  },
  {
    name: 'bootstrap-icons',
    pattern: 'bootstrap-icons',
    iconPattern: /\bbi-[a-z0-9-]+\b/i,
    isGeneric: false,
    betterAlternatives: ['@tabler/icons-react', 'lucide-react']
  }
]

// Icon upgrade suggestions — generic → real icon mapping
export const GENERIC_TO_REAL: Record<string, { name: string; library: string }> = {
  'icon': { name: 'Menu', library: 'lucide-react' },
  'default-icon': { name: 'Circle', library: 'lucide-react' },
  'placeholder': { name: 'Image', library: 'lucide-react' },
  'img': { name: 'Image', library: 'lucide-react' },
  'image': { name: 'Image', library: 'lucide-react' },
  'photo': { name: 'Camera', library: 'lucide-react' },
  'picture': { name: 'Image', library: 'lucide-react' },
  'dummy': { name: 'Box', library: 'lucide-react' },
  'temp': { name: 'Clock', library: 'lucide-react' },
  'temporary': { name: 'Clock', library: 'lucide-react' },
  'mock': { name: 'TestTube', library: 'lucide-react' },
  'sample': { name: 'TestTube', library: 'lucide-react' },
  'example': { name: 'Lightbulb', library: 'lucide-react' },
  'test': { name: 'TestTube', library: 'lucide-react' },
  'fake': { name: 'AlertTriangle', library: 'lucide-react' },
  'blank': { name: 'Square', library: 'lucide-react' },
  'empty': { name: 'Package', library: 'lucide-react' },
  'unknown': { name: 'HelpCircle', library: 'lucide-react' },
  'fallback': { name: 'RefreshCw', library: 'lucide-react' },
  'missing': { name: 'XCircle', library: 'lucide-react' },
  'none': { name: 'Minus', library: 'lucide-react' },
  'null': { name: 'Minus', library: 'lucide-react' },
  'undefined': { name: 'HelpCircle', library: 'lucide-react' },
  'help': { name: 'HelpCircle', library: 'lucide-react' },
  'question': { name: 'HelpCircle', library: 'lucide-react' },
  'info': { name: 'Info', library: 'lucide-react' },
  'alert': { name: 'AlertTriangle', library: 'lucide-react' },
  'logo': { name: 'Globe', library: 'lucide-react' },
  'brand': { name: 'Building', library: 'lucide-react' },
  'company': { name: 'Building', library: 'lucide-react' },
  'twitter': { name: 'Twitter', library: 'lucide-react' },
  'github': { name: 'Github', library: 'lucide-react' },
  'discord': { name: 'MessageCircle', library: 'lucide-react' },
  'slack': { name: 'Hash', library: 'lucide-react' },
  'notion': { name: 'FileText', library: 'lucide-react' },
  'figma': { name: 'Figma', library: 'lucide-react' },
  'vercel': { name: 'Triangle', library: 'lucide-react' },
  'stripe': { name: 'CreditCard', library: 'lucide-react' },
  'twilio': { name: 'Phone', library: 'lucide-react' },
  'aws': { name: 'Cloud', library: 'lucide-react' }
}

// Libraries that are NOT icon libraries
export const NON_ICON_IMPORTS = new Set([
  'react', 'react-dom', 'react-native', 'react-native-web',
  'next', 'next/head', 'next/image', 'next/link', 'next/router',
  '@types', 'typescript', 'jest', 'vitest',
  'tailwindcss', 'postcss', 'autoprefixer',
  'radix-ui', '@radix-ui'
])
export const BRAND_LOGO_MAP: Record<string, { name: string; library: string }> = {
  'logo': { name: 'YourBrandLogo', library: 'custom-svg' },
  'brand': { name: 'YourBrandLogo', library: 'custom-svg' },
  'twitter': { name: 'Twitter', library: 'lucide-react' },
  'github': { name: 'Github', library: 'lucide-react' },
  'discord': { name: 'MessageCircle', library: 'lucide-react' },
  'slack': { name: 'Hash', library: 'lucide-react' },
  'notion': { name: 'FileText', library: 'lucide-react' },
  'figma': { name: 'Figma', library: 'lucide-react' },
  'vercel': { name: 'Triangle', library: 'lucide-react' },
  'stripe': { name: 'CreditCard', library: 'lucide-react' },
  'twilio': { name: 'Phone', library: 'lucide-react' },
  'aws': { name: 'Cloud', library: 'lucide-react' },
  'google': { name: 'Chrome', library: 'lucide-react' },
  'apple': { name: 'Apple', library: 'lucide-react' },
  'microsoft': { name: 'Windows', library: 'lucide-react' },
  'meta': { name: 'Facebook', library: 'lucide-react' },
  'linkedin': { name: 'Linkedin', library: 'lucide-react' },
  'youtube': { name: 'Youtube', library: 'lucide-react' },
  'instagram': { name: 'Instagram', library: 'lucide-react' },
  'tiktok': { name: 'Music', library: 'lucide-react' },
  'spotify': { name: 'Music', library: 'lucide-react' },
  'netflix': { name: 'Tv', library: 'lucide-react' },
  'uber': { name: 'Car', library: 'lucide-react' },
  'airbnb': { name: 'Home', library: 'lucide-react' },
  'shopify': { name: 'ShoppingBag', library: 'lucide-react' },
  'slack-logo': { name: 'Hash', library: 'lucide-react' },
  'zoom': { name: 'Video', library: 'lucide-react' },
  'skype': { name: 'Phone', library: 'lucide-react' },
  'telegram': { name: 'Send', library: 'lucide-react' },
  'whatsapp': { name: 'MessageCircle', library: 'lucide-react' },
  'signal': { name: 'Radio', library: 'lucide-react' },
  'figma-logo': { name: 'Figma', library: 'lucide-react' },
  'github-logo': { name: 'Github', library: 'lucide-react' },
  'gitlab': { name: 'GitBranch', library: 'lucide-react' },
  'bitbucket': { name: 'GitBranch', library: 'lucide-react' }
}

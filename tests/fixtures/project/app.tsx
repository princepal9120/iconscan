import { useState, createElement } from 'react'
import {
  Sun,
  Moon as Crescent,
  Trash2,
  Octagon,
  Icon,
} from 'lucide-react'
import DefaultIcon from './Icon'
import * as Icons from '@tabler/icons-react'
import Logo from './Logo'

const menu = [
  { icon: Sun, label: 'Light mode' },
  { icon: Crescent, label: 'Dark mode' },
]

export function App() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <DefaultIcon />
      <Icons.Foo />
      <Logo />
      <Trash2 onClick={() => setOpen(!open)} />
      {createElement(Icon)}
      {open && menu.map(item => <span key={item.label}>{item.label}</span>)}
    </div>
  )
}

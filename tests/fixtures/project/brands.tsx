import { FaTwitter } from 'react-icons/fa'
import { Twitter, X, ZoomIn, ZoomOut, Apple, Signal } from 'lucide-react'
import XLogo from './XLogo'
import GoogleIcon from './GoogleIcon'
import AwesomeWidget from './AwesomeWidget'
import { sendSlackMessage } from './slack'
import { BRAND } from './constants'

export function Socials() {
  sendSlackMessage()
  return (
    <div>
      <FaTwitter />
      <Twitter />
      <X />
      <ZoomIn />
      <ZoomOut />
      <Apple />
      <Signal />
      <XLogo />
      <GoogleIcon />
      <AwesomeWidget data-brand={BRAND} />
    </div>
  )
}

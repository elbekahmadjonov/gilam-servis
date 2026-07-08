import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SuperApp from './super/SuperApp.jsx'
import { startTranslit, isKiril } from './utils/translit'

// gilamadmin.qariya.uz → Super Admin panel; boshqa domenlar → mijoz ilovasi
const isSuper = typeof window !== 'undefined'
  && window.location.hostname.startsWith('gilamadmin')

// Super panel desktop — mobil 480px cheklovini olib tashlaymiz
if (isSuper) document.body.classList.add('super')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSuper ? <SuperApp /> : <App />}
  </StrictMode>,
)

// Kiril rejim yoqilgan bo'lsa — DOM ustida jonli transliteratsiya
if (isKiril()) startTranslit()

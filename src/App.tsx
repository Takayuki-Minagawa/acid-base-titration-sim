import './i18n'
import './index.css'
import { useState } from 'react'
import Header from './components/Header'
import ControlPanel from './components/ControlPanel'
import ExperimentView from './components/ExperimentView'
import TitrationCurve from './components/TitrationCurve'
import IonPanel from './components/IonPanel'
import LearningPanel from './components/LearningPanel'
import WelcomeBanner from './components/WelcomeBanner'
import Toasts from './components/Toasts'
import MobileDock from './components/MobileDock'
import { ThemeProvider } from './context/ThemeContext'
import { SimProvider } from './context/SimContext'
import { ProgressProvider } from './context/ProgressContext'

const WELCOME_KEY = 'titration-welcome-dismissed'

export default function App() {
  return (
    <ThemeProvider>
      <SimProvider>
        <ProgressProvider>
          <AppLayout />
        </ProgressProvider>
      </SimProvider>
    </ThemeProvider>
  )
}

function AppLayout() {
  // Note: no useSim() here, so the layout doesn't re-render on every simulation tick
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem(WELCOME_KEY) !== '1' } catch { return true }
  })

  const closeWelcome = () => {
    setShowWelcome(false)
    try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* storage unavailable */ }
  }

  const openWelcome = () => {
    setShowWelcome(true)
    // The banner sits at the top of the page: bring it into view and move focus to it
    requestAnimationFrame(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      document.getElementById('welcome-title')?.focus({ preventScroll: true })
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onHelp={openWelcome} />
      {showWelcome && (
        <div className="px-4 pt-4 mx-auto w-full" style={{ maxWidth: 1600 }}>
          <WelcomeBanner onClose={closeWelcome} />
        </div>
      )}
      <main className="flex-1 pt-4 layout-grid">
        <section className="panel-controls min-w-0">
          <ControlPanel />
        </section>
        <section id="experiment" className="panel-experiment min-w-0" style={{ scrollMarginTop: 'calc(var(--header-h, 72px) + 12px)' }}>
          <ExperimentView />
        </section>
        <section className="panel-curve min-w-0">
          <TitrationCurve />
        </section>
        <div className="panel-side">
          <section className="panel-ions min-w-0">
            <IonPanel />
          </section>
          <section className="panel-learning min-w-0">
            <LearningPanel />
          </section>
        </div>
      </main>
      <MobileDock />
      <Toasts />
    </div>
  )
}

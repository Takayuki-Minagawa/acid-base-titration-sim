import './i18n'
import './index.css'
import Header from './components/Header'
import ControlPanel from './components/ControlPanel'
import ExperimentView from './components/ExperimentView'
import TitrationCurve from './components/TitrationCurve'
import IonPanel from './components/IonPanel'
import LearningPanel from './components/LearningPanel'
import { ThemeProvider } from './context/ThemeContext'
import { SimProvider } from './context/SimContext'

export default function App() {
  return (
    <ThemeProvider>
      <SimProvider>
        <AppLayout />
      </SimProvider>
    </ThemeProvider>
  )
}

function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Header />
      <main className="flex-1 p-2 layout-grid">
        <section className="rounded-lg border overflow-auto panel-controls" style={{ borderColor: 'var(--color-border)' }}>
          <ControlPanel />
        </section>
        <section className="rounded-lg border overflow-hidden panel-experiment" style={{ borderColor: 'var(--color-border)', minHeight: '220px' }}>
          <ExperimentView />
        </section>
        <section className="rounded-lg border overflow-hidden panel-curve" style={{ borderColor: 'var(--color-border)' }}>
          <TitrationCurve />
        </section>
        <section className="rounded-lg border overflow-hidden panel-ions" style={{ borderColor: 'var(--color-border)' }}>
          <IonPanel />
        </section>
        <section className="rounded-lg border overflow-hidden panel-learning" style={{ borderColor: 'var(--color-border)' }}>
          <LearningPanel />
        </section>
      </main>
    </div>
  )
}

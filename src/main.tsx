import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router'
import { ContentGate } from './content/ContentProvider'
import { StepPreview } from './screens/StepPreview'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContentGate>
      <HashRouter>
        <Routes>
          <Route path="/" element={<StepPreview />} />
          <Route path="*" element={<StepPreview />} />
        </Routes>
      </HashRouter>
    </ContentGate>
  </StrictMode>,
)

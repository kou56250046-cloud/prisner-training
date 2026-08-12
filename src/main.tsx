import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router'
import { ContentGate } from './content/ContentProvider'
import { AnimLab } from './screens/AnimLab'
import { StepPreview } from './screens/StepPreview'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* アニメ確認用。関節角度データは暗号化対象外なので解錠不要 */}
        <Route path="/anim" element={<AnimLab />} />
        <Route
          path="*"
          element={
            <ContentGate>
              <StepPreview />
            </ContentGate>
          }
        />
      </Routes>
    </HashRouter>
  </StrictMode>,
)

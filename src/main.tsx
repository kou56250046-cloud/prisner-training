import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Outlet, Route, Routes } from 'react-router'
import { TabBar } from './components/TabBar'
import { ContentGate } from './content/ContentProvider'
import { AnimLab } from './screens/AnimLab'
import { Home } from './screens/Home'
import { Library } from './screens/Library'
import { Settings } from './screens/Settings'
import { Workout } from './screens/Workout'
import './index.css'

/** タブバー付きの通常画面。ワークアウト中はタブを出さず、集中を切らさない */
function Shell() {
  return (
    <div className="min-h-full">
      <Outlet />
      <TabBar />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* アニメ確認用。角度データは暗号化対象外なので解錠不要 */}
        <Route path="/anim" element={<AnimLab />} />

        <Route
          element={
            <ContentGate>
              <Outlet />
            </ContentGate>
          }
        >
          {/* ワークアウト実行中はタブバーを出さない */}
          <Route path="/workout" element={<Workout />} />

          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:chapterId" element={<Library />} />
            <Route path="/library/:chapterId/:stepNo" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)

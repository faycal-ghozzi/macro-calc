import { ReactNode } from 'react'
import BottomNav from './BottomNav'

interface LayoutProps {
  children: ReactNode
  title?: string
  headerRight?: ReactNode
}

export default function Layout({ children, title, headerRight }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {title && (
        <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 pt-safe">
          <div className="flex items-center justify-between h-14 max-w-lg mx-auto">
            <h1 className="text-lg font-bold text-white">{title}</h1>
            {headerRight && <div>{headerRight}</div>}
          </div>
        </header>
      )}
      <main className="max-w-lg mx-auto px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  )
}

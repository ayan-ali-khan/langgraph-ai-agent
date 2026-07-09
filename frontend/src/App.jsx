import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import LogInteractionPage from './pages/LogInteractionPage'
import InteractionsListPage from './pages/InteractionsListPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/log-interaction" replace />} />
        <Route path="/log-interaction" element={<LogInteractionPage />} />
        <Route path="/interactions" element={<InteractionsListPage />} />
      </Routes>
    </Layout>
  )
}

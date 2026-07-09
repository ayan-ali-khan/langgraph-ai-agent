import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchHCPs } from '../store/hcpSlice'
import { setActiveTab } from '../store/interactionSlice'
import InteractionForm from '../components/LogInteraction/InteractionForm'
import ChatInterface from '../components/LogInteraction/ChatInterface'
import styles from './LogInteractionPage.module.css'

export default function LogInteractionPage() {
  const dispatch = useDispatch()
  const { activeTab, selected, formMode } = useSelector((s) => s.interactions)

  useEffect(() => {
    dispatch(fetchHCPs())
  }, [dispatch])

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {formMode === 'edit' ? 'Edit Interaction' : 'Log Interaction'}
          </h1>
          <p className={styles.subtitle}>
            Capture HCP interactions via structured form or AI chat
          </p>
        </div>
        <div className={styles.aiBadge}>
          <span className={styles.sparkle}>✦</span>
          <span>Powered by Gemma2 · LangGraph</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'form' ? styles.tabActive : ''}`}
          onClick={() => dispatch(setActiveTab('form'))}
        >
          <span>📝</span>
          Structured Form
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => dispatch(setActiveTab('chat'))}
        >
          <span className={styles.aiTabIcon}>✦</span>
          AI Chat
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'form' ? (
          <InteractionForm />
        ) : (
          <ChatInterface />
        )}
      </div>
    </div>
  )
}

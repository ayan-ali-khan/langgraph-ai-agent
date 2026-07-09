import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchHCPs } from '../store/hcpSlice'
import InteractionForm from '../components/LogInteraction/InteractionForm'
import AISidePanel from '../components/LogInteraction/AISidePanel'
import styles from './LogInteractionPage.module.css'

export default function LogInteractionPage() {
  const dispatch = useDispatch()
  const { formMode } = useSelector((s) => s.interactions)

  useEffect(() => {
    dispatch(fetchHCPs())
  }, [dispatch])

  return (
    <div className={styles.page}>
      <div className={styles.splitLayout}>
        {/* Left: Structured Form */}
        <div className={styles.formPane}>
          <div className={styles.formPaneHeader}>
            <h1 className={styles.title}>
              {formMode === 'edit' ? 'Edit HCP Interaction' : 'Log HCP Interaction'}
            </h1>
          </div>
          <div className={styles.formPaneBody}>
            <InteractionForm />
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Right: AI Assistant Panel */}
        <div className={styles.aiPane}>
          <AISidePanel />
        </div>
      </div>
    </div>
  )
}

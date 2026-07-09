import React from 'react'
import styles from './ChatMessage.module.css'

const ACTION_LABELS = {
  log_interaction: '✓ Interaction Logged',
  edit_interaction: '✓ Interaction Updated',
  schedule_follow_up: '📅 Follow-up Scheduled',
  search_hcp_profile: '🔍 HCP Profile Retrieved',
  get_sales_insights: '📊 Insights Generated',
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const meta = message.meta || {}
  const action = meta.action_taken

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && (
        <div className={styles.avatar} aria-label="AI assistant">✦</div>
      )}
      <div className={styles.bubble}>
        <p className={styles.content}>{message.content}</p>
        {action && ACTION_LABELS[action] && (
          <div className={styles.actionTag}>
            {ACTION_LABELS[action]}
            {meta.interaction_id && (
              <span className={styles.idChip}>ID #{meta.interaction_id}</span>
            )}
          </div>
        )}
        {meta.error && (
          <div className={styles.errorTag}>⚠ Error occurred</div>
        )}
      </div>
      {isUser && (
        <div className={styles.userAvatar} aria-label="You">A</div>
      )}
    </div>
  )
}

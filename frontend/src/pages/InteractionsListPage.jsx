import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchInteractions, setSelected, deleteInteraction } from '../store/interactionSlice'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import styles from './InteractionsListPage.module.css'

const TYPE_ICONS = {
  face_to_face: '🤝',
  phone_call: '📞',
  virtual_meeting: '💻',
  email: '📧',
  conference: '🏛️',
}

const SENTIMENT_COLOR = (score) => {
  if (score >= 0.65) return styles.sentimentPos
  if (score >= 0.4) return styles.sentimentNeu
  return styles.sentimentNeg
}

export default function InteractionsListPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, loading } = useSelector((s) => s.interactions)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    dispatch(fetchInteractions())
  }, [dispatch])

  const handleEdit = (interaction) => {
    dispatch(setSelected(interaction))
    navigate('/log-interaction')
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this interaction?')) {
      dispatch(deleteInteraction(id))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Interactions</h1>
        <span className={styles.count}>{list.length} records</span>
      </div>

      {loading && <div className={styles.loading}>Loading interactions…</div>}

      {!loading && list.length === 0 && (
        <div className={styles.empty}>
          <span>📋</span>
          <p>No interactions logged yet. Go to <strong>Log Interaction</strong> to get started.</p>
        </div>
      )}

      <div className={styles.list}>
        {list.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
              <div className={styles.cardLeft}>
                <span className={styles.typeIcon}>{TYPE_ICONS[item.interaction_type] || '📋'}</span>
                <div>
                  <div className={styles.hcpName}>{item.hcp?.name || `HCP #${item.hcp_id}`}</div>
                  <div className={styles.meta}>
                    <span>{item.hcp?.specialty}</span>
                    <span>·</span>
                    <span>{item.interaction_type?.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>{item.interaction_date ? format(new Date(item.interaction_date), 'MMM d, yyyy') : '—'}</span>
                    {item.duration_minutes && <><span>·</span><span>{item.duration_minutes} min</span></>}
                  </div>
                </div>
              </div>
              <div className={styles.cardRight}>
                {item.sentiment_score != null && (
                  <span className={`${styles.sentiment} ${SENTIMENT_COLOR(item.sentiment_score)}`}>
                    {item.sentiment_score >= 0.65 ? '↑' : item.sentiment_score >= 0.4 ? '→' : '↓'}
                    {' '}{Math.round(item.sentiment_score * 100)}%
                  </span>
                )}
                <span className={`${styles.status} ${styles['status_' + item.status]}`}>
                  {item.status?.replace(/_/g, ' ')}
                </span>
                <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); handleEdit(item) }}>Edit</button>
                <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}>✕</button>
                <span className={styles.chevron}>{expanded === item.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expanded === item.id && (
              <div className={styles.cardBody}>
                {item.ai_summary && (
                  <div className={styles.aiSummary}>
                    <div className={styles.aiSummaryLabel}>✦ AI Summary</div>
                    <p>{item.ai_summary}</p>
                  </div>
                )}
                {item.products_discussed?.length > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Products</span>
                    <div className={styles.tags}>
                      {item.products_discussed.map((p, i) => <span key={i} className={styles.tag}>{p}</span>)}
                    </div>
                  </div>
                )}
                {item.objections_raised?.length > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Objections</span>
                    <div className={styles.tags}>
                      {item.objections_raised.map((o, i) => <span key={i} className={`${styles.tag} ${styles.tagWarn}`}>{o}</span>)}
                    </div>
                  </div>
                )}
                {item.next_steps && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Next Steps</span>
                    <span className={styles.detailVal}>{item.next_steps}</span>
                  </div>
                )}
                {item.raw_notes && (
                  <div className={styles.notes}>
                    <span className={styles.detailLabel}>Notes</span>
                    <p>{item.raw_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

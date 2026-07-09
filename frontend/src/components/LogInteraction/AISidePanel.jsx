import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { sendAgentMessage, addUserMessage, clearChat } from '../../store/agentSlice'
import { fetchInteractions } from '../../store/interactionSlice'
import styles from './AISidePanel.module.css'

export default function AISidePanel() {
  const dispatch = useDispatch()
  const { messages, loading } = useSelector((s) => s.agent)
  const { selectedHcpId } = useSelector((s) => s.hcps)
  const { selected } = useSelector((s) => s.interactions)
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    dispatch(addUserMessage(msg))
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    await dispatch(sendAgentMessage({
      message: msg,
      conversationHistory: history,
      hcpId: selectedHcpId,
      interactionId: selected?.id,
    }))
    dispatch(fetchInteractions())
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.botIcon}>🤖</span>
          <div>
            <div className={styles.headerName}>AI Assistant</div>
            <div className={styles.headerSub}>Log Interaction details here via chat</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={() => dispatch(clearChat())} title="Clear chat">
            ↺
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {/* Welcome bubble — always shown when empty */}
        {messages.length === 0 && (
          <div className={styles.welcomeBubble}>
            Log interaction details here (e.g., "Met Dr. Smith, discussed
            Prodo-X efficacy, positive sentiment, shared brochure") or ask
            for help.
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.message} ${msg.role === 'user' ? styles.msgUser : styles.msgAssistant}`}
          >
            <div className={styles.bubble}>
              {msg.content}
            </div>
            {msg.meta?.action_taken && (
              <div className={styles.actionChip}>
                {ACTION_LABELS[msg.meta.action_taken] || msg.meta.action_taken}
                {msg.meta.interaction_id && (
                  <span className={styles.idBadge}>#{msg.meta.interaction_id}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className={styles.typingRow}>
            <div className={styles.typingDots}>
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className={styles.input}
          placeholder="Describe Interaction..."
          rows={2}
          disabled={loading}
        />
        <button
          className={styles.sendBtn}
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          aria-label="Log"
        >
          {loading ? <span className={styles.spinner} /> : (
            <>
              <span className={styles.sendIcon}>A</span>
              <span className={styles.sendLabel}>Log</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const ACTION_LABELS = {
  log_interaction: '✓ Interaction Logged',
  edit_interaction: '✓ Interaction Updated',
  schedule_follow_up: '📅 Follow-up Scheduled',
  search_hcp_profile: '🔍 HCP Profile Retrieved',
  get_sales_insights: '📊 Insights Generated',
}

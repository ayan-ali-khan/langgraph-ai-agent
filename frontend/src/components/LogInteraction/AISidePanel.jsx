import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { sendAgentMessage, addUserMessage, clearChat } from '../../store/agentSlice'
import { prefillForm } from '../../store/interactionSlice'
import styles from './AISidePanel.module.css'

const ACTION_LABELS = {
  edit_interaction: '✓ Interaction Updated',
  schedule_follow_up: '📅 Follow-up Scheduled',
  search_hcp_profile: '🔍 HCP Profile Retrieved',
  get_sales_insights: '📊 Insights Generated',
}

export default function AISidePanel() {
  const dispatch = useDispatch()
  const { messages, loading } = useSelector((s) => s.agent)
  const { selectedHcpId } = useSelector((s) => s.hcps)
  const { selected } = useSelector((s) => s.interactions)
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    dispatch(addUserMessage(msg))
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    const result = await dispatch(sendAgentMessage({
      message: msg,
      conversationHistory: history,
      hcpId: selectedHcpId,
      interactionId: selected?.id,
    }))

    // If agent wants to pre-fill the form, push the data to the form slice
    const payload = result?.payload
    if (payload?.prefill_form && payload?.interaction_data) {
      dispatch(prefillForm(payload.interaction_data))
    }
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
          <button
            className={styles.clearBtn}
            onClick={() => dispatch(clearChat())}
            title="Clear chat"
          >
            ↺
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.welcomeBubble}>
            Log interaction details here (e.g., "Met Dr. Sarah Chen, discussed
            OncoClear efficacy, positive sentiment, shared brochure") or ask
            for help.
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} msg={msg} />
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
          aria-label="Send"
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
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

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const meta = msg.meta || {}
  const isPrefill = !isUser && meta.action_taken === 'log_interaction' && meta.prefill_form === true

  return (
    <div className={`${styles.message} ${isUser ? styles.msgUser : styles.msgAssistant}`}>
      <div
        className={styles.bubble}
        dangerouslySetInnerHTML={{
          __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
        }}
      />

      {/* Pre-fill confirmation chip */}
      {isPrefill && (
        <div className={styles.prefillChip}>
          <span className={styles.prefillIcon}>✦</span>
          Form pre-filled — review &amp; click <strong>Log Interaction</strong> to save
          <span className={styles.arrowHint}>←</span>
        </div>
      )}

      {/* Other action chips */}
      {!isUser && !isPrefill && meta.action_taken && ACTION_LABELS[meta.action_taken] && (
        <div className={styles.actionChip}>
          {ACTION_LABELS[meta.action_taken]}
          {meta.interaction_id && (
            <span className={styles.idBadge}>#{meta.interaction_id}</span>
          )}
        </div>
      )}
    </div>
  )
}

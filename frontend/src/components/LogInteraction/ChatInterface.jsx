import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { sendAgentMessage, addUserMessage, clearChat } from '../../store/agentSlice'
import { fetchInteractions } from '../../store/interactionSlice'
import ChatMessage from './ChatMessage'
import styles from './ChatInterface.module.css'

const SUGGESTIONS = [
  'I just visited Dr. Sarah Chen at Mass General. We discussed OncoClear dosing and she had concerns about the side effect profile.',
  'Log a 30-min phone call with Dr. Patel about CardioPlus efficacy data. He seemed interested.',
  'What are Dr. Wong\'s recent interactions and prescribing potential?',
  'Schedule a follow-up with Dr. Chen for next week to share the Phase III data.',
]

export default function ChatInterface() {
  const dispatch = useDispatch()
  const { messages, loading } = useSelector((s) => s.agent)
  const { selectedHcpId } = useSelector((s) => s.hcps)
  const { selected } = useSelector((s) => s.interactions)
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

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

    // Refresh interactions list after logging
    dispatch(fetchInteractions())
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.container}>
      {/* Welcome state */}
      {messages.length === 0 && (
        <div className={styles.welcome}>
          <div className={styles.welcomeIcon}>✦</div>
          <h2 className={styles.welcomeTitle}>AI Interaction Assistant</h2>
          <p className={styles.welcomeSubtitle}>
            Describe your HCP interaction naturally — I'll extract the details,
            log it, and suggest next steps.
          </p>
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className={styles.suggestion} onClick={() => handleSend(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className={styles.messages}>
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          {loading && (
            <div className={styles.typingIndicator}>
              <div className={styles.typingDots}>
                <span /><span /><span />
              </div>
              <span className={styles.typingText}>AI Agent is thinking…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={() => dispatch(clearChat())} title="Clear chat">
            ↺ New chat
          </button>
        )}
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            className={styles.input}
            placeholder="Describe your interaction with the HCP, or ask me to search, log, or edit…"
            rows={2}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            {loading ? <span className={styles.spinner} /> : '↑'}
          </button>
        </div>
        <p className={styles.hint}>Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

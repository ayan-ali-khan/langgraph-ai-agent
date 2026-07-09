import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../services/api'

export const sendAgentMessage = createAsyncThunk(
  'agent/sendMessage',
  async ({ message, conversationHistory, hcpId, interactionId }) => {
    const res = await api.post('/agent/chat', {
      message,
      conversation_history: conversationHistory,
      hcp_id: hcpId || null,
      interaction_id: interactionId || null,
    })
    return res.data
  }
)

const agentSlice = createSlice({
  name: 'agent',
  initialState: {
    messages: [], // { role: 'user'|'assistant', content: string, meta?: object }
    loading: false,
    error: null,
    lastAction: null,
    lastInteractionId: null,
  },
  reducers: {
    addUserMessage(state, action) {
      state.messages.push({ role: 'user', content: action.payload })
    },
    clearChat(state) {
      state.messages = []
      state.lastAction = null
      state.lastInteractionId = null
      state.error = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendAgentMessage.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(sendAgentMessage.fulfilled, (state, action) => {
        state.loading = false
        state.messages.push({
          role: 'assistant',
          content: action.payload.message,
          meta: {
            action_taken: action.payload.action_taken,
            interaction_id: action.payload.interaction_id,
            interaction_data: action.payload.interaction_data,
          },
        })
        state.lastAction = action.payload.action_taken
        state.lastInteractionId = action.payload.interaction_id
      })
      .addCase(sendAgentMessage.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
        state.messages.push({
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          meta: { error: true },
        })
      })
  },
})

export const { addUserMessage, clearChat, clearError } = agentSlice.actions
export default agentSlice.reducer

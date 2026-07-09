import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../services/api'

export const fetchInteractions = createAsyncThunk(
  'interactions/fetchAll',
  async (params = {}) => {
    const res = await api.get('/interactions/', { params })
    return res.data
  }
)

export const createInteraction = createAsyncThunk(
  'interactions/create',
  async (payload) => {
    const res = await api.post('/interactions/', payload)
    return res.data
  }
)

export const updateInteraction = createAsyncThunk(
  'interactions/update',
  async ({ id, data }) => {
    const res = await api.patch(`/interactions/${id}`, data)
    return res.data
  }
)

export const deleteInteraction = createAsyncThunk(
  'interactions/delete',
  async (id) => {
    await api.delete(`/interactions/${id}`)
    return id
  }
)

const interactionSlice = createSlice({
  name: 'interactions',
  initialState: {
    list: [],
    selected: null,
    loading: false,
    error: null,
    formMode: 'create', // 'create' | 'edit'
    activeTab: 'form',  // 'form' | 'chat'
  },
  reducers: {
    setSelected(state, action) {
      state.selected = action.payload
      state.formMode = action.payload ? 'edit' : 'create'
    },
    setActiveTab(state, action) {
      state.activeTab = action.payload
    },
    clearSelected(state) {
      state.selected = null
      state.formMode = 'create'
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => { state.loading = true })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
        state.selected = action.payload
      })
      .addCase(updateInteraction.fulfilled, (state, action) => {
        const idx = state.list.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
        state.selected = action.payload
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.list = state.list.filter((i) => i.id !== action.payload)
        if (state.selected?.id === action.payload) state.selected = null
      })
  },
})

export const { setSelected, setActiveTab, clearSelected, clearError } = interactionSlice.actions
export default interactionSlice.reducer

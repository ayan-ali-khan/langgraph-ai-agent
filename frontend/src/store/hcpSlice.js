import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../services/api'

export const fetchHCPs = createAsyncThunk('hcps/fetchAll', async (params = {}) => {
  const res = await api.get('/hcps/', { params })
  return res.data
})

const hcpSlice = createSlice({
  name: 'hcps',
  initialState: {
    list: [],
    loading: false,
    error: null,
    selectedHcpId: null,
  },
  reducers: {
    setSelectedHcp(state, action) {
      state.selectedHcpId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHCPs.pending, (state) => { state.loading = true })
      .addCase(fetchHCPs.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchHCPs.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
  },
})

export const { setSelectedHcp } = hcpSlice.actions
export default hcpSlice.reducer

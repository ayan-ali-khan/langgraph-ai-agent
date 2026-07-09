import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createInteraction, updateInteraction, clearSelected } from '../../store/interactionSlice'
import styles from './InteractionForm.module.css'

const INTERACTION_TYPES = [
  { value: 'face_to_face', label: 'Face-to-Face Visit' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'virtual_meeting', label: 'Virtual Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'conference', label: 'Conference' },
  { value: 'meeting', label: 'Meeting' },
]

const PRODUCT_OPTIONS = [
  'PharmaX 10mg', 'CardioPlus', 'OncoClear', 'NeuroShield', 'RheumaFlex',
  'BioMed 5mg', 'OncoShield Pro',
]

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'draft', label: 'Draft' },
  { value: 'follow_up_required', label: 'Follow-Up Required' },
]

const emptyForm = {
  hcp_id: '',
  interaction_type: 'face_to_face',
  interaction_date: new Date().toISOString().slice(0, 10),
  interaction_time: new Date().toTimeString().slice(0, 5),
  attendees: '',
  topics_discussed: '',
  products_discussed: [],
  raw_notes: '',
  next_steps: '',
  follow_up_date: '',
  samples_provided: [],
  objections_raised: [],
  status: 'completed',
}

export default function InteractionForm() {
  const dispatch = useDispatch()
  const { selected, formMode } = useSelector((s) => s.interactions)
  const { list: hcps } = useSelector((s) => s.hcps)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [materialInput, setMaterialInput] = useState('')
  const [materialsList, setMaterialsList] = useState([])
  const [objectionInput, setObjectionInput] = useState('')
  const [hcpSearch, setHcpSearch] = useState('')
  const [showHcpDropdown, setShowHcpDropdown] = useState(false)

  useEffect(() => {
    if (selected && formMode === 'edit') {
      const d = new Date(selected.interaction_date)
      setForm({
        hcp_id: selected.hcp_id || '',
        interaction_type: selected.interaction_type || 'face_to_face',
        interaction_date: d.toISOString().slice(0, 10),
        interaction_time: d.toTimeString().slice(0, 5),
        attendees: '',
        topics_discussed: selected.topics_covered?.join(', ') || '',
        products_discussed: selected.products_discussed || [],
        raw_notes: selected.raw_notes || '',
        next_steps: selected.next_steps || '',
        follow_up_date: selected.follow_up_date
          ? new Date(selected.follow_up_date).toISOString().slice(0, 10)
          : '',
        samples_provided: selected.samples_provided || [],
        objections_raised: selected.objections_raised || [],
        status: selected.status || 'completed',
      })
      const hcp = hcps.find((h) => h.id === selected.hcp_id)
      if (hcp) setHcpSearch(hcp.name)
      setMaterialsList(selected.samples_provided || [])
    } else {
      setForm(emptyForm)
      setHcpSearch('')
      setMaterialsList([])
    }
  }, [selected, formMode, hcps])

  const filteredHcps = hcps.filter((h) =>
    h.name.toLowerCase().includes(hcpSearch.toLowerCase())
  )

  const selectHcp = (hcp) => {
    setForm((f) => ({ ...f, hcp_id: hcp.id }))
    setHcpSearch(hcp.name)
    setShowHcpDropdown(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const toggleProduct = (product) => {
    setForm((f) => ({
      ...f,
      products_discussed: f.products_discussed.includes(product)
        ? f.products_discussed.filter((p) => p !== product)
        : [...f.products_discussed, product],
    }))
  }

  const addMaterial = () => {
    if (!materialInput.trim()) return
    const updated = [...materialsList, materialInput.trim()]
    setMaterialsList(updated)
    setForm((f) => ({ ...f, samples_provided: updated }))
    setMaterialInput('')
  }

  const removeMaterial = (i) => {
    const updated = materialsList.filter((_, idx) => idx !== i)
    setMaterialsList(updated)
    setForm((f) => ({ ...f, samples_provided: updated }))
  }

  const addObjection = () => {
    if (!objectionInput.trim()) return
    setForm((f) => ({ ...f, objections_raised: [...f.objections_raised, objectionInput.trim()] }))
    setObjectionInput('')
  }

  const removeObjection = (i) => {
    setForm((f) => ({ ...f, objections_raised: f.objections_raised.filter((_, idx) => idx !== i) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.hcp_id) return
    setSaving(true)
    setSuccess(false)
    try {
      const dateTime = `${form.interaction_date}T${form.interaction_time || '09:00'}:00`
      const payload = {
        hcp_id: parseInt(form.hcp_id),
        rep_id: 1,
        interaction_type: form.interaction_type,
        interaction_date: new Date(dateTime).toISOString(),
        topics_covered: form.topics_discussed
          ? form.topics_discussed.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        products_discussed: form.products_discussed,
        raw_notes: form.raw_notes,
        next_steps: form.next_steps,
        follow_up_date: form.follow_up_date
          ? new Date(form.follow_up_date).toISOString()
          : null,
        samples_provided: materialsList,
        objections_raised: form.objections_raised,
        status: form.status,
      }
      if (formMode === 'edit' && selected) {
        await dispatch(updateInteraction({ id: selected.id, data: payload })).unwrap()
      } else {
        await dispatch(createInteraction(payload)).unwrap()
      }
      setSuccess(true)
      if (formMode === 'create') {
        setForm(emptyForm)
        setHcpSearch('')
        setMaterialsList([])
      }
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>

      {/* Section: Interaction Details */}
      <div className={styles.sectionLabel}>Interaction Details</div>

      {/* Row 1: HCP Name + Interaction Type */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>HCP Name</label>
          <div className={styles.hcpWrapper}>
            <input
              type="text"
              value={hcpSearch}
              onChange={(e) => { setHcpSearch(e.target.value); setShowHcpDropdown(true) }}
              onFocus={() => setShowHcpDropdown(true)}
              onBlur={() => setTimeout(() => setShowHcpDropdown(false), 150)}
              className={styles.input}
              placeholder="Search or select HCP..."
              autoComplete="off"
            />
            {showHcpDropdown && filteredHcps.length > 0 && (
              <div className={styles.dropdown}>
                {filteredHcps.slice(0, 8).map((h) => (
                  <button
                    type="button"
                    key={h.id}
                    className={styles.dropdownItem}
                    onMouseDown={() => selectHcp(h)}
                  >
                    <span className={styles.dropdownName}>{h.name}</span>
                    <span className={styles.dropdownMeta}>{h.specialty}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Interaction Type</label>
          <select
            name="interaction_type"
            value={form.interaction_type}
            onChange={handleChange}
            className={styles.select}
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Date + Time */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            name="interaction_date"
            value={form.interaction_date}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Time</label>
          <input
            type="time"
            name="interaction_time"
            value={form.interaction_time}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Attendees */}
      <div className={styles.field}>
        <label className={styles.label}>Attendees</label>
        <input
          type="text"
          name="attendees"
          value={form.attendees}
          onChange={handleChange}
          className={styles.input}
          placeholder="Enter names or search..."
        />
      </div>

      {/* Topics Discussed */}
      <div className={styles.field}>
        <label className={styles.label}>Topics Discussed</label>
        <textarea
          name="topics_discussed"
          value={form.topics_discussed}
          onChange={handleChange}
          className={styles.textarea}
          rows={4}
          placeholder="Enter key discussion points..."
        />
        <button type="button" className={styles.voiceBtn}>
          <span>🎤</span> Summarize from Voice Note (Requires Consent)
        </button>
      </div>

      {/* Materials / Samples */}
      <div className={styles.sectionLabel}>Materials Shared / Samples Distributed</div>
      <div className={styles.field}>
        <label className={styles.label}>Materials Shared</label>
        {materialsList.length === 0 ? (
          <p className={styles.emptyText}>No materials added.</p>
        ) : (
          <div className={styles.tagList}>
            {materialsList.map((m, i) => (
              <span key={i} className={styles.tag}>
                {m}
                <button type="button" onClick={() => removeMaterial(i)} className={styles.tagClose}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className={styles.inlineAdd}>
          <input
            value={materialInput}
            onChange={(e) => setMaterialInput(e.target.value)}
            className={styles.input}
            placeholder="Add material or sample..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaterial() } }}
          />
          <button type="button" className={styles.searchAddBtn} onClick={addMaterial}>
            <span>🔍</span> Search/Add
          </button>
        </div>
      </div>

      {/* Products Discussed */}
      <div className={styles.field}>
        <label className={styles.label}>Products Discussed</label>
        <div className={styles.chipGroup}>
          {PRODUCT_OPTIONS.map((p) => (
            <button
              type="button"
              key={p}
              className={`${styles.chip} ${form.products_discussed.includes(p) ? styles.chipActive : ''}`}
              onClick={() => toggleProduct(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Objections */}
      <div className={styles.field}>
        <label className={styles.label}>Objections / Concerns Raised</label>
        <div className={styles.inlineAdd}>
          <input
            value={objectionInput}
            onChange={(e) => setObjectionInput(e.target.value)}
            className={styles.input}
            placeholder="Add an objection or concern..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addObjection() } }}
          />
          <button type="button" className={styles.searchAddBtn} onClick={addObjection}>
            Add
          </button>
        </div>
        {form.objections_raised.length > 0 && (
          <div className={styles.tagList}>
            {form.objections_raised.map((o, i) => (
              <span key={i} className={`${styles.tag} ${styles.tagWarn}`}>
                {o}
                <button type="button" onClick={() => removeObjection(i)} className={styles.tagClose}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label className={styles.label}>
          Interaction Notes
          <span className={styles.aiHint}>✦ AI auto-summarizes</span>
        </label>
        <textarea
          name="raw_notes"
          value={form.raw_notes}
          onChange={handleChange}
          className={styles.textarea}
          rows={4}
          placeholder="Additional notes about the interaction..."
        />
      </div>

      {/* Next Steps + Follow-up */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Next Steps</label>
          <input
            name="next_steps"
            value={form.next_steps}
            onChange={handleChange}
            className={styles.input}
            placeholder="Agreed next steps..."
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Follow-Up Date</label>
          <input
            type="date"
            name="follow_up_date"
            value={form.follow_up_date}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Status */}
      <div className={styles.field}>
        <label className={styles.label}>Status</label>
        <select name="status" value={form.status} onChange={handleChange} className={styles.select}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {formMode === 'edit' && (
          <button type="button" className={styles.cancelBtn} onClick={() => dispatch(clearSelected())}>
            Cancel
          </button>
        )}
        <button type="submit" className={styles.submitBtn} disabled={saving || !form.hcp_id}>
          {saving ? (
            <><span className={styles.spinner} /> Saving…</>
          ) : success ? (
            <>✓ {formMode === 'edit' ? 'Updated' : 'Logged'}</>
          ) : (
            formMode === 'edit' ? 'Update Interaction' : 'Log Interaction'
          )}
        </button>
      </div>

      {success && (
        <div className={styles.successBanner}>
          ✓ Interaction {formMode === 'edit' ? 'updated' : 'logged'} — AI enrichment applied.
        </div>
      )}
    </form>
  )
}

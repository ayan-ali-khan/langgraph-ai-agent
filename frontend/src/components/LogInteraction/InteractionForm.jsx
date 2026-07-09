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
]

const PRODUCT_OPTIONS = ['PharmaX 10mg', 'CardioPlus', 'OncoClear', 'NeuroShield', 'RheumaFlex']
const TOPIC_OPTIONS = ['Efficacy Data', 'Safety Profile', 'Dosing', 'Patient Cases', 'Clinical Study', 'Competitor', 'Formulary']

const emptyForm = {
  hcp_id: '',
  interaction_type: 'face_to_face',
  interaction_date: new Date().toISOString().slice(0, 16),
  duration_minutes: '',
  products_discussed: [],
  topics_covered: [],
  raw_notes: '',
  next_steps: '',
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
  const [objectionInput, setObjectionInput] = useState('')
  const [sampleInput, setSampleInput] = useState('')

  useEffect(() => {
    if (selected && formMode === 'edit') {
      setForm({
        hcp_id: selected.hcp_id || '',
        interaction_type: selected.interaction_type || 'face_to_face',
        interaction_date: selected.interaction_date
          ? new Date(selected.interaction_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        duration_minutes: selected.duration_minutes || '',
        products_discussed: selected.products_discussed || [],
        topics_covered: selected.topics_covered || [],
        raw_notes: selected.raw_notes || '',
        next_steps: selected.next_steps || '',
        samples_provided: selected.samples_provided || [],
        objections_raised: selected.objections_raised || [],
        status: selected.status || 'completed',
      })
    } else {
      setForm(emptyForm)
    }
  }, [selected, formMode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const toggleArrayItem = (field, value) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }))
  }

  const addFreeText = (field, value, clearFn) => {
    if (!value.trim()) return
    setForm((f) => ({ ...f, [field]: [...f[field], value.trim()] }))
    clearFn('')
  }

  const removeItem = (field, idx) => {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    try {
      const payload = {
        ...form,
        hcp_id: parseInt(form.hcp_id),
        rep_id: 1,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        interaction_date: new Date(form.interaction_date).toISOString(),
      }
      if (formMode === 'edit' && selected) {
        await dispatch(updateInteraction({ id: selected.id, data: payload })).unwrap()
      } else {
        await dispatch(createInteraction(payload)).unwrap()
      }
      setSuccess(true)
      if (formMode === 'create') setForm(emptyForm)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Row 1: HCP + Type */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Healthcare Professional *</label>
          <select name="hcp_id" value={form.hcp_id} onChange={handleChange} className={styles.select} required>
            <option value="">Select HCP…</option>
            {hcps.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {h.specialty}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Interaction Type *</label>
          <select name="interaction_type" value={form.interaction_type} onChange={handleChange} className={styles.select}>
            {INTERACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Date + Duration + Status */}
      <div className={styles.row3}>
        <div className={styles.field}>
          <label className={styles.label}>Date & Time *</label>
          <input type="datetime-local" name="interaction_date" value={form.interaction_date} onChange={handleChange} className={styles.input} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Duration (min)</label>
          <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} className={styles.input} placeholder="e.g. 30" min="1" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select name="status" value={form.status} onChange={handleChange} className={styles.select}>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="follow_up_required">Follow-Up Required</option>
          </select>
        </div>
      </div>

      {/* Products */}
      <div className={styles.field}>
        <label className={styles.label}>Products Discussed</label>
        <div className={styles.chipGroup}>
          {PRODUCT_OPTIONS.map((p) => (
            <button type="button" key={p}
              className={`${styles.chip} ${form.products_discussed.includes(p) ? styles.chipActive : ''}`}
              onClick={() => toggleArrayItem('products_discussed', p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className={styles.field}>
        <label className={styles.label}>Topics Covered</label>
        <div className={styles.chipGroup}>
          {TOPIC_OPTIONS.map((t) => (
            <button type="button" key={t}
              className={`${styles.chip} ${form.topics_covered.includes(t) ? styles.chipActive : ''}`}
              onClick={() => toggleArrayItem('topics_covered', t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Samples */}
      <div className={styles.field}>
        <label className={styles.label}>Samples Provided</label>
        <div className={styles.inlineAdd}>
          <input value={sampleInput} onChange={(e) => setSampleInput(e.target.value)}
            className={styles.input} placeholder="Add sample…"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFreeText('samples_provided', sampleInput, setSampleInput) } }} />
          <button type="button" className={styles.addBtn} onClick={() => addFreeText('samples_provided', sampleInput, setSampleInput)}>Add</button>
        </div>
        <div className={styles.tagList}>
          {form.samples_provided.map((s, i) => (
            <span key={i} className={styles.tag}>{s}<button type="button" onClick={() => removeItem('samples_provided', i)}>×</button></span>
          ))}
        </div>
      </div>

      {/* Objections */}
      <div className={styles.field}>
        <label className={styles.label}>Objections / Concerns Raised</label>
        <div className={styles.inlineAdd}>
          <input value={objectionInput} onChange={(e) => setObjectionInput(e.target.value)}
            className={styles.input} placeholder="Add objection…"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFreeText('objections_raised', objectionInput, setObjectionInput) } }} />
          <button type="button" className={styles.addBtn} onClick={() => addFreeText('objections_raised', objectionInput, setObjectionInput)}>Add</button>
        </div>
        <div className={styles.tagList}>
          {form.objections_raised.map((o, i) => (
            <span key={i} className={`${styles.tag} ${styles.tagWarning}`}>{o}<button type="button" onClick={() => removeItem('objections_raised', i)}>×</button></span>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label className={styles.label}>
          Interaction Notes
          <span className={styles.aiHint}>✦ AI will auto-summarize & extract entities</span>
        </label>
        <textarea name="raw_notes" value={form.raw_notes} onChange={handleChange}
          className={styles.textarea} rows={5}
          placeholder="Describe the interaction in your own words. Include key discussion points, HCP feedback, clinical questions, competitor mentions, etc." />
      </div>

      {/* Next Steps */}
      <div className={styles.field}>
        <label className={styles.label}>Next Steps</label>
        <input name="next_steps" value={form.next_steps} onChange={handleChange}
          className={styles.input} placeholder="e.g. Send Phase III study data, schedule follow-up call" />
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
            <><span>✓</span> {formMode === 'edit' ? 'Updated' : 'Logged'}</>
          ) : (
            formMode === 'edit' ? 'Update Interaction' : 'Log Interaction'
          )}
        </button>
      </div>

      {success && (
        <div className={styles.successBanner}>
          ✓ Interaction {formMode === 'edit' ? 'updated' : 'logged'} successfully. AI enrichment applied.
        </div>
      )}
    </form>
  )
}

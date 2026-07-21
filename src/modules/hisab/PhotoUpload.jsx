/**
 * PhotoUpload — tap 📷 to upload a khata/kharcha photo. The image is compressed
 * on-device and queued in the cloud (apps/hisab/uploads, status 'pending'). When
 * Claude's system is running it reads the photo, adds the entries, and deletes
 * the upload — so every open tab/device updates automatically (realtime).
 */
import { useRef, useState } from 'react'
import { Card } from '../../core/ui'
import { dmy } from './logic'

// Downscale + JPEG-compress so the image fits inside a Firestore doc (<1MB).
async function compress(file, maxDim = 1280) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file)
  })
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl
  })
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d').drawImage(img, 0, 0, w, h)
  let q = 0.6, out = c.toDataURL('image/jpeg', q)
  while (out.length > 900_000 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/jpeg', q) }
  return out
}

export default function PhotoUpload({ uploads, kind = 'expense' }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const pending = (uploads.list || []).filter((u) => u.status !== 'done')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  const pick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true)
    try {
      const image = await compress(file)
      await uploads.insert({ kind, note: note.trim(), image, status: 'pending' }).saved
      setNote('')
    } catch (err) { alert('Upload failed: ' + err.message) }
    setBusy(false); e.target.value = ''
  }

  return (
    <Card className="p-4 space-y-2 border-2 border-[#1f5f7a]/20">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">📷 Upload a diary / khata photo</div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional): kharcha page, supplier name…"
        className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        className="w-full py-3 rounded-2xl bg-[#1f5f7a] text-white font-bold active:scale-95 transition disabled:opacity-60">
        {busy ? 'Uploading…' : '📷 Take / choose photo'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
      <p className="text-[11px] text-slate-400">Claude reads it and adds the entries when the system is online — they then appear here automatically.</p>

      {pending.length > 0 && (
        <div className="pt-1 space-y-1.5">
          {pending.map((u) => (
            <div key={u.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {u.image && <img src={u.image} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-800">⏳ Waiting to be read</div>
                <div className="text-[11px] text-amber-700 truncate">{u.note || 'photo'} · {dmy((u.createdAt || '').slice(0, 10))}</div>
              </div>
              <button onClick={() => { if (confirm('Remove this pending photo?')) uploads.remove(u.id) }} className="text-amber-400 text-lg px-1">×</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

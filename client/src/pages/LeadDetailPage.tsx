import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import type { Lead } from '../types';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isManager } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [error, setError] = useState('');
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.get(`/leads/${id}`);
        setLead(res.data.lead); setEditForm(res.data.lead);
        if (isManager) { const repsRes = await api.get('/users/reps'); setReps(repsRes.data.reps); }
      } catch (err: any) {
        if (err.response?.status === 403) setError('You do not have permission to view this record.');
        else if (err.response?.status === 404) setError('Record not found.');
        else setError('Failed to load profile.');
      } finally { setLoading(false); }
    }
    fetch();
  }, [id, isManager]);

  const handleSave = async () => {
    try {
      const res = await api.put(`/leads/${id}`, { companyName: editForm.companyName, contactName: editForm.contactName, contactEmail: editForm.contactEmail, contactPhone: editForm.contactPhone || null, source: editForm.source, status: editForm.status, notes: editForm.notes || null, ...(isManager && editForm.assignedTo !== lead?.assignedTo ? { assignedTo: editForm.assignedTo } : {}) });
      setLead(res.data.lead); setEditing(false);
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to update'); }
  };

  const handleConvert = async () => {
    setConverting(true); setConvertError('');
    try { await api.post(`/leads/${id}/convert`); const res = await api.get(`/leads/${id}`); setLead(res.data.lead); }
    catch (err: any) { setConvertError(err.response?.data?.error || 'Conversion failed'); }
    finally { setConverting(false); }
  };

  if (loading) return <div className="p-12 text-stone text-sm">Loading record...</div>;
  if (error && !lead) return <div className="p-12 text-signal-negative text-sm">{error}</div>;
  if (!lead) return null;

  return (
    <div className="fade-in w-full pb-20 space-y-12">
      <div className="border-b border-hairline pb-8">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/leads" className="text-stone hover:text-charcoal text-[10px] uppercase tracking-widest transition-colors font-semibold">Prospects</Link>
          <span className="text-stone text-xs">/</span>
          <span className="text-charcoal text-[10px] uppercase tracking-widest font-semibold">{lead.companyName}</span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-400 text-charcoal tracking-tight mb-4">{lead.companyName}</h1>
            <span className={`stage-tag ${lead.status === 'CONVERTED' ? 'won' : lead.status === 'DISQUALIFIED' ? 'lost' : ''}`}>{lead.status}</span>
          </div>
          <div className="flex gap-4">
            {lead.status === 'QUALIFIED' && <button onClick={handleConvert} disabled={converting} className="btn-institutional">{converting ? 'Processing...' : 'Convert to Client'}</button>}
            {!editing ? <button onClick={() => setEditing(true)} className="btn-outline">Edit Record</button> : <div className="flex gap-2"><button onClick={() => { setEditing(false); setEditForm(lead); }} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-institutional">Save Changes</button></div>}
          </div>
        </div>
        {convertError && <p className="text-signal-negative text-sm mt-4">{convertError}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-10">
          <div>
            <h2 className="text-charcoal text-[11px] uppercase tracking-widest mb-6 border-b border-hairline pb-3 font-semibold">Company Details</h2>
            <div className="space-y-6">
              {editing ? (<><Field label="Company Name" value={editForm.companyName} onChange={v => setEditForm((f: any) => ({ ...f, companyName: v }))} /><Field label="Primary Contact" value={editForm.contactName} onChange={v => setEditForm((f: any) => ({ ...f, contactName: v }))} /><Field label="Email Address" value={editForm.contactEmail} onChange={v => setEditForm((f: any) => ({ ...f, contactEmail: v }))} /><Field label="Phone Number" value={editForm.contactPhone || ''} onChange={v => setEditForm((f: any) => ({ ...f, contactPhone: v }))} /><div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Source</label><select value={editForm.source} onChange={e => setEditForm((f: any) => ({ ...f, source: e.target.value }))} className="w-full input-institutional">{['Website', 'LinkedIn', 'Referral', 'Cold Call', 'Trade Show'].map(s => <option key={s}>{s}</option>)}</select></div><div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Status</label><select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full input-institutional">{['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED'].map(s => <option key={s}>{s}</option>)}</select></div></>) : (<><InfoRow label="Primary Contact" value={lead.contactName} /><InfoRow label="Email Address" value={lead.contactEmail} /><InfoRow label="Phone Number" value={lead.contactPhone || '—'} /><InfoRow label="Acquisition Source" value={lead.source} /></>)}
            </div>
          </div>
        </div>
        <div className="space-y-10">
          <div>
            <h2 className="text-charcoal text-[11px] uppercase tracking-widest mb-6 border-b border-hairline pb-3 font-semibold">Administration & Notes</h2>
            <div className="space-y-6">
              {editing && isManager ? (<div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Assigned Representative</label><select value={editForm.assignedTo} onChange={e => setEditForm((f: any) => ({ ...f, assignedTo: e.target.value }))} className="w-full input-institutional">{reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>) : (<InfoRow label="Assigned Representative" value={lead.assignedUser.name} />)}
              <div className="grid grid-cols-2 gap-8"><InfoRow label="Record Created" value={new Date(lead.createdAt).toLocaleDateString()} /><InfoRow label="Last Updated" value={new Date(lead.updatedAt).toLocaleDateString()} /></div>
              <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Notes</label>{editing ? <textarea value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} rows={6} className="w-full input-institutional resize-none" /> : <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap mt-2">{lead.notes || '—'}</p>}</div>
            </div>
          </div>
        </div>
      </div>

      {lead.opportunities && lead.opportunities.length > 0 && (
        <div className="pt-8">
          <h2 className="text-charcoal text-[11px] uppercase tracking-widest mb-4 border-b border-hairline pb-3 font-semibold">Active Deals</h2>
          <div className="overflow-x-auto">
            <table className="editorial-table"><thead><tr><th className="pl-0">Title</th><th>Stage</th><th className="num-col">Expected Close</th><th className="num-col">Value</th></tr></thead>
            <tbody>{lead.opportunities.map(opp => (<tr key={opp.id}><td className="pl-0 text-charcoal font-medium">{opp.title}</td><td><span className={`stage-tag ${opp.stage === 'WON' ? 'won' : opp.stage === 'LOST' ? 'lost' : ''}`}>{opp.stage}</span></td><td className="num-col text-stone">{opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '—'}</td><td className="num-col font-[family-name:var(--font-display)] text-xl text-charcoal">${Number(opp.dealValue).toLocaleString()}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[10px] uppercase tracking-widest text-stone mb-1 font-semibold">{label}</span><p className="text-sm font-medium text-charcoal">{value}</p></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">{label}</label><input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full input-institutional" /></div>;
}

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import type { Lead, LeadStatus } from '../types';
import { X } from 'lucide-react';

const STATUS_OPTIONS: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED'];
const SOURCE_OPTIONS = ['Website', 'LinkedIn', 'Referral', 'Cold Call', 'Trade Show'];

export default function LeadsPage() {
  const { isManager } = useAuth();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const fetchLeads = async () => {
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/leads', { params });
      setLeads(res.data.leads);
    } catch {
      setError('Failed to load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [filterStatus, searchQuery]);

  if (loading) {
    return <div className="p-12 text-stone text-sm">Loading prospects...</div>;
  }

  return (
    <div className="fade-in w-full pb-20">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-400 text-charcoal tracking-tight mb-2">Prospects</h1>
          <p className="text-stone text-sm">{leads.length} record{leads.length !== 1 ? 's' : ''} found.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-institutional">New Prospect</button>
      </div>

      <div className="mb-10 flex flex-wrap gap-8 items-end">
        <div className="w-72">
          <label className="block text-stone text-[10px] uppercase tracking-widest mb-2 font-semibold">Search</label>
          <input type="text" placeholder="Company or contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full input-institutional" />
        </div>
        <div>
          <label className="block text-stone text-[10px] uppercase tracking-widest mb-2 font-semibold">Status</label>
          <div className="flex gap-4">
            <button onClick={() => setFilterStatus('')} className={`text-sm pb-1 border-b-2 transition-colors ${!filterStatus ? 'border-bronze text-charcoal' : 'border-transparent text-stone hover:text-charcoal'}`}>All</button>
            {STATUS_OPTIONS.map(status => (
              <button key={status} onClick={() => setFilterStatus(status === filterStatus ? '' : status)} className={`text-sm pb-1 border-b-2 transition-colors ${filterStatus === status ? 'border-bronze text-charcoal' : 'border-transparent text-stone hover:text-charcoal'}`}>{status}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="text-signal-negative text-sm mb-8">{error}</div>}

      {leads.length === 0 ? (
        <div className="py-12 border-t border-hairline text-stone text-sm italic">No records match your criteria.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="editorial-table">
            <thead>
              <tr>
                <th className="pl-0">Company</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                {isManager && <th>Assigned To</th>}
                <th className="num-col">Active Deals</th>
                <th className="pr-0 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="pl-0">
                    <Link to={`/leads/${lead.id}`} className="block group">
                      <span className="font-medium text-charcoal group-hover:text-bronze transition-colors">{lead.companyName}</span>
                    </Link>
                  </td>
                  <td><span className="text-charcoal">{lead.contactName}</span><br /><span className="text-stone text-xs">{lead.contactEmail}</span></td>
                  <td><span className="text-stone">{lead.source}</span></td>
                  <td><span className="stage-tag">{lead.status}</span></td>
                  {isManager && <td className="text-stone">{lead.assignedUser.name}</td>}
                  <td className="num-col">{lead._count?.opportunities || 0}</td>
                  <td className="pr-0 text-right"><Link to={`/leads/${lead.id}`} className="text-bronze text-sm hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchLeads(); }} />}
    </div>
  );
}

function CreateLeadModal({ onClose, onCreated }: any) {
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', source: 'Website', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.post('/leads', form); onCreated(); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed to create record.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-charcoal-50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div className="bg-ivory w-full max-w-xl border border-hairline shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-hairline flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-charcoal">New Prospect Record</h2>
          <button onClick={onClose} className="text-stone hover:text-charcoal transition-colors"><X size={20} strokeWidth={1} /></button>
        </div>
        {error && <div className="px-8 py-4 bg-signal-negative/5 text-signal-negative text-sm border-b border-signal-negative/20">{error}</div>}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Company Name</label><input type="text" required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full input-institutional" /></div>
            <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Primary Contact</label><input type="text" required value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className="w-full input-institutional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Email Address</label><input type="email" required value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="w-full input-institutional" /></div>
            <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Phone (Optional)</label><input type="text" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="w-full input-institutional" /></div>
          </div>
          <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Acquisition Source</label><select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full input-institutional">{SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Initial Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full input-institutional resize-none" /></div>
          <div className="pt-4 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-institutional">{loading ? 'Saving...' : 'Save Record'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

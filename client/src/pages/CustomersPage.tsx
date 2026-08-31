import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import type { Customer } from '../types';

export default function CustomersPage() {
  const { isManager } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetch() {
      try {
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        const res = await api.get('/customers', { params });
        setCustomers(res.data.customers);
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, [searchQuery]);

  if (loading) {
    return <div className="p-12 text-stone text-sm">Loading accounts...</div>;
  }

  return (
    <div className="fade-in w-full pb-20">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-400 text-charcoal tracking-tight mb-2">Client Accounts</h1>
          <p className="text-stone text-sm">{customers.length} won account{customers.length !== 1 ? 's' : ''} {isManager ? 'across all territories' : 'assigned to you'}.</p>
        </div>
      </div>
      <div className="mb-10">
        <div className="w-72">
          <label className="block text-stone text-[10px] uppercase tracking-widest mb-2 font-semibold">Search Accounts</label>
          <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full input-institutional" />
        </div>
      </div>
      {customers.length === 0 ? (
        <div className="py-12 border-t border-hairline text-stone text-sm italic">No records match your criteria.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="editorial-table">
            <thead><tr><th className="pl-0">Account Name</th><th>Industry</th><th className="num-col">Contacts</th><th className="num-col">Activity Log</th>{isManager && <th>Assigned To</th>}<th className="pr-0 text-right"></th></tr></thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust.id}>
                  <td className="pl-0"><Link to={`/customers/${cust.id}`} className="block group"><span className="font-[family-name:var(--font-display)] text-xl font-400 text-charcoal group-hover:text-bronze transition-colors">{cust.companyName}</span></Link></td>
                  <td><span className="text-stone">{cust.industry || 'Unspecified'}</span></td>
                  <td className="num-col">{cust._count?.contacts || 0}</td>
                  <td className="num-col">{cust._count?.activities || 0}</td>
                  {isManager && <td className="text-stone">{cust.assignedUser?.name}</td>}
                  <td className="pr-0 text-right"><Link to={`/customers/${cust.id}`} className="text-bronze text-sm hover:underline">View Profile</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

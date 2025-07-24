import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

function useApi(endpoint) {
    const [data, setData] = useState([]);
    useEffect(() => {
        fetch(`http://localhost:4000${endpoint}`)
            .then(res => res.json())
            .then(setData);
    }, [endpoint]);
    return data;
}

function App() {
    const users = useApi('/api/users');
    const tickets = useApi('/api/support-tickets');
    const payments = useApi('/api/payments');
    const reports = useApi('/api/reports');
    const moderation = useApi('/api/content-reports');
    const violations = useApi('/api/vendor-violations');
    const locations = useApi('/api/driver-locations');
    const deliveries = useApi('/api/fuel-deliveries');
    const fraud = useApi('/api/suspicious-transactions');
    const compliance = useApi('/api/compliance-documents');
    const metrics = useApi('/api/metrics');

    const [chatMsg, setChatMsg] = useState('');
    const [chatLog, setChatLog] = useState([]);

    useEffect(() => {
        socket.on('chat message', (msg) => {
            setChatLog((log) => [...log, msg]);
        });
        return () => socket.off('chat message');
    }, []);

    const sendChat = () => {
        if (chatMsg) {
            socket.emit('chat message', chatMsg);
            setChatMsg('');
        }
    };

    return (
        <div style={{
            padding: 16,
            maxWidth: 1200,
            margin: '0 auto',
            fontFamily: 'sans-serif'
        }}>
            <h1>Brillprime Admin Panel</h1>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 16
            }}>
                <section>
                    <h2>Users</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {users.map(u => <div key={u._id}>{u.name || u.email || u._id}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Support Tickets</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {tickets.map(t => <div key={t._id}>{t.subject || t._id}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Payments</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {payments.map(p => <div key={p._id}>{p.status} - {p.amount}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Moderation</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {moderation.map(m => <div key={m._id}>{m.reason}</div>)}
                        {violations.map(v => <div key={v._id}>{v.violationType}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Location & Service</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {locations.map(l => <div key={l._id}>{l.driverId}: {l.latitude}, {l.longitude}</div>)}
                        {deliveries.map(d => <div key={d._id}>{d.status}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Fraud Detection</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {fraud.map(f => <div key={f._id}>{f.reason}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Compliance</h2>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
                        {compliance.map(c => <div key={c._id}>{c.documentType} - {c.status}</div>)}
                    </div>
                </section>
                <section>
                    <h2>Metrics</h2>
                    <div style={{ border: '1px solid #eee', padding: 8 }}>
                        <div>Users: {metrics.userCount}</div>
                        <div>Active Payments: {metrics.activePayments}</div>
                        <div>Open Tickets: {metrics.ticketCount}</div>
                    </div>
                </section>
                <section>
                    <h2>Live Chat</h2>
                    <div style={{ border: '1px solid #ccc', padding: 8, height: 120, overflowY: 'auto' }}>
                        {chatLog.map((msg, idx) => (
                            <div key={idx}>{msg}</div>
                        ))}
                    </div>
                    <input
                        value={chatMsg}
                        onChange={e => setChatMsg(e.target.value)}
                        placeholder="Type a message"
                        style={{ width: '80%', marginRight: 8 }}
                    />
                    <button onClick={sendChat}>Send</button>
                </section>
            </div>
        </div>
    );
}

export default App;
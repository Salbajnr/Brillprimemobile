
import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useWebSocket } from '../hooks/use-websocket';

interface SupportTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface SupportStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
}

const Support = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats>({ totalTickets: 0, openTickets: 0, resolvedTickets: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'NORMAL'
  });
  const [newResponse, setNewResponse] = useState('');
  
  const { toast } = useToast();
  const { socket } = useWebSocket();

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('ticket_updated', (data) => {
        setTickets(prev => prev.map(ticket => 
          ticket.id === data.ticketId 
            ? { ...ticket, status: data.status, updatedAt: data.updatedAt }
            : ticket
        ));
        if (selectedTicket === data.ticketId) {
          fetchTicketDetails(data.ticketId);
        }
      });

      socket.on('ticket_response', (data) => {
        if (selectedTicket === data.ticketId) {
          fetchTicketDetails(data.ticketId);
        }
        toast({
          title: "New Response",
          description: `You received a response to ticket ${data.ticketNumber}`
        });
      });

      return () => {
        socket.off('ticket_updated');
        socket.off('ticket_response');
      };
    }
  }, [socket, selectedTicket, toast]);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/support/tickets', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch tickets",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch support tickets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/support/stats', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTicketDetails = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setTicketDetails(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch ticket details",
        variant: "destructive"
      });
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newTicket)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Ticket ${data.ticket.ticketNumber} created successfully`
        });
        setNewTicket({ subject: '', message: '', priority: 'NORMAL' });
        setShowCreateForm(false);
        fetchTickets();
        fetchStats();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create support ticket",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newResponse.trim()) return;

    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: newResponse })
      });

      const data = await response.json();

      if (data.success) {
        setNewResponse('');
        fetchTicketDetails(selectedTicket);
        toast({
          title: "Success",
          description: "Response added successfully"
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add response",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add response",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
            <p className="text-gray-600 mt-1">Get help with your account and orders</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-brill"
          >
            {showCreateForm ? 'Cancel' : 'Create New Ticket'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 rounded-brill">
            <h3 className="text-lg font-semibold text-gray-900">Total Tickets</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalTickets}</p>
          </Card>
          <Card className="p-6 rounded-brill">
            <h3 className="text-lg font-semibold text-gray-900">Open Tickets</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.openTickets}</p>
          </Card>
          <Card className="p-6 rounded-brill">
            <h3 className="text-lg font-semibold text-gray-900">Resolved</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolvedTickets}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-2">
            {/* Create Form */}
            {showCreateForm && (
              <Card className="p-6 mb-6 rounded-brill">
                <h3 className="text-lg font-semibold mb-4">Create Support Ticket</h3>
                <form onSubmit={createTicket}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <Input
                        type="text"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        required
                        className="rounded-brill"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-brill focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <Textarea
                        value={newTicket.message}
                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                        placeholder="Please describe your issue in detail..."
                        rows={6}
                        required
                        className="rounded-brill"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="rounded-brill"
                    >
                      {submitting ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Tickets */}
            <Card className="rounded-brill">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your Support Tickets</h3>
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No support tickets found.</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first ticket to get help.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket.id);
                          fetchTicketDetails(ticket.id);
                        }}
                        className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedTicket === ticket.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                            <p className="text-sm text-gray-600 mt-1">#{ticket.ticketNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-gray-500">
                            Created: {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Ticket Details */}
          <div>
            <Card className="rounded-brill">
              <div className="p-6">
                {selectedTicket && ticketDetails ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Ticket Details</h3>
                      <Badge className={getStatusColor(ticketDetails.ticket.status)}>
                        {ticketDetails.ticket.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{ticketDetails.ticket.subject}</h4>
                        <p className="text-sm text-gray-600">#{ticketDetails.ticket.ticketNumber}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Original Message</h5>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {ticketDetails.ticket.message}
                        </p>
                      </div>

                      {ticketDetails.ticket.resolution && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Resolution</h5>
                          <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                            {ticketDetails.ticket.resolution}
                          </p>
                        </div>
                      )}

                      {ticketDetails.responses.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Responses</h5>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {ticketDetails.responses.map((response: any) => (
                              <div key={response.id} className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant={response.responderType === 'ADMIN' ? 'default' : 'secondary'}>
                                    {response.responderType === 'ADMIN' ? 'Support Agent' : 'You'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(response.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{response.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticketDetails.ticket.status !== 'RESOLVED' && (
                        <form onSubmit={addResponse}>
                          <Textarea
                            value={newResponse}
                            onChange={(e) => setNewResponse(e.target.value)}
                            placeholder="Add a response..."
                            rows={3}
                            className="mb-3 rounded-brill"
                          />
                          <Button 
                            type="submit" 
                            size="sm" 
                            disabled={!newResponse.trim()}
                            className="rounded-brill"
                          >
                            Send Response
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Select a ticket to view details</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;

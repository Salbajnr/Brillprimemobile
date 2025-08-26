
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { useWebSocket } from '../hooks/use-websocket';

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  userId: number;
  userRole: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  priority: string;
  assignedTo?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  urgentTickets: number;
  unassignedTickets: number;
}

const AdminSupport = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    totalTickets: 0, openTickets: 0, inProgressTickets: 0, 
    resolvedTickets: 0, urgentTickets: 0, unassignedTickets: 0
  });
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    page: 1
  });
  const [adminResponse, setAdminResponse] = useState('');
  const [changeStatus, setChangeStatus] = useState('');
  
  const { toast } = useToast();
  const { socket } = useWebSocket();

  useEffect(() => {
    fetchDashboardStats();
    fetchTickets();
  }, [filters]);

  useEffect(() => {
    if (socket) {
      socket.on('new_support_ticket', (data) => {
        setStats(prev => ({ ...prev, totalTickets: prev.totalTickets + 1, openTickets: prev.openTickets + 1 }));
        fetchTickets();
        toast({
          title: "New Support Ticket",
          description: `New ${data.priority} priority ticket: ${data.subject}`
        });
      });

      socket.on('ticket_response', (data) => {
        if (selectedTicket === data.ticketId) {
          fetchTicketDetails(data.ticketId);
        }
        toast({
          title: "New Response",
          description: `User responded to ticket ${data.ticketNumber}`
        });
      });

      return () => {
        socket.off('new_support_ticket');
        socket.off('ticket_response');
      };
    }
  }, [socket, selectedTicket, toast]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin-support/dashboard/stats', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setRecentTickets(data.recentTickets);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.priority) searchParams.append('priority', filters.priority);
      if (filters.search) searchParams.append('search', filters.search);
      searchParams.append('page', filters.page.toString());

      const response = await fetch(`/api/admin-support/tickets?${searchParams}`, {
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

  const fetchTicketDetails = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/admin-support/tickets/${ticketId}`, {
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

  const updateTicket = async (ticketId: number, updates: any) => {
    try {
      const response = await fetch(`/api/admin-support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        fetchTickets();
        fetchDashboardStats();
        if (selectedTicket === ticketId) {
          fetchTicketDetails(ticketId);
        }
        toast({
          title: "Success",
          description: "Ticket updated successfully"
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update ticket",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive"
      });
    }
  };

  const addAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminResponse.trim()) return;

    try {
      const response = await fetch(`/api/admin-support/tickets/${selectedTicket}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          message: adminResponse,
          changeStatus: changeStatus || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setAdminResponse('');
        setChangeStatus('');
        fetchTicketDetails(selectedTicket);
        fetchTickets();
        fetchDashboardStats();
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

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedTickets.length === 0) {
      toast({
        title: "Warning",
        description: "Please select tickets to perform bulk actions",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/admin-support/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticketIds: selectedTickets,
          action,
          value
        })
      });

      const data = await response.json();

      if (data.success) {
        setSelectedTickets([]);
        fetchTickets();
        fetchDashboardStats();
        toast({
          title: "Success",
          description: data.message
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to perform bulk action",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
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
          <p className="mt-4 text-gray-600">Loading support dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Management</h1>
            <p className="text-gray-600 mt-1">Manage customer support tickets and responses</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="tickets">All Tickets</TabsTrigger>
            <TabsTrigger value="details">Ticket Details</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card className="p-4 rounded-brill">
                <h3 className="text-sm font-medium text-gray-700">Total</h3>
                <p className="text-2xl font-bold text-blue-600">{stats.totalTickets}</p>
              </Card>
              <Card className="p-4 rounded-brill">
                <h3 className="text-sm font-medium text-gray-700">Open</h3>
                <p className="text-2xl font-bold text-orange-600">{stats.openTickets}</p>
              </Card>
              <Card className="p-4 rounded-brill">
                <h3 className="text-sm font-medium text-gray-700">In Progress</h3>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgressTickets}</p>
              </Card>
              <Card className="p-4 rounded-brill">
                <h3 className="text-sm font-medium text-gray-700">Resolved</h3>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</p>
              </Card>
              <Card className="p-4 rounded-brill">
                <h3 className="text-sm font-medium text-gray-700">Urgent</h3>
                <p className="text-2xl font-bold text-red-600">{stats.urgentTickets}</p>
              </Card>
              <Card className="p-4 rounded-brill">
                <h3 className="text-sm font-medium text-gray-700">Unassigned</h3>
                <p className="text-2xl font-bold text-purple-600">{stats.unassignedTickets}</p>
              </Card>
            </div>

            {/* Recent Tickets */}
            <Card className="rounded-brill">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Tickets</h3>
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">#{ticket.ticketNumber}</h4>
                        <p className="text-sm text-gray-600">{ticket.subject}</p>
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
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            {/* Filters */}
            <Card className="p-4 rounded-brill">
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="max-w-xs rounded-brill"
                />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="px-3 py-2 border border-gray-300 rounded-brill focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
                  className="px-3 py-2 border border-gray-300 rounded-brill focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priority</option>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </Card>

            {/* Bulk Actions */}
            {selectedTickets.length > 0 && (
              <Card className="p-4 rounded-brill">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {selectedTickets.length} ticket(s) selected
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('status', 'IN_PROGRESS')}
                    className="rounded-brill"
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('status', 'RESOLVED')}
                    className="rounded-brill"
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTickets([])}
                    className="rounded-brill"
                  >
                    Clear Selection
                  </Button>
                </div>
              </Card>
            )}

            {/* Tickets List */}
            <Card className="rounded-brill">
              <div className="p-6">
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTickets.includes(ticket.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTickets([...selectedTickets, ticket.id]);
                          } else {
                            setSelectedTickets(selectedTickets.filter(id => id !== ticket.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedTicket(ticket.id);
                          fetchTicketDetails(ticket.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              #{ticket.ticketNumber} - {ticket.subject}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {ticket.name} ({ticket.email}) - {ticket.userRole}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(ticket.createdAt).toLocaleString()}
                            </p>
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card className="rounded-brill">
              <div className="p-6">
                {selectedTicket && ticketDetails ? (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">#{ticketDetails.ticket.ticketNumber}</h3>
                        <h4 className="text-lg text-gray-900 mt-1">{ticketDetails.ticket.subject}</h4>
                        <p className="text-gray-600 mt-1">
                          {ticketDetails.ticket.name} ({ticketDetails.ticket.email})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(ticketDetails.ticket.priority)}>
                          {ticketDetails.ticket.priority}
                        </Badge>
                        <Badge className={getStatusColor(ticketDetails.ticket.status)}>
                          {ticketDetails.ticket.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateTicket(selectedTicket, { status: 'IN_PROGRESS' })}
                        disabled={ticketDetails.ticket.status === 'IN_PROGRESS'}
                        className="rounded-brill"
                      >
                        In Progress
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateTicket(selectedTicket, { status: 'RESOLVED' })}
                        disabled={ticketDetails.ticket.status === 'RESOLVED'}
                        className="rounded-brill"
                      >
                        Resolve
                      </Button>
                    </div>

                    {/* Original Message */}
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Original Message</h5>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700">{ticketDetails.ticket.message}</p>
                      </div>
                    </div>

                    {/* Responses */}
                    {ticketDetails.responses.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Conversation</h5>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {ticketDetails.responses.map((response: any) => (
                            <div key={response.id} className={`p-4 rounded-lg ${
                              response.responderType === 'ADMIN' ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant={response.responderType === 'ADMIN' ? 'default' : 'secondary'}>
                                  {response.responderType === 'ADMIN' ? 'Support Agent' : 'Customer'}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(response.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700">{response.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Response */}
                    <form onSubmit={addAdminResponse} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Response
                        </label>
                        <Textarea
                          value={adminResponse}
                          onChange={(e) => setAdminResponse(e.target.value)}
                          placeholder="Type your response to the customer..."
                          rows={4}
                          className="rounded-brill"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <select
                          value={changeStatus}
                          onChange={(e) => setChangeStatus(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-brill focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Keep current status</option>
                          <option value="IN_PROGRESS">Mark In Progress</option>
                          <option value="RESOLVED">Mark Resolved</option>
                          <option value="CLOSED">Mark Closed</option>
                        </select>
                        <Button 
                          type="submit" 
                          disabled={!adminResponse.trim()}
                          className="rounded-brill"
                        >
                          Send Response
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Select a ticket from the tickets tab to view details</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSupport;

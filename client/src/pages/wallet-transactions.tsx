import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Calendar, Download } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

interface TransactionResponse {
  transactions: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

export default function WalletTransactionsPage() {
  const [, setLocation] = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: '10',
          ...(filter && { type: filter })
        });

        const response = await fetch(`/api/wallet/transactions?${queryParams}`);
        const data: TransactionResponse = await response.json();
        
        if (response.ok) {
          setTransactions(data.transactions);
        } else {
          console.error('Failed to fetch transactions');
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentPage, filter]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'WALLET_FUNDING':
        return '💳';
      case 'BILL_PAYMENT':
        return '⚡';
      case 'MONEY_TRANSFER':
        return '💸';
      default:
        return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'NGN' ? '₦' : currency;
    const formattedAmount = Math.abs(amount).toLocaleString();
    return amount < 0 ? `-${symbol}${formattedAmount}` : `+${symbol}${formattedAmount}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/dashboard')}
                className="text-white hover:bg-white/20 mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Transaction History</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 p-2 border rounded-lg text-sm"
            >
              <option value="">All Transactions</option>
              <option value="WALLET_FUNDING">Wallet Funding</option>
              <option value="BILL_PAYMENT">Bill Payments</option>
              <option value="MONEY_TRANSFER">Money Transfers</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500 mb-6">Your transaction history will appear here</p>
              <Button onClick={() => setLocation('/wallet-fund')}>
                Fund Your Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${
                          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatAmount(transaction.amount, transaction.currency)}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={getStatusColor(transaction.status)}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Load More */}
        {!loading && transactions.length > 0 && (
          <div className="p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Load More Transactions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Order {
  id: string
  status: string
  driverName?: string
  estimatedArrival?: string
  completionPercentage: number
}

export default function RealTimeOrderTracking() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching orders
    const mockOrders: Order[] = [
      {
        id: "fo_001",
        status: "IN_TRANSIT",
        driverName: "Ahmed Musa",
        estimatedArrival: new Date(Date.now() + 1800000).toISOString(),
        completionPercentage: 65
      }
    ]
    
    setOrders(mockOrders)
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="p-4">Loading orders...</div>
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="w-full">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Order {order.id}</span>
              <Badge variant={order.status === 'IN_TRANSIT' ? 'default' : 'secondary'}>
                {order.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.driverName && (
                <p className="text-sm">Driver: {order.driverName}</p>
              )}
              {order.estimatedArrival && (
                <p className="text-sm">
                  ETA: {new Date(order.estimatedArrival).toLocaleString()}
                </p>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${order.completionPercentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {order.completionPercentage}% Complete
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
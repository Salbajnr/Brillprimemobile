// Add method signatures for the features you're implementing
  abstract getOrderTracking(orderId: string): Promise<any>;
  abstract updateOrderTracking(orderId: string, status: string, location?: any): Promise<any>;
  abstract getDriverProfile(driverId: number): Promise<any>;
  abstract updateDriverLocation(driverId: number, location: any): Promise<void>;
  abstract addLocationHistory(driverId: number, location: any): Promise<void>;
  abstract getDriverOrders(driverId: number, status?: string): Promise<any[]>;

  // Chat and messaging methods
  abstract createConversation(data: {
    id: string;
    customerId: number;
    vendorId: number;
    conversationType: string;
    status: string;
  }): Promise<any>;
  abstract sendMessage(data: {
    id: string;
    conversationId: string;
    senderId: number;
    content: string;
    messageType: any;
  }): Promise<any>;
  abstract getConversationMessages(conversationId: string, limit: number, offset?: number): Promise<any[]>;

  // Support ticket methods
  abstract createSupportTicket(data: {
    userEmail: string;
    userRole: string;
    subject: string;
    description: string;
    priority: string;
  }): Promise<any>;

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { MessageCircle, ArrowLeft, AlertTriangle, HelpCircle, Bug, CreditCard } from 'lucide-react';
import { useLocation } from 'wouter';

interface SupportTicketForm {
  subject: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  category: string;
  name: string;
  email: string;
  phone?: string;
}

const SupportTicketSubmit = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<SupportTicketForm>({
    subject: '',
    message: '',
    priority: 'NORMAL',
    category: '',
    name: '',
    email: '',
    phone: ''
  });

  const submitTicketMutation = useMutation({
    mutationFn: async (data: SupportTicketForm) => {
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit support ticket');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Support Ticket Submitted",
        description: `Your ticket #${data.ticketNumber} has been submitted successfully. We'll respond within 24 hours.`,
      });
      setLocation('/dashboard');
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit your support ticket. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message || !formData.name || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    submitTicketMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof SupportTicketForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const categories = [
    { value: 'PAYMENT', label: 'Payment Issues', icon: CreditCard },
    { value: 'ACCOUNT', label: 'Account Problems', icon: MessageCircle },
    { value: 'TECHNICAL', label: 'Technical Support', icon: Bug },
    { value: 'GENERAL', label: 'General Inquiry', icon: HelpCircle },
    { value: 'URGENT', label: 'Urgent Issue', icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Support</h1>
            <p className="text-gray-600">We're here to help with any issues or questions</p>
          </div>
        </div>

        {/* Support Categories */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {categories.map((category) => (
            <Card 
              key={category.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                formData.category === category.value ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleInputChange('category', category.value)}
            >
              <CardContent className="flex flex-col items-center p-4">
                <category.icon className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-center">{category.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Submit Support Request
            </CardTitle>
            <CardDescription>
              Please provide detailed information about your issue so we can assist you better.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>

              {/* Issue Details */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: any) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low - General questions</SelectItem>
                    <SelectItem value="NORMAL">Normal - Standard support</SelectItem>
                    <SelectItem value="HIGH">High - Important issues</SelectItem>
                    <SelectItem value="URGENT">Urgent - Critical problems</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Detailed Description *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Please provide a detailed description of your issue, including any error messages or steps to reproduce the problem"
                  rows={6}
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitTicketMutation.isPending}
                  className="min-w-32"
                >
                  {submitTicketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Support Info */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <MessageCircle className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• You'll receive a confirmation email with your ticket number</li>
                  <li>• Our support team will review your request within 24 hours</li>
                  <li>• We'll contact you via email or phone to resolve your issue</li>
                  <li>• You can track your ticket status in your dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupportTicketSubmit;


import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from "../lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import {
  Upload, FileText, CheckCircle, Clock, AlertCircle, Shield,
  Building, CreditCard, User, MapPin, Phone, Mail
} from 'lucide-react';

interface KycSubmission {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reviewNotes?: string;
}

interface KycRequirements {
  requiredDocuments: Array<{
    type: string;
    name: string;
    description: string;
    required: boolean;
    formats: string[];
    maxSize: string;
  }>;
  processingTime: string;
  benefits: string[];
}

export default function MerchantKycVerification() {
  const [currentTab, setCurrentTab] = useState('status');
  const [formData, setFormData] = useState({
    businessRegistrationNumber: '',
    taxIdentificationNumber: '',
    businessType: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    ownerFullName: '',
    ownerNationalId: '',
    bankAccountNumber: '',
    bankName: '',
    bankAccountName: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  // Fetch KYC status
  const { data: kycStatus } = useQuery<KycSubmission>({
    queryKey: ['merchant', 'kyc-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/merchant/kyc/status');
      return response.json();
    }
  });

  // Fetch KYC requirements
  const { data: requirements } = useQuery<KycRequirements>({
    queryKey: ['merchant', 'kyc-requirements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/merchant/kyc/requirements');
      return response.json();
    }
  });

  // Submit KYC mutation
  const submitKycMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/merchant/kyc/submit', {
        method: 'POST',
        credentials: 'include',
        body: data
      });
      if (!response.ok) {
        throw new Error('Failed to submit KYC documents');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'kyc-status'] });
      setCurrentTab('status');
    }
  });

  const handleFileUpload = (documentType: string, file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [documentType]: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSubmit = new FormData();
    formDataToSubmit.append('kycData', JSON.stringify(formData));
    
    // Append files
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      formDataToSubmit.append(key, file);
    });

    submitKycMutation.mutate(formDataToSubmit);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'REJECTED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completionPercentage = () => {
    const requiredFields = Object.keys(formData).length;
    const filledFields = Object.values(formData).filter(value => value.trim() !== '').length;
    const uploadedDocsCount = Object.keys(uploadedFiles).length;
    const requiredDocsCount = requirements?.requiredDocuments.length || 0;
    
    return Math.round(((filledFields + uploadedDocsCount) / (requiredFields + requiredDocsCount)) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0b1a51] mb-2">Merchant KYC Verification</h1>
        <p className="text-gray-600">Complete your identity verification to unlock all merchant features</p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="submit">Submit Documents</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Verification Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kycStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(kycStatus.status)}
                      <div>
                        <p className="font-medium">Current Status</p>
                        <p className="text-sm text-gray-600">
                          Submitted on {new Date(kycStatus.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(kycStatus.status)}>
                      {kycStatus.status}
                    </Badge>
                  </div>

                  {kycStatus.status === 'PENDING' && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Your KYC documents are under review. This typically takes 2-3 business days.
                      </AlertDescription>
                    </Alert>
                  )}

                  {kycStatus.status === 'APPROVED' && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Congratulations! Your KYC verification is complete. You now have access to all merchant features.
                      </AlertDescription>
                    </Alert>
                  )}

                  {kycStatus.status === 'REJECTED' && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Your KYC submission was rejected. {kycStatus.rejectionReason}
                        {kycStatus.reviewNotes && (
                          <div className="mt-2">
                            <strong>Review Notes:</strong> {kycStatus.reviewNotes}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No KYC submission found</p>
                  <Button onClick={() => setCurrentTab('submit')} className="bg-[#4682b4] hover:bg-[#0b1a51]">
                    Start KYC Process
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submit Documents Tab */}
        <TabsContent value="submit" className="space-y-4">
          {(!kycStatus || kycStatus.status === 'REJECTED') && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Completion Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{completionPercentage()}%</span>
                    </div>
                    <Progress value={completionPercentage()} className="w-full" />
                  </div>
                </CardContent>
              </Card>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="h-5 w-5" />
                      <span>Business Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessRegistrationNumber">Business Registration Number *</Label>
                        <Input
                          id="businessRegistrationNumber"
                          value={formData.businessRegistrationNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, businessRegistrationNumber: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="taxIdentificationNumber">Tax Identification Number *</Label>
                        <Input
                          id="taxIdentificationNumber"
                          value={formData.taxIdentificationNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, taxIdentificationNumber: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessType">Business Type *</Label>
                        <Select 
                          value={formData.businessType} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SOLE_PROPRIETORSHIP">Sole Proprietorship</SelectItem>
                            <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                            <SelectItem value="LIMITED_COMPANY">Limited Company</SelectItem>
                            <SelectItem value="CORPORATION">Corporation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="businessPhone">Business Phone *</Label>
                        <Input
                          id="businessPhone"
                          value={formData.businessPhone}
                          onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="businessAddress">Business Address *</Label>
                        <Textarea
                          id="businessAddress"
                          value={formData.businessAddress}
                          onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessEmail">Business Email *</Label>
                        <Input
                          id="businessEmail"
                          type="email"
                          value={formData.businessEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, businessEmail: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Owner Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Owner Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ownerFullName">Full Name *</Label>
                        <Input
                          id="ownerFullName"
                          value={formData.ownerFullName}
                          onChange={(e) => setFormData(prev => ({ ...prev, ownerFullName: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="ownerNationalId">National ID Number *</Label>
                        <Input
                          id="ownerNationalId"
                          value={formData.ownerNationalId}
                          onChange={(e) => setFormData(prev => ({ ...prev, ownerNationalId: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Banking Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Banking Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bankName">Bank Name *</Label>
                        <Input
                          id="bankName"
                          value={formData.bankName}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="bankAccountNumber">Account Number *</Label>
                        <Input
                          id="bankAccountNumber"
                          value={formData.bankAccountNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="bankAccountName">Account Name *</Label>
                        <Input
                          id="bankAccountName"
                          value={formData.bankAccountName}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Uploads */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="h-5 w-5" />
                      <span>Required Documents</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requirements?.requiredDocuments.map((doc) => (
                      <div key={doc.type} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{doc.name}</h4>
                            <p className="text-sm text-gray-600">{doc.description}</p>
                            <p className="text-xs text-gray-500">
                              Formats: {doc.formats.join(', ')} | Max size: {doc.maxSize}
                            </p>
                          </div>
                          <Badge variant={uploadedFiles[doc.type] ? "default" : "secondary"}>
                            {uploadedFiles[doc.type] ? "Uploaded" : "Required"}
                          </Badge>
                        </div>
                        <input
                          type="file"
                          accept={doc.formats.map(f => f === 'PDF' ? '.pdf' : '.jpg,.jpeg,.png').join(',')}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(doc.type, file);
                            }
                          }}
                          className="w-full"
                        />
                        {uploadedFiles[doc.type] && (
                          <p className="text-sm text-green-600 mt-1">
                            ✓ {uploadedFiles[doc.type].name}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="submit"
                    disabled={submitKycMutation.isPending || completionPercentage() < 100}
                    className="bg-[#4682b4] hover:bg-[#0b1a51]"
                  >
                    {submitKycMutation.isPending ? 'Submitting...' : 'Submit KYC Documents'}
                  </Button>
                </div>
              </form>
            </>
          )}

          {kycStatus && kycStatus.status === 'PENDING' && (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">KYC Under Review</h3>
                <p className="text-gray-600">
                  Your documents have been submitted and are currently under review.
                  You'll be notified once the review is complete.
                </p>
              </CardContent>
            </Card>
          )}

          {kycStatus && kycStatus.status === 'APPROVED' && (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">KYC Verified</h3>
                <p className="text-gray-600">
                  Your identity has been successfully verified. You now have access to all merchant features.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KYC Requirements & Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Required Documents</h4>
                <div className="space-y-3">
                  {requirements?.requiredDocuments.map((doc) => (
                    <div key={doc.type} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <h5 className="font-medium">{doc.name}</h5>
                        <p className="text-sm text-gray-600">{doc.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Accepted formats: {doc.formats.join(', ')} | Maximum size: {doc.maxSize}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Processing Time</h4>
                <p className="text-gray-600">{requirements?.processingTime}</p>
              </div>

              <div>
                <h4 className="font-medium mb-3">Verification Benefits</h4>
                <ul className="space-y-2">
                  {requirements?.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

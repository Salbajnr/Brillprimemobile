
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Shield, FileText, Download, CheckCircle } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

export default function LegalCompliancePage() {
  const { user } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complianceData, setComplianceData] = useState<any>(null);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const [termsRes, privacyRes, ndprRes] = await Promise.all([
        fetch('/api/legal/terms-of-service'),
        fetch('/api/legal/privacy-policy'),
        fetch('/api/compliance/ndpr-compliance', {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [terms, privacy, ndpr] = await Promise.all([
        termsRes.json(),
        privacyRes.json(),
        ndprRes.json()
      ]);

      setComplianceData({ terms, privacy, ndpr });
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    }
  };

  const acceptTerms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/legal/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'v1.0',
          ipAddress: window.location.hostname
        })
      });

      if (response.ok) {
        setTermsAccepted(true);
      }
    } catch (error) {
      console.error('Failed to accept terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestDataExport = async () => {
    try {
      const response = await fetch('/api/data-privacy/request-data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'ACCESS',
          reason: 'User requested data export'
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('Data export request submitted. You will receive a download link via email within 72 hours.');
      }
    } catch (error) {
      console.error('Failed to request data export:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal & Compliance</h1>
          <p className="text-gray-600">
            Understand your rights and our compliance with data protection and financial regulations
          </p>
        </div>

        <Tabs defaultValue="terms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR Rights</TabsTrigger>
            <TabsTrigger value="pci">Payment Security</TabsTrigger>
            <TabsTrigger value="nigerian">Nigerian Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Terms of Service
                  {termsAccepted && <Badge variant="secondary" className="ml-2">Accepted</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceData?.terms && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {complianceData.terms.terms?.content}
                      </pre>
                    </div>
                    
                    {!termsAccepted && (
                      <div className="flex items-center gap-4">
                        <Button onClick={acceptTerms} disabled={loading}>
                          {loading ? 'Processing...' : 'Accept Terms of Service'}
                        </Button>
                        <p className="text-sm text-gray-600">
                          By clicking accept, you agree to our terms and conditions
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceData?.privacy && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {complianceData.privacy.privacyPolicy?.content}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gdpr">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Your Data Protection Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Right to Access</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Request a copy of all personal data we hold about you
                      </p>
                      <Button onClick={requestDataExport} size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Request Data Export
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Right to Rectification</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Correct any inaccurate personal information
                      </p>
                      <Button variant="outline" size="sm">
                        Update Profile
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Right to Erasure</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Request deletion of your personal data
                      </p>
                      <Button variant="destructive" size="sm">
                        Request Deletion
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Data Portability</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Get your data in a portable format
                      </p>
                      <Button variant="outline" size="sm">
                        Export Data
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Contact Data Protection Officer</h3>
                  <p className="text-blue-800 text-sm">
                    For any data protection concerns, contact our DPO at privacy@brillprime.com
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pci">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Payment Card Industry (PCI DSS) Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Security Measures</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• End-to-end encryption</li>
                      <li>• Secure data transmission</li>
                      <li>• No card data storage</li>
                      <li>• Regular security audits</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Compliance Status</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• PCI DSS Level 1 Certified</li>
                      <li>• Annual security assessments</li>
                      <li>• Vulnerability scanning</li>
                      <li>• Incident response plan</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">Your Responsibilities</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Never share your payment information</li>
                    <li>• Use secure networks for transactions</li>
                    <li>• Report suspicious activities immediately</li>
                    <li>• Keep your account credentials secure</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nigerian">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img src="/images/coat_of_arm.png" alt="Nigeria" className="w-5 h-5" />
                  Nigerian Regulatory Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {complianceData?.ndpr && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">NDPR Compliance</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Nigerian Data Protection Regulation compliance
                          </p>
                          <Badge variant="secondary">
                            Registered with NITDA
                          </Badge>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">CBN Licensed</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Central Bank of Nigeria Payment Service Provider
                          </p>
                          <Badge variant="secondary">
                            PSP License Active
                          </Badge>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">NIBSS Integration</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Nigeria Inter-Bank Settlement System
                          </p>
                          <Badge variant="secondary">
                            Certified Participant
                          </Badge>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">Consumer Protection</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Full consumer protection framework
                          </p>
                          <Badge variant="secondary">
                            CBN Guidelines
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-900 mb-2">Regulatory Oversight</h3>
                      <div className="text-sm text-green-800 space-y-1">
                        <p><strong>Primary Regulator:</strong> Central Bank of Nigeria (CBN)</p>
                        <p><strong>Data Protection:</strong> Nigeria Data Protection Commission (NDPC)</p>
                        <p><strong>Consumer Protection:</strong> CBN Consumer Protection Department</p>
                        <p><strong>Complaints:</strong> contact@brillprime.com | CBN Consumer Help Desk</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


import { Router } from 'express';
import { db } from '../db';
import { users, auditLogs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { sanitizeInput } from '../middleware/validation';

const router = Router();

// Terms of Service versions
const TERMS_VERSIONS = {
  'v1.0': {
    version: 'v1.0',
    effectiveDate: '2024-01-01',
    content: `
# BrillPrime Terms of Service

## 1. Acceptance of Terms
By accessing or using BrillPrime services, you agree to be bound by these Terms of Service.

## 2. Service Description
BrillPrime provides multi-service delivery platform including:
- Commodity delivery services
- Fuel delivery services
- Digital payment processing
- Toll payment services

## 3. User Responsibilities
Users must:
- Provide accurate information
- Comply with local laws and regulations
- Use services in good faith
- Report security issues promptly

## 4. Payment Terms
- All payments are processed securely
- Fees are clearly disclosed before transactions
- Refunds subject to our refund policy

## 5. Data Protection
We comply with applicable data protection laws including GDPR and Nigerian Data Protection Regulation.

## 6. Limitation of Liability
BrillPrime's liability is limited to the maximum extent permitted by law.

## 7. Governing Law
These terms are governed by Nigerian law.

Last updated: January 1, 2024
    `,
    requiredAgreement: true
  }
};

// Privacy Policy
const PRIVACY_POLICY = {
  version: 'v1.0',
  lastUpdated: '2024-01-01',
  content: `
# BrillPrime Privacy Policy

## 1. Information We Collect
- Personal identification information
- Location data for delivery services
- Payment information
- Device and usage information

## 2. How We Use Information
- To provide and improve our services
- To process payments and deliveries
- To communicate with users
- To comply with legal obligations

## 3. Information Sharing
We do not sell personal information. We may share information:
- With service providers
- For legal compliance
- With user consent

## 4. Data Security
We implement appropriate security measures to protect personal information.

## 5. Your Rights
Under GDPR and Nigerian Data Protection Regulation, you have rights to:
- Access your data
- Correct inaccurate data
- Delete your data
- Data portability
- Object to processing

## 6. Contact Information
For privacy questions: privacy@brillprime.com

Last updated: January 1, 2024
  `
};

// Get current terms of service
router.get('/terms-of-service', async (req, res) => {
  try {
    const currentVersion = 'v1.0';
    const terms = TERMS_VERSIONS[currentVersion as keyof typeof TERMS_VERSIONS];

    res.json({
      success: true,
      terms: {
        ...terms,
        acceptanceRequired: !req.session?.userId || await checkTermsAcceptance(req.session.userId)
      }
    });

  } catch (error) {
    console.error('Terms of service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve terms of service'
    });
  }
});

// Accept terms of service
router.post('/accept-terms', requireAuth, sanitizeInput(), async (req, res) => {
  try {
    const userId = req.session!.userId!;
    const { version, ipAddress } = req.body;

    // Log terms acceptance
    await db.insert(auditLogs).values({
      userId,
      action: 'TERMS_ACCEPTANCE',
      resource: 'LEGAL_AGREEMENT',
      resourceId: version,
      newValues: JSON.stringify({
        version,
        acceptedAt: new Date().toISOString(),
        ipAddress: req.ip
      }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      success: true
    });

    res.json({
      success: true,
      message: 'Terms of service accepted successfully',
      acceptedVersion: version,
      acceptedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Terms acceptance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record terms acceptance'
    });
  }
});

// Get privacy policy
router.get('/privacy-policy', async (req, res) => {
  try {
    res.json({
      success: true,
      privacyPolicy: PRIVACY_POLICY
    });

  } catch (error) {
    console.error('Privacy policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve privacy policy'
    });
  }
});

// Cookie policy
router.get('/cookie-policy', async (req, res) => {
  try {
    const cookiePolicy = {
      version: 'v1.0',
      lastUpdated: '2024-01-01',
      essentialCookies: [
        { name: 'session', purpose: 'Authentication and security', duration: '30 minutes' },
        { name: 'csrf', purpose: 'CSRF protection', duration: 'Session' }
      ],
      analyticalCookies: [
        { name: 'analytics', purpose: 'Usage analytics', duration: '2 years', optional: true }
      ],
      userRights: [
        'You can control cookie preferences in your browser',
        'Essential cookies cannot be disabled',
        'Analytical cookies can be opted out'
      ]
    };

    res.json({
      success: true,
      cookiePolicy
    });

  } catch (error) {
    console.error('Cookie policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cookie policy'
    });
  }
});

// Data retention policy
router.get('/data-retention-policy', async (req, res) => {
  try {
    const retentionPolicy = {
      version: 'v1.0',
      lastUpdated: '2024-01-01',
      retentionPeriods: {
        userAccounts: '7 years after account closure',
        transactionData: '7 years (legal requirement)',
        locationData: '6 months',
        chatMessages: '2 years',
        auditLogs: '7 years',
        supportTickets: '3 years'
      },
      deletionProcess: [
        'Automated deletion after retention period',
        'Manual review for legal holds',
        'Secure data destruction methods',
        'Audit trail of deletions'
      ],
      exceptions: [
        'Legal obligations may require longer retention',
        'Active legal proceedings prevent deletion',
        'Fraud investigation data retained longer'
      ]
    };

    res.json({
      success: true,
      retentionPolicy
    });

  } catch (error) {
    console.error('Data retention policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve data retention policy'
    });
  }
});

async function checkTermsAcceptance(userId: number): Promise<boolean> {
  // Check if user has accepted current terms
  // This would check against a terms acceptance table
  return false; // Placeholder - implement based on your needs
}

export default router;

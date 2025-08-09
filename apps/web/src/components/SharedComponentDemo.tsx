/**
 * Demo component showcasing shared UI components and utilities
 */

import { useState } from 'react'
import { Button, Card, Badge, Text, View } from '@packages/shared-ui'
import { Platform, formatCurrency, validateEmail } from '@packages/shared'

const SharedComponentDemo = () => {
  const [email, setEmail] = useState('')
  const [validation, setValidation] = useState({ isValid: true, error: '' })

  const handleEmailValidation = () => {
    const result = validateEmail(email)
    setValidation(result)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-puzzle-piece mr-2 text-blue-600"></i>
            Shared Components Demo
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Platform detection */}
          <Card padding="md" shadow="sm">
            <Text variant="h5" className="mb-3">Platform Detection</Text>
            <div className="space-y-2 text-sm">
              <div><strong>Platform:</strong> {Platform.OS}</div>
              <div><strong>Is Web:</strong> {Platform.isWeb ? 'Yes' : 'No'}</div>
              <div><strong>Is Mobile:</strong> {Platform.isMobile ? 'Yes' : 'No'}</div>
              <div><strong>Is Desktop:</strong> {Platform.isDesktop ? 'Yes' : 'No'}</div>
            </div>
          </Card>

          {/* Shared Buttons */}
          <Card padding="md" shadow="sm">
            <Text variant="h5" className="mb-3">Shared Buttons</Text>
            <View className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">
                Primary Small
              </Button>
              <Button variant="secondary" size="md">
                Secondary Medium
              </Button>
              <Button variant="outline" size="lg">
                Outline Large
              </Button>
              <Button variant="primary" fullWidth>
                Full Width Button
              </Button>
            </View>
          </Card>

          {/* Badges */}
          <Card padding="md" shadow="sm">
            <Text variant="h5" className="mb-3">Shared Badges</Text>
            <View className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </View>
          </Card>

          {/* Validation Demo */}
          <Card padding="md" shadow="sm">
            <Text variant="h5" className="mb-3">Shared Validation</Text>
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email to validate"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="primary" onClick={handleEmailValidation}>
                Validate Email
              </Button>
              {!validation.isValid && (
                <div className="text-red-600 text-sm">
                  {validation.error}
                </div>
              )}
              {validation.isValid && email && (
                <div className="text-green-600 text-sm">
                  Email is valid!
                </div>
              )}
            </div>
          </Card>

          {/* Formatting Demo */}
          <Card padding="md" shadow="sm">
            <Text variant="h5" className="mb-3">Shared Formatters</Text>
            <div className="space-y-2 text-sm">
              <div><strong>Currency:</strong> {formatCurrency(1234.56)}</div>
              <div><strong>USD:</strong> {formatCurrency(1234.56, 'USD', 'en-US')}</div>
              <div><strong>NGN:</strong> {formatCurrency(1234.56, 'NGN', 'en-NG')}</div>
            </div>
          </Card>

          {/* Typography */}
          <Card padding="md" shadow="sm">
            <Text variant="h5" className="mb-3">Shared Typography</Text>
            <div className="space-y-2">
              <Text variant="h1">Heading 1</Text>
              <Text variant="h2">Heading 2</Text>
              <Text variant="h3">Heading 3</Text>
              <Text variant="body">Body text with normal weight</Text>
              <Text variant="caption" color="secondary">Caption text in secondary color</Text>
              <Text variant="overline">OVERLINE TEXT</Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SharedComponentDemo
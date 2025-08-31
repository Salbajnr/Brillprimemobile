import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RoleCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  features?: string[]
  isSelected?: boolean
  onSelect?: () => void
  className?: string
}

export function RoleCard({
  title,
  description,
  icon,
  features = [],
  isSelected = false,
  onSelect,
  className
}: RoleCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg",
        isSelected && "ring-2 ring-blue-600 border-blue-600",
        className
      )}
      onClick={onSelect}
    >
      <CardContent className="p-6 text-center">
        {icon && (
          <div className="mb-4 flex justify-center">
            {icon}
          </div>
        )}
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        {features.length > 0 && (
          <div className="mb-4">
            <ul className="text-sm text-gray-500 space-y-1">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center justify-center">
                  <span className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <Button 
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.()
          }}
        >
          {isSelected ? "Selected" : "Select Role"}
        </Button>
      </CardContent>
    </Card>
  )
}
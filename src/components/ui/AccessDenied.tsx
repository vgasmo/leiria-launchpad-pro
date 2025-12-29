import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  backTo?: string;
  backLabel?: string;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to view this content. Please contact an administrator if you believe this is an error.",
  backTo = "/my-workspaces",
  backLabel = "Back to Workspaces"
}: AccessDeniedProps) {
  return (
    <Card className="bg-muted/50 border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-6">
          <ShieldX className="h-12 w-12 text-destructive" />
        </div>
        <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          {message}
        </p>
        <Link to={backTo}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

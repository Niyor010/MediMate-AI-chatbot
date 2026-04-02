import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm mb-1">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <p className="text-muted-foreground text-xs mb-6">
              If this keeps happening, please refresh the page.
            </p>
            <Button
              onClick={this.handleReset}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
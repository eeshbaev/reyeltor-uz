/**
 * Error Boundary component for React Native
 * Catches and handles errors from child components to prevent white screen crashes
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { fixedColors } from '@/lib/design/colors';
import { spacing } from '@/lib/design/spacing';
import { typeSize } from '@/lib/design/typography';
import { logger } from '@/lib/logging/logger';

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary class component
 * Must be a class component to catch errors in React Native
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(
      `Error boundary caught: ${error.message}`,
      error,
      {
        context: this.props.context || 'ErrorBoundary',
        extra: {
          componentStack: errorInfo.componentStack,
        },
      },
    );
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (fallback) {
        return fallback(this.state.error, this.retry);
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          retry={this.retry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AppText variant="h2" color="accent" style={styles.errorIcon}>
          !
        </AppText>

        <AppText variant="h2" style={styles.title}>
          Something Went Wrong
        </AppText>

        <AppText
          variant="body"
          color="secondary"
          style={styles.message}
        >
          We encountered an unexpected error. Please try again.
        </AppText>

        {__DEV__ && (
          <AppText
            variant="micro"
            color="secondary"
            style={styles.errorDetails}
          >
            {error.message}
          </AppText>
        )}

        <Button label="Retry" onPress={retry} style={styles.retryButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: fixedColors.splash,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: typeSize.display * 1.4,
    lineHeight: typeSize.display * 1.6,
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorDetails: {
    marginBottom: spacing.md,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: spacing.sm,
    borderRadius: 4,
  },
  retryButton: {
    marginTop: spacing.md,
  },
});

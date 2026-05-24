import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { logger } from '../../services/logger';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LocalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(error, `Local_Error_Boundary: ${errorInfo.componentStack}`);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Widget error occurred</Text>
          <Text style={styles.errorText}>
            {this.props.errorMessage || 'This component failed to load.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: scale(16),
    marginVertical: scale(8),
    backgroundColor: '#FFF3F2',
    borderColor: '#FEE4E2',
    borderWidth: 1,
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#D92D20',
    marginBottom: scale(4),
  },
  errorText: {
    fontSize: scale(11),
    color: '#667085',
    textAlign: 'center',
    marginBottom: scale(10),
  },
  retryButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(6),
    backgroundColor: '#D92D20',
    borderRadius: scale(8),
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: scale(11),
    fontWeight: 'bold',
  },
});

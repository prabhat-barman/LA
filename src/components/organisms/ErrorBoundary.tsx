import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  DevSettings,
} from 'react-native';
import { logger } from '../../services/logger';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(error, `JS_Error_Boundary: ${errorInfo.componentStack}`);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    // Reload JS bundle
    if (__DEV__) {
      DevSettings.reload();
    } else {
      // In production, reset state. If a native restart package is not configured,
      // resetting the local boundary state is a safe fallback.
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown Error';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Warning Icon Graphic */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Text style={styles.iconText}>⚠️</Text>
              </View>
            </View>

            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.description}>
              An unexpected error occurred in the application. Our team has been notified.
            </Text>

            {/* Error Message Box */}
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>ERROR MESSAGE</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>

            {/* View Stack Trace Toggle */}
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => this.setState({ showDetails: !this.state.showDetails })}
            >
              <Text style={styles.detailsToggleText}>
                {this.state.showDetails ? 'Hide details' : 'Show details'}
              </Text>
            </TouchableOpacity>

            {this.state.showDetails && (
              <View style={styles.detailsContainer}>
                <ScrollView style={styles.detailsScroll} nestedScrollEnabled>
                  <Text style={styles.detailsText}>
                    {this.state.error?.stack}
                    {'\n\nComponent Stack:\n'}
                    {componentStack}
                  </Text>
                </ScrollView>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.reloadButton} onPress={this.handleReload}>
                <Text style={styles.reloadButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  container: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: scale(20),
  },
  iconBackground: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#FEE4E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: scale(32),
  },
  title: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1C1F2A',
    fontFamily: 'BricolageGrotesque-Bold',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  description: {
    fontSize: scale(13),
    color: '#667085',
    fontFamily: 'BricolageGrotesque-Regular',
    textAlign: 'center',
    marginBottom: scale(24),
    lineHeight: scale(18),
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#F2F4F7',
    marginBottom: scale(16),
  },
  errorLabel: {
    fontSize: scale(10),
    fontWeight: 'bold',
    color: '#F04438',
    fontFamily: 'BricolageGrotesque-Bold',
    letterSpacing: 0.5,
    marginBottom: scale(4),
  },
  errorMessage: {
    fontSize: scale(12),
    color: '#344054',
    fontFamily: 'BricolageGrotesque-Regular',
    lineHeight: scale(16),
  },
  detailsToggle: {
    paddingVertical: scale(8),
    marginBottom: scale(12),
  },
  detailsToggleText: {
    fontSize: scale(13),
    color: '#94C23C',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  detailsContainer: {
    width: '100%',
    height: scale(140),
    backgroundColor: '#1E293B',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(20),
  },
  detailsScroll: {
    flex: 1,
  },
  detailsText: {
    fontSize: scale(11),
    color: '#94A3B8',
    fontFamily: 'Courier',
  },
  actions: {
    width: '100%',
    marginTop: scale(10),
  },
  reloadButton: {
    backgroundColor: '#94C23C',
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  reloadButtonText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});

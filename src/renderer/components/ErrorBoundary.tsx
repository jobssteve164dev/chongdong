import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';
import { log } from '@/utils/logger';

const { Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error('React Error Boundary caught an error', { error, errorInfo }, 'ErrorBoundary');
    this.setState({ error, errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReport = (): void => {
    const { error, errorInfo } = this.state;
    const errorReport = {
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // 这里可以发送错误报告到服务器
    log.error('Error report', errorReport, 'ErrorBoundary');
    
    // 复制错误信息到剪贴板
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('错误信息已复制到剪贴板，请发送给开发团队');
      })
      .catch(() => {
        alert('无法复制错误信息，请手动记录错误详情');
      });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="应用出现错误"
          subTitle="抱歉，应用遇到了一个意外错误。"
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReload}>
              重新加载
            </Button>,
            <Button key="report" onClick={this.handleReport}>
              报告错误
            </Button>,
          ]}
        >
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <Text strong>错误详情：</Text>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 4, 
                overflow: 'auto',
                fontSize: 12,
                marginTop: 8 
              }}>
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

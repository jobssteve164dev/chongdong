import React from 'react';
import { Card } from 'antd';
import LogViewer from './LogViewer';

const ErrorMonitor: React.FC = () => {
  return (
    <Card title="日志查看器">
      <LogViewer autoRefresh={true} refreshInterval={5000} showFilters={true} showStats={true} />
    </Card>
  );
};

export default ErrorMonitor;

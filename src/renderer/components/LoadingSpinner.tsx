import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'default',
  text = '加载中...',
  fullScreen = false,
  className = '',
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  if (fullScreen) {
    return (
      <div className={`loading-fullscreen ${className}`}>
        <Spin indicator={antIcon} size={size} tip={text} />
      </div>
    );
  }

  return (
    <div className={`loading-container ${className}`}>
      <Spin indicator={antIcon} size={size} tip={text} />
    </div>
  );
};

export default LoadingSpinner;

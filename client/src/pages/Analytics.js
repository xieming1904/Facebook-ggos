import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, message, DatePicker } from 'antd';
import { BarChartOutlined, LineChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const { RangePicker } = DatePicker;

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    summary: {
      totalVisits: 0,
      uniqueVisitors: 0,
      conversionRate: 0,
      bounceRate: 0
    },
    chartData: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/dashboard');
      setAnalyticsData(response.data);
    } catch (error) {
      message.error('获取分析数据失败');
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/analytics/export?format=csv');
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics-data.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('数据导出成功');
    } catch (error) {
      message.error('数据导出失败');
      console.error('Export error:', error);
    }
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0 }}>数据分析</h2>
        <div>
          <RangePicker style={{ marginRight: 8 }} />
          <Button type="primary" onClick={handleExport}>
            导出数据
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总访问量"
              value={analyticsData.summary.totalVisits}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="独立访客"
              value={analyticsData.summary.uniqueVisitors}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="转化率"
              value={analyticsData.summary.conversionRate}
              suffix="%"
              prefix={<PieChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="跳出率"
              value={analyticsData.summary.bounceRate || 35}
              suffix="%"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="访问趋势" loading={loading}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analyticsData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="visits" 
                  stroke="#1890ff" 
                  name="访问量"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#52c41a" 
                  name="点击量"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Button, message } from 'antd';
import { 
  GlobalOutlined, 
  FileTextOutlined, 
  EyeOutlined, 
  ClickOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalDomains: 0,
      totalPages: 0,
      totalVisits: 0,
      totalClicks: 0,
      conversionRate: 0
    },
    chartData: [],
    topDomains: [],
    topPages: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      message.error('获取仪表盘数据失败');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const domainColumns = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
    },
    {
      title: '访问量',
      dataIndex: 'visits',
      key: 'visits',
      render: (text) => <span>{text || 0}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span style={{ 
          color: status === 'active' ? '#52c41a' : '#f5222d' 
        }}>
          {status === 'active' ? '正常' : '异常'}
        </span>
      ),
    },
  ];

  const pageColumns = [
    {
      title: '页面名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{ 
          color: type === 'main' ? '#1890ff' : '#722ed1' 
        }}>
          {type === 'main' ? '主页面' : type === 'cloak' ? '掩护页面' : '重定向'}
        </span>
      ),
    },
    {
      title: '浏览量',
      dataIndex: 'views',
      key: 'views',
      render: (text) => <span>{text || 0}</span>,
    },
    {
      title: '点击量',
      dataIndex: 'clicks',
      key: 'clicks',
      render: (text) => <span>{text || 0}</span>,
    },
  ];

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0 }}>仪表盘</h2>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />}
          onClick={fetchDashboardData}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总域名数"
              value={dashboardData.summary.totalDomains}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="落地页数"
              value={dashboardData.summary.totalPages}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总访问量"
              value={dashboardData.summary.totalVisits}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总点击量"
              value={dashboardData.summary.totalClicks}
              prefix={<ClickOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={16}>
          <Card title="访问趋势" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.chartData}>
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
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#52c41a" 
                  name="点击量"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="转化率" loading={loading}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress
                type="circle"
                percent={parseFloat(dashboardData.summary.conversionRate || 0)}
                format={(percent) => `${percent}%`}
                size={120}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <p style={{ marginTop: 16, fontSize: '16px', color: '#666' }}>
                点击转化率
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="热门域名" loading={loading}>
            <Table
              columns={domainColumns}
              dataSource={dashboardData.topDomains}
              pagination={false}
              size="small"
              rowKey="domain"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="热门页面" loading={loading}>
            <Table
              columns={pageColumns}
              dataSource={dashboardData.topPages}
              pagination={false}
              size="small"
              rowKey="name"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
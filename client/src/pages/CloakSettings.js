import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, message, Input, Form } from 'antd';
import { ShieldOutlined, BugOutlined, GlobalOutlined } from '@ant-design/icons';
import axios from 'axios';

const CloakSettings = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    cloakedRequests: 0,
    allowedRequests: 0,
    cloakRate: 0
  });
  const [testForm] = Form.useForm();

  useEffect(() => {
    fetchCloakStats();
  }, []);

  const fetchCloakStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/cloak/stats');
      setStats(response.data.stats);
    } catch (error) {
      message.error('获取Cloak统计失败');
      console.error('Fetch cloak stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestIp = async (values) => {
    try {
      const response = await axios.post('/api/cloak/test-ip', values);
      const result = response.data.result;
      
      message.success(`测试完成: ${result.shouldCloak ? '需要Cloak' : '不需要Cloak'}`);
    } catch (error) {
      message.error('IP测试失败');
      console.error('Test IP error:', error);
    }
  };

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '国家',
      dataIndex: 'country',
      key: 'country',
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      render: (action) => (
        <span style={{ color: action === 'cloaked' ? '#f5222d' : '#52c41a' }}>
          {action === 'cloaked' ? '已屏蔽' : '已允许'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总请求数"
              value={stats.totalRequests}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已屏蔽请求"
              value={stats.cloakedRequests}
              prefix={<ShieldOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="屏蔽率"
              value={stats.cloakRate}
              suffix="%"
              prefix={<BugOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="IP测试工具">
            <Form form={testForm} onFinish={handleTestIp} layout="vertical">
              <Form.Item
                label="IP地址"
                name="ip"
                rules={[{ required: true, message: '请输入IP地址' }]}
              >
                <Input placeholder="192.168.1.1" />
              </Form.Item>
              <Form.Item
                label="User-Agent"
                name="userAgent"
              >
                <Input placeholder="Mozilla/5.0..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  测试IP
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="访问日志" loading={loading}>
            <Table
              columns={logColumns}
              dataSource={[
                {
                  key: '1',
                  timestamp: new Date(),
                  ip: '173.252.64.15',
                  country: 'US',
                  action: 'cloaked'
                },
                {
                  key: '2',
                  timestamp: new Date(),
                  ip: '192.168.1.1',
                  country: 'CN',
                  action: 'allowed'
                }
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CloakSettings;
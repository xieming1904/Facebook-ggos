import React, { useState, useEffect } from 'react';
import { Card, Table, Button, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const LandingPages = () => {
  const [landingPages, setLandingPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLandingPages();
  }, []);

  const fetchLandingPages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/landing-pages');
      setLandingPages(response.data.landingPages);
    } catch (error) {
      message.error('获取落地页列表失败');
      console.error('Fetch landing pages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '页面名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          main: '主页面',
          cloak: '掩护页面',
          redirect: '重定向页面'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: '模板',
      dataIndex: 'template',
      key: 'template',
    },
    {
      title: '浏览量',
      dataIndex: ['analytics', 'views'],
      key: 'views',
      render: (views) => views || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div>
      <Card
        title="落地页管理"
        extra={
          <div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ marginRight: 8 }}
              onClick={() => message.info('创建功能开发中...')}
            >
              创建落地页
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchLandingPages}
              loading={loading}
            >
              刷新
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={landingPages}
          loading={loading}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default LandingPages;
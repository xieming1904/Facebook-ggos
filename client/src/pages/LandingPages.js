import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Space,
  Tag,
  Modal,
  Popconfirm,
  Tooltip,
  Input
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  CodeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import PageEditor from '../components/PageEditor';

const { Search } = Input;

const LandingPages = () => {
  const [landingPages, setLandingPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [searchText, setSearchText] = useState('');

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

  const handleCreatePage = () => {
    setEditingPage(null);
    setEditorVisible(true);
  };

  const handleEditPage = (page) => {
    setEditingPage(page);
    setEditorVisible(true);
  };

  const handleDeletePage = async (id) => {
    try {
      await axios.delete(`/api/landing-pages/${id}`);
      message.success('落地页删除成功');
      fetchLandingPages();
    } catch (error) {
      message.error('删除落地页失败');
      console.error('Delete page error:', error);
    }
  };

  const handleClonePage = async (page) => {
    try {
      await axios.post(`/api/landing-pages/${page._id}/clone`, {
        name: `${page.name} - 副本`
      });
      message.success('落地页复制成功');
      fetchLandingPages();
    } catch (error) {
      message.error('复制落地页失败');
      console.error('Clone page error:', error);
    }
  };

  const handleSavePage = async (pageData) => {
    try {
      if (editingPage) {
        await axios.put(`/api/landing-pages/${editingPage._id}`, pageData);
        message.success('落地页更新成功');
      } else {
        await axios.post('/api/landing-pages', pageData);
        message.success('落地页创建成功');
      }
      setEditorVisible(false);
      fetchLandingPages();
    } catch (error) {
      message.error(editingPage ? '更新失败' : '创建失败');
      console.error('Save page error:', error);
      throw error;
    }
  };

  const handlePreviewPage = (page) => {
    const previewUrl = `/page/${page._id}`;
    window.open(previewUrl, '_blank');
  };

  const filteredPages = landingPages.filter(page =>
    page.name.toLowerCase().includes(searchText.toLowerCase()) ||
    page.type.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '页面名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {!record.isActive && <Tag color="default" style={{ marginLeft: 8 }}>未启用</Tag>}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeConfig = {
          main: { color: 'blue', text: '主页面' },
          cloak: { color: 'purple', text: '掩护页面' },
          redirect: { color: 'orange', text: '重定向页面' }
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '模板',
      dataIndex: 'template',
      key: 'template',
      render: (template) => {
        const templateNames = {
          news: '新闻',
          blog: '博客',
          shop: '电商',
          corporate: '企业',
          custom: '自定义'
        };
        return templateNames[template] || template;
      }
    },
    {
      title: '统计数据',
      key: 'analytics',
      render: (_, record) => (
        <div>
          <div>浏览: {record.analytics?.views || 0}</div>
          <div>点击: {record.analytics?.clicks || 0}</div>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="预览">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreviewPage(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditPage(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleClonePage(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个落地页吗？"
            onConfirm={() => handleDeletePage(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="落地页管理"
        extra={
          <Space>
            <Search
              placeholder="搜索页面名称或类型"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreatePage}
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
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredPages}
          loading={loading}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSize: 10,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <CodeOutlined />
            {editingPage ? '编辑落地页' : '创建落地页'}
          </Space>
        }
        open={editorVisible}
        onCancel={() => setEditorVisible(false)}
        footer={null}
        width="95%"
        style={{ top: 20 }}
        bodyStyle={{ padding: 0, height: '85vh' }}
        maskClosable={false}
        destroyOnClose={true}
      >
        <PageEditor
          landingPage={editingPage}
          onSave={handleSavePage}
        />
      </Modal>
    </div>
  );
};

export default LandingPages;
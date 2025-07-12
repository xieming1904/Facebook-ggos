import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const Domains = () => {
  const [domains, setDomains] = useState([]);
  const [landingPages, setLandingPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDomains();
    fetchLandingPages();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/domains');
      setDomains(response.data.domains);
    } catch (error) {
      message.error('获取域名列表失败');
      console.error('Fetch domains error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLandingPages = async () => {
    try {
      const response = await axios.get('/api/landing-pages');
      setLandingPages(response.data.landingPages);
    } catch (error) {
      console.error('Fetch landing pages error:', error);
    }
  };

  const handleAddDomain = () => {
    setEditingDomain(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditDomain = (domain) => {
    setEditingDomain(domain);
    form.setFieldsValue({
      domain: domain.domain,
      sslEnabled: domain.sslEnabled,
      redirectUrl: domain.redirectUrl,
      cloakEnabled: domain.cloakEnabled,
      cloakPage: domain.cloakPage?._id,
      mainPage: domain.mainPage?._id,
      status: domain.status
    });
    setModalVisible(true);
  };

  const handleDeleteDomain = async (id) => {
    try {
      await axios.delete(`/api/domains/${id}`);
      message.success('域名删除成功');
      fetchDomains();
    } catch (error) {
      message.error('删除域名失败');
      console.error('Delete domain error:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingDomain) {
        await axios.put(`/api/domains/${editingDomain._id}`, values);
        message.success('域名更新成功');
      } else {
        await axios.post('/api/domains', values);
        message.success('域名创建成功');
      }
      setModalVisible(false);
      fetchDomains();
    } catch (error) {
      message.error(editingDomain ? '更新域名失败' : '创建域名失败');
      console.error('Submit domain error:', error);
    }
  };

  const handleCheckStatus = async (domain) => {
    try {
      await axios.post(`/api/domains/${domain._id}/check-status`);
      message.success('域名状态检查完成');
      fetchDomains();
    } catch (error) {
      message.error('检查域名状态失败');
      console.error('Check status error:', error);
    }
  };

  const columns = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.sslEnabled && <Tag color="green" style={{ marginLeft: 8 }}>SSL</Tag>}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'active' ? 'green' :
          status === 'inactive' ? 'red' :
          status === 'blocked' ? 'orange' : 'default'
        }>
          {status === 'active' ? '正常' :
           status === 'inactive' ? '禁用' :
           status === 'blocked' ? '被封' : '待审核'}
        </Tag>
      ),
    },
    {
      title: 'Cloak',
      dataIndex: 'cloakEnabled',
      key: 'cloakEnabled',
      render: (enabled) => (
        <Tag color={enabled ? 'blue' : 'default'}>
          {enabled ? '已启用' : '未启用'}
        </Tag>
      ),
    },
    {
      title: '掩护页面',
      dataIndex: 'cloakPage',
      key: 'cloakPage',
      render: (page) => page ? page.name : '-',
    },
    {
      title: '主页面',
      dataIndex: 'mainPage',
      key: 'mainPage',
      render: (page) => page ? page.name : '-',
    },
    {
      title: '访问量',
      dataIndex: ['analytics', 'totalVisits'],
      key: 'visits',
      render: (visits) => visits || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="查看统计">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewStats(record)}
            />
          </Tooltip>
          <Tooltip title="检查状态">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCheckStatus(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditDomain(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个域名吗？"
            onConfirm={() => handleDeleteDomain(record._id)}
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

  const handleViewStats = (domain) => {
    // TODO: 实现统计查看功能
    message.info('统计功能开发中...');
  };

  return (
    <div>
      <Card
        title="域名管理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddDomain}
            >
              添加域名
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchDomains}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={domains}
          loading={loading}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingDomain ? '编辑域名' : '添加域名'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="域名"
            name="domain"
            rules={[
              { required: true, message: '请输入域名' },
              { pattern: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, message: '请输入有效的域名' }
            ]}
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item
            label="SSL证书"
            name="sslEnabled"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="重定向URL"
            name="redirectUrl"
          >
            <Input placeholder="https://example.com/redirect" />
          </Form.Item>

          <Form.Item
            label="启用Cloak"
            name="cloakEnabled"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="掩护页面"
            name="cloakPage"
          >
            <Select placeholder="选择掩护页面" allowClear>
              {landingPages.filter(page => page.type === 'cloak').map(page => (
                <Option key={page._id} value={page._id}>{page.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="主页面"
            name="mainPage"
          >
            <Select placeholder="选择主页面" allowClear>
              {landingPages.filter(page => page.type === 'main').map(page => (
                <Option key={page._id} value={page._id}>{page.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            initialValue="pending"
          >
            <Select>
              <Option value="active">正常</Option>
              <Option value="inactive">禁用</Option>
              <Option value="blocked">被封</Option>
              <Option value="pending">待审核</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Domains;
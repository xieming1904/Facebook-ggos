import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Switch,
  Button,
  message,
  Divider,
  Row,
  Col,
  Select,
  InputNumber,
  Table,
  Tag,
  Space,
  Modal,
  Upload,
  Progress,
  Tooltip,
  Badge,
  DatePicker,
  Popconfirm
} from 'antd';
import {
  SettingOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClearOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { RangePicker } = DatePicker;

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [logViewerVisible, setLogViewerVisible] = useState(false);
  const [systemInfo, setSystemInfo] = useState({});
  const [backupProgress, setBackupProgress] = useState(0);
  const [logFiles, setLogFiles] = useState([]);
  const [logStats, setLogStats] = useState({});
  const [selectedLogFile, setSelectedLogFile] = useState(null);
  const [logContent, setLogContent] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const [generalForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [cloakForm] = Form.useForm();

  useEffect(() => {
    fetchSystemInfo();
    fetchSettings();
    fetchLogFiles();
    fetchLogStats();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/health');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Fetch system info error:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data.settings) {
        generalForm.setFieldsValue(response.data.settings.general || {});
        securityForm.setFieldsValue(response.data.settings.security || {});
        cloakForm.setFieldsValue(response.data.settings.cloak || {});
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
    }
  };

  const fetchLogFiles = async () => {
    try {
      const response = await axios.get('/api/logs/files');
      setLogFiles(response.data.files || []);
    } catch (error) {
      console.error('Fetch log files error:', error);
    }
  };

  const fetchLogStats = async () => {
    try {
      const response = await axios.get('/api/logs/stats');
      setLogStats(response.data.stats || {});
    } catch (error) {
      console.error('Fetch log stats error:', error);
    }
  };

  const handleSaveGeneral = async (values) => {
    try {
      setLoading(true);
      await axios.put('/api/settings/general', values);
      message.success('通用设置保存成功');
    } catch (error) {
      message.error('保存失败');
      console.error('Save general settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async (values) => {
    try {
      setLoading(true);
      await axios.put('/api/settings/security', values);
      message.success('安全设置保存成功');
    } catch (error) {
      message.error('保存失败');
      console.error('Save security settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCloak = async (values) => {
    try {
      setLoading(true);
      await axios.put('/api/settings/cloak', values);
      message.success('Cloak设置保存成功');
    } catch (error) {
      message.error('保存失败');
      console.error('Save cloak settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupProgress(0);
      
      // 模拟备份进度
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await axios.post('/api/system/backup', {}, {
        responseType: 'blob'
      });
      
      setBackupProgress(100);
      clearInterval(interval);
      
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      message.success('备份下载成功');
    } catch (error) {
      message.error('备份失败');
      console.error('Backup error:', error);
    } finally {
      setBackupLoading(false);
      setTimeout(() => setBackupProgress(0), 2000);
    }
  };

  const handleRestore = async (file) => {
    const formData = new FormData();
    formData.append('backup', file);
    
    try {
      await axios.post('/api/system/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      message.success('恢复成功，请重新登录');
      setRestoreModalVisible(false);
      // 延迟刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      message.error('恢复失败');
      console.error('Restore error:', error);
    }
    
    return false; // 阻止自动上传
  };

  const handleViewLog = async (file) => {
    try {
      setLogLoading(true);
      setSelectedLogFile(file);
      const response = await axios.get(`/api/logs/content/${file.name}`, {
        params: { limit: 100 }
      });
      setLogContent(response.data.logs || []);
      setLogViewerVisible(true);
    } catch (error) {
      message.error('读取日志失败');
      console.error('View log error:', error);
    } finally {
      setLogLoading(false);
    }
  };

  const handleDeleteLog = async (filename) => {
    try {
      await axios.delete(`/api/logs/files/${filename}`);
      message.success('日志文件删除成功');
      fetchLogFiles();
      fetchLogStats();
    } catch (error) {
      message.error('删除日志失败');
      console.error('Delete log error:', error);
    }
  };

  const handleClearLog = async (filename) => {
    try {
      await axios.post(`/api/logs/clear/${filename}`);
      message.success('日志文件清空成功');
      fetchLogFiles();
      fetchLogStats();
    } catch (error) {
      message.error('清空日志失败');
      console.error('Clear log error:', error);
    }
  };

  const handleDownloadLog = (filename) => {
    const link = document.createElement('a');
    link.href = `/api/logs/download/${filename}`;
    link.download = filename;
    link.click();
  };

  const systemColumns = [
    {
      title: '项目',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (value, record) => {
        if (record.key === '状态') {
          return <Tag color="green">{value}</Tag>;
        }
        return value;
      }
    }
  ];

  const logColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          <div style={{ fontSize: '12px', color: '#666' }}>
            大小: {record.sizeFormatted}
          </div>
        </div>
      )
    },
    {
      title: '修改时间',
      dataIndex: 'modified',
      key: 'modified',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewLog(record)}
            />
          </Tooltip>
          <Tooltip title="下载">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadLog(record.name)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要清空这个日志文件吗？"
            onConfirm={() => handleClearLog(record.name)}
          >
            <Tooltip title="清空">
              <Button
                type="text"
                icon={<ClearOutlined />}
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="确定要删除这个日志文件吗？"
            onConfirm={() => handleDeleteLog(record.name)}
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
      )
    }
  ];

  const logContentColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => moment(timestamp).format('MM-DD HH:mm:ss')
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => {
        const colors = {
          error: 'red',
          warn: 'orange',
          info: 'blue',
          debug: 'gray'
        };
        return <Tag color={colors[level] || 'default'}>{level}</Tag>;
      }
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.meta && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {JSON.stringify(record.meta)}
            </div>
          )}
        </div>
      )
    }
  ];

  const systemData = [
    { key: '状态', value: systemInfo.status || 'unknown' },
    { key: 'Node.js版本', value: systemInfo.system?.nodeVersion || '-' },
    { key: '平台', value: systemInfo.system?.platform || '-' },
    { key: '架构', value: systemInfo.system?.arch || '-' },
    { key: '运行时间', value: systemInfo.system?.uptime || '-' },
    { key: '内存使用', value: systemInfo.memory ? `${systemInfo.memory.heapUsed}MB / ${systemInfo.memory.heapTotal}MB` : '-' },
    { key: '数据库状态', value: systemInfo.database || '-' }
  ];

  return (
    <div>
      <Card title="系统设置">
        <Tabs defaultActiveKey="general">
          <TabPane tab={<span><SettingOutlined />通用设置</span>} key="general">
            <Form
              form={generalForm}
              layout="vertical"
              onFinish={handleSaveGeneral}
              initialValues={{
                siteName: 'Facebook广告系统',
                siteDescription: '专业的广告落地页管理系统',
                maxFileSize: 10,
                allowedFileTypes: 'jpg,jpeg,png,gif,pdf,zip',
                emailNotifications: true,
                autoBackup: false,
                backupRetention: 30
              }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="网站名称" name="siteName">
                    <Input placeholder="输入网站名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="网站描述" name="siteDescription">
                    <Input placeholder="输入网站描述" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="最大文件上传大小 (MB)" name="maxFileSize">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="允许的文件类型" name="allowedFileTypes">
                    <Input placeholder="用逗号分隔，如: jpg,png,pdf" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>通知设置</Divider>

              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="邮件通知" name="emailNotifications" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="自动备份" name="autoBackup" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="备份保留天数" name="backupRetention">
                    <InputNumber min={1} max={365} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存通用设置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span><SecurityScanOutlined />安全设置</span>} key="security">
            <Form
              form={securityForm}
              layout="vertical"
              onFinish={handleSaveSecurity}
              initialValues={{
                loginAttempts: 5,
                lockoutDuration: 30,
                sessionTimeout: 24,
                enableTwoFactor: false,
                passwordMinLength: 8,
                forceHttps: true,
                rateLimitRequests: 100,
                rateLimitWindow: 15
              }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="登录失败次数限制" name="loginAttempts">
                    <InputNumber min={3} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="账户锁定时间 (分钟)" name="lockoutDuration">
                    <InputNumber min={5} max={120} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="会话超时 (小时)" name="sessionTimeout">
                    <InputNumber min={1} max={72} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="密码最小长度" name="passwordMinLength">
                    <InputNumber min={6} max={20} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>访问控制</Divider>

              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="启用双因素认证" name="enableTwoFactor" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="强制HTTPS" name="forceHttps" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="限流窗口 (分钟)" name="rateLimitWindow">
                    <InputNumber min={1} max={60} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="限流请求数" name="rateLimitRequests">
                <InputNumber min={10} max={1000} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存安全设置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span><SecurityScanOutlined />Cloak配置</span>} key="cloak">
            <Form
              form={cloakForm}
              layout="vertical"
              onFinish={handleSaveCloak}
              initialValues={{
                enableCloak: true,
                detectionSensitivity: 'medium',
                autoUpdateRules: true,
                logRetention: 30,
                blockUnknownBots: false
              }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="启用Cloak功能" name="enableCloak" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="检测敏感度" name="detectionSensitivity">
                    <Select>
                      <Option value="low">低 - 仅检测明确的FB爬虫</Option>
                      <Option value="medium">中 - 平衡检测</Option>
                      <Option value="high">高 - 严格检测</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item label="自动更新规则" name="autoUpdateRules" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="屏蔽未知爬虫" name="blockUnknownBots" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="日志保留天数" name="logRetention">
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="自定义User-Agent规则" name="customUserAgents">
                <TextArea 
                  rows={4} 
                  placeholder="每行一个规则，支持正则表达式"
                />
              </Form.Item>

              <Form.Item label="自定义IP规则" name="customIpRules">
                <TextArea 
                  rows={4} 
                  placeholder="每行一个IP或IP段，如: 192.168.1.1 或 192.168.1.0/24"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存Cloak配置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span><DatabaseOutlined />系统信息</span>} key="system">
            <Row gutter={24}>
              <Col span={12}>
                <Card title="系统状态" size="small">
                  <Table
                    columns={systemColumns}
                    dataSource={systemData}
                    pagination={false}
                    size="small"
                    showHeader={false}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="数据备份" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleBackup}
                      loading={backupLoading}
                      block
                    >
                      {backupLoading ? '备份中...' : '立即备份'}
                    </Button>
                    
                    {backupProgress > 0 && (
                      <Progress percent={backupProgress} status={backupProgress === 100 ? 'success' : 'active'} />
                    )}
                    
                    <Button
                      icon={<CloudUploadOutlined />}
                      onClick={() => setRestoreModalVisible(true)}
                      block
                    >
                      恢复备份
                    </Button>
                    
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <p>• 备份包含所有数据库数据和配置文件</p>
                      <p>• 建议定期备份重要数据</p>
                      <p>• 恢复操作会覆盖当前所有数据</p>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span><FileTextOutlined />日志管理</span>} key="logs">
            <Row gutter={24} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                      {logStats.files || 0}
                    </div>
                    <div style={{ color: '#666' }}>日志文件</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                      {logStats.totalSizeFormatted || '0 MB'}
                    </div>
                    <div style={{ color: '#666' }}>总大小</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa541c' }}>
                      {logStats.logCounts?.error || 0}
                    </div>
                    <div style={{ color: '#666' }}>错误日志</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                      {logStats.logCounts?.warn || 0}
                    </div>
                    <div style={{ color: '#666' }}>警告日志</div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card
              title="日志文件列表"
              extra={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    fetchLogFiles();
                    fetchLogStats();
                  }}
                >
                  刷新
                </Button>
              }
            >
              <Table
                columns={logColumns}
                dataSource={logFiles}
                rowKey="name"
                size="small"
                pagination={{
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 个文件`
                }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="恢复备份"
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          <strong>警告：恢复操作将覆盖所有现有数据，请谨慎操作！</strong>
        </div>
        
        <Dragger
          name="backup"
          multiple={false}
          accept=".zip"
          beforeUpload={handleRestore}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽备份文件到此区域</p>
          <p className="ant-upload-hint">仅支持 .zip 格式的备份文件</p>
        </Dragger>
      </Modal>

      <Modal
        title={`查看日志 - ${selectedLogFile?.name}`}
        open={logViewerVisible}
        onCancel={() => setLogViewerVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <Table
          columns={logContentColumns}
          dataSource={logContent}
          loading={logLoading}
          size="small"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条日志`
          }}
          scroll={{ y: 400 }}
        />
      </Modal>
    </div>
  );
};

export default Settings;
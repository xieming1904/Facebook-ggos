import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Tooltip,
  Progress,
  Statistic,
  Row,
  Col,
  Divider,
  Popconfirm,
  Badge
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  BarChartOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const ABTests = () => {
  const [abTests, setAbTests] = useState([]);
  const [landingPages, setLandingPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [statisticsModalVisible, setStatisticsModalVisible] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testStatistics, setTestStatistics] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  
  const [form] = Form.useForm();

  useEffect(() => {
    fetchABTests();
    fetchLandingPages();
  }, []);

  const fetchABTests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ab-tests');
      setAbTests(response.data.abTests);
    } catch (error) {
      message.error('获取A/B测试列表失败');
      console.error('Fetch AB tests error:', error);
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

  const handleCreateTest = () => {
    setEditingTest(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    form.setFieldsValue({
      ...test,
      variants: test.variants.map(v => ({
        ...v,
        landingPageId: v.landingPageId._id || v.landingPageId
      }))
    });
    setModalVisible(true);
  };

  const handleSaveTest = async (values) => {
    try {
      if (editingTest) {
        await axios.put(`/api/ab-tests/${editingTest._id}`, values);
        message.success('A/B测试更新成功');
      } else {
        await axios.post('/api/ab-tests', values);
        message.success('A/B测试创建成功');
      }
      setModalVisible(false);
      fetchABTests();
    } catch (error) {
      message.error(editingTest ? '更新失败' : '创建失败');
      console.error('Save AB test error:', error);
    }
  };

  const handleStartTest = async (testId) => {
    try {
      await axios.post(`/api/ab-tests/${testId}/start`);
      message.success('A/B测试启动成功');
      fetchABTests();
    } catch (error) {
      message.error('启动失败');
      console.error('Start test error:', error);
    }
  };

  const handlePauseTest = async (testId) => {
    try {
      await axios.post(`/api/ab-tests/${testId}/pause`);
      message.success('A/B测试暂停成功');
      fetchABTests();
    } catch (error) {
      message.error('暂停失败');
      console.error('Pause test error:', error);
    }
  };

  const handleStopTest = async (testId) => {
    try {
      await axios.post(`/api/ab-tests/${testId}/stop`);
      message.success('A/B测试停止成功');
      fetchABTests();
    } catch (error) {
      message.error('停止失败');
      console.error('Stop test error:', error);
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      await axios.delete(`/api/ab-tests/${testId}`);
      message.success('A/B测试删除成功');
      fetchABTests();
    } catch (error) {
      message.error('删除失败');
      console.error('Delete test error:', error);
    }
  };

  const handleCloneTest = async (testId) => {
    try {
      await axios.post(`/api/ab-tests/${testId}/clone`);
      message.success('A/B测试复制成功');
      fetchABTests();
    } catch (error) {
      message.error('复制失败');
      console.error('Clone test error:', error);
    }
  };

  const handleViewStatistics = async (test) => {
    try {
      setSelectedTest(test);
      const response = await axios.get(`/api/ab-tests/${test._id}/statistics`);
      setTestStatistics(response.data.statistics);
      setStatisticsModalVisible(true);
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('Get statistics error:', error);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      draft: 'default',
      running: 'processing',
      paused: 'warning',
      completed: 'success'
    };
    return statusMap[status] || 'default';
  };

  const getStatusText = (status) => {
    const statusMap = {
      draft: '草稿',
      running: '运行中',
      paused: '已暂停',
      completed: '已完成'
    };
    return statusMap[status] || status;
  };

  const columns = [
    {
      title: '测试名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {record.description}
            </div>
          )}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: '变体数量',
      dataIndex: 'variants',
      key: 'variants',
      render: (variants) => (
        <Badge count={variants?.length || 0} showZero />
      )
    },
    {
      title: '访问量',
      dataIndex: ['statistics', 'totalVisitors'],
      key: 'visitors',
      render: (visitors) => visitors || 0
    },
    {
      title: '转化率',
      key: 'conversionRate',
      render: (_, record) => {
        const stats = record.statistics?.variantStats;
        if (!stats || stats.length === 0) return '-';
        
        const avgRate = stats.reduce((sum, s) => sum + (s.conversionRate || 0), 0) / stats.length;
        return `${(avgRate * 100).toFixed(2)}%`;
      }
    },
    {
      title: '进度',
      key: 'progress',
      render: (_, record) => {
        if (record.status !== 'running') return '-';
        
        const now = new Date();
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        const duration = end - start;
        const elapsed = now - start;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        return (
          <Progress
            percent={progress}
            size="small"
            format={() => `${Math.round(progress)}%`}
          />
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看统计">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              onClick={() => handleViewStatistics(record)}
            />
          </Tooltip>
          
          {record.status === 'draft' || record.status === 'paused' ? (
            <Tooltip title="启动测试">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartTest(record._id)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          ) : null}
          
          {record.status === 'running' ? (
            <Tooltip title="暂停测试">
              <Button
                type="text"
                icon={<PauseCircleOutlined />}
                onClick={() => handlePauseTest(record._id)}
                style={{ color: '#faad14' }}
              />
            </Tooltip>
          ) : null}
          
          {record.status === 'running' || record.status === 'paused' ? (
            <Tooltip title="停止测试">
              <Button
                type="text"
                icon={<StopOutlined />}
                onClick={() => handleStopTest(record._id)}
                style={{ color: '#ff4d4f' }}
              />
            </Tooltip>
          ) : null}
          
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditTest(record)}
              disabled={record.status === 'running'}
            />
          </Tooltip>
          
          <Tooltip title="复制">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCloneTest(record._id)}
            />
          </Tooltip>
          
          <Popconfirm
            title="确定要删除这个A/B测试吗？"
            onConfirm={() => handleDeleteTest(record._id)}
            disabled={record.status === 'running'}
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={record.status === 'running'}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title="A/B测试管理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateTest}
            >
              创建A/B测试
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchABTests}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={abTests}
          loading={loading}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSize: 10
          }}
        />
      </Card>

      {/* 创建/编辑A/B测试模态框 */}
      <Modal
        title={editingTest ? '编辑A/B测试' : '创建A/B测试'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTest}
          initialValues={{
            type: 'page_variant',
            config: {
              trafficSplit: 50,
              duration: 7,
              minSampleSize: 100,
              confidenceLevel: 95
            },
            variants: [
              { name: '控制组', weight: 50, isControl: true },
              { name: '变体A', weight: 50, isControl: false }
            ],
            goals: [
              { name: '点击转化', type: 'click', target: '.cta-button', isPrimary: true }
            ]
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="测试名称"
                name="name"
                rules={[{ required: true, message: '请输入测试名称' }]}
              >
                <Input placeholder="输入测试名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="测试类型" name="type">
                <Select>
                  <Option value="page_variant">页面变体测试</Option>
                  <Option value="traffic_split">流量分配测试</Option>
                  <Option value="conversion_funnel">转化漏斗测试</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="测试描述（可选）" />
          </Form.Item>

          <Divider>测试配置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="流量分配 (%)" name={['config', 'trafficSplit']}>
                <InputNumber min={1} max={99} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="测试时长 (天)" name={['config', 'duration']}>
                <InputNumber min={1} max={90} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="最小样本量" name={['config', 'minSampleSize']}>
                <InputNumber min={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="置信水平 (%)" name={['config', 'confidenceLevel']}>
            <InputNumber min={80} max={99} style={{ width: '100%' }} />
          </Form.Item>

          <Divider>测试变体</Divider>

          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="变体名称"
                          rules={[{ required: true, message: '请输入变体名称' }]}
                        >
                          <Input placeholder="变体名称" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'landingPageId']}
                          label="落地页"
                          rules={[{ required: true, message: '请选择落地页' }]}
                        >
                          <Select placeholder="选择落地页">
                            {landingPages.map(page => (
                              <Option key={page._id} value={page._id}>
                                {page.name}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'weight']}
                          label="权重 (%)"
                          rules={[{ required: true, message: '请输入权重' }]}
                        >
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Form.Item label=" ">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            disabled={fields.length <= 2}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ name: '', weight: 0, isControl: false })}
                  icon={<PlusOutlined />}
                  style={{ width: '100%' }}
                >
                  添加变体
                </Button>
              </>
            )}
          </Form.List>

          <Divider>转化目标</Divider>

          <Form.List name="goals">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="目标名称"
                          rules={[{ required: true, message: '请输入目标名称' }]}
                        >
                          <Input placeholder="目标名称" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'type']}
                          label="目标类型"
                          rules={[{ required: true, message: '请选择目标类型' }]}
                        >
                          <Select placeholder="选择类型">
                            <Option value="click">点击转化</Option>
                            <Option value="conversion">页面转化</Option>
                            <Option value="engagement">用户参与</Option>
                            <Option value="custom">自定义</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'target']}
                          label="目标选择器"
                          rules={[{ required: true, message: '请输入目标选择器' }]}
                        >
                          <Input placeholder="CSS选择器或URL" />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Form.Item label=" ">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            disabled={fields.length <= 1}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ name: '', type: 'click', target: '', isPrimary: false })}
                  icon={<PlusOutlined />}
                  style={{ width: '100%' }}
                >
                  添加目标
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTest ? '更新测试' : '创建测试'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 统计数据模态框 */}
      <Modal
        title={`测试统计 - ${selectedTest?.name}`}
        open={statisticsModalVisible}
        onCancel={() => setStatisticsModalVisible(false)}
        width={900}
        footer={null}
      >
        {testStatistics && (
          <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="总访问量"
                  value={testStatistics.totalVisitors}
                  prefix={<EyeOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="变体数量"
                  value={testStatistics.variantStats?.length || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="置信水平"
                  value={selectedTest?.config?.confidenceLevel || 95}
                  suffix="%"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="统计显著性"
                  value={testStatistics.analysis?.significant ? '是' : '否'}
                  valueStyle={{ 
                    color: testStatistics.analysis?.significant ? '#3f8600' : '#cf1322' 
                  }}
                />
              </Col>
            </Row>

            <Divider>变体表现</Divider>

            <Table
              dataSource={testStatistics.variantStats}
              pagination={false}
              size="small"
              columns={[
                {
                  title: '变体',
                  key: 'variant',
                  render: (_, record, index) => {
                    const variant = selectedTest?.variants?.[index];
                    return (
                      <div>
                        <strong>{variant?.name}</strong>
                        {variant?.isControl && <Tag color="blue" style={{ marginLeft: 8 }}>控制组</Tag>}
                      </div>
                    );
                  }
                },
                {
                  title: '访问量',
                  dataIndex: 'visitors',
                  key: 'visitors'
                },
                {
                  title: '转化量',
                  dataIndex: 'conversions',
                  key: 'conversions'
                },
                {
                  title: '转化率',
                  dataIndex: 'conversionRate',
                  key: 'conversionRate',
                  render: (rate) => `${(rate * 100).toFixed(2)}%`
                },
                {
                  title: '收入',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  render: (revenue) => `¥${revenue.toFixed(2)}`
                },
                {
                  title: '跳出率',
                  dataIndex: 'bounceRate',
                  key: 'bounceRate',
                  render: (rate) => `${(rate * 100).toFixed(2)}%`
                }
              ]}
            />

            {testStatistics.analysis && (
              <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6ffed', borderRadius: 6 }}>
                <h4>统计分析结果</h4>
                <p>P值: {testStatistics.analysis.pValue?.toFixed(4)}</p>
                <p>Z分数: {testStatistics.analysis.zScore?.toFixed(4)}</p>
                <p>改进幅度: {testStatistics.analysis.improvement?.toFixed(2)}%</p>
                <p>
                  结论: {testStatistics.analysis.significant ? 
                    '测试结果具有统计显著性' : 
                    '测试结果暂无统计显著性，建议继续收集数据'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ABTests;
import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Timeline, Table, Alert,
  Typography, Space, Tag, Tooltip, Button, Select, DatePicker,
  Switch, Modal, notification, Spin, Badge
} from 'antd';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import {
  DashboardOutlined, UserOutlined, EyeOutlined, DollarOutlined,
  TrophyOutlined, AlertOutlined, FireOutlined, ThunderboltOutlined,
  ClockCircleOutlined, TeamOutlined, GlobalOutlined, BarChartOutlined,
  LineChartOutlined, PieChartOutlined, FullscreenOutlined, SettingOutlined,
  ReloadOutlined, ExportOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './Dashboard.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 秒
  const [dateRange, setDateRange] = useState([
    moment().subtract(7, 'days'),
    moment()
  ]);
  
  // 数据状态
  const [metrics, setMetrics] = useState({
    totalVisitors: 0,
    totalConversions: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgSessionDuration: 0,
    activeLandingPages: 0,
    runningABTests: 0,
    activeAutomations: 0
  });
  
  const [chartData, setChartData] = useState({
    visitors: [],
    conversions: [],
    revenue: [],
    deviceTypes: [],
    trafficSources: [],
    topPages: [],
    abTestResults: [],
    automationTriggers: []
  });
  
  const [realtimeData, setRealtimeData] = useState({
    onlineUsers: 0,
    currentVisitors: [],
    recentConversions: [],
    systemAlerts: [],
    queueStats: {},
    serverStats: {}
  });
  
  const wsRef = useRef(null);
  const refreshTimer = useRef(null);

  // WebSocket连接
  useEffect(() => {
    const connectWebSocket = () => {
      const token = localStorage.getItem('token');
      const wsUrl = `ws://localhost:5000/ws?token=${token}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        // 订阅实时数据
        wsRef.current.send(JSON.stringify({
          type: 'subscribe_analytics',
          data: { global: true }
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // 处理WebSocket消息
  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'analytics_update':
        setRealtimeData(prev => ({
          ...prev,
          onlineUsers: message.data.onlineUsers || prev.onlineUsers,
          currentVisitors: message.data.visitors || prev.currentVisitors
        }));
        break;
        
      case 'conversion_event':
        setRealtimeData(prev => ({
          ...prev,
          recentConversions: [message.data, ...prev.recentConversions.slice(0, 9)]
        }));
        notification.success({
          message: '新转化！',
          description: `页面 ${message.data.pageName} 产生了一个转化，价值 ¥${message.data.value}`,
          placement: 'topRight'
        });
        break;
        
      case 'system_alert':
        setRealtimeData(prev => ({
          ...prev,
          systemAlerts: [message.data, ...prev.systemAlerts.slice(0, 4)]
        }));
        notification.warning({
          message: '系统告警',
          description: message.data.message,
          placement: 'topRight'
        });
        break;
        
      default:
        break;
    }
  };

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshTimer.current = setInterval(() => {
        refreshData();
      }, refreshInterval * 1000);
    } else {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    }
    
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // 初始化数据加载
  useEffect(() => {
    loadInitialData();
  }, [dateRange]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadChartData(),
        loadRealtimeData()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      notification.error({
        message: '数据加载失败',
        description: '请检查网络连接并重试'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadRealtimeData()
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMetrics = async () => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMetrics({
      totalVisitors: 1234567,
      totalConversions: 23456,
      totalRevenue: 345678.9,
      conversionRate: 1.9,
      avgSessionDuration: 245,
      activeLandingPages: 128,
      runningABTests: 12,
      activeAutomations: 34
    });
  };

  const loadChartData = async () => {
    // 模拟图表数据
    const dates = [];
    const visitors = [];
    const conversions = [];
    const revenue = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('MM-DD');
      dates.push(date);
      visitors.push({
        date,
        visitors: Math.floor(Math.random() * 5000) + 15000,
        mobile: Math.floor(Math.random() * 2000) + 8000,
        desktop: Math.floor(Math.random() * 3000) + 7000
      });
      conversions.push({
        date,
        conversions: Math.floor(Math.random() * 200) + 300,
        goal1: Math.floor(Math.random() * 100) + 150,
        goal2: Math.floor(Math.random() * 100) + 150
      });
      revenue.push({
        date,
        revenue: Math.floor(Math.random() * 50000) + 100000
      });
    }
    
    setChartData({
      visitors,
      conversions,
      revenue,
      deviceTypes: [
        { name: '移动端', value: 65, color: '#1890ff' },
        { name: '桌面端', value: 30, color: '#52c41a' },
        { name: '平板', value: 5, color: '#faad14' }
      ],
      trafficSources: [
        { name: 'Facebook广告', value: 45, color: '#1890ff' },
        { name: 'Google广告', value: 25, color: '#52c41a' },
        { name: '直接访问', value: 15, color: '#faad14' },
        { name: '其他', value: 15, color: '#f5222d' }
      ],
      topPages: [
        { name: '产品页面A', visitors: 12345, conversions: 234, rate: 1.9 },
        { name: '促销页面B', visitors: 9876, conversions: 198, rate: 2.0 },
        { name: '注册页面C', visitors: 8765, conversions: 175, rate: 2.0 },
        { name: '下载页面D', visitors: 7654, conversions: 153, rate: 2.0 },
        { name: '联系页面E', visitors: 6543, conversions: 131, rate: 2.0 }
      ]
    });
  };

  const loadRealtimeData = async () => {
    setRealtimeData({
      onlineUsers: Math.floor(Math.random() * 500) + 1000,
      currentVisitors: [
        { id: 1, ip: '192.168.1.1', location: '北京', page: '首页', duration: 120 },
        { id: 2, ip: '192.168.1.2', location: '上海', page: '产品页', duration: 89 },
        { id: 3, ip: '192.168.1.3', location: '深圳', page: '注册页', duration: 45 }
      ],
      recentConversions: [
        { id: 1, page: '产品页面A', value: 299, time: moment().subtract(2, 'minutes') },
        { id: 2, page: '促销页面B', value: 199, time: moment().subtract(5, 'minutes') },
        { id: 3, page: '注册页面C', value: 99, time: moment().subtract(8, 'minutes') }
      ],
      systemAlerts: [
        { level: 'warning', message: '服务器CPU使用率过高', time: moment().subtract(10, 'minutes') },
        { level: 'info', message: 'A/B测试已自动停止', time: moment().subtract(15, 'minutes') }
      ],
      queueStats: {
        analytics: { waiting: 12, active: 3, completed: 1234, failed: 2 },
        email: { waiting: 5, active: 1, completed: 567, failed: 0 },
        reports: { waiting: 2, active: 0, completed: 89, failed: 1 }
      },
      serverStats: {
        cpu: 45,
        memory: 67,
        disk: 23,
        network: 89
      }
    });
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };

  const exportData = () => {
    notification.info({
      message: '导出中...',
      description: '数据导出任务已添加到队列，完成后将通过邮件发送'
    });
  };

  const renderKPICards = () => (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={8} lg={6}>
        <Card className="kpi-card">
          <Statistic
            title="总访问量"
            value={metrics.totalVisitors}
            prefix={<EyeOutlined />}
            suffix={
              <Badge
                count={`+${Math.floor(Math.random() * 1000)}`}
                style={{ backgroundColor: '#52c41a' }}
              />
            }
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={6}>
        <Card className="kpi-card">
          <Statistic
            title="总转化量"
            value={metrics.totalConversions}
            prefix={<TrophyOutlined />}
            suffix={
              <Badge
                count={`+${Math.floor(Math.random() * 100)}`}
                style={{ backgroundColor: '#1890ff' }}
              />
            }
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={6}>
        <Card className="kpi-card">
          <Statistic
            title="总收入"
            value={metrics.totalRevenue}
            precision={2}
            prefix={<DollarOutlined />}
            suffix="CNY"
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={6}>
        <Card className="kpi-card">
          <Statistic
            title="转化率"
            value={metrics.conversionRate}
            precision={2}
            prefix={<FireOutlined />}
            suffix="%"
          />
        </Card>
      </Col>
    </Row>
  );

  const renderRealtimeStats = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card className="realtime-card">
          <Statistic
            title="在线用户"
            value={realtimeData.onlineUsers}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
          <Progress
            percent={Math.min((realtimeData.onlineUsers / 2000) * 100, 100)}
            showInfo={false}
            strokeColor="#52c41a"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="realtime-card">
          <Statistic
            title="活跃页面"
            value={metrics.activeLandingPages}
            prefix={<GlobalOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="realtime-card">
          <Statistic
            title="运行中A/B测试"
            value={metrics.runningABTests}
            prefix={<BarChartOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="realtime-card">
          <Statistic
            title="活跃自动化"
            value={metrics.activeAutomations}
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderTrafficChart = () => (
    <Card
      title="访问量趋势"
      extra={
        <Space>
          <Button size="small" icon={<LineChartOutlined />}>
            折线图
          </Button>
          <Button size="small" icon={<BarChartOutlined />}>
            柱状图
          </Button>
        </Space>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData.visitors}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="visitors"
            fill="#1890ff"
            fillOpacity={0.6}
            stroke="#1890ff"
            name="总访问量"
          />
          <Bar dataKey="mobile" fill="#52c41a" name="移动端" />
          <Bar dataKey="desktop" fill="#faad14" name="桌面端" />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderConversionChart = () => (
    <Card title="转化趋势">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData.conversions}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="conversions"
            stroke="#f5222d"
            strokeWidth={3}
            name="总转化"
          />
          <Line
            type="monotone"
            dataKey="goal1"
            stroke="#52c41a"
            name="目标1"
          />
          <Line
            type="monotone"
            dataKey="goal2"
            stroke="#1890ff"
            name="目标2"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderDeviceChart = () => (
    <Card title="设备类型分布">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            dataKey="value"
            data={chartData.deviceTypes}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.deviceTypes.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderTrafficSourceChart = () => (
    <Card title="流量来源">
      <ResponsiveContainer width="100%" height={300}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={chartData.trafficSources}>
          <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
          <Legend iconSize={18} layout="horizontal" verticalAlign="bottom" />
          <RechartsTooltip />
        </RadialBarChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderTopPagesTable = () => (
    <Card title="热门页面">
      <Table
        dataSource={chartData.topPages}
        pagination={false}
        size="small"
        columns={[
          {
            title: '页面名称',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>
          },
          {
            title: '访问量',
            dataIndex: 'visitors',
            key: 'visitors',
            render: (value) => value.toLocaleString()
          },
          {
            title: '转化量',
            dataIndex: 'conversions',
            key: 'conversions',
            render: (value) => value.toLocaleString()
          },
          {
            title: '转化率',
            dataIndex: 'rate',
            key: 'rate',
            render: (value) => (
              <Progress
                percent={value * 10}
                showInfo={false}
                size="small"
                format={() => `${value}%`}
              />
            )
          }
        ]}
      />
    </Card>
  );

  const renderRecentActivity = () => (
    <Card title="最近活动">
      <Timeline size="small">
        {realtimeData.recentConversions.map(conversion => (
          <Timeline.Item key={conversion.id} color="green">
            <Text strong>{conversion.page}</Text> 产生转化
            <br />
            <Text type="secondary">
              价值: ¥{conversion.value} - {conversion.time.fromNow()}
            </Text>
          </Timeline.Item>
        ))}
        {realtimeData.systemAlerts.map((alert, index) => (
          <Timeline.Item key={index} color={alert.level === 'warning' ? 'orange' : 'blue'}>
            <Text>{alert.message}</Text>
            <br />
            <Text type="secondary">{alert.time.fromNow()}</Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );

  const renderSystemStatus = () => (
    <Card title="系统状态">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Text>CPU使用率</Text>
          <Progress percent={realtimeData.serverStats.cpu} status="active" />
        </Col>
        <Col span={12}>
          <Text>内存使用率</Text>
          <Progress percent={realtimeData.serverStats.memory} status="active" />
        </Col>
        <Col span={12}>
          <Text>磁盘使用率</Text>
          <Progress percent={realtimeData.serverStats.disk} />
        </Col>
        <Col span={12}>
          <Text>网络使用率</Text>
          <Progress percent={realtimeData.serverStats.network} />
        </Col>
      </Row>
      
      <div style={{ marginTop: 16 }}>
        <Text strong>队列状态</Text>
        {Object.entries(realtimeData.queueStats).map(([queue, stats]) => (
          <div key={queue} style={{ marginTop: 8 }}>
            <Space>
              <Tag color="blue">{queue}</Tag>
              <Text>等待: {stats.waiting}</Text>
              <Text>处理中: {stats.active}</Text>
              <Text>已完成: {stats.completed}</Text>
              {stats.failed > 0 && (
                <Text type="danger">失败: {stats.failed}</Text>
              )}
            </Space>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderControlPanel = () => (
    <Card size="small" className="control-panel">
      <Space wrap>
        <Button
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={refreshData}
        >
          刷新
        </Button>
        
        <Button
          icon={<FullscreenOutlined />}
          onClick={toggleFullscreen}
        >
          {fullscreen ? '退出全屏' : '全屏模式'}
        </Button>
        
        <Button
          icon={<ExportOutlined />}
          onClick={exportData}
        >
          导出数据
        </Button>
        
        <Space>
          <Text>自动刷新</Text>
          <Switch
            checked={autoRefresh}
            onChange={setAutoRefresh}
          />
        </Space>
        
        <Select
          value={refreshInterval}
          onChange={setRefreshInterval}
          style={{ width: 100 }}
          disabled={!autoRefresh}
        >
          <Option value={10}>10秒</Option>
          <Option value={30}>30秒</Option>
          <Option value={60}>1分钟</Option>
          <Option value={300}>5分钟</Option>
        </Select>
        
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="YYYY-MM-DD"
        />
      </Space>
    </Card>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>加载数据中...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="dashboard-header">
        <Title level={2}>
          <DashboardOutlined /> 实时监控大屏
        </Title>
        {renderControlPanel()}
      </div>

      <div className="dashboard-content">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* KPI指标卡片 */}
          {renderKPICards()}
          
          {/* 实时统计 */}
          {renderRealtimeStats()}
          
          {/* 图表区域 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              {renderTrafficChart()}
            </Col>
            <Col xs={24} lg={8}>
              {renderDeviceChart()}
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              {renderConversionChart()}
            </Col>
            <Col xs={24} lg={12}>
              {renderTrafficSourceChart()}
            </Col>
          </Row>
          
          {/* 详细数据 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              {renderTopPagesTable()}
            </Col>
            <Col xs={24} lg={12}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  {renderRecentActivity()}
                </Col>
                <Col span={24}>
                  {renderSystemStatus()}
                </Col>
              </Row>
            </Col>
          </Row>
        </Space>
      </div>
    </div>
  );
};

export default Dashboard;
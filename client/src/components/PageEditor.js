import React, { useState, useRef } from 'react';
import { 
  Card, 
  Tabs, 
  Input, 
  Button, 
  Row, 
  Col, 
  Select, 
  Form, 
  Switch,
  message,
  Modal,
  Space
} from 'antd';
import { 
  EyeOutlined, 
  SaveOutlined, 
  CodeOutlined,
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined
} from '@ant-design/icons';
import MonacoEditor from 'react-monaco-editor';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const PageEditor = ({ landingPage, onSave, templates = [] }) => {
  const [form] = Form.useForm();
  const [content, setContent] = useState({
    html: landingPage?.content?.html || '',
    css: landingPage?.content?.css || '',
    js: landingPage?.content?.js || ''
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [loading, setSaving] = useState(false);
  const previewRef = useRef();

  const handleContentChange = (type, value) => {
    setContent(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleTemplateChange = async (templateId) => {
    if (!templateId) return;
    
    try {
      const response = await fetch(`/api/landing-pages/templates/${templateId}`);
      const data = await response.json();
      
      if (data.template) {
        setContent({
          html: data.template.html || '',
          css: data.template.css || '',
          js: data.template.js || ''
        });
        message.success('模板加载成功');
      }
    } catch (error) {
      message.error('加载模板失败');
      console.error('Load template error:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = await form.validateFields();
      
      const pageData = {
        ...formData,
        content
      };
      
      await onSave(pageData);
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewVisible(true);
    
    // 延迟更新预览内容，确保Modal完全渲染
    setTimeout(() => {
      if (previewRef.current) {
        const previewDoc = previewRef.current.contentDocument;
        const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              ${content.css}
            </style>
          </head>
          <body>
            ${content.html}
            <script>
              ${content.js}
            </script>
          </body>
          </html>
        `;
        
        previewDoc.open();
        previewDoc.write(fullHtml);
        previewDoc.close();
      }
    }, 100);
  };

  const getPreviewStyle = () => {
    const styles = {
      desktop: { width: '100%', height: '600px' },
      tablet: { width: '768px', height: '600px', margin: '0 auto' },
      mobile: { width: '375px', height: '600px', margin: '0 auto' }
    };
    return styles[previewDevice];
  };

  const editorOptions = {
    selectOnLineNumbers: true,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    theme: 'vs-dark'
  };

  // 默认HTML模板
  const defaultTemplates = {
    news: {
      html: `<div class="news-container">
  <header class="news-header">
    <h1>突发新闻</h1>
    <div class="news-meta">
      <span class="date">${new Date().toLocaleDateString()}</span>
      <span class="author">新闻编辑部</span>
    </div>
  </header>
  <article class="news-content">
    <h2>重要新闻标题</h2>
    <img src="https://via.placeholder.com/600x300" alt="新闻图片" class="news-image">
    <p>这里是新闻内容的第一段。您可以在这里添加详细的新闻描述...</p>
    <p>继续添加更多新闻内容，保持内容的真实性和可读性...</p>
    <div class="news-actions">
      <button class="btn-primary">了解更多</button>
      <button class="btn-secondary">分享新闻</button>
    </div>
  </article>
</div>`,
      css: `.news-container { max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; }
.news-header { border-bottom: 2px solid #1890ff; padding-bottom: 20px; margin-bottom: 30px; }
.news-header h1 { color: #1890ff; margin: 0; font-size: 2.5em; }
.news-meta { margin-top: 10px; color: #666; font-size: 0.9em; }
.news-meta span { margin-right: 20px; }
.news-content h2 { color: #333; font-size: 1.8em; margin-bottom: 20px; }
.news-image { width: 100%; height: auto; margin: 20px 0; border-radius: 8px; }
.news-content p { line-height: 1.8; color: #555; margin-bottom: 20px; font-size: 1.1em; }
.news-actions { margin-top: 30px; text-align: center; }
.btn-primary, .btn-secondary { padding: 12px 24px; margin: 0 10px; border: none; border-radius: 6px; cursor: pointer; font-size: 1em; }
.btn-primary { background: #1890ff; color: white; }
.btn-secondary { background: #f5f5f5; color: #333; }
.btn-primary:hover { background: #40a9ff; }
.btn-secondary:hover { background: #e6e6e6; }`,
      js: `console.log('新闻页面已加载');

// 按钮点击事件
document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      console.log('按钮被点击:', this.textContent);
      // 这里可以添加具体的点击处理逻辑
    });
  });
});`
    },
    blog: {
      html: `<div class="blog-container">
  <article class="blog-post">
    <header class="blog-header">
      <h1>博客文章标题</h1>
      <div class="blog-meta">
        <span class="author">作者姓名</span>
        <span class="date">${new Date().toLocaleDateString()}</span>
        <span class="category">分类: 技术</span>
      </div>
    </header>
    <div class="blog-content">
      <p class="intro">这是博客文章的引言部分，简要介绍文章的主要内容...</p>
      <img src="https://via.placeholder.com/700x400" alt="博客配图" class="blog-image">
      <h3>小标题一</h3>
      <p>详细内容段落，您可以在这里添加丰富的内容...</p>
      <h3>小标题二</h3>
      <p>更多内容段落，保持内容的连贯性和逻辑性...</p>
      <div class="blog-footer">
        <div class="tags">
          <span class="tag">标签1</span>
          <span class="tag">标签2</span>
          <span class="tag">标签3</span>
        </div>
        <div class="social-share">
          <button class="share-btn">分享到社交媒体</button>
        </div>
      </div>
    </div>
  </article>
</div>`,
      css: `.blog-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #fff; }
.blog-header { text-align: center; margin-bottom: 40px; }
.blog-header h1 { font-size: 2.5em; color: #333; margin-bottom: 20px; }
.blog-meta { color: #666; font-size: 0.95em; }
.blog-meta span { margin: 0 15px; }
.blog-content { line-height: 1.8; color: #444; }
.intro { font-size: 1.2em; font-style: italic; color: #666; margin-bottom: 30px; }
.blog-image { width: 100%; height: auto; margin: 30px 0; border-radius: 12px; }
.blog-content h3 { color: #333; font-size: 1.5em; margin: 30px 0 15px; }
.blog-content p { margin-bottom: 20px; font-size: 1.1em; }
.blog-footer { margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee; }
.tags { margin-bottom: 20px; }
.tag { background: #f0f0f0; color: #666; padding: 4px 12px; margin-right: 10px; border-radius: 20px; font-size: 0.9em; }
.share-btn { background: #1890ff; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; }
.share-btn:hover { background: #40a9ff; }`,
      js: `console.log('博客页面已加载');

// 社交分享功能
document.addEventListener('DOMContentLoaded', function() {
  const shareBtn = document.querySelector('.share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function() {
      if (navigator.share) {
        navigator.share({
          title: document.querySelector('h1').textContent,
          text: document.querySelector('.intro').textContent,
          url: window.location.href
        });
      } else {
        console.log('分享功能触发');
        alert('分享功能已触发（在实际应用中这里会调用社交媒体分享API）');
      }
    });
  }
});`
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 200px)' }}>
      <Card 
        title="页面编辑器"
        extra={
          <Space>
            <Select
              placeholder="选择设备预览"
              value={previewDevice}
              onChange={setPreviewDevice}
              style={{ width: 120 }}
            >
              <Option value="desktop"><DesktopOutlined /> 桌面</Option>
              <Option value="tablet"><TabletOutlined /> 平板</Option>
              <Option value="mobile"><MobileOutlined /> 手机</Option>
            </Select>
            <Button icon={<EyeOutlined />} onClick={handlePreview}>
              预览
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
              loading={loading}
            >
              保存
            </Button>
          </Space>
        }
        bodyStyle={{ padding: 0, height: 'calc(100vh - 280px)' }}
      >
        <Row style={{ height: '100%' }}>
          <Col span={8} style={{ borderRight: '1px solid #f0f0f0', padding: 16, overflowY: 'auto' }}>
            <Form form={form} layout="vertical" initialValues={landingPage}>
              <Form.Item label="页面名称" name="name" rules={[{ required: true }]}>
                <Input placeholder="输入页面名称" />
              </Form.Item>
              
              <Form.Item label="页面类型" name="type" rules={[{ required: true }]}>
                <Select placeholder="选择页面类型">
                  <Option value="main">主页面</Option>
                  <Option value="cloak">掩护页面</Option>
                  <Option value="redirect">重定向页面</Option>
                </Select>
              </Form.Item>

              <Form.Item label="选择模板">
                <Select 
                  placeholder="选择模板"
                  onChange={handleTemplateChange}
                  allowClear
                >
                  <Option value="news">新闻模板</Option>
                  <Option value="blog">博客模板</Option>
                </Select>
              </Form.Item>

              <Form.Item label="SEO标题" name={['seo', 'title']}>
                <Input placeholder="页面标题" />
              </Form.Item>

              <Form.Item label="SEO描述" name={['seo', 'description']}>
                <TextArea rows={3} placeholder="页面描述" />
              </Form.Item>

              <Form.Item label="SEO关键词" name={['seo', 'keywords']}>
                <Input placeholder="关键词，用逗号分隔" />
              </Form.Item>

              <Form.Item label="启用页面" name="isActive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Form>
          </Col>
          
          <Col span={16} style={{ height: '100%' }}>
            <Tabs 
              defaultActiveKey="html" 
              style={{ height: '100%' }}
              tabBarStyle={{ padding: '0 16px', margin: 0 }}
            >
              <TabPane tab={<span><CodeOutlined />HTML</span>} key="html">
                <MonacoEditor
                  language="html"
                  theme="vs-dark"
                  value={content.html}
                  options={editorOptions}
                  onChange={(value) => handleContentChange('html', value)}
                />
              </TabPane>
              
              <TabPane tab={<span><CodeOutlined />CSS</span>} key="css">
                <MonacoEditor
                  language="css"
                  theme="vs-dark"
                  value={content.css}
                  options={editorOptions}
                  onChange={(value) => handleContentChange('css', value)}
                />
              </TabPane>
              
              <TabPane tab={<span><CodeOutlined />JavaScript</span>} key="js">
                <MonacoEditor
                  language="javascript"
                  theme="vs-dark"
                  value={content.js}
                  options={editorOptions}
                  onChange={(value) => handleContentChange('js', value)}
                />
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Card>

      <Modal
        title="页面预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={null}
        bodyStyle={{ padding: 0, height: '80vh' }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button 
              type={previewDevice === 'desktop' ? 'primary' : 'default'}
              icon={<DesktopOutlined />}
              onClick={() => setPreviewDevice('desktop')}
            >
              桌面
            </Button>
            <Button 
              type={previewDevice === 'tablet' ? 'primary' : 'default'}
              icon={<TabletOutlined />}
              onClick={() => setPreviewDevice('tablet')}
            >
              平板
            </Button>
            <Button 
              type={previewDevice === 'mobile' ? 'primary' : 'default'}
              icon={<MobileOutlined />}
              onClick={() => setPreviewDevice('mobile')}
            >
              手机
            </Button>
          </Space>
        </div>
        <div style={{ padding: 16, height: 'calc(80vh - 80px)', overflow: 'auto' }}>
          <iframe
            ref={previewRef}
            style={{
              ...getPreviewStyle(),
              border: '1px solid #d9d9d9',
              borderRadius: 4
            }}
            title="页面预览"
          />
        </div>
      </Modal>
    </div>
  );
};

export default PageEditor;
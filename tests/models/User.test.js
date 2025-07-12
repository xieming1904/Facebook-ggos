const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('用户创建', () => {
    test('应该成功创建用户', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.password).not.toBe(userData.password); // 应该被加密
      expect(savedUser.createdAt).toBeDefined();
    });

    test('用户名重复时应该抛出错误', async () => {
      const userData1 = {
        username: 'duplicateuser',
        email: 'test1@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'duplicateuser',
        email: 'test2@example.com',
        password: 'password456'
      };

      await new User(userData1).save();
      
      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    test('邮箱重复时应该抛出错误', async () => {
      const userData1 = {
        username: 'user1',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password456'
      };

      await new User(userData1).save();
      
      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    test('缺少必填字段时应该抛出错误', async () => {
      const incompleteData = {
        username: 'testuser'
        // 缺少email和password
      };

      const user = new User(incompleteData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('密码加密', () => {
    test('保存时应该自动加密密码', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plainpassword',
        role: 'user'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe('plainpassword');
      expect(user.password.length).toBeGreaterThan(20); // bcrypt哈希长度
    });

    test('密码未修改时不应该重新加密', async () => {
      const user = await testUtils.createTestUser();
      const originalPassword = user.password;

      // 修改其他字段
      user.username = 'newusername';
      await user.save();

      expect(user.password).toBe(originalPassword);
    });

    test('comparePassword方法应该正确验证密码', async () => {
      const plainPassword = 'testpassword123';
      const user = await testUtils.createTestUser({ password: plainPassword });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
  });

  describe('用户角色和权限', () => {
    test('默认角色应该是user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      expect(user.role).toBe('user');
    });

    test('应该支持所有角色类型', async () => {
      const roles = ['admin', 'user', 'owner', 'manager', 'viewer'];

      for (const role of roles) {
        const userData = {
          username: `testuser_${role}`,
          email: `test_${role}@example.com`,
          password: 'password123',
          role: role
        };

        const user = new User(userData);
        await user.save();

        expect(user.role).toBe(role);
      }
    });

    test('无效角色应该抛出错误', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalidrole'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('应该设置默认权限', async () => {
      const user = await testUtils.createTestUser();

      expect(user.permissions).toBeDefined();
      expect(user.permissions.domains).toBeDefined();
      expect(user.permissions.pages).toBeDefined();
      expect(user.permissions.analytics).toBeDefined();

      // 检查默认权限值
      expect(user.permissions.domains.read).toBe(true);
      expect(user.permissions.domains.create).toBe(false);
      expect(user.permissions.pages.read).toBe(true);
      expect(user.permissions.pages.create).toBe(true);
    });
  });

  describe('组织关联', () => {
    test('应该支持组织关联', async () => {
      const { organization, user: orgOwner } = await testUtils.createTestOrganization();
      
      const userData = {
        username: 'orguser',
        email: 'orguser@example.com',
        password: 'password123',
        organizationId: organization._id,
        organizationRole: 'manager'
      };

      const user = new User(userData);
      await user.save();

      expect(user.organizationId.toString()).toBe(organization._id.toString());
      expect(user.organizationRole).toBe('manager');
    });

    test('默认组织角色应该是user', async () => {
      const user = await testUtils.createTestUser();
      expect(user.organizationRole).toBe('user');
    });
  });

  describe('用户设置', () => {
    test('应该设置默认设置', async () => {
      const user = await testUtils.createTestUser();

      expect(user.settings).toBeDefined();
      expect(user.settings.notifications.email).toBe(true);
      expect(user.settings.notifications.push).toBe(true);
      expect(user.settings.theme).toBe('light');
      expect(user.settings.language).toBe('zh-CN');
    });

    test('应该允许自定义设置', async () => {
      const customSettings = {
        notifications: {
          email: false,
          push: false
        },
        theme: 'dark',
        language: 'en-US'
      };

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        settings: customSettings
      };

      const user = new User(userData);
      await user.save();

      expect(user.settings.notifications.email).toBe(false);
      expect(user.settings.theme).toBe('dark');
      expect(user.settings.language).toBe('en-US');
    });
  });

  describe('用户资料', () => {
    test('应该允许设置用户资料', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'http://example.com/avatar.jpg',
        phone: '+86 138 0000 0000'
      };

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        profile: profileData
      };

      const user = new User(userData);
      await user.save();

      expect(user.profile.firstName).toBe(profileData.firstName);
      expect(user.profile.lastName).toBe(profileData.lastName);
      expect(user.profile.avatar).toBe(profileData.avatar);
      expect(user.profile.phone).toBe(profileData.phone);
    });

    test('资料字段应该是可选的', async () => {
      const user = await testUtils.createTestUser();

      expect(user.profile).toBeDefined();
      expect(user.profile.firstName).toBeUndefined();
      expect(user.profile.lastName).toBeUndefined();
      expect(user.profile.avatar).toBeUndefined();
      expect(user.profile.phone).toBeUndefined();
    });
  });

  describe('用户状态', () => {
    test('新用户应该默认是活跃状态', async () => {
      const user = await testUtils.createTestUser();
      expect(user.isActive).toBe(true);
    });

    test('应该能够禁用用户', async () => {
      const user = await testUtils.createTestUser();
      
      user.isActive = false;
      await user.save();

      expect(user.isActive).toBe(false);
    });

    test('应该记录最后登录时间', async () => {
      const user = await testUtils.createTestUser();
      
      const loginTime = new Date();
      user.lastLogin = loginTime;
      await user.save();

      expect(user.lastLogin).toEqual(loginTime);
    });
  });

  describe('数据验证', () => {
    test('用户名应该进行trim处理', async () => {
      const userData = {
        username: '  testuser  ',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      expect(user.username).toBe('testuser');
    });

    test('邮箱应该进行trim和lowercase处理', async () => {
      const userData = {
        username: 'testuser',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('数据库查询', () => {
    test('应该能够按用户名查找用户', async () => {
      const user = await testUtils.createTestUser({ username: 'findme' });
      
      const foundUser = await User.findOne({ username: 'findme' });
      expect(foundUser).toBeDefined();
      expect(foundUser._id.toString()).toBe(user._id.toString());
    });

    test('应该能够按邮箱查找用户', async () => {
      const user = await testUtils.createTestUser({ email: 'findme@example.com' });
      
      const foundUser = await User.findOne({ email: 'findme@example.com' });
      expect(foundUser).toBeDefined();
      expect(foundUser._id.toString()).toBe(user._id.toString());
    });

    test('应该能够查找活跃用户', async () => {
      await testUtils.createTestUser({ username: 'active', isActive: true });
      await testUtils.createTestUser({ username: 'inactive', isActive: false });
      
      const activeUsers = await User.find({ isActive: true });
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].username).toBe('active');
    });

    test('应该能够按角色查找用户', async () => {
      await testUtils.createTestUser({ username: 'admin', role: 'admin' });
      await testUtils.createTestUser({ username: 'user', role: 'user' });
      
      const admins = await User.find({ role: 'admin' });
      expect(admins).toHaveLength(1);
      expect(admins[0].username).toBe('admin');
    });
  });
});
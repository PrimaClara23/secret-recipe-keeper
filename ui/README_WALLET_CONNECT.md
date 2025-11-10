# WalletConnect 403 错误说明

## ✅ 这些错误是正常的！

在本地开发环境中，您会在浏览器控制台和Network标签中看到WalletConnect相关的403错误。**这些错误是完全正常的，不会影响任何功能！**

## 📋 错误示例

```
GET https://api.web3modal.org/appkit/v1/config?projectId=... 403 (Forbidden)
POST https://pulse.walletconnect.org/e?projectId=... 403 (Forbidden)
Origin http://localhost:8080 not found on Allowlist
```

## 🔍 为什么会出现这些错误？

1. **WalletConnect需要域名白名单**: 生产环境需要在 https://cloud.reown.com 配置域名
2. **本地开发不受限制**: 应用会自动使用本地默认配置
3. **功能完全正常**: 所有钱包连接和合约交互功能都正常工作

## ✅ 功能验证

即使有这些错误，以下功能**完全正常**：
- ✅ MetaMask钱包连接
- ✅ WalletConnect钱包连接
- ✅ 合约交互
- ✅ 数据加密/解密
- ✅ 所有业务功能

## 🔧 如何消除这些错误（可选）

### 方法1: 获取真实的WalletConnect Project ID

1. 访问 https://cloud.reown.com
2. 注册/登录账户
3. 创建新项目
4. 添加域名白名单：`http://localhost:8080`
5. 复制Project ID
6. 创建 `.env.local` 文件：
   ```bash
   VITE_WALLET_CONNECT_PROJECT_ID=your-real-project-id-here
   ```
7. 重启开发服务器

### 方法2: 忽略这些错误（推荐用于开发）

这些错误不影响功能，可以安全忽略。应用会使用本地默认配置，所有功能正常工作。

## 🚀 生产环境部署

部署到生产环境时：

1. 使用真实的WalletConnect Project ID
2. 在cloud.reown.com配置生产域名白名单
3. 使用环境变量管理配置（不要提交到代码库）

## 📚 参考资源

- [RainbowKit文档](https://www.rainbowkit.com/docs/introduction)
- [WalletConnect Cloud](https://cloud.reown.com)
- [secret-vote-box项目](https://github.com/your-repo/secret-vote-box) - 参考实现

## 💡 提示

应用启动时会在控制台显示友好的提示信息，说明这些错误是正常的。您可以安全地忽略它们，专注于开发！

